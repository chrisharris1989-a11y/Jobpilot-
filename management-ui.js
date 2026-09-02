import { supabase } from "./supabase.js";

let currentRole = null;

const PLANS = {
  solo: { label: "Solo", users: 1, price: 14.99 },
  team: { label: "Team", users: 10, price: 39.99 },
  business: { label: "Business", users: 25, price: 74.99 },
  pro: { label: "Pro", users: 50, price: 119.99 }
};

async function getManagementRole() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("company_members").select("role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (error) { console.error("JobPilot management role:", error); return null; }
  const role = String(data?.role || "").toLowerCase();
  return ["owner", "admin"].includes(role) ? role : null;
}

async function getCompany() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,plan,max_users,billing_status,test_mode,owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) { console.error("JobPilot company:", error); return null; }
  if (data) return data;
  const { data: member } = await supabase.from("company_members").select("company_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!member?.company_id) return null;
  const { data: company } = await supabase.from("companies").select("id,name,plan,max_users,billing_status,test_mode,owner_id").eq("id", member.company_id).maybeSingle();
  return company || null;
}

function getManagementButton() { return document.getElementById("jobpilot-management-button"); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }
function setManagementHeader(title, subtitle) {
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = subtitle;
}
function setManagementActive() {
  document.querySelectorAll(".nav-item").forEach(button => button.classList.remove("active"));
  getManagementButton()?.classList.add("active");
}
function backButton() {
  return `<button id="jobpilot-management-back" class="secondary-button" type="button" style="margin-top:16px">← Back to Management</button>`;
}

async function loadTeam() {
  const list = document.getElementById("jobpilot-team-list");
  const count = document.getElementById("jobpilot-team-count");
  if (!list) return;
  list.innerHTML = `<p class="muted">Loading team…</p>`;
  const { data, error } = await supabase.rpc("get_my_company_members");
  if (error) { list.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`; return; }
  const members = data || [];
  if (count) count.textContent = `${members.length} user${members.length === 1 ? "" : "s"}`;
  list.innerHTML = members.map(member => {
    const isOwner = member.role === "owner";
    const roleLabel = isOwner ? "Owner" : member.role === "admin" ? "Admin" : "Member";
    const nextRole = member.role === "admin" ? "member" : "admin";
    const nextRoleLabel = nextRole === "admin" ? "Make admin" : "Make member";
    const statusLabel = member.status === "suspended" ? "Suspended" : "Active";
    return `<div class="panel-row" style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid var(--border,#e5e7eb);">
      <div style="min-width:0"><strong>${escapeHtml(member.email || "User")}</strong><div class="muted" style="margin-top:4px">${roleLabel} · ${statusLabel}</div></div>
      ${isOwner ? "" : `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button class="secondary-button" data-member-action="role" data-member-id="${member.member_id}" data-next-role="${nextRole}">${nextRoleLabel}</button>
        <button class="secondary-button" data-member-action="status" data-member-id="${member.member_id}" data-next-status="${member.status === "suspended" ? "active" : "suspended"}">${member.status === "suspended" ? "Reactivate" : "Suspend"}</button>
        <button class="danger-button" data-member-action="remove" data-member-id="${member.member_id}">Remove</button>
      </div>`}
    </div>`;
  }).join("");
}

async function handleTeamAction(event) {
  const button = event.target.closest("[data-member-action]");
  if (!button) return;
  const action = button.dataset.memberAction;
  const memberId = button.dataset.memberId;
  if (action === "remove" && !confirm("Remove this user from the company?")) return;
  button.disabled = true;
  let result;
  if (action === "role") result = await supabase.rpc("update_company_member_role", { target_member_id: memberId, new_role: button.dataset.nextRole });
  if (action === "status") result = await supabase.rpc("update_company_member_status", { target_member_id: memberId, new_status: button.dataset.nextStatus });
  if (action === "remove") result = await supabase.rpc("remove_company_member", { target_member_id: memberId });
  if (result?.error) alert(result.error.message);
  await loadTeam();
}

async function renderUsersTeam() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setManagementHeader("Users & Team", "Manage your company users, roles and access.");
  setManagementActive();
  content.innerHTML = `
    <div class="page-actions"><div><h2>Users & Team</h2><p>Manage the people who have access to this JobPilot company.</p></div><button id="jobpilot-invite-user" class="primary-button" type="button">+ Invite user</button></div>
    <div class="panel"><div class="panel-header"><div><h2>Company users</h2><p>Owners and admins can manage roles and access.</p></div><span id="jobpilot-team-count" class="muted"></span></div><div id="jobpilot-team-list"></div></div>
    ${backButton()}`;
  document.getElementById("jobpilot-team-list")?.addEventListener("click", handleTeamAction);
  document.getElementById("jobpilot-invite-user")?.addEventListener("click", () => alert("User invitations are the next part of team management."));
  document.getElementById("jobpilot-management-back")?.addEventListener("click", renderManagementPage);
  loadTeam();
}

async function renderCompanyManagement() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setManagementHeader("Company", "Manage your company details.");
  setManagementActive();
  const company = await getCompany();
  if (!company) {
    content.innerHTML = `<div class="panel"><h2>Company</h2><p class="muted">We couldn't load your company details.</p></div>${backButton()}`;
    document.getElementById("jobpilot-management-back")?.addEventListener("click", renderManagementPage);
    return;
  }
  content.innerHTML = `
    <div class="page-actions"><div><h2>Company details</h2><p>These details belong to your JobPilot company.</p></div></div>
    <div class="panel">
      <div class="panel-header"><div><h2>Company information</h2><p>Update the name shown throughout your company account.</p></div></div>
      <form id="jobpilot-company-form" style="margin-top:16px;max-width:620px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;">Company name</label>
        <input id="jobpilot-company-name" type="text" value="${escapeHtml(company.name)}" required style="width:100%;box-sizing:border-box;">
        <button class="primary-button" type="submit" style="margin-top:12px;">Save company details</button>
        <div id="jobpilot-company-message" class="muted" style="margin-top:10px;"></div>
      </form>
    </div>
    ${backButton()}`;
  document.getElementById("jobpilot-company-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type=submit]");
    const message = document.getElementById("jobpilot-company-message");
    button.disabled = true;
    message.textContent = "Saving…";
    const { error } = await supabase.rpc("update_my_company_details", { requested_name: document.getElementById("jobpilot-company-name").value });
    button.disabled = false;
    if (error) { message.textContent = error.message; message.style.color = "#b91c1c"; return; }
    message.textContent = "Company details saved.";
    message.style.color = "#166534";
    window.JobPilotCompany = window.JobPilotCompany || {};
    if (window.JobPilotCompany.company) window.JobPilotCompany.company.name = document.getElementById("jobpilot-company-name").value.trim();
    window.dispatchEvent(new CustomEvent("jobpilot:company-ready"));
  });
  document.getElementById("jobpilot-management-back")?.addEventListener("click", renderManagementPage);
}

