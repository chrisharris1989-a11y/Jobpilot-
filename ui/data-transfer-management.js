import { supabase } from "../supabase.js";
import { mountDataTransfer } from "../data-transfer.js";

let allowed = false;

async function checkManagementAccess() {
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
    console.error("JobPilot data transfer access:", error);
    return false;
  }
  return ["owner", "admin"].includes(String(data?.role || "").toLowerCase());
}

function managementButton() {
  return document.getElementById("jobpilot-management-button");
}

function isManagementActive() {
  return managementButton()?.classList.contains("active");
}

function addManagementCard() {
  if (!allowed || !isManagementActive()) return;
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
  if (!allowed) return;
  const content = document.getElementById("pageContent");
  if (!content) return;

  content.innerHTML = "";
  const page = document.createElement("div");
  page.setAttribute("data-management-transfer-page", "true");
  page.innerHTML = '<div class="page-actions"><div><h2>Import & Export Data</h2><p>Manage your company data. This area is only available to owners and admins.</p></div></div>';
  content.appendChild(page);

  mountDataTransfer(page);

  const back = document.createElement("button");
  back.type = "button";
  back.className = "secondary-button";
  back.style.marginTop = "16px";
  back.textContent = "← Back to Management";
  back.addEventListener("click", () => managementButton()?.click());
  page.appendChild(back);

  document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Import & Export Data"));
  document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode("Manage your company data."));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  managementButton()?.classList.add("active");
}

function bindManagementButton() {
  const button = managementButton();
  if (!button || button.dataset.transferCardBound === "true") return;
  button.dataset.transferCardBound = "true";
  button.addEventListener("click", () => {
    // management-ui.js replaces #pageContent during its click handler.
    // Wait until that DOM update has completed, then add our card.
    setTimeout(addManagementCard, 25);
    setTimeout(addManagementCard, 150);
  });
}

async function init() {
  allowed = await checkManagementAccess();
  if (!allowed) return;

  const observer = new MutationObserver(() => {
    bindManagementButton();
    addManagementCard();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  bindManagementButton();
  addManagementCard();

  // The main app can create the Management button after this module loads.
  [100, 300, 700, 1500, 3000].forEach(delay => {
    setTimeout(() => {
      bindManagementButton();
      addManagementCard();
    }, delay);
  });
}

init();
