import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

export function getPesapalConfig() {
  const consumerKey = Deno.env.get("PESAPAL_CONSUMER_KEY") || "";
  const consumerSecret = Deno.env.get("PESAPAL_CONSUMER_SECRET") || "";
  const environment = Deno.env.get("PESAPAL_ENVIRONMENT") || "sandbox";
  
  const baseUrl = environment === "production"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

  return { consumerKey, consumerSecret, environment, baseUrl };
}

export async function getPesapalToken(supabaseClient: any): Promise<string> {
  const { consumerKey, consumerSecret, environment, baseUrl } = getPesapalConfig();

  if (!consumerKey || !consumerSecret) {
    throw new Error("Missing PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET env variables");
  }

  // Check database cache for valid active token
  const now = new Date().toISOString();
  const { data: cached, error: cacheError } = await supabaseClient
    .from("pesapal_auth_cache")
    .select("*")
    .eq("environment", environment)
    .eq("status", "active")
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached && cached.access_token) {
    console.log("Using cached Pesapal access token. Expires at:", cached.expires_at);
    return cached.access_token;
  }

  if (cacheError) {
    console.warn("Failed to check token cache, proceeding with API call:", cacheError);
  }

  console.log("Generating fresh Pesapal access token from API:", `${baseUrl}/api/Auth/RequestToken`);
  
  const authResponse = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  if (!authResponse.ok) {
    const errorText = await authResponse.text();
    throw new Error(`Pesapal auth request failed with status ${authResponse.status}: ${errorText}`);
  }

  const authData = await authResponse.json();
  if (!authData.token) {
    throw new Error("Invalid Auth response from Pesapal: Missing token field");
  }

  // Save new token to database cache
  const { error: insertError } = await supabaseClient
    .from("pesapal_auth_cache")
    .insert({
      environment,
      access_token: authData.token,
      token_type: "Bearer",
      expires_at: authData.expiryDate, // Iso Date string representing expiry returned by Pesapal
      issued_at: new Date().toISOString(),
      status: "active"
    });

  if (insertError) {
    console.error("Failed to cache Pesapal token:", insertError);
  }

  return authData.token;
}

export async function registerIpnHelper(supabaseClient: any, token: string, customIpnUrl?: string): Promise<string> {
  const { environment, baseUrl } = getPesapalConfig();
  
  let ipnUrl = customIpnUrl;
  if (!ipnUrl) {
    const projectUrl = Deno.env.get("SUPABASE_URL") || "";
    ipnUrl = `${projectUrl}/functions/v1/pesapal-ipn`;
  }

  console.log("Registering Pesapal IPN URL:", ipnUrl);

  const ipnResponse = await fetch(`${baseUrl}/api/URLRegister/RegisterIPN`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "GET",
    }),
  });

  if (!ipnResponse.ok) {
    const errorText = await ipnResponse.text();
    throw new Error(`Pesapal IPN registration failed: ${errorText}`);
  }

  const ipnData = await ipnResponse.json();
  if (!ipnData.ipn_id) {
    throw new Error("IPN registration response missing ipn_id");
  }

  const { error: insertError } = await supabaseClient
    .from("provider_ipn_registrations")
    .insert({
      provider: "pesapal",
      environment,
      ipn_id: ipnData.ipn_id,
      ipn_url: ipnData.url || ipnUrl,
      registered_at: new Date().toISOString(),
      status: "active",
      notification_type: ipnData.ipn_notification_type || "GET",
      raw_response: ipnData
    });

  if (insertError) {
    console.error("Failed to store IPN registration log in DB:", insertError);
  }

  return ipnData.ipn_id;
}
