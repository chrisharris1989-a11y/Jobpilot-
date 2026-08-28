import { supabase } from "./supabase.js";

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
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <input
        id="adminUserSearch"
        class="search-input"
        type="search"
        placeholder="Search by name, phone or email..."
        autocomplete="off"
      >
    </div>

    <div id="adminUsersList">
      <div class="panel"><p>Loading users...</p></div>
    </div>
  `;

  const container = document.getElementById("adminUsersList");
  const searchInput = document.getElementById("adminUserSearch");
  if (!container) return;

  const { data, error } = await supabase.functions.invoke("admin-users");

  if (error) {
    container.innerHTML = `
      <div class="panel">
        <h3>Could not load users</h3>
        <p>${escapeHtml(error.message || "Unable to load users.")}</p>
      </div>
    `;
    return;
  }

  const users = Array.isArray(data?.users) ? data.users : [];

  if (!users.length) {
    container.innerHTML = `
      <div class="panel">
        <h3>No users found</h3>
        <p>There are currently no registered JobPilot accounts.</p>
      </div>
    `;
    return;
  }

  const renderUsers = (term = "") => {
    const query = String(term || "").trim().toLowerCase();
    const filteredUsers = users.filter(user => {
      const searchable = [user.name, user.phone, user.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !query || searchable.includes(query);
    });

    if (!filteredUsers.length) {
      container.innerHTML = `
        <div class="panel">
          <h3>No matching users</h3>
          <p>Try a different name, phone number or email address.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredUsers.map((user, index) => `
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
        </div>
      </details>
    `).join("");
  };

  if (searchInput) {
    searchInput.addEventListener("input", event => {
      renderUsers(event.target.value);
    });
  }

  renderUsers();
}

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
