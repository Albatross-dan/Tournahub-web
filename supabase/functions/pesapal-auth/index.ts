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

  // Fallback to table payment_providers
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

export async function getActiveToken(supabase: any, environment: string) {
  // 1. Check database cache
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

  // 2. Load credentials and request new token
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

  // 3. Update database cache
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const environment = body.environment || Deno.env.get("PESAPAL_ENVIRONMENT") || "sandbox";

    const { token, apiBaseUrl } = await getActiveToken(supabaseClient, environment);

    return new Response(
      JSON.stringify({ 
        success: true, 
        token, 
        api_base_url: apiBaseUrl 
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
