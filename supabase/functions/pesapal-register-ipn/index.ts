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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const environment = body.environment || Deno.env.get("PESAPAL_ENVIRONMENT") || "sandbox";
    const notificationType = body.notification_type || "GET";
    
    // Dynamically derive correct IPN webhook URL if not provided explicitly in body
    const defaultIpnUrl = `${supabaseUrl}/functions/v1/pesapal-ipn`;
    const ipnUrl = body.ipn_url || defaultIpnUrl;

    // 1. Authenticate with Pesapal
    const { token, apiBaseUrl } = await getActiveToken(supabaseClient, environment);

    // 2. Register IPN with Pesapal API
    const response = await fetch(`${apiBaseUrl}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        "url": ipnUrl,
        "ipn_notification_type": notificationType
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`IPN registration with Pesapal API failed: ${response.statusText} - ${errText}`);
    }

    const result = await response.json();
    if (!result.ipn_id) {
      throw new Error(`Pesapal register IPN response error: ${JSON.stringify(result)}`);
    }

    // 3. Store the active registration in the provider_ipn_registrations table
    const { data: stored, error: dbErr } = await supabaseClient
      .from('provider_ipn_registrations')
      .insert({
        provider: 'pesapal',
        environment: environment,
        ipn_id: result.ipn_id,
        ipn_url: ipnUrl,
        registered_at: new Date().toISOString(),
        status: 'active',
        notification_type: notificationType,
        raw_response: result,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbErr) {
      throw new Error(`Failed to store IPN registration in database: ${dbErr.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ipn_id: result.ipn_id, 
        url: ipnUrl, 
        stored 
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
