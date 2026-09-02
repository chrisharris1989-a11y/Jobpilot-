import { supabase } from "./supabase.js";

let currentRole = null;

async function getManagementRole() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("company_members").select("role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (error) { console.error("JobPilot management role:", error); return null; }
  const role = String(data?.role || "").toLowerCase();
  return ["owner", "admin"].includes(role) ? role : null;
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

function openSettings() {
  const settingsButton = document.querySelector('.nav-item[data-page="settings"]');
  if (settingsButton) settingsButton.click();
}

function renderUsersTeam() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setManagementHeader("Users & Team", "Manage your company users, roles and access.");
  setManagementActive();
  content.innerHTML = `
    <div class="page-actions"><div><h2>Users & Team</h2><p>Manage the people who have access to this JobPilot company.</p></div><button id="jobpilot-invite-user" class="primary-button" type="button">+ Invite user</button></div>
    <div class="panel"><div class="panel-header"><div><h2>Company users</h2><p>Owners and admins can manage roles and access.</p></div><span id="jobpilot-team-count" class="muted"></span></div><div id="jobpilot-team-list"></div></div>
    <button id="jobpilot-management-back" class="secondary-button" type="button" style="margin-top:16px">← Back to Management</button>`;
  document.getElementById("jobpilot-team-list")?.addEventListener("click", handleTeamAction);
  document.getElementById("jobpilot-invite-user")?.addEventListener("click", () => alert("User invitations are the next part of team management."));
  document.getElementById("jobpilot-management-back")?.addEventListener("click", renderManagementPage);
  loadTeam();
}

function renderManagementPage() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setManagementHeader("Management", "Manage your JobPilot company.");
  setManagementActive();
  content.innerHTML = `
    <div class="page-actions"><div><h2>Management</h2><p>Company and team management.</p></div></div>
    <div class="content-grid">
      <button class="panel jobpilot-management-card" type="button" data-management-section="users" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb);"><div class="panel-header"><div><h2>👥 Users & Team</h2><p>Manage company users, roles and access.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0;">Add users, change roles, suspend or remove access.</p></button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="company" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb);"><div class="panel-header"><div><h2>🏢 Company</h2><p>Manage company-level settings.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0;">Open your company details and settings.</p></button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="billing" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb);"><div class="panel-header"><div><h2>💳 Billing</h2><p>Manage your JobPilot plan and billing.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0;">Open subscription and billing settings.</p></button>
    </div>`;
  content.querySelectorAll("[data-management-section]").forEach(card => {
    card.addEventListener("click", () => {
      const section = card.dataset.managementSection;
      if (section === "users") renderUsersTeam();
      if (section === "company" || section === "billing") openSettings();
    });
  });
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
