import { supabase } from "../supabase.js";

const FUNCTION_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/management-users-v1";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function callUsersFunction(body) {
  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("You are not logged in.");
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let result = {};
  try { result = JSON.parse(text); } catch { result = { error: text || `Request failed (${response.status})` }; }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}

function addStyles() {
  if (document.getElementById("jobpilot-management-users-styles")) return;
  const style = document.createElement("style");
  style.id = "jobpilot-management-users-styles";
  style.textContent = `
    .management-users-wrap { display:flex; flex-direction:column; gap:18px; }
    .management-users-wrap .settings-section { background:var(--surface,#fff); border:1px solid var(--border,#e5e7eb); border-radius:var(--radius,12px); box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04)); padding:24px; }
    .management-users-head { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
    .management-users-head h2 { margin:0 0 6px; }
    .management-users-head p { margin:0; }
    .management-users-table { width:100%; border-collapse:collapse; }
    .management-users-table th,.management-users-table td { padding:13px 10px; border-bottom:1px solid var(--border,#e5e7eb); text-align:left; vertical-align:middle; }
    .management-users-table th { font-size:13px; color:var(--muted,#64748b); }
    .management-user-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .management-user-actions select { margin:0; min-width:105px; }
    .management-user-status { font-size:12px; border-radius:999px; padding:4px 8px; background:#f1f5f9; display:inline-block; }
    .management-user-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 18px; }
    .management-user-form label { display:block; margin-bottom:6px; font-weight:600; }
    .management-user-form input,.management-user-form select { width:100%; box-sizing:border-box; }
    .management-user-form .full { grid-column:1 / -1; }
    .management-user-form-actions { display:flex; justify-content:flex-end; gap:10px; grid-column:1 / -1; }
    #managementUsersMessage { margin:0; }
    @media(max-width:699px) { .management-user-form { grid-template-columns:1fr; } .management-user-form .full,.management-user-form-actions { grid-column:auto; } .management-users-table { min-width:680px; } .management-users-table-wrap { overflow-x:auto; } }
  `;
  document.head.appendChild(style);
}

function setManagementActive() {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.getElementById("jobpilot-management-button")?.classList.add("active");
}

