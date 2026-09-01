import { supabase } from "./supabase.js";

const PLAN_OPTIONS = [
  { id: "solo", label: "Solo", description: "For one person" },
  { id: "team", label: "Team", description: "Up to 10 users" },
  { id: "business", label: "Business", description: "Up to 25 users" },
  { id: "pro", label: "Pro", description: "Up to 50 users" }
];

let company = null;
let membership = null;

function publishContext() {
  window.JobPilotCompany = { company, membership };
  window.dispatchEvent(new CustomEvent("jobpilot:company-ready", { detail: { company, membership } }));
}

export function getCompanyContext() { return { company, membership }; }

async function acceptInviteFromUrl() {
  const token = new URLSearchParams(window.location.search).get("invite");
  if (!token) return null;

  const { data, error } = await supabase.rpc("accept_company_invitation", { requested_token: token });
  if (error) {
    console.error("Company invitation:", error);
    return { error };
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  return { data };
}

export async function ensureCompanyContext() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user || null;

  if (!user) {
    company = null; membership = null; publishContext();
    return { user: null, company: null, membership: null };
  }

  const inviteResult = await acceptInviteFromUrl();
  if (inviteResult?.error) {
    showInviteMessage(inviteResult.error.message || "This invitation could not be accepted.", true);
  }

  const { data: member, error: memberError } = await supabase
    .from("company_members")
    .select("company_id, role, status, joined_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) return showCompanyOnboarding(user);

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("id, name, plan, max_users, owner_id, created_at, updated_at")
    .eq("id", member.company_id)
    .maybeSingle();

  if (companyError) throw companyError;
  if (!companyData) throw new Error("Your JobPilot company could not be found.");

  company = companyData;
  membership = member;
  publishContext();
  return { user, company, membership };
}

function showInviteMessage(message, isError) {
  const existing = document.getElementById("jobpilot-invite-message");
  if (existing) existing.remove();
  const box = document.createElement("div");
  box.id = "jobpilot-invite-message";
  box.style.cssText = `position:fixed;top:20px;right:20px;z-index:100000;max-width:420px;padding:14px 16px;border-radius:10px;background:${isError ? "#fef2f2" : "#f0fdf4"};border:1px solid ${isError ? "#fecaca" : "#bbf7d0"};color:${isError ? "#991b1b" : "#166534"};box-shadow:0 10px 30px rgba(15,23,42,.12);font:14px/1.4 inherit;`;
  box.textContent = message;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 7000);
}

async function showCompanyOnboarding(user) {
  const existing = document.getElementById("jobpilot-company-onboarding");
  if (existing) return { user, company: null, membership: null, needsOnboarding: true };

  const root = document.createElement("div");
  root.id = "jobpilot-company-onboarding";
  root.innerHTML = `
    <div style="position:fixed;inset:0;z-index:99999;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit;overflow:auto;">
      <div style="width:100%;max-width:680px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:32px;box-shadow:0 20px 50px rgba(15,23,42,.12);">
        <div style="margin-bottom:26px;"><div style="font-size:28px;font-weight:800;color:#111827;">Set up your JobPilot workspace</div><p style="margin:8px 0 0;color:#64748b;">Choose your starting plan and business name. You can manage your team later from Settings.</p></div>
        <label style="display:block;font-weight:600;margin-bottom:8px;color:#111827;">Business name</label>
        <input id="jobpilot-company-name" type="text" maxlength="120" placeholder="Your business name" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;margin-bottom:22px;font:inherit;">
        <div style="font-weight:600;margin-bottom:10px;color:#111827;">Choose a plan</div>
        <div id="jobpilot-plan-options" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          ${PLAN_OPTIONS.map((plan, index) => `<button type="button" data-plan="${plan.id}" style="text-align:left;padding:16px;border:2px solid ${index === 0 ? "#2563eb" : "#e2e8f0"};border-radius:12px;background:#fff;cursor:pointer;font:inherit;"><div style="font-weight:700;color:#111827;">${plan.label}</div><div style="font-size:13px;color:#64748b;margin-top:4px;">${plan.description}</div></button>`).join("")}
        </div>
        <div id="jobpilot-company-error" style="display:none;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;margin-top:18px;"></div>
        <button id="jobpilot-company-submit" type="button" style="width:100%;margin-top:20px;padding:13px 16px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">Continue to JobPilot</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  let selectedPlan = "solo";
  root.querySelectorAll("[data-plan]").forEach(button => button.addEventListener("click", () => {
    selectedPlan = button.dataset.plan;
    root.querySelectorAll("[data-plan]").forEach(option => option.style.borderColor = option.dataset.plan === selectedPlan ? "#2563eb" : "#e2e8f0");
  }));
  root.querySelector("#jobpilot-company-submit").addEventListener("click", async () => {
    const nameInput = root.querySelector("#jobpilot-company-name");
    const submit = root.querySelector("#jobpilot-company-submit");
    const errorBox = root.querySelector("#jobpilot-company-error");
    const name = nameInput.value.trim();
    if (!name) { errorBox.textContent = "Enter your business name to continue."; errorBox.style.display = "block"; return; }
    submit.disabled = true; submit.textContent = "Setting up your workspace..."; errorBox.style.display = "none";
    const { data: companyId, error } = await supabase.rpc("create_my_company", { requested_plan: selectedPlan, requested_name: name });
    if (error) { errorBox.textContent = error.message || "We couldn't set up your workspace. Please try again."; errorBox.style.display = "block"; submit.disabled = false; submit.textContent = "Continue to JobPilot"; return; }
    const { data: companyData, error: companyError } = await supabase.from("companies").select("id, name, plan, max_users, owner_id, created_at, updated_at").eq("id", companyId).single();
    const { data: memberData, error: membershipError } = await supabase.from("company_members").select("company_id, role, status, joined_at").eq("company_id", companyId).eq("user_id", user.id).eq("status", "active").single();
    if (companyError || membershipError) { errorBox.textContent = "Your workspace was created, but JobPilot could not load it. Please sign in again."; errorBox.style.display = "block"; submit.disabled = false; submit.textContent = "Continue to JobPilot"; return; }
    company = companyData; membership = memberData; publishContext(); root.remove(); window.location.reload();
  });
  return { user, company: null, membership: null, needsOnboarding: true };
}

window.JobPilotCompanyContext = { ensureCompanyContext, getCompanyContext };
