import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normaliseEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

async function pinHash(pin: string, accountId: string) {
  const input = `${pin}:${accountId}:${SERVICE_ROLE_KEY}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function validPin(pin: unknown) {
  return /^\d{4}$/.test(String(pin || ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    if (action === "set") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Authentication required." }, 401);

      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user } = {} } = await userClient.auth.getUser();
      if (!user) return json({ error: "Authentication required." }, 401);
      if (!validPin(body.pin)) return json({ error: "PIN must be exactly 4 digits." }, 400);

      const { data: account, error: accountError } = await admin
        .from("customer_portal_accounts")
        .select("id,pin_hash,pin_set_at,status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (accountError) throw accountError;
      if (!account) return json({ error: "Portal account not found." }, 404);
      if (account.pin_set_at || account.pin_hash) return json({ error: "A portal PIN has already been set." }, 409);

      const hash = await pinHash(String(body.pin), account.id);
      const { error: updateError } = await admin
        .from("customer_portal_accounts")
        .update({ pin_hash: hash, pin_set_at: new Date().toISOString() })
        .eq("id", account.id)
        .is("pin_hash", null);
      if (updateError) throw updateError;
      return json({ ok: true });
    }

    if (action === "login") {
      const email = normaliseEmail(body.email);
      const pin = String(body.pin || "");
      const redirectTo = String(body.redirect_to || "");
      if (!email || !validPin(pin)) return json({ error: "Invalid email or PIN." }, 400);

      const { data: userData, error: userError } = await admin.auth.admin.getUserByEmail(email);
      if (userError || !userData?.user) return json({ error: "Invalid email or PIN." }, 401);

      const { data: account, error: accountError } = await admin
        .from("customer_portal_accounts")
        .select("id,user_id,pin_hash,pin_set_at,status")
        .eq("user_id", userData.user.id)
        .eq("status", "active")
        .maybeSingle();
      if (accountError) throw accountError;
      if (!account?.pin_hash || !account.pin_set_at) return json({ error: "PIN login has not been set up yet. Please use the email sign-in link." }, 400);

      const { data: attempt } = await admin
        .from("customer_portal_pin_attempts")
        .select("failed_attempts,window_started_at,locked_until")
        .eq("account_id", account.id)
        .maybeSingle();
      const now = Date.now();
      if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now) {
        const minutes = Math.max(1, Math.ceil((new Date(attempt.locked_until).getTime() - now) / 60000));
        return json({ error: `Too many incorrect PIN attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` }, 429);
      }

      const suppliedHash = await pinHash(pin, account.id);
      if (suppliedHash !== account.pin_hash) {
        const windowStarted = attempt?.window_started_at && now - new Date(attempt.window_started_at).getTime() < 15 * 60 * 1000
          ? attempt.window_started_at
          : new Date().toISOString();
        const failed = (attempt?.window_started_at === windowStarted ? Number(attempt?.failed_attempts || 0) : 0) + 1;
        const lockedUntil = failed >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
        await admin.from("customer_portal_pin_attempts").upsert({
          account_id: account.id,
          failed_attempts: failed,
          window_started_at: windowStarted,
          locked_until: lockedUntil,
          updated_at: new Date().toISOString(),
        });
        return json({ error: lockedUntil ? "Too many incorrect PIN attempts. Try again in 15 minutes." : "Invalid email or PIN." }, 401);
      }

      await admin.from("customer_portal_pin_attempts").upsert({
        account_id: account.id,
        failed_attempts: 0,
        window_started_at: null,
        locked_until: null,
        updated_at: new Date().toISOString(),
      });

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: redirectTo || undefined },
      });
      if (linkError || !linkData?.properties?.action_link) throw linkError || new Error("Could not create the portal session.");
      return json({ ok: true, action_link: linkData.properties.action_link });
    }

    return json({ error: "Invalid action." }, 400);
  } catch (error) {
    console.error("customer-portal-pin", error);
    return json({ error: error instanceof Error ? error.message : "Unable to process portal PIN." }, 500);
  }
});
