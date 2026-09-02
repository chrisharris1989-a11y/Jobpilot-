import { supabase } from "./supabase.js";

const MANAGEMENT_ROLES = ["owner", "admin"];

function getManagementButton() {
  return document.getElementById("jobpilot-management-button");
}

function setManagementActive() {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  getManagementButton()?.classList.add("active");
}

function renderManagementPage() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Management";
  if (subtitle) subtitle.textContent = "Manage your JobPilot company.";
  setManagementActive();

  content.innerHTML = `
    <div class="page-actions">
      <div>
        <h2>Management</h2>
        <p>Company and team management.</p>
      </div>
    </div>
    <div class="content-grid">
      <button class="panel jobpilot-management-card" type="button" data-management-section="users" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>👥 Users &amp; Team</h2><p>Manage company users, roles and access.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">Manage the people who have access to your company.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="company" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>🏢 Company</h2><p>Manage your company details.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">Edit the company information used throughout JobPilot.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="accounting" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>📊 Accounting</h2><p>Manage your accounting and payment connections.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">Connect the accounting and payment services you use.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="billing" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>💳 Billing</h2><p>Manage your JobPilot subscription.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">View your current plan and billing options.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="import" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>↕️ Import &amp; Export</h2><p>Move your business data in and out of JobPilot.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">Import and export your JobPilot data.</p>
      </button>
    </div>`;

  document.querySelector('[data-management-section="company"]')?.addEventListener("click", () => {
    if (typeof window.renderManagementCompanyPage === "function") {
      window.renderManagementCompanyPage();
    }
  });
}

window.renderManagementPage = renderManagementPage;

async function hasManagementAccess() {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("JobPilot management access:", error);
      return false;
    }

    return MANAGEMENT_ROLES.includes(String(data?.role || "").toLowerCase());
  } catch (error) {
    console.error("JobPilot management access:", error);
    return false;
  }
}

function addManagementButton() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || getManagementButton()) return;

  const button = document.createElement("button");
  button.id = "jobpilot-management-button";
  button.className = "nav-item";
  button.type = "button";
  button.textContent = "⚙️ Management";
  button.addEventListener("click", renderManagementPage);
  nav.appendChild(button);
}

async function initManagement() {
  if (!(await hasManagementAccess())) return;
  addManagementButton();
}

const navObserver = new MutationObserver(() => {
  if (!getManagementButton()) addManagementButton();
});
navObserver.observe(document.body, { childList: true, subtree: true });

initManagement();
