import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getPesapalCredentials(supabase: any, environment: string) {
  const envKey = Deno.env.get("PESAPAL_CONSUMER_KEY");
  const envSecret = Deno.env.get("PESAPAL_CONSUMER_SECRET");
  if (envKey && envSecret) {
    return {
      consumerKey: envKey,
      consumerSecret: envSecret,
      apiBaseUrl: environment === "production" 
        ? "https://api.pesapal.com/pesapalv3" 
        : "https://cybqa.pesapal.com/pesapalv3"
    };
  }

  const { data: provider, error } = await supabase
    .from("payment_providers")
    .select("config, api_base_url")
    .eq("name", "pesapal")
    .eq("environment", environment)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !provider) {
    const { data: fallback } = await supabase
      .from("payment_providers")
      .select("config, api_base_url")
      .eq("name", "pesapal")
      .maybeSingle();
      
    if (fallback) {
      const config = typeof fallback.config === "string" 
        ? JSON.parse(fallback.config) 
        : fallback.config;
      return {
        consumerKey: config?.consumer_key || config?.consumerKey || "",
        consumerSecret: config?.consumer_secret || config?.consumerSecret || "",
        apiBaseUrl: fallback.api_base_url || (environment === "production" 
          ? "https://api.pesapal.com/pesapalv3" 
          : "https://cybqa.pesapal.com/pesapalv3")
      };
    }
    
    throw new Error("Pesapal provider config not found in DB or Environment");
  }

  const config = typeof provider.config === "string" 
    ? JSON.parse(provider.config) 
    : provider.config;

  return {
    consumerKey: config?.consumer_key || config?.consumerKey || "",
    consumerSecret: config?.consumer_secret || config?.consumerSecret || "",
    apiBaseUrl: provider.api_base_url || (environment === "production" 
      ? "https://api.pesapal.com/pesapalv3" 
      : "https://cybqa.pesapal.com/pesapalv3")
  };
}

async function getActiveToken(supabase: any, environment: string) {
  const { data: cached, error: cacheErr } = await supabase
    .from('pesapal_auth_cache')
    .select('*')
    .eq('environment', environment)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached && !cacheErr) {
    return {
      token: cached.access_token,
      apiBaseUrl: environment === "production" 
        ? "https://api.pesapal.com/pesapalv3" 
        : "https://cybqa.pesapal.com/pesapalv3"
    };
  }

  const { consumerKey, consumerSecret, apiBaseUrl } = await getPesapalCredentials(supabase, environment);

  const response = await fetch(`${apiBaseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      "consumer_key": consumerKey,
      "consumer_secret": consumerSecret
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to authenticate with Pesapal: ${response.statusText} - ${errText}`);
  }

  const result = await response.json();
  if (result.error || !result.token) {
    throw new Error(`Pesapal authentication response error: ${result.error || 'No token received'}`);
  }

  await supabase
    .from('pesapal_auth_cache')
    .upsert({
      environment,
      access_token: result.token,
      token_type: 'Bearer',
      expires_at: result.expiryDate || new Date(Date.now() + 30 * 60000).toISOString(),
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'environment' });

  return {
    token: result.token,
    apiBaseUrl
  };
}

