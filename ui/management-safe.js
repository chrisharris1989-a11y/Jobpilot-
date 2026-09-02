// Safe Management landing-page guard.
// Keeps the Management tab independent from the older Management routing code.
// This intentionally only owns the top-level Management click for now; the
// existing section handlers remain available for the next step.

function renderSafeManagementLanding() {
  const content = document.getElementById("pageContent");
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  const button = document.getElementById("jobpilot-management-button");
  if (!content) return;

  if (title) title.textContent = "Management";
  if (subtitle) subtitle.textContent = "Manage your JobPilot company.";
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  button?.classList.add("active");

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
        <p class="muted" style="margin:16px 0 0">Add users, change roles, suspend or remove access.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="company" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>🏢 Company</h2><p>Manage your company details.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">Edit the information used across JobPilot.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="accounting" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>📊 Accounting</h2><p>Manage accounting and payment connections.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">Stripe, GoCardless and FreeAgent connections.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="billing" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>💳 Billing</h2><p>Manage your JobPilot subscription.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">View your plan and manage billing.</p>
      </button>
      <button class="panel jobpilot-management-card" type="button" data-management-section="import" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)">
        <div class="panel-header"><div><h2>↕️ Import &amp; Export</h2><p>Move your business data in and out of JobPilot.</p></div><span aria-hidden="true">→</span></div>
        <p class="muted" style="margin:16px 0 0">Import customers and export your data.</p>
      </button>
    </div>`;
}

function handleManagementNavigation(event) {
  const management = event.target.closest?.("#jobpilot-management-button");
  if (!management) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderSafeManagementLanding();
}

document.addEventListener("click", handleManagementNavigation, true);

// Also recover cleanly if another module has already selected Management.
const observer = new MutationObserver(() => {
  const title = document.getElementById("pageTitle");
  const button = document.getElementById("jobpilot-management-button");
  if (title?.textContent.trim() === "Management" && button?.classList.contains("active")) {
    const content = document.getElementById("pageContent");
    if (content && !content.querySelector(".jobpilot-management-card")) renderSafeManagementLanding();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
