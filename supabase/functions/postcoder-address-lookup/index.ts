import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const COUNTRY_CODES: Record<string, string> = {
  GB: "uk",
  AU: "au",
  NZ: "nz",
  IE: "ie",
  CA: "ca",
  US: "us"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const postcoderApiKey = Deno.env.get("POSTCODER_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase configuration is missing." }, 500);
  if (!postcoderApiKey) return json({ error: "Postcoder is not configured yet." }, 503);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authentication required." }, 401);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Authentication required." }, 401);

  let body: { postcode?: string; countryCode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const postcode = String(body.postcode || "").trim().replace(/\s+/g, " ");
  const countryCode = String(body.countryCode || "GB").trim().toUpperCase();
  const postcoderCountry = COUNTRY_CODES[countryCode];

  if (!postcode) return json({ error: "A postcode is required." }, 400);
  if (!postcoderCountry) return json({ error: "This country is not supported by the JobPilot address lookup." }, 400);

  const identifier = `jobpilot_${user.id}`;
  const params = new URLSearchParams({
    format: "json",
    identifier,
    lines: "3",
    include: "county,posttown,postcode"
  });

  if (countryCode === "GB") params.set("postcodeonly", "true");

  const endpoint = `https://ws.postcoder.com/pcw/${encodeURIComponent(postcoderApiKey)}/address/${postcoderCountry}/${encodeURIComponent(postcode)}?${params.toString()}`;

  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    const text = await response.text();
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { payload = null; }

    if (!response.ok) {
      console.error("Postcoder lookup failed", response.status, text.slice(0, 500));
      return json({ error: "Address lookup failed.", providerStatus: response.status }, 502);
    }

    const addresses = Array.isArray(payload) ? payload : [];
    const results = addresses.map((address: Record<string, unknown>, index: number) => ({
      id: String(address.udprn || address.uprn || `${index}-${address.summaryline || "address"}`),
      address_line1: String(address.addressline1 || ""),
      address_line2: String(address.addressline2 || ""),
      address_line3: String(address.addressline3 || ""),
      city: String(address.posttown || address.city || ""),
      region: String(address.county || address.state || ""),
      postcode: String(address.postcode || postcode),
      country_code: countryCode,
      display_address: String(address.summaryline || "")
    })).filter((address) => address.address_line1 || address.address_line2 || address.display_address);

    return json({ results });
  } catch (error) {
    console.error("Postcoder lookup request failed", error);
    return json({ error: "Address lookup is temporarily unavailable." }, 502);
  }
});