export async function verifyAndCreditTransaction(supabaseClient: any, identifiers: { payment_request_id?: string; order_tracking_id?: string }, triggeredBy: string = "user_poll") {
  const startTs = Date.now();
  
  // 1. Fetch matching payment request from DB
  let query = supabaseClient.from('payment_requests').select('*');
  if (identifiers.payment_request_id) {
    query = query.eq('id', identifiers.payment_request_id);
  } else if (identifiers.order_tracking_id) {
    query = query.eq('order_tracking_id', identifiers.order_tracking_id);
  } else {
    throw new Error("Either payment_request_id or order_tracking_id must be provided");
  }

  const { data: request, error: queryErr } = await query.maybeSingle();
  if (queryErr || !request) {
    throw new Error(`payment_request not found with given criteria: ${queryErr?.message || 'not found'}`);
  }

  const orderTrackingId = request.order_tracking_id;
  if (!orderTrackingId) {
    throw new Error("This payment request does not have an active provider order tracking ID yet.");
  }

  // Prevent double crediting: check if payment request is already completed
  if (request.status === 'completed') {
    return { success: true, already_completed: true, status: 'completed' };
  }

  const environment = request.environment || Deno.env.get("PESAPAL_ENVIRONMENT") || "sandbox";

  // 2. Obtain Pesapal Authorization Token
  const { token, apiBaseUrl } = await getActiveToken(supabaseClient, environment);

  // 3. Request actual status directly from Pesapal REST API (pull mode)
  const statusRes = await fetch(`${apiBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });

  if (!statusRes.ok) {
    const errText = await statusRes.text();
    throw new Error(`Failed to fetch status from Pesapal: ${statusRes.statusText} - ${errText}`);
  }

  const result = await statusRes.json();
  const rawStatus = result.payment_status_description || result.status;
  const isCompleted = typeof rawStatus === "string" && (
    rawStatus.toLowerCase() === "completed" || 
    rawStatus.toLowerCase() === "success" ||
    result.status_code === 1
  );

  // 4. Verification Check: Compare expected currency and amount vs Pesapal response
  const pesapalAmount = Number(result.amount);
  const pesapalCurrency = result.currency;
  
  const amountExpected = Number(request.original_amount);
  const currencyExpected = request.original_currency;

  const amountMatches = Math.abs(pesapalAmount - amountExpected) < 0.01;
  const currencyMatches = String(pesapalCurrency).toLowerCase() === String(currencyExpected).toLowerCase();
  const referenceMatches = String(result.merchant_reference) === String(request.id);

  const verificationSuccess = isCompleted && amountMatches && currencyMatches && referenceMatches;
  const verifiedStatus = verificationSuccess ? 'verified' : (isCompleted ? 'invalid_parameters' : 'pending');

  // Compute attempts log
  const { count } = await supabaseClient
    .from('provider_verification_log')
    .select('*', { count: 'exact', head: true })
    .eq('payment_request_id', request.id);
  const nextAttemptNum = (count || 0) + 1;

  const durationMs = Date.now() - startTs;

  // 5. Store security records to provider_verification_log
  const { error: logErr } = await supabaseClient
    .from('provider_verification_log')
    .insert({
      payment_request_id: request.id,
      provider: 'pesapal',
      environment: environment,
      provider_reference: orderTrackingId,
      merchant_reference: request.id,
      verification_status: verifiedStatus,
      provider_raw_status: rawStatus,
      verified_amount: pesapalAmount,
      verified_currency: pesapalCurrency,
      amount_matches: amountMatches,
      currency_matches: currencyMatches,
      raw_response: result,
      error_message: verificationSuccess ? null : `isCompleted: ${isCompleted}, amountExpected: ${amountExpected}(got: ${pesapalAmount}), currencyExpected: ${currencyExpected}(got: ${pesapalCurrency}), referenceMatches: ${referenceMatches}`,
      attempt_number: nextAttemptNum,
      processing_duration_ms: durationMs,
      triggered_by: triggeredBy,
      verified_at: new Date().toISOString()
    });

  if (logErr) {
    console.error("Failed to write provider verification log:", logErr);
  }

  // 6. Action Execution: Execute actual wallet crediting ONLY if verified
  if (verificationSuccess) {
    // Call DB RPC 'confirm_payment_request' which wraps crediting, ledger updates and balance snapshots inside a Postgres ACID txn
    const { data: confirmData, error: confirmErr } = await supabaseClient.rpc('confirm_payment_request', {
      p_request_id: request.id,
      p_provider_response: result
    });

    if (confirmErr) {
      throw new Error(`Database transaction confirmation failed: ${confirmErr.message}`);
    }

    return {
      success: true,
      status: 'completed',
      verification_status: 'verified',
      confirm_response: confirmData
    };
  } else {
    // If fail/invalid, update the payment request table's verification status
    const newStatus = isCompleted ? 'failed' : 'initiated';
    await supabaseClient
      .from('payment_requests')
      .update({
        verification_status: verifiedStatus,
        verification_attempts: nextAttemptNum,
        last_verified_at: new Date().toISOString(),
        status: newStatus,
        last_error: isCompleted ? "Verification failed: Parameter mismatch" : "Transaction pending completion"
      })
      .eq('id', request.id);

    return {
      success: false,
      status: newStatus,
      verification_status: verifiedStatus,
      message: `Verification pending or failed. Status: ${rawStatus}`
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { payment_request_id, order_tracking_id, triggered_by } = body;

    const result = await verifyAndCreditTransaction(
      supabaseClient, 
      { payment_request_id, order_tracking_id }, 
      triggered_by || "user_poll"
    );

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})
