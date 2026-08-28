import { supabase } from "./supabase.js";
import { setupAdminPushNotifications } from "./push-notifications.js";

const JOBPILOT_ADMIN_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";

export async function showAdminUsers() {
  const { data: { user } = {} } = await supabase.auth.getUser();

  if (!user || String(user.id) !== JOBPILOT_ADMIN_ID) {
    alert("You do not have permission to view users.");
    return;
  }

  const pageContent = document.getElementById("pageContent");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (!pageContent) return;

  if (pageTitle) pageTitle.textContent = "Users";
  if (pageSubtitle) pageSubtitle.textContent = "Manage and view JobPilot accounts.";

  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <h2>👥 Users</h2>
        <p>Search users by name, phone number or email.</p>
        <div id="adminPushControls"></div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <input id="adminUserSearch" class="search-input" type="search" placeholder="Search by name, phone or email..." autocomplete="off">
    </div>

    <div id="adminUsersList"><div class="panel"><p>Loading users...</p></div></div>
  `;

  await setupAdminPushNotifications(document.getElementById("adminPushControls"));

  const container = document.getElementById("adminUsersList");
  const searchInput = document.getElementById("adminUserSearch");
  if (!container) return;

  const loadUsers = async () => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
    if (error) {
      container.innerHTML = `<div class="panel"><h3>Could not load users</h3><p>${escapeHtml(error.message || "Unable to load users.")}</p></div>`;
      return [];
    }
    return Array.isArray(data?.users) ? data.users : [];
  };

  const users = await loadUsers();

  if (!users.length) {
    container.innerHTML = `<div class="panel"><h3>No users found</h3><p>There are currently no registered JobPilot accounts.</p></div>`;
    return;
  }

  const renderUsers = (term = "") => {
    const query = String(term || "").trim().toLowerCase();
    const filteredUsers = users.filter(user => [user.name, user.phone, user.email].filter(Boolean).join(" ").toLowerCase().includes(query));

    if (!filteredUsers.length) {
      container.innerHTML = `<div class="panel"><h3>No matching users</h3><p>Try a different name, phone number or email address.</p></div>`;
      return;
    }

    container.innerHTML = filteredUsers.map(user => `
      <details class="panel" style="margin-bottom:12px;">
        <summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div>
            <h3 style="margin:0 0 4px;">${escapeHtml(user.name || "Unnamed user")}</h3>
            <p style="margin:0;">${escapeHtml(user.phone || "No phone number")}</p>
          </div>
          <span class="muted">View details ▾</span>
        </summary>

        <div style="margin-top:16px;">
          <hr>
          <p><strong>Email:</strong> ${escapeHtml(user.email || "Not available")}</p>
          ${user.business_name ? `<p><strong>Business:</strong> ${escapeHtml(user.business_name)}</p>` : ""}
          <p><strong>Phone:</strong> ${escapeHtml(user.phone || "Not available")}</p>
          <p><strong>Status:</strong> ${user.email_confirmed ? "Active" : "Email not confirmed"}</p>
          <p><strong>Created:</strong> ${formatDate(user.created_at)}</p>
          <p><strong>Last sign-in:</strong> ${formatDate(user.last_sign_in_at)}</p>

          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px;">
            <div><strong>${Number(user.customer_count || 0)}</strong><div class="muted">Customers</div></div>
            <div><strong>${Number(user.job_count || 0)}</strong><div class="muted">Jobs</div></div>
            <div><strong>${Number(user.quote_count || 0)}</strong><div class="muted">Quotes</div></div>
            <div><strong>${Number(user.invoice_count || 0)}</strong><div class="muted">Invoices</div></div>
          </div>

          <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
            <button type="button" class="secondary-btn" data-edit-user="${escapeHtml(user.id)}">Edit user</button>
            ${user.id !== JOBPILOT_ADMIN_ID ? `<button type="button" class="danger-btn" data-delete-user="${escapeHtml(user.id)}" data-delete-user-name="${escapeHtml(user.name || user.email || "this user")}">Delete user</button>` : ""}
          </div>
        </div>
      </details>
    `).join("");

    container.querySelectorAll("[data-edit-user]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const user = users.find(u => u.id === button.getAttribute("data-edit-user"));
        if (user) showEditForm(user);
      });
    });

    container.querySelectorAll("[data-delete-user]").forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        const userId = button.getAttribute("data-delete-user");
        const userName = button.getAttribute("data-delete-user-name") || "this user";
        if (!userId || userId === JOBPILOT_ADMIN_ID) return;
        if (!window.confirm(`Delete ${userName}?\n\nThis permanently removes their JobPilot account. This cannot be undone.`)) return;
        button.disabled = true;
        button.textContent = "Deleting...";
        const { error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", user_id: userId } });
        if (error) {
          alert(`Could not delete user: ${error.message || "Unknown error"}`);
          button.disabled = false;
          button.textContent = "Delete user";
          return;
        }
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) users.splice(index, 1);
        renderUsers(searchInput?.value || "");
      });
    });
  };

  const showEditForm = (user) => {
    const existing = container.querySelector(`[data-user-form="${CSS.escape(user.id)}"]`);
    if (existing) return;
    const details = [...container.querySelectorAll("details")].find(el => el.querySelector(`[data-edit-user="${CSS.escape(user.id)}"]`));
    if (!details) return;
    const form = document.createElement("div");
    form.setAttribute("data-user-form", user.id);
    form.style.cssText = "margin-top:16px;padding:16px;border-top:1px solid var(--border-color,#ddd);";
    form.innerHTML = `<h4 style="margin:0 0 12px;">Edit user account</h4><div style="display:grid;gap:10px;"><label>Name<input data-field="name" value="${escapeHtml(user.name)}"></label><label>Phone number<input data-field="phone" type="tel" value="${escapeHtml(user.phone)}"></label><label>Email<input data-field="email" type="email" value="${escapeHtml(user.email)}"></label><label>Business name<input data-field="business_name" value="${escapeHtml(user.business_name)}"></label></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;"><button type="button" class="secondary-btn" data-cancel-edit>Cancel</button><button type="button" class="primary-btn" data-save-edit>Save changes</button></div>`;
    details.appendChild(form);
    form.querySelector("[data-cancel-edit]").addEventListener("click", () => form.remove());
    form.querySelector("[data-save-edit]").addEventListener("click", async () => {
      const get = field => form.querySelector(`[data-field="${field}"]`).value.trim();
      const payload = { action: "update", user_id: user.id, name: get("name"), phone: get("phone"), email: get("email"), business_name: get("business_name") };
      const save = form.querySelector("[data-save-edit]");
      save.disabled = true;
      save.textContent = "Saving...";
      const { data, error } = await supabase.functions.invoke("admin-users", { body: payload });
      if (error) {
        alert(`Could not update user: ${error.message || "Unknown error"}`);
        save.disabled = false;
        save.textContent = "Save changes";
        return;
      }
      Object.assign(user, data.user || payload);
      renderUsers(searchInput?.value || "");
    });
  };

  if (searchInput) searchInput.addEventListener("input", event => renderUsers(event.target.value));
  renderUsers();
}

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
