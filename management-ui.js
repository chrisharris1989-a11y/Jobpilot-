import { supabase } from "./supabase.js";

let currentRole = null;

async function getManagementRole() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("JobPilot management role:", error);
    return null;
  }

  const role = String(data?.role || "").toLowerCase();
  return ["owner", "admin"].includes(role) ? role : null;
}

function getManagementButton() {
  return document.getElementById("jobpilot-management-button");
}

function renderManagementPage() {
  const content = document.getElementById("pageContent");
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (!content) return;

  document.querySelectorAll(".nav-item").forEach(button => button.classList.remove("active"));
  getManagementButton()?.classList.add("active");

  if (title) title.textContent = "Management";
  if (subtitle) subtitle.textContent = "Manage your JobPilot company.";

  content.innerHTML = `
    <div class="page-actions">
      <div>
        <h2>Management</h2>
        <p>Company and team management.</p>
      </div>
    </div>

    <div class="content-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>👥 Users & Team</h2>
            <p>Manage your company users, roles and access.</p>
          </div>
        </div>
        <p class="muted" style="margin:16px 0 0;">Team management will appear here.</p>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>🏢 Company</h2>
            <p>Manage company-level settings.</p>
          </div>
        </div>
        <p class="muted" style="margin:16px 0 0;">Company management will appear here.</p>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>💳 Billing</h2>
            <p>Manage your JobPilot plan and billing.</p>
          </div>
        </div>
        <p class="muted" style="margin:16px 0 0;">Billing management will appear here.</p>
      </div>
    </div>
  `;
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
  if (connections) connections.insertAdjacentElement("afterend", button);
  else nav.appendChild(button);
}

function removeManagementButton() {
  getManagementButton()?.remove();
}

async function refreshManagementAccess() {
  currentRole = await getManagementRole();
  if (currentRole) addManagementButton();
  else removeManagementButton();
}

function start() {
  refreshManagementAccess();

  const observer = new MutationObserver(() => {
    if (currentRole) addManagementButton();
  });

  const app = document.getElementById("app");
  if (app) observer.observe(app, { childList: true, subtree: true });

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session) {
      currentRole = null;
      removeManagementButton();
      return;
    }
    await refreshManagementAccess();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