async function renderUsers() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  addStyles();
  setManagementActive();
  document.getElementById("pageTitle").textContent = "Users & Team";
  document.getElementById("pageSubtitle").textContent = "Manage the people who have access to your company.";
  content.innerHTML = `<div class="panel"><p class="muted">Loading users…</p></div>`;

  try {
    const result = await callUsersFunction({ action: "list" });
    const users = result.users || [];
    const company = result.company || {};
    const activeCount = users.filter(u => u.status === "active").length;
    const maxUsers = Number(company.max_users || 1);
    const atLimit = activeCount >= maxUsers;

    content.innerHTML = `
      <div class="page-actions management-users-head">
        <div><h2>Users &amp; Team</h2><p>Manage company users, roles and access.</p></div>
        <div class="management-user-actions">
          <span class="muted">${activeCount} / ${maxUsers} active user${maxUsers === 1 ? "" : "s"}</span>
          <button id="managementUsersBack" class="button secondary" type="button">← Management</button>
          <button id="managementAddUser" class="button primary" type="button">+ Add User</button>
        </div>
      </div>
      <div class="management-users-wrap">
        <section class="settings-section">
          <h2>👥 ${escapeHtml(company.name || "Company")}</h2>
          <p class="muted">Plan: ${escapeHtml(company.plan || "current")} · Active users: ${activeCount} of ${maxUsers}</p>
          ${atLimit ? `<p class="muted">Your current plan has reached its user limit. Upgrade the plan in Management → Billing before adding another user.</p>` : ""}
          <div class="management-users-table-wrap">
            <table class="management-users-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${users.length ? users.map(user => `
                  <tr data-member-id="${escapeHtml(user.membership_id)}">
                    <td><strong>${escapeHtml(user.name || "Unnamed user")}</strong>${user.is_owner ? `<div class="muted" style="font-size:12px">Company owner</div>` : ""}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${escapeHtml(user.phone || "—")}</td>
                    <td>${user.is_owner ? "Owner" : `<select class="management-role-select" aria-label="Role for ${escapeHtml(user.email)}"><option value="user" ${String(user.role).toLowerCase() === "user" ? "selected" : ""}>User</option><option value="admin" ${String(user.role).toLowerCase() === "admin" ? "selected" : ""}>Admin</option></select>`}</td>
                    <td><span class="management-user-status">${escapeHtml(user.status)}</span></td>
                    <td>${user.is_owner ? "—" : `<button class="button secondary management-remove-user" type="button">Remove</button>`}</td>
                  </tr>`).join("") : `<tr><td colspan="6" class="muted">No company users found.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div id="managementUsersMessage" class="muted"></div>`;

    document.getElementById("managementUsersBack")?.addEventListener("click", () => window.renderManagementPage?.());
    document.getElementById("managementAddUser")?.addEventListener("click", () => showAddUserForm(company, atLimit));

    content.querySelectorAll(".management-role-select").forEach(select => {
      select.addEventListener("change", async event => {
        const row = event.target.closest("tr");
        const membershipId = row?.dataset.memberId;
        if (!membershipId) return;
        event.target.disabled = true;
        try {
          await callUsersFunction({ action: "update", user_id: membershipId, role: event.target.value });
          const message = document.getElementById("managementUsersMessage");
          if (message) message.textContent = "Role updated.";
        } catch (error) {
          alert(error.message || error);
          await renderUsers();
        } finally { event.target.disabled = false; }
      });
    });

    content.querySelectorAll(".management-remove-user").forEach(button => {
      button.addEventListener("click", async event => {
        const row = event.target.closest("tr");
        const membershipId = row?.dataset.memberId;
        if (!membershipId || !confirm("Remove this user from the company? Their JobPilot account will not be deleted.")) return;
        event.target.disabled = true;
        try {
          await callUsersFunction({ action: "remove", user_id: membershipId });
          await renderUsers();
        } catch (error) {
          alert(error.message || error);
          event.target.disabled = false;
        }
      });
    });
  } catch (error) {
    content.innerHTML = `<div class="panel"><h2>Users &amp; Team</h2><p class="muted">${escapeHtml(error.message || error)}</p><button id="managementUsersBack" class="button secondary" type="button" style="margin-top:16px">← Management</button></div>`;
    document.getElementById("managementUsersBack")?.addEventListener("click", () => window.renderManagementPage?.());
  }
}

function showAddUserForm(company, atLimit) {
  const content = document.getElementById("pageContent");
  if (!content) return;
  content.innerHTML = `
    <div class="page-actions management-users-head">
      <div><h2>Add User</h2><p>Invite someone to access this company.</p></div>
      <button id="managementUsersBack" class="button secondary" type="button">← Users &amp; Team</button>
    </div>
    <div class="management-users-wrap">
      <section class="settings-section">
        <form id="managementAddUserForm" class="management-user-form">
          <div><label for="managementUserName">Name</label><input id="managementUserName" type="text" required autocomplete="name"></div>
          <div><label for="managementUserEmail">Email</label><input id="managementUserEmail" type="email" required autocomplete="email"></div>
          <div><label for="managementUserPhone">Phone</label><input id="managementUserPhone" type="tel" autocomplete="tel"></div>
          <div><label for="managementUserRole">Role</label><select id="managementUserRole"><option value="user">User</option><option value="admin">Admin</option></select></div>
          ${atLimit ? `<p class="muted full">The current ${escapeHtml(company.plan || "plan")} plan allows ${Number(company.max_users || 1)} active user${Number(company.max_users || 1) === 1 ? "" : "s"}. Upgrade the plan before adding another user.</p>` : ""}
          <div class="management-user-form-actions"><span id="managementUsersMessage" class="muted"></span><button id="managementAddUserSubmit" class="button primary" type="submit" ${atLimit ? "disabled" : ""}>Send Invitation</button></div>
        </form>
      </section>
    </div>`;

  document.getElementById("managementUsersBack")?.addEventListener("click", renderUsers);
  document.getElementById("managementAddUserForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.getElementById("managementAddUserSubmit");
    const message = document.getElementById("managementUsersMessage");
    if (!button || !message) return;
    button.disabled = true;
    message.textContent = "Sending invitation…";
    try {
      const result = await callUsersFunction({
        action: "invite",
        name: document.getElementById("managementUserName")?.value.trim(),
        email: document.getElementById("managementUserEmail")?.value.trim(),
        phone: document.getElementById("managementUserPhone")?.value.trim(),
        role: document.getElementById("managementUserRole")?.value
      });
      message.textContent = result.reactivated ? "User access restored." : "Invitation sent. The user has been added to your company.";
      setTimeout(renderUsers, 900);
    } catch (error) {
      message.textContent = error.message || String(error);
      button.disabled = false;
    }
  });
}

window.renderManagementUsers = renderUsers;
