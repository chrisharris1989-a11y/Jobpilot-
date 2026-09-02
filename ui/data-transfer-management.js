import { supabase } from "../supabase.js";

let allowed = false;

async function checkManagementAccess() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from("company_members").select("role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (error) return false;
  return ["owner", "admin"].includes(String(data?.role || "").toLowerCase());
}

function isManagementLanding() {
  return document.getElementById("jobpilot-management-button")?.classList.contains("active") && document.querySelector('[data-management-section="billing"]') !== null;
}

function hideSettingsTransfer() {
  const transfer = document.getElementById("jp-data-transfer");
  if (transfer && !transfer.closest("#pageContent")?.querySelector("[data-management-transfer-page]")) {
    transfer.style.display = "none";
  }
}

function addManagementCard() {
  if (!allowed || !isManagementLanding()) return;
  const grid = document.querySelector("#pageContent .content-grid");
  if (!grid || document.getElementById("jobpilot-management-data-card")) return;
  const card = document.createElement("button");
  card.id = "jobpilot-management-data-card";
  card.type = "button";
  card.className = "panel jobpilot-management-card";
  card.style.cssText = "text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)";
  card.innerHTML = '<div class="panel-header"><div><h2>📦 Import & Export Data</h2><p>Move your company data into or out of JobPilot.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0">Import backups or export customers, jobs, quotes and invoices.</p>';
  card.addEventListener("click", openManagementTransfer);
  grid.appendChild(card);
}

function openManagementTransfer() {
  const content = document.getElementById("pageContent");
  const transfer = document.getElementById("jp-data-transfer");
  if (!content || !transfer) return;
  const page = document.createElement("div");
  page.setAttribute("data-management-transfer-page", "true");
  page.innerHTML = '<div class="page-actions"><div><h2>Import & Export Data</h2><p>Manage your company data. This area is only available to owners and admins.</p></div></div>';
  transfer.style.display = "block";
  transfer.style.marginTop = "0";
  page.appendChild(transfer);
  const back = document.createElement("button");
  back.type = "button";
  back.className = "secondary-button";
  back.style.marginTop = "16px";
  back.textContent = "← Back to Management";
  back.addEventListener("click", () => window.dispatchEvent(new CustomEvent("jobpilot:management-home")));
  page.appendChild(back);
  content.innerHTML = "";
  content.appendChild(page);
  document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Import & Export Data"));
  document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode("Manage your company data."));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("jobpilot-management-button")?.classList.add("active");
}

function returnToManagement() {
  if (!document.getElementById("jobpilot-management-button")?.classList.contains("active")) return;
  const transfer = document.getElementById("jp-data-transfer");
  if (transfer) transfer.style.display = "none";
  document.getElementById("jobpilot-management-button")?.click();
}

window.addEventListener("jobpilot:management-home", returnToManagement);

async function init() {
  allowed = await checkManagementAccess();
  if (!allowed) return;
  const observer = new MutationObserver(() => {
    hideSettingsTransfer();
    addManagementCard();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  hideSettingsTransfer();
  addManagementCard();
}

init();
