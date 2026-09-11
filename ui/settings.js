// JobPilot Settings
// Clean Settings entry point.

import { supabase } from "../supabase.js";

export function renderSettings(content = document.getElementById("pageContent")) {
  if (!content) return;
  renderSettingsOverview(content);
}

function renderSettingsOverview(content) {
  window.__jobpilotSettingsCompany = false;
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header"><h2>Settings</h2><p>Manage your JobPilot settings.</p></header>
      <div class="jp-settings-grid">
        <button class="jp-settings-card" type="button" data-settings-section="account"><span class="jp-settings-card-icon">👤</span><span class="jp-settings-card-body"><strong>Account</strong><small>Manage your profile, email address and password.</small></span><span class="jp-settings-card-arrow">→</span></button>
        <button class="jp-settings-card" type="button" data-settings-section="company"><span class="jp-settings-card-icon">🏢</span><span class="jp-settings-card-body"><strong>Company</strong><small>Manage your company details and logo.</small></span><span class="jp-settings-card-arrow">→</span></button>
        <button class="jp-settings-card" type="button" data-settings-section="documents"><span class="jp-settings-card-icon">📄</span><span class="jp-settings-card-body"><strong>Documents</strong><small>Manage templates and uploaded business documents.</small></span><span class="jp-settings-card-arrow">→</span></button>
        <button class="jp-settings-card" type="button" data-settings-section="app-preferences"><span class="jp-settings-card-icon">⚙️</span><span class="jp-settings-card-body"><strong>App Preferences</strong><small>Manage how JobPilot looks and behaves.</small></span><span class="jp-settings-card-arrow">→</span></button>
        <button class="jp-settings-card" type="button" data-settings-section="notifications"><span class="jp-settings-card-icon">🔔</span><span class="jp-settings-card-body"><strong>Notifications</strong><small>Manage your JobPilot notification preferences.</small></span><span class="jp-settings-card-arrow">→</span></button>
        <button class="jp-settings-card jp-settings-danger-card" type="button" data-settings-section="danger-zone"><span class="jp-settings-card-icon">⚠️</span><span class="jp-settings-card-body"><strong>Danger Zone</strong><small>Irreversible account and data actions.</small></span><span class="jp-settings-card-arrow">→</span></button>
      </div>
    </section>`;
  ensureSettingsStyles();
  content.querySelector('[data-settings-section="account"]')?.addEventListener("click", () => renderAccountSettings(content));
  content.querySelector('[data-settings-section="company"]')?.addEventListener("click", () => renderCompanySettings(content));
  content.querySelector('[data-settings-section="documents"]')?.addEventListener("click", () => renderDocumentsSettings(content));
  content.querySelector('[data-settings-section="danger-zone"]')?.addEventListener("click", () => renderDangerZone(content));
}

function renderAccountSettings(content) {
  window.__jobpilotSettingsCompany = false;
  content.innerHTML = `<section class="settings-page jp-settings-page"><header class="page-header"><h2>Account</h2><p>Manage your personal JobPilot account details and login information.</p></header><button class="jp-settings-back" type="button" data-settings-back>← Settings</button><div class="jp-settings-grid"><button class="jp-settings-card" type="button"><span class="jp-settings-card-icon">👤</span><span class="jp-settings-card-body"><strong>Profile</strong><small>Manage your name and personal details.</small></span><span class="jp-settings-card-arrow">→</span></button><button class="jp-settings-card" type="button"><span class="jp-settings-card-icon">🔐</span><span class="jp-settings-card-body"><strong>Email &amp; Password</strong><small>Manage the email address and password you use to sign in.</small></span><span class="jp-settings-card-arrow">→</span></button></div></section>`;
  ensureSettingsStyles();
  content.querySelector("[data-settings-back]")?.addEventListener("click", () => renderSettingsOverview(content));
}

async function renderDocumentsSettings(content) {
  window.__jobpilotSettingsCompany = false;
  content.innerHTML = `<section class="settings-page jp-settings-page"><header class="page-header"><h2>Documents</h2><p>Manage document templates and business files.</p></header><button class="jp-settings-back" type="button" data-settings-back>← Settings</button><div class="jp-documents-section"><h3>Document Templates</h3><p class="jp-documents-help">Set the standard wording JobPilot can use on your business documents.</p><div class="jp-documents-list">${documentCard("quote_terms","Quote Terms & Conditions","Default terms included with quotes.","✍️")}${documentCard("invoice_terms","Invoice Terms & Conditions","Default payment and invoice terms.","🧾")}${documentCard("job_completion","Job Completion","Customer completion and sign-off wording.","✅")}${documentCard("privacy_policy","Privacy Policy","Your business privacy policy.","🔒")}${documentCard("terms_of_service","Terms of Service","Your general service terms.","📋")}</div></div><div class="jp-documents-section"><h3>Uploaded Documents</h3><p class="jp-documents-help">Documents uploaded here can later be linked to customers and jobs.</p><div class="jp-settings-grid jp-document-upload-grid"><button class="jp-settings-card" type="button" data-document-upload="customer"><span class="jp-settings-card-icon">👥</span><span class="jp-settings-card-body"><strong>Customer Documents</strong><small>Contracts, certificates and other customer files.</small></span><span class="jp-settings-card-arrow">→</span></button><button class="jp-settings-card" type="button" data-document-upload="job"><span class="jp-settings-card-icon">🛠️</span><span class="jp-settings-card-body"><strong>Job Documents</strong><small>Site documents, paperwork and job files.</small></span><span class="jp-settings-card-arrow">→</span></button></div></div></section>`;
  ensureSettingsStyles();
  content.querySelector("[data-settings-back]")?.addEventListener("click", () => renderSettingsOverview(content));
  content.querySelectorAll("[data-document-type]").forEach(card => card.addEventListener("click", () => editDocumentTemplate(content, card.dataset.documentType)));
  content.querySelectorAll("[data-document-upload]").forEach(card => card.addEventListener("click", () => showDocumentUploadNotice(content, card.dataset.documentUpload)));
}

function documentCard(type, title, description, icon) {
  return `<button class="jp-settings-card jp-document-template-card" type="button" data-document-type="${type}"><span class="jp-settings-card-icon">${icon}</span><span class="jp-settings-card-body"><strong>${title}</strong><small>${description}</small></span><span class="jp-settings-card-arrow">→</span></button>`;
}

async function editDocumentTemplate(content, type) {
  const labels = {quote_terms:"Quote Terms & Conditions",invoice_terms:"Invoice Terms & Conditions",job_completion:"Job Completion",privacy_policy:"Privacy Policy",terms_of_service:"Terms of Service"};
  const { data: company } = await supabase.from("companies").select("id").maybeSingle();
  if (!company?.id) return alert("We could not find your company.");
  const { data, error } = await supabase.from("company_document_templates").select("content").eq("company_id", company.id).eq("document_type", type).maybeSingle();
  if (error) return alert(error.message);
  content.innerHTML = `<section class="settings-page jp-settings-page"><header class="page-header"><h2>${labels[type]}</h2><p>Edit the default wording for this document.</p></header><button class="jp-settings-back" type="button" data-settings-back>← Documents</button><div class="jp-document-editor"><textarea class="jp-document-textarea" aria-label="${labels[type]}" placeholder="Enter your default wording here...">${escapeHtml(data?.content || "")}</textarea><div class="jp-document-editor-actions"><button class="jp-settings-back" type="button" data-settings-back>Cancel</button><button class="jp-document-save" type="button">Save Template</button></div><div class="jp-document-status" role="status" aria-live="polite"></div></div></section>`;
  ensureSettingsStyles();
  content.querySelectorAll("[data-settings-back]").forEach(button => button.addEventListener("click", () => renderDocumentsSettings(content)));
  content.querySelector(".jp-document-save")?.addEventListener("click", async () => {
    const button = content.querySelector(".jp-document-save"); const status = content.querySelector(".jp-document-status");
    button.disabled = true; status.textContent = "Saving…";
    const payload = { company_id: company.id, document_type: type, content: content.querySelector(".jp-document-textarea").value, updated_at: new Date().toISOString() };
    const { error: saveError } = await supabase.from("company_document_templates").upsert(payload, { onConflict: "company_id,document_type" });
    if (saveError) { status.textContent = saveError.message; button.disabled = false; return; }
    status.textContent = "Template saved."; button.disabled = false;
  });
}

function showDocumentUploadNotice(content, scope) {
  const title = scope === "customer" ? "Customer Documents" : "Job Documents";
  alert(`${title} storage is ready. The upload interface will be connected to Supabase Storage when the customer/job document screens are wired up.`);
}

function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;"}[char] || char)); }

function renderDangerZone(content) {
  window.__jobpilotSettingsCompany = false;
  content.innerHTML = `<section class="settings-page jp-settings-page"><header class="page-header"><h2>Danger Zone</h2><p>Irreversible account and data actions.</p></header><button class="jp-settings-back" type="button" data-settings-back>← Settings</button><div class="jp-danger-panel"><div class="jp-danger-copy"><strong>Delete account</strong><p>Permanently delete your JobPilot account and your owned company data. This cannot be undone.</p></div><button class="jp-delete-account-button" type="button">Delete account</button></div><div class="jp-danger-status" role="alert" aria-live="polite"></div></section>`;
  ensureSettingsStyles();
  content.querySelector("[data-settings-back]")?.addEventListener("click", () => renderSettingsOverview(content));
  content.querySelector(".jp-delete-account-button")?.addEventListener("click", () => deleteCurrentAccount(content));
}

async function deleteCurrentAccount(content) {
  const button = content.querySelector(".jp-delete-account-button"); const status = content.querySelector(".jp-danger-status");
  if (!window.confirm("Delete your JobPilot account permanently? Your owned company data will also be deleted.")) return;
  if (!window.confirm("Final confirmation: permanently delete this account and company data and sign you out?")) return;
  button.disabled = true; button.textContent = "Deleting…"; status.textContent = "Deleting your account…"; status.style.color = "#b91c1c";
  try { const { data, error } = await supabase.functions.invoke("delete-account", { method: "POST", body: {} }); if (error) throw error; if (!data?.success) throw new Error(data?.error || "Account deletion failed"); await supabase.auth.signOut({ scope: "local" }); status.textContent = "Account deleted. Redirecting…"; setTimeout(() => window.location.reload(), 250); } catch (error) { console.error("JobPilot account deletion:", error); status.textContent = error?.message || "We could not delete your account. Please try again."; button.disabled = false; button.textContent = "Delete account"; }
}

function renderCompanySettings(content) {
  window.__jobpilotSettingsCompany = true;
  if (typeof window.renderManagementCompanyPage === "function") { window.renderManagementCompanyPage(); return; }
  content.innerHTML = `<section class="settings-page jp-settings-page"><header class="page-header"><h2>Company</h2><p>Manage your company details and branding.</p></header><div class="panel"><p class="muted">Company settings are still loading…</p></div></section>`;
}

function ensureSettingsStyles() {
  if (document.getElementById("jp-account-settings-styles")) return;
  const style = document.createElement("style"); style.id = "jp-account-settings-styles";
  style.textContent = `.jp-settings-page{width:100%}.jp-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:20px;max-width:900px}.jp-settings-card{appearance:none;border:1px solid rgba(0,0,0,.10);background:var(--card-bg,#fff);border-radius:14px;padding:20px;display:flex;align-items:center;gap:15px;text-align:left;cursor:pointer;color:inherit;box-shadow:0 2px 8px rgba(0,0,0,.04);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.jp-settings-card:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(0,0,0,.08);border-color:rgba(0,0,0,.18)}.jp-settings-danger-card{border-color:rgba(185,28,28,.28)}.jp-settings-danger-card .jp-settings-card-icon{background:rgba(185,28,28,.08)}.jp-settings-card-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:rgba(0,0,0,.05);font-size:20px;flex:0 0 42px}.jp-settings-card-body{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1}.jp-settings-card-body strong{font-size:15px}.jp-settings-card-body small{font-size:13px;opacity:.68;line-height:1.4}.jp-settings-card-arrow{font-size:20px;opacity:.5}.jp-settings-back{margin-top:4px;border:0;background:none;padding:6px 0;color:inherit;opacity:.7;cursor:pointer;font-size:13px}.jp-settings-back:hover{opacity:1}.jp-danger-panel{max-width:900px;margin-top:20px;padding:22px;border:1px solid rgba(185,28,28,.3);border-radius:14px;background:rgba(185,28,28,.04);display:flex;align-items:center;justify-content:space-between;gap:20px}.jp-danger-copy strong{font-size:16px}.jp-danger-copy p{margin:6px 0 0;opacity:.7;font-size:13px}.jp-delete-account-button{border:1px solid #b91c1c;background:#b91c1c;color:#fff;border-radius:9px;padding:10px 16px;font-weight:700;cursor:pointer;white-space:nowrap}.jp-delete-account-button:hover{filter:brightness(.94)}.jp-delete-account-button:disabled{opacity:.6;cursor:wait}.jp-danger-status{max-width:900px;margin-top:12px;font-size:13px}.jp-documents-section{max-width:900px;margin-top:24px}.jp-documents-section h3{margin:0;font-size:17px}.jp-documents-help{margin:6px 0 14px;opacity:.68;font-size:13px}.jp-documents-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.jp-document-upload-grid{margin-top:0}.jp-document-editor{max-width:900px;margin-top:20px}.jp-document-textarea{width:100%;min-height:300px;box-sizing:border-box;border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:14px;font:inherit;line-height:1.5;background:var(--card-bg,#fff);color:inherit;resize:vertical}.jp-document-editor-actions{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:12px}.jp-document-save{border:0;border-radius:9px;padding:10px 16px;background:#111827;color:#fff;font-weight:700;cursor:pointer}.jp-document-save:disabled{opacity:.6;cursor:wait}.jp-document-status{font-size:13px;margin-top:10px;min-height:18px}.jp-document-template-card{width:100%}@media(max-width:700px){.jp-settings-grid,.jp-documents-list{grid-template-columns:1fr}.jp-danger-panel{align-items:flex-start;flex-direction:column}.jp-delete-account-button{width:100%}}`;
  document.head.appendChild(style);
}

document.addEventListener("click", event => { const button=event.target.closest?.("#companyBackButton"); if(!button||!window.__jobpilotSettingsCompany)return; event.preventDefault(); event.stopImmediatePropagation(); window.__jobpilotSettingsCompany=false; renderSettings(document.getElementById("pageContent")); }, true);
document.addEventListener("click", event => { const button=event.target.closest?.('.nav-item[data-page="settings"]'); if(!button)return; event.preventDefault(); event.stopImmediatePropagation(); document.querySelectorAll(".nav-item").forEach(item=>item.classList.remove("active")); button.classList.add("active"); const title=document.getElementById("pageTitle"); const subtitle=document.getElementById("pageSubtitle"); if(title)title.textContent="Settings"; if(subtitle)subtitle.textContent="Manage your JobPilot account settings."; renderSettings(); }, true);
function addSettingsTab(){const bottom=document.querySelector(".sidebar .sidebar-bottom");if(!bottom||bottom.querySelector('[data-page="settings"]'))return;const button=document.createElement("button");button.className="nav-item";button.type="button";button.dataset.page="settings";button.textContent="⚙️ Settings";bottom.insertBefore(button,bottom.firstChild)}
const observer=new MutationObserver(addSettingsTab);observer.observe(document.body,{childList:true,subtree:true});addSettingsTab();
