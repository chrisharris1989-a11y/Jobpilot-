import { supabase } from "./supabase.js";
import { openImporter } from "./customer-import.js";

const escapeCsv = value => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function getAllData() {
  const tables = ["customers", "jobs", "quotes", "invoices"];
  const result = {};
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    result[table] = data || [];
  }
  return result;
}

function makeCombinedCsv(data) {
  const rows = [];
  for (const [table, records] of Object.entries(data)) {
    for (const record of records) {
      rows.push({ record_type: table, ...record });
    }
  }
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return [keys.map(escapeCsv).join(","), ...rows.map(r => keys.map(k => escapeCsv(typeof r[k] === "object" && r[k] !== null ? JSON.stringify(r[k]) : r[k])).join(","))].join("\n");
}

async function exportAll() {
  try {
    const data = await getAllData();
    const payload = {
      format: "JobPilot complete business backup",
      version: 1,
      exported_at: new Date().toISOString(),
      data
    };
    download(`jobpilot-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload, null, 2), "application/json");
    const csv = makeCombinedCsv(data);
    download(`jobpilot-data-${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv;charset=utf-8");
    showMessage("Your complete JobPilot data has been exported as a backup and CSV file.");
  } catch (error) {
    showMessage(`Export failed: ${error.message}`, true);
  }
}

function showMessage(message, error = false) {
  const el = document.getElementById("dataTransferMessage");
  if (!el) return;
  el.textContent = message;
  el.style.color = error ? "#b91c1c" : "#166534";
}

function injectStyles() {
  if (document.getElementById("jp-transfer-style")) return;
  const style = document.createElement("style");
  style.id = "jp-transfer-style";
  style.textContent = `
    .jp-transfer-panel{margin-top:20px}
    .jp-transfer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:14px}
    .jp-transfer-card{border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}
    .jp-transfer-card h3{margin:0 0 8px}
    .jp-transfer-card p{color:#64748b;line-height:1.5}
    .jp-transfer-message{margin-top:14px;font-size:14px}
  `;
  document.head.appendChild(style);
}

function addTransferSection() {
  const content = document.getElementById("pageContent");
  if (!content || document.getElementById("jp-data-transfer")) return;
  const settingsPanel = content.querySelector(".settings-panel");
  if (!settingsPanel) return;
  injectStyles();
  const section = document.createElement("div");
  section.id = "jp-data-transfer";
  section.className = "panel jp-transfer-panel";
  section.innerHTML = `
    <h2>Data Import & Export</h2>
    <p class="muted">Move your business data into or out of JobPilot. This is designed for complete business data portability, not just customer records.</p>
    <div class="jp-transfer-grid">
      <div class="jp-transfer-card">
        <h3>Import Data</h3>
        <p>Import supported customer and job information from a CSV, review the detected data and possible duplicates, then choose what to add to JobPilot.</p>
        <button id="jp-open-import" type="button" class="button primary">Import Data</button>
      </div>
      <div class="jp-transfer-card">
        <h3>Export Data</h3>
        <p>Download a complete backup of your JobPilot business data, plus a combined CSV containing customers, jobs, quotes and invoices.</p>
        <button id="jp-export-data" type="button" class="button primary">Export Data</button>
      </div>
    </div>
    <div id="dataTransferMessage" class="jp-transfer-message"></div>
  `;
  settingsPanel.insertAdjacentElement("afterend", section);
  section.querySelector("#jp-open-import").addEventListener("click", openImporter);
  section.querySelector("#jp-export-data").addEventListener("click", exportAll);
}

new MutationObserver(addTransferSection).observe(document.body, { childList: true, subtree: true });
window.addEventListener("load", addTransferSection);
setTimeout(addTransferSection, 700);
