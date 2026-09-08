import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required.");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { customer_id, redirect_to } = await req.json();
    if (!customer_id) throw new Error("Customer is required.");

    const { data: membership, error: membershipError } = await admin
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new Error("You do not have permission to invite portal users.");

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id, company_id, email, name")
      .eq("id", customer_id)
      .eq("company_id", membership.company_id)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) throw new Error("Customer not found in your company.");
    if (!customer.email) throw new Error("This customer does not have an email address.");

    const { data: existingAccount } = await admin
      .from("customer_portal_accounts")
      .select("id, user_id, status")
      .eq("company_id", membership.company_id)
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (existingAccount) {
      const { error: updateError } = await admin.from("customer_portal_accounts").update({ status: "active", invited_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", existingAccount.id);
      if (updateError) throw updateError;
      return json({ ok: true, existing: true, message: "Portal access is already set up for this customer." });
    }

    const siteUrl = redirect_to || `${Deno.env.get("SITE_URL") || ""}/portal.html`;
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(customer.email, { redirectTo: siteUrl, data: { portal_user: true } });
    if (inviteError) throw inviteError;

    const { error: insertError } = await admin.from("customer_portal_accounts").insert({
      user_id: invited.user.id,
      customer_id: customer.id,
      company_id: membership.company_id,
      status: "active",
      invited_at: new Date().toISOString()
    });
    if (insertError) throw insertError;

    return json({ ok: true, existing: false, message: `Invitation sent to ${customer.email}.` });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Unable to send invitation." }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
