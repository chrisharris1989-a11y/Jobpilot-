import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const REDIRECT_URI = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/quickbooks-oauth-callback";
const APP_REDIRECT = "https://jobpilot-eosin.vercel.app/?quickbooks=connected";
const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const ACCOUNTING_SCOPE = "com.intuit.quickbooks.accounting";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

function base64(value: string) {
  return btoa(value);
}

async function getSessionUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

async function exchangeToken(params: URLSearchParams, clientId: string, clientSecret: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${base64(`${clientId}:${clientSecret}`)}`,
    },
    body: params,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error_description || result.error || "QuickBooks token request failed.");
  }
  return result;
}

async function getCompanyName(realmId: string, accessToken: string) {
  const response = await fetch(
    `https://sandbox-quickbooks.api.intuit.com/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(realmId)}?minorversion=75`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) return null;
  const result = await response.json().catch(() => ({}));
  return result?.CompanyInfo?.CompanyName || null;
}

async function handleCallback(req: Request, admin: ReturnType<typeof createClient>, clientId: string, clientSecret: string) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) return redirect(`${APP_REDIRECT}&error=${encodeURIComponent(error)}`);

  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const state = url.searchParams.get("state");
  if (!code || !realmId || !state) return redirect(`${APP_REDIRECT}&error=${encodeURIComponent("Incomplete QuickBooks authorization response")}`);

  const { data: oauthState } = await admin
    .from("quickbooks_oauth_states")
    .select("user_id,created_at")
    .eq("state", state)
    .maybeSingle();

  if (!oauthState) return redirect(`${APP_REDIRECT}&error=${encodeURIComponent("Invalid or expired QuickBooks authorization state")}`);
  if (Date.now() - new Date(oauthState.created_at).getTime() > 10 * 60 * 1000) {
    await admin.from("quickbooks_oauth_states").delete().eq("state", state);
    return redirect(`${APP_REDIRECT}&error=${encodeURIComponent("QuickBooks authorization expired. Please try again.")}`);
  }

  await admin.from("quickbooks_oauth_states").delete().eq("state", state);

  try {
    const token = await exchangeToken(
      new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
      clientId,
      clientSecret,
    );
    const companyName = await getCompanyName(realmId, token.access_token);
    await admin.from("quickbooks_connections").upsert({
      user_id: oauthState.user_id,
      realm_id: realmId,
      company_name: companyName,
      environment: "sandbox",
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      access_token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
      refresh_token_expires_at: token.x_refresh_token_expires_in
        ? new Date(Date.now() + Number(token.x_refresh_token_expires_in) * 1000).toISOString()
        : null,
      scopes: [ACCOUNTING_SCOPE],
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return redirect(APP_REDIRECT);
  } catch (err) {
    console.error("QuickBooks OAuth callback failed:", err);
    return redirect(`${APP_REDIRECT}&error=${encodeURIComponent(err instanceof Error ? err.message : "QuickBooks connection failed")}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID");
  const clientSecret = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !clientId || !clientSecret) return json({ error: "QuickBooks integration is not configured." }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.has("code") || url.searchParams.has("error")) {
      return handleCallback(req, admin, clientId, clientSecret);
    }
    return json({ ok: true, service: "quickbooks-oauth-callback" });
  }

  try {
    const user = await getSessionUser(req, supabaseUrl, anonKey);
    if (!user) return json({ error: "Authentication required." }, 401);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "connect";

    if (action === "status") {
      const { data } = await admin
        .from("quickbooks_connections")
        .select("realm_id,company_name,environment,scopes,connected_at,updated_at,access_token_expires_at,refresh_token_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return json({ connected: !!data, connection: data || null });
    }

    if (action === "disconnect") {
      await admin.from("quickbooks_connections").delete().eq("user_id", user.id);
      await admin.from("quickbooks_oauth_states").delete().eq("user_id", user.id);
      return json({ ok: true, connected: false });
    }

    if (action === "connect") {
      const state = crypto.randomUUID();
      await admin.from("quickbooks_oauth_states").insert({ state, user_id: user.id });
      const authUrl = new URL(AUTHORIZE_URL);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", ACCOUNTING_SCOPE);
      authUrl.searchParams.set("state", state);
      return json({ url: authUrl.toString(), scopes: [ACCOUNTING_SCOPE], environment: "sandbox" });
    }

    if (action === "refresh") {
      const { data: connection } = await admin
        .from("quickbooks_connections")
        .select("refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!connection?.refresh_token) return json({ error: "QuickBooks is not connected." }, 400);
      const token = await exchangeToken(
        new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refresh_token }),
        clientId,
        clientSecret,
      );
      await admin.from("quickbooks_connections").update({
        access_token: token.access_token,
        refresh_token: token.refresh_token || connection.refresh_token,
        access_token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
        refresh_token_expires_at: token.x_refresh_token_expires_in
          ? new Date(Date.now() + Number(token.x_refresh_token_expires_in) * 1000).toISOString()
          : undefined,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      return json({ ok: true });
    }

    return json({ error: "Unsupported action." }, 400);
  } catch (err) {
    console.error("QuickBooks OAuth request failed:", err);
    return json({ error: err instanceof Error ? err.message : "QuickBooks request failed." }, 500);
  }
});
