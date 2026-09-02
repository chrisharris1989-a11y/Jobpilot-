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
  if (error) return false;
  return ["owner", "admin"].includes(String(data?.role || "").toLowerCase());
}

function isManagementActive() {
  return document.getElementById("jobpilot-management-button")?.classList.contains("active");
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

  mountDataTransfer(page);

  const back = document.createElement("button");
  back.type = "button";
  back.className = "secondary-button";
  back.style.marginTop = "16px";
  back.textContent = "← Back to Management";
  back.addEventListener("click", () => document.getElementById("jobpilot-management-button")?.click());
  page.appendChild(back);
  content.appendChild(page);

  document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Import & Export Data"));
  document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode("Manage your company data."));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("jobpilot-management-button")?.classList.add("active");
}

async function init() {
  allowed = await checkManagementAccess();
  if (!allowed) return;

  const observer = new MutationObserver(() => addManagementCard());
  observer.observe(document.body, { childList: true, subtree: true });
  addManagementCard();
}

init();
