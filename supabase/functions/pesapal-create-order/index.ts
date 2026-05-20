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

async function getOrRegisterIpnId(supabase: any, environment: string, token: string, apiBaseUrl: string, supabaseUrl: string) {
  // Query DB for existing active IPN
  const { data: ipnReg } = await supabase
    .from('provider_ipn_registrations')
    .select('ipn_id')
    .eq('provider', 'pesapal')
    .eq('environment', environment)
    .eq('status', 'active')
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ipnReg?.ipn_id) {
    return ipnReg.ipn_id;
  }

  // Self-heal: Automatically register parent webhook IPN
  const defaultIpnUrl = `${supabaseUrl}/functions/v1/pesapal-ipn`;
  const response = await fetch(`${apiBaseUrl}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      "url": defaultIpnUrl,
      "ipn_notification_type": "GET"
    })
  });

  if (!response.ok) {
    throw new Error(`Failed self-healing register IPN backchannel: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.ipn_id) {
    throw new Error(`Registration backchannel response did not contain IPN ID`);
  }

  await supabase
    .from('provider_ipn_registrations')
    .insert({
      provider: 'pesapal',
      environment: environment,
      ipn_id: result.ipn_id,
      ipn_url: defaultIpnUrl,
      registered_at: new Date().toISOString(),
      status: 'active',
      notification_type: 'GET',
      raw_response: result,
      updated_at: new Date().toISOString()
    });

  return result.ipn_id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { payment_request_id, callback_url } = body;

    if (!payment_request_id) {
      throw new Error("payment_request_id is required");
    }

    // 1. Fetch the deposit requested record
    const { data: request, error: fetchErr } = await supabaseClient
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .single();

    if (fetchErr || !request) {
      throw new Error(`Payment request ${payment_request_id} not found: ${fetchErr?.message}`);
    }

    const environment = request.environment || Deno.env.get("PESAPAL_ENVIRONMENT") || "sandbox";

    // 2. Fetch User contact details from auth and profiles tables to meet KYC/billing requirements
    const { data: userData, error: userErr } = await supabaseClient.auth.admin.getUserById(request.user_id);
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username, country_code')
      .eq('id', request.user_id)
      .maybeSingle();

    const email = userData?.user?.email || "customer@example.com";
    const phone = userData?.user?.phone || null;
    const username = profile?.username || "Jane Doe";
    const parts = username.trim().split(/\s+/);
    const firstName = parts[0] || "Jane";
    const lastName = parts.slice(1).join(" ") || "Doe";
    const countryCode = profile?.country_code || "KE";

    // 3. Authenticate with Pesapal
    const { token, apiBaseUrl } = await getActiveToken(supabaseClient, environment);

    // 4. Resolve IPN reference
    const ipnId = await getOrRegisterIpnId(supabaseClient, environment, token, apiBaseUrl, supabaseUrl);

    // 5. Submit Order Request
    const pesapalOrderBody = {
      "id": request.id,
      "currency": request.original_currency,
      "amount": request.original_amount,
      "description": `Deposit to wallet - Ref: ${request.id.slice(0,8)}`,
      "callback_url": callback_url || `${Deno.env.get("APP_URL") || "https://example.com"}/wallet-callback`,
      "notification_id": ipnId,
      "billing_address": {
        "email_address": email,
        "phone_number": phone,
        "first_name": firstName,
        "last_name": lastName,
        "country_code": countryCode
      }
    };

    const orderRes = await fetch(`${apiBaseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(pesapalOrderBody)
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`Pesapal order submission failed: ${orderRes.statusText} - ${errText}`);
    }

    const orderResult = await orderRes.json();
    if (orderResult.error || !orderResult.order_tracking_id) {
      throw new Error(`Pesapal order submission error: ${orderResult.error || 'No tracking ID returned'}`);
    }

    // 6. Update payment request status details
    const { error: updateErr } = await supabaseClient
      .from('payment_requests')
      .update({
        order_tracking_id: orderResult.order_tracking_id,
        merchant_reference: request.id,
        checkout_url: orderResult.redirect_url,
        status: 'initiated',
        provider_response: orderResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (updateErr) {
      throw new Error(`Failed to update payment request after initiating order: ${updateErr.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_tracking_id: orderResult.order_tracking_id,
        redirect_url: orderResult.redirect_url,
        merchant_reference: request.id
      }),
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