async function openManagementBilling(action, plan) {
  const message = document.getElementById("jobpilot-management-billing-message");
  if (message) { message.textContent = action === "portal" ? "Opening billing portal…" : "Opening Stripe checkout…"; message.style.color = "#64748b"; }
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error("You are not logged in.");
    const response = await fetch("https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-billing-v1", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, plan, origin: window.location.origin })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not open Stripe billing.");
    if (!result.url) throw new Error("Stripe did not return a billing URL.");
    window.location.assign(result.url);
  } catch (error) {
    console.error("JobPilot management billing:", error);
    if (message) { message.textContent = error.message || String(error); message.style.color = "#b91c1c"; }
  }
}

async function renderBillingManagement() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setManagementHeader("Billing", "Manage your JobPilot subscription.");
  setManagementActive();
  const company = await getCompany();
  if (!company) {
    content.innerHTML = `<div class="panel"><h2>Billing</h2><p class="muted">We couldn't load your company billing details.</p></div>${backButton()}`;
    document.getElementById("jobpilot-management-back")?.addEventListener("click", renderManagementPage);
    return;
  }
  const current = PLANS[String(company.plan || "solo").toLowerCase()] || PLANS.solo;
  const isTest = company.test_mode === true;
  const nextPlans = { solo: ["team", "business", "pro"], team: ["business", "pro"], business: ["pro"], pro: [] }[String(company.plan || "solo").toLowerCase()] || [];
  content.innerHTML = `
    <div class="page-actions"><div><h2>Billing</h2><p>Manage your JobPilot plan without leaving Management.</p></div></div>
    <div class="panel">
      <div class="panel-header"><div><h2>Current plan</h2><p>${current.label} · Up to ${current.users} users</p></div>${isTest ? `<span style="font-size:12px;font-weight:700;padding:5px 9px;border-radius:999px;background:#dcfce7;color:#166534;">TEST MODE</span>` : ""}</div>
      <div style="font-size:28px;font-weight:700;margin-top:12px;">£${current.price.toFixed(2)}<span style="font-size:14px;font-weight:400;color:#64748b;"> / month</span></div>
      <div id="jobpilot-management-billing-message" class="muted" style="margin-top:10px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
        ${isTest ? `<span class="muted">Billing is simulated for this development account.</span>` : `<button id="jobpilot-management-billing-portal" class="secondary-button" type="button">Manage billing</button>`}
      </div>
    </div>
    ${nextPlans.length ? `<div class="panel" style="margin-top:16px;"><div class="panel-header"><div><h2>Change plan</h2><p>Choose a higher plan when your company needs more users.</p></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">${nextPlans.map(name => `<button class="secondary-button" type="button" data-management-plan="${name}">${PLANS[name].label} · £${PLANS[name].price.toFixed(2)}/month · ${PLANS[name].users} users</button>`).join("")}</div></div>` : ""}
    ${backButton()}`;
  document.getElementById("jobpilot-management-billing-portal")?.addEventListener("click", () => openManagementBilling("portal"));
  content.querySelectorAll("[data-management-plan]").forEach(button => button.addEventListener("click", () => {
    const plan = button.dataset.managementPlan;
    if (isTest) {
      if (!confirm(`Switch this development account to ${PLANS[plan].label}?`)) return;
      switchTestPlan(plan);
    } else {
      openManagementBilling("checkout", plan);
    }
  }));
  document.getElementById("jobpilot-management-back")?.addEventListener("click", renderManagementPage);
}

async function switchTestPlan(plan) {
  const message = document.getElementById("jobpilot-management-billing-message");
  if (message) message.textContent = "Updating test plan…";
  const { data: company } = await getCompanyWithId();
  if (!company) return;
  const { error } = await supabase.from("companies").update({ plan, max_users: PLANS[plan].users, billing_status: "active", test_mode: true }).eq("id", company.id);
  if (error) { if (message) { message.textContent = error.message; message.style.color = "#b91c1c"; } return; }
  if (message) { message.textContent = `Test plan changed to ${PLANS[plan].label}.`; message.style.color = "#166534"; }
  setTimeout(renderBillingManagement, 350);
}

async function getCompanyWithId() { return { data: await getCompany() }; }

function renderManagementPage() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setManagementHeader("Management", "Manage your JobPilot company.");
  setManagementActive();
  content.innerHTML = `
    <div class="page-actions"><div><h2>Management</h2><p>Company and team management.</p></div></div>
    <div class="content-grid">
      <button class="panel jobpilot-management-card" type="button" data-management-section="users" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb);"><div class="panel-header"><div><h2>👥 Users & Team</h2><p>Manage company users, roles and access.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0;">Add users, change roles, suspend or remove access.</p></button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="company" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb);"><div class="panel-header"><div><h2>🏢 Company</h2><p>Manage company details directly from Management.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0;">Edit your company information.</p></button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="billing" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb);"><div class="panel-header"><div><h2>💳 Billing</h2><p>Manage your JobPilot plan and billing.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0;">View your plan, change plan or manage billing.</p></button>
    </div>`;
  content.querySelectorAll("[data-management-section]").forEach(card => card.addEventListener("click", () => {
    const section = card.dataset.managementSection;
    if (section === "users") renderUsersTeam();
    if (section === "company") renderCompanyManagement();
    if (section === "billing") renderBillingManagement();
  }));
}

function addManagementButton() {
  if (!currentRole) return;
  const nav = document.querySelector(".sidebar nav");
  if (!nav || getManagementButton()) return;
  const button = document.createElement("button");
  button.className = "nav-item";
  button.id = "jobpilot-management-button";
  button.type = "button";
  button.dataset.page = "management";
  button.textContent = "⚙️ Management";
  button.addEventListener("click", renderManagementPage);
  const connections = nav.querySelector('[data-page="connections"]');
  if (connections) connections.insertAdjacentElement("afterend", button); else nav.appendChild(button);
}
function removeManagementButton() { getManagementButton()?.remove(); }
async function refreshManagementAccess() { currentRole = await getManagementRole(); if (currentRole) addManagementButton(); else removeManagementButton(); }
function start() {
  refreshManagementAccess();
  const observer = new MutationObserver(() => { if (currentRole) addManagementButton(); });
  const app = document.getElementById("app");
  if (app) observer.observe(app, { childList: true, subtree: true });
  supabase.auth.onAuthStateChange(async (_event, session) => { if (!session) { currentRole = null; removeManagementButton(); return; } await refreshManagementAccess(); });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();