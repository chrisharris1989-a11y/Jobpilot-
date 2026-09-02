import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
});
const clean = (v: unknown) => String(v ?? "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const action = clean(body.action || "list").toLowerCase();
  const { data: membership, error: membershipError } = await admin.from("company_members").select("company_id, role, status").eq("user_id", caller.id).eq("status", "active").limit(1).maybeSingle();
  if (membershipError || !membership || !["owner", "admin"].includes(clean(membership.role).toLowerCase())) return json({ error: "You do not have permission to manage company users." }, 403);
  const companyId = membership.company_id;
  const { data: company, error: companyError } = await admin.from("companies").select("id, name, plan, max_users, owner_id").eq("id", companyId).maybeSingle();
  if (companyError || !company) return json({ error: "Company could not be found." }, 404);

  if (action === "list") {
    const { data: members, error } = await admin.from("company_members").select("id, user_id, role, status, joined_at, created_at").eq("company_id", companyId).order("created_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    const users = [];
    for (const member of members || []) {
      const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
      const meta = authUser?.user?.user_metadata || {};
      users.push({ membership_id: member.id, user_id: member.user_id, email: authUser?.user?.email || "", name: clean(meta.name || meta.full_name), phone: clean(meta.phone), role: member.role === "member" ? "user" : member.role, status: member.status, joined_at: member.joined_at || member.created_at, is_owner: String(company.owner_id) === String(member.user_id) });
    }
    return json({ company: { id: company.id, name: company.name, plan: company.plan, max_users: company.max_users }, users });
  }

  if (action === "invite") {
    const email = clean(body.email).toLowerCase(), name = clean(body.name), phone = clean(body.phone), role = clean(body.role).toLowerCase();
    if (!email || !email.includes("@")) return json({ error: "A valid email address is required." }, 400);
    if (!name) return json({ error: "Name is required." }, 400);
    if (!["user", "admin"].includes(role)) return json({ error: "Role must be User or Admin." }, 400);
    const dbRole = role === "user" ? "member" : role;
    const { count: activeCount, error: countError } = await admin.from("company_members").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active");
    if (countError) return json({ error: countError.message }, 500);
    const maxUsers = Number(company.max_users || 1);
    if (Number(activeCount || 0) >= maxUsers) return json({ error: `Your ${company.plan || "current"} plan allows ${maxUsers} active user${maxUsers === 1 ? "" : "s"}. Upgrade your plan to add another user.` }, 409);

    const { data: allUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return json({ error: listError.message }, 500);
    let target = (allUsers.users || []).find(u => clean(u.email).toLowerCase() === email) || null;
    if (!target) {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { name, phone }, redirectTo: req.headers.get("origin") || "https://jobpilot-eosin.vercel.app/" });
      if (inviteError) return json({ error: inviteError.message || "Unable to send invitation." }, 400);
      target = invited.user;
    } else {
      const { data: existingMembership } = await admin.from("company_members").select("id, company_id, role, status").eq("user_id", target.id).eq("company_id", companyId).maybeSingle();
      if (existingMembership) {
        if (existingMembership.status === "active") return json({ error: "That user is already a member of this company." }, 409);
        const { error: reactivateError } = await admin.from("company_members").update({ role: dbRole, status: "active", joined_at: new Date().toISOString() }).eq("id", existingMembership.id);
        if (reactivateError) return json({ error: reactivateError.message }, 500);
        await admin.auth.admin.updateUserById(target.id, { user_metadata: { ...(target.user_metadata || {}), name, phone } });
        return json({ success: true, invited: false, reactivated: true });
      }
      const { data: otherMembership } = await admin.from("company_members").select("company_id, status").eq("user_id", target.id).eq("status", "active").limit(1).maybeSingle();
      if (otherMembership) return json({ error: "That email already belongs to another active company." }, 409);
      await admin.auth.admin.updateUserById(target.id, { user_metadata: { ...(target.user_metadata || {}), name, phone } });
    }
    const { error: memberError } = await admin.from("company_members").insert({ company_id: companyId, user_id: target.id, role: dbRole, status: "active", joined_at: new Date().toISOString() });
    if (memberError) return json({ error: memberError.message }, 500);
    return json({ success: true, invited: true, user_id: target.id });
  }

  if (action === "update") {
    const membershipId = clean(body.user_id), role = clean(body.role).toLowerCase();
    if (!membershipId) return json({ error: "User ID is required." }, 400);
    if (!["user", "admin"].includes(role)) return json({ error: "Role must be User or Admin." }, 400);
    const dbRole = role === "user" ? "member" : role;
    const { data: targetMember, error: targetError } = await admin.from("company_members").select("id, user_id, role").eq("id", membershipId).eq("company_id", companyId).maybeSingle();
    if (targetError || !targetMember) return json({ error: "Company member not found." }, 404);
    if (String(targetMember.user_id) === String(company.owner_id)) return json({ error: "The company owner cannot have their role changed." }, 403);
    const { error } = await admin.from("company_members").update({ role: dbRole }).eq("id", targetMember.id);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  if (action === "remove") {
    const membershipId = clean(body.user_id);
    if (!membershipId) return json({ error: "User ID is required." }, 400);
    const { data: targetMember } = await admin.from("company_members").select("id, user_id").eq("id", membershipId).eq("company_id", companyId).maybeSingle();
    if (!targetMember) return json({ error: "Company member not found." }, 404);
    if (String(targetMember.user_id) === String(company.owner_id)) return json({ error: "The company owner cannot be removed." }, 403);
    const { error } = await admin.from("company_members").update({ status: "inactive" }).eq("id", targetMember.id);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }
  return json({ error: "Unknown action." }, 400);
});
