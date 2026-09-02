import { mountDataTransfer } from "../data-transfer.js";

function setManagementActive() {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.getElementById("jobpilot-management-button")?.classList.add("active");
}

function backToManagement() {
  document.getElementById("jobpilot-management-button")?.click();
}

export function renderManagementImportExport() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Import & Export";
  if (subtitle) subtitle.textContent = "Move your business data into or out of JobPilot.";
  setManagementActive();

  content.innerHTML = `
    <div class="page-actions">
      <div>
        <h2>Import &amp; Export</h2>
        <p>Move your business data in and out of JobPilot.</p>
      </div>
    </div>

    <div id="managementDataTransfer"></div>

    <div class="panel" style="margin-top:20px">
      <div class="panel-header">
        <div>
          <h2>📅 Import from Calendar</h2>
          <p>Bring existing appointments into JobPilot from your calendar.</p>
        </div>
      </div>
      <p class="muted" style="margin-top:10px">Connect your calendar, choose a date range, and import appointments as JobPilot jobs.</p>
      <div id="managementCalendarImport" style="margin-top:16px"></div>
    </div>

    <button id="managementImportExportBack" class="secondary-button" type="button" style="margin-top:16px">← Back to Management</button>
  `;

  mountDataTransfer(document.getElementById("managementDataTransfer"));
  if (typeof window.renderCalendarImportUI === "function") window.renderCalendarImportUI();
  document.getElementById("managementImportExportBack")?.addEventListener("click", backToManagement);
}

window.renderManagementImportExport = renderManagementImportExport;
