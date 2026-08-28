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
        <p>All accounts registered with JobPilot.</p>
      </div>
    </div>
    <div id="adminUsersList">
      <div class="panel"><p>Loading users...</p></div>
    </div>
  `;

  const container = document.getElementById("adminUsersList");
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

  container.innerHTML = users.map(user => `
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <h3>${escapeHtml(user.name || user.email || "Unnamed user")}</h3>
          <p>${escapeHtml(user.email)}</p>
          ${user.business_name ? `<p><strong>Business:</strong> ${escapeHtml(user.business_name)}</p>` : ""}
          ${user.phone ? `<p><strong>Phone:</strong> ${escapeHtml(user.phone)}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <strong>${user.email_confirmed ? "Active" : "Email not confirmed"}</strong>
          <div class="muted">Created ${formatDate(user.created_at)}</div>
          <div class="muted">Last sign-in ${formatDate(user.last_sign_in_at)}</div>
        </div>
      </div>
      <hr>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">
        <div><strong>${Number(user.customer_count || 0)}</strong><div class="muted">Customers</div></div>
        <div><strong>${Number(user.job_count || 0)}</strong><div class="muted">Jobs</div></div>
        <div><strong>${Number(user.quote_count || 0)}</strong><div class="muted">Quotes</div></div>
        <div><strong>${Number(user.invoice_count || 0)}</strong><div class="muted">Invoices</div></div>
      </div>
    </div>
  `).join("");
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
