import { supabase } from "./supabase.js";

const SETTINGS_KEY = "jobpilot_settings";

function getSettings() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderManagementCompanyPage() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  const settings = getSettings();
  const managementButton = document.getElementById("jobpilot-management-button");

  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  managementButton?.classList.add("active");

  document.getElementById("pageTitle").textContent = "Company";
  document.getElementById("pageSubtitle").textContent = "Manage your company settings.";

  content.innerHTML = `
    <div class="page-actions">
      <div>
        <h2>Company</h2>
        <p>Manage company-wide document settings.</p>
      </div>
      <button id="companyBackButton" class="button secondary" type="button">← Management</button>
    </div>

    <div class="panel settings-panel">
      <h2>🧾 Invoice Settings</h2>
      <p class="muted">Set the defaults used when creating invoices for your customers.</p>

      <label>Invoice Prefix</label>
      <input id="companyInvoicePrefix" type="text" value="${escapeHtml(settings.invoicePrefix || "INV-")}" placeholder="INV-">

      <label>Next Invoice Number</label>
      <input id="companyNextInvoiceNumber" type="number" min="1" value="${Number(settings.nextInvoiceNumber) || 1}">

      <label>Default Payment Terms</label>
      <select id="companyPaymentTerms">
        <option value="7" ${String(settings.paymentTerms ?? 30) === "7" ? "selected" : ""}>7 days</option>
        <option value="14" ${String(settings.paymentTerms ?? 30) === "14" ? "selected" : ""}>14 days</option>
        <option value="30" ${String(settings.paymentTerms ?? 30) === "30" ? "selected" : ""}>30 days</option>
        <option value="60" ${String(settings.paymentTerms ?? 30) === "60" ? "selected" : ""}>60 days</option>
      </select>

      <label>Default VAT Rate (%)</label>
      <input id="companyVatRate" type="number" step="0.01" min="0" value="${Number(settings.vatRate ?? 20)}">

      <label>Invoice Footer / Notes</label>
      <textarea id="companyInvoiceFooter" placeholder="Payment details, bank information, thank you message, etc.">${escapeHtml(settings.invoiceFooter || "")}</textarea>

      <hr>

      <h2>💷 Quote Settings</h2>
      <p class="muted">Set the defaults used when creating quotes for your customers.</p>

      <label>Quote Prefix</label>
      <input id="companyQuotePrefix" type="text" value="${escapeHtml(settings.quotePrefix || "QUO-")}" placeholder="QUO-">

      <label>Next Quote Number</label>
      <input id="companyNextQuoteNumber" type="number" min="1" value="${Number(settings.nextQuoteNumber) || 1}">

      <label>Quote Validity</label>
      <select id="companyQuoteValidity">
        <option value="7" ${String(settings.quoteValidity ?? 30) === "7" ? "selected" : ""}>7 days</option>
        <option value="14" ${String(settings.quoteValidity ?? 30) === "14" ? "selected" : ""}>14 days</option>
        <option value="30" ${String(settings.quoteValidity ?? 30) === "30" ? "selected" : ""}>30 days</option>
        <option value="60" ${String(settings.quoteValidity ?? 30) === "60" ? "selected" : ""}>60 days</option>
      </select>

      <label>Quote Footer / Notes</label>
      <textarea id="companyQuoteFooter" placeholder="Terms, notes or other information shown on quotes.">${escapeHtml(settings.quoteFooter || "")}</textarea>

      <div id="companySettingsMessage" class="muted" style="margin-top:15px;"></div>

      <div style="display:flex;justify-content:flex-end;margin-top:25px;">
        <button id="saveCompanySettings" class="button primary" type="button">Save Company Settings</button>
      </div>
    </div>
  `;

  document.getElementById("companyBackButton")?.addEventListener("click", () => {
    if (typeof window.renderManagementPage === "function") {
      window.renderManagementPage();
    }
  });

  document.getElementById("saveCompanySettings")?.addEventListener("click", saveCompanySettings);
}

async function saveCompanySettings() {
  const message = document.getElementById("companySettingsMessage");
  const button = document.getElementById("saveCompanySettings");
  if (!message || !button) return;

  const current = getSettings();
  const next = {
    ...current,
    invoicePrefix: document.getElementById("companyInvoicePrefix")?.value.trim() || "INV-",
    nextInvoiceNumber: Number(document.getElementById("companyNextInvoiceNumber")?.value) || 1,
    paymentTerms: Number(document.getElementById("companyPaymentTerms")?.value) || 30,
    vatRate: Number(document.getElementById("companyVatRate")?.value) || 0,
    invoiceFooter: document.getElementById("companyInvoiceFooter")?.value || "",
    quotePrefix: document.getElementById("companyQuotePrefix")?.value.trim() || "QUO-",
    nextQuoteNumber: Number(document.getElementById("companyNextQuoteNumber")?.value) || 1,
    quoteValidity: Number(document.getElementById("companyQuoteValidity")?.value) || 30,
    quoteFooter: document.getElementById("companyQuoteFooter")?.value || ""
  };

  button.disabled = true;
  message.textContent = "Saving...";

  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("You are not logged in.");

    const { error } = await supabase
      .from("user_settings")
      .update({
        invoice_prefix: next.invoicePrefix,
        next_invoice_number: next.nextInvoiceNumber,
        invoice_payment_terms: next.paymentTerms,
        default_vat_rate: next.vatRate,
        invoice_footer: next.invoiceFooter,
        quote_prefix: next.quotePrefix,
        next_quote_number: next.nextQuoteNumber,
        quote_validity_days: next.quoteValidity,
        quote_footer: next.quoteFooter
      })
      .eq("user_id", user.id);

    if (error) throw error;

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    message.textContent = "Company settings saved.";
  } catch (error) {
    console.error("Company settings:", error);
    message.textContent = `Could not save settings: ${error?.message || error}`;
  } finally {
    button.disabled = false;
  }
}

window.renderManagementCompanyPage = renderManagementCompanyPage;
