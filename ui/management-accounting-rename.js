import { supabase } from "../supabase.js";
import { mountDataTransfer } from "../data-transfer.js";

let allowed = false;

async function checkManagementAccess() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from("company_members").select("role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (error) {
    console.error("JobPilot management access:", error);
    return false;
  }
  return ["owner", "admin"].includes(String(data?.role || "").toLowerCase());
}

function isManagement() {
  return document.getElementById("jobpilot-management-button")?.classList.contains("active");
}

function getGrid() {
  return document.querySelector("#pageContent .content-grid");
}

function renameManagementRequests() {
  if (!isManagement()) return;

  const content = document.getElementById("pageContent");
  if (!content) return;

  // Rename the Management card without changing its underlying route/functionality.
  const grid = getGrid();
  if (grid) {
    grid.querySelectorAll("h2").forEach(heading => {
      if (heading.textContent.trim().replace(/^\S+\s*/, "") === "Quote Requests") {
        heading.textContent = heading.textContent.trim().startsWith("💷") ? "💷 Requests" : "Requests";
        const card = heading.closest("[data-management-section], .panel, button");
        card?.setAttribute("aria-label", "Requests");
      }
    });
  }

  if (document.getElementById("pageTitle")?.textContent.trim() === "Quote Requests") {
    document.getElementById("pageTitle").textContent = "Requests";
    const subtitle = document.getElementById("pageSubtitle");
    if (subtitle) subtitle.textContent = "Review requests submitted by your team and customers.";
  }
}

function renameAccountingCard() {
  if (!isManagement()) return;

  const card = document.querySelector('#pageContent [data-management-section="connections"]');
  if (card) {
    const heading = card.querySelector("h2");
    if (heading) heading.textContent = "📊 Accounting";
    const description = card.querySelector("p");
    if (description) description.textContent = "Manage your accounting and payment connections.";
    card.setAttribute("aria-label", "Accounting");
  }

  if (document.getElementById("pageTitle")?.textContent.trim() === "Connections") {
    document.getElementById("pageTitle").textContent = "Accounting";
    const heading = document.querySelector("#pageContent .page-actions h2");
    if (heading) heading.textContent = "Accounting";
    const subtitle = document.getElementById("pageSubtitle");
    if (subtitle) subtitle.textContent = "Manage your accounting and payment connections.";
  }
}

function addImportExportCard() {
  if (!allowed || !isManagement()) return;
  const grid = getGrid();
  if (!grid || grid.querySelector("#jobpilot-management-data-card")) return;

  const card = document.createElement("button");
  card.id = "jobpilot-management-data-card";
  card.type = "button";
  card.className = "panel jobpilot-management-card";
  card.style.cssText = "text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)";
  card.innerHTML = '<div class="panel-header"><div><h2>📦 Import & Export Data</h2><p>Move your company data into or out of JobPilot.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0">Import backups or export customers, jobs, quotes and invoices.</p>';
  card.addEventListener("click", () => {
    const content = document.getElementById("pageContent");
    if (!content) return;
    content.innerHTML = "";
    const page = document.createElement("div");
    page.innerHTML = '<div class="page-actions"><div><h2>Import & Export Data</h2><p>Manage your company data. This area is only available to owners and admins.</p></div></div>';
    content.appendChild(page);
    mountDataTransfer(page);
    const back = document.createElement("button");
    back.type = "button";
    back.className = "secondary-button";
    back.style.marginTop = "16px";
    back.textContent = "← Back to Management";
    back.addEventListener("click", () => document.getElementById("jobpilot-management-button")?.click());
    page.appendChild(back);
    document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Import & Export Data"));
    document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode("Manage your company data."));
    document.querySelectorAll(".nav-item").forEach(button => button.classList.remove("active"));
    document.getElementById("jobpilot-management-button")?.classList.add("active");
  });
  grid.appendChild(card);
}

async function init() {
  allowed = await checkManagementAccess();
  if (!allowed) return;

  const observer = new MutationObserver(() => {
    renameManagementRequests();
    renameAccountingCard();
    addImportExportCard();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  renameManagementRequests();
  renameAccountingCard();
  addImportExportCard();
}

init();
