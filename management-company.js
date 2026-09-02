import { supabase } from "./supabase.js";

const SETTINGS_KEY = "jobpilot_settings";

function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }
  catch { return {}; }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadCompanySettings() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error("You are not logged in.");

  const { data, error } = await supabase.from("user_settings").select(`
    business_name, contact_name, phone, email, website, address_line1, city, postcode,
    invoice_prefix, next_invoice_number, invoice_payment_terms, default_vat_rate, invoice_footer,
    quote_prefix, next_quote_number, quote_validity_days, quote_footer, currency,
    show_contact_name_on_invoice, show_phone_on_invoice, show_email_on_invoice,
    show_website_on_invoice, show_address_on_invoice
  `).eq("user_id", user.id).maybeSingle();

  if (error) throw error;
  const local = getSettings();
  const row = data || {};

  return {
    ...local,
    businessName: row.business_name ?? local.businessName ?? "",
    contactName: row.contact_name ?? local.contactName ?? "",
    phone: row.phone ?? local.phone ?? "",
    businessEmail: row.email ?? local.businessEmail ?? "",
    address: row.address_line1 ?? local.address ?? "",
    city: row.city ?? local.city ?? "",
    postcode: row.postcode ?? local.postcode ?? "",
    website: row.website ?? local.website ?? "",
    invoicePrefix: row.invoice_prefix ?? local.invoicePrefix ?? "INV-",
    nextInvoiceNumber: row.next_invoice_number ?? local.nextInvoiceNumber ?? 1,
    paymentTerms: row.invoice_payment_terms ?? local.paymentTerms ?? 30,
    vatRate: row.default_vat_rate ?? local.vatRate ?? 20,
    invoiceFooter: row.invoice_footer ?? local.invoiceFooter ?? "",
    quotePrefix: row.quote_prefix ?? local.quotePrefix ?? "QUO-",
    nextQuoteNumber: row.next_quote_number ?? local.nextQuoteNumber ?? 1,
    quoteValidity: row.quote_validity_days ?? local.quoteValidity ?? 30,
    quoteFooter: row.quote_footer ?? local.quoteFooter ?? "",
    currency: row.currency ?? local.currency ?? "GBP",
    showContactName: row.show_contact_name_on_invoice !== false,
    showPhone: row.show_phone_on_invoice !== false,
    showEmail: row.show_email_on_invoice !== false,
    showWebsite: row.show_website_on_invoice !== false,
    showAddress: row.show_address_on_invoice === true
  };
}

function renderManagementCompanyPage() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.getElementById("jobpilot-management-button")?.classList.add("active");
  document.getElementById("pageTitle").textContent = "Company";
  document.getElementById("pageSubtitle").textContent = "Manage your company, documents and invoice information.";
  content.innerHTML = `<div class="panel"><p class="muted">Loading company settings…</p></div>`;

  loadCompanySettings().then(settings => {
    content.innerHTML = `
      <div class="page-actions">
        <div><h2>Company</h2><p>Manage the company information and document settings used throughout JobPilot.</p></div>
        <button id="companyBackButton" class="button secondary" type="button">← Management</button>
      </div>

      <div class="panel settings-panel">
        <section class="settings-section">
          <h2>🏢 Company Details</h2>
          <p class="muted">These details are used throughout JobPilot and on your customer documents.</p>
          <label>Business Name</label><input id="companyBusinessName" type="text" value="${escapeHtml(settings.businessName)}" required>
          <label>Contact Name</label><input id="companyContactName" type="text" value="${escapeHtml(settings.contactName)}">
          <label>Phone</label><input id="companyPhone" type="tel" value="${escapeHtml(settings.phone)}">
          <label>Email</label><input id="companyEmail" type="email" value="${escapeHtml(settings.businessEmail)}">
          <label>Business Address</label><input id="companyAddress" type="text" value="${escapeHtml(settings.address)}">
          <label>Town / City</label><input id="companyCity" type="text" value="${escapeHtml(settings.city)}">
          <label>Postcode</label><input id="companyPostcode" type="text" value="${escapeHtml(settings.postcode)}">
          <label>Website</label><input id="companyWebsite" type="url" value="${escapeHtml(settings.website)}" placeholder="https://">
        </section>

        <section class="settings-section">
          <h2>🧾 Invoice Settings</h2>
          <p class="muted">Set the defaults used when creating invoices for your customers.</p>
          <label>Invoice Prefix</label><input id="companyInvoicePrefix" type="text" value="${escapeHtml(settings.invoicePrefix)}" placeholder="INV-">
          <label>Next Invoice Number</label><input id="companyNextInvoiceNumber" type="number" min="1" value="${Number(settings.nextInvoiceNumber) || 1}">
          <label>Default Payment Terms</label>
          <select id="companyPaymentTerms">
            <option value="7" ${String(settings.paymentTerms) === "7" ? "selected" : ""}>7 days</option>
            <option value="14" ${String(settings.paymentTerms) === "14" ? "selected" : ""}>14 days</option>
            <option value="30" ${String(settings.paymentTerms) === "30" ? "selected" : ""}>30 days</option>
            <option value="60" ${String(settings.paymentTerms) === "60" ? "selected" : ""}>60 days</option>
          </select>
          <label>Default VAT Rate (%)</label><input id="companyVatRate" type="number" step="0.01" min="0" value="${Number(settings.vatRate ?? 20)}">
          <label>Invoice Footer / Notes</label><textarea id="companyInvoiceFooter" placeholder="Payment details, bank information, thank you message, etc.">${escapeHtml(settings.invoiceFooter)}</textarea>
        </section>

        <section class="settings-section">
          <h2>💷 Quote Settings</h2>
          <p class="muted">Set the defaults used when creating quotes for your customers.</p>
          <label>Quote Prefix</label><input id="companyQuotePrefix" type="text" value="${escapeHtml(settings.quotePrefix)}" placeholder="QUO-">
          <label>Next Quote Number</label><input id="companyNextQuoteNumber" type="number" min="1" value="${Number(settings.nextQuoteNumber) || 1}">
          <label>Quote Validity</label>
          <select id="companyQuoteValidity">
            <option value="7" ${String(settings.quoteValidity) === "7" ? "selected" : ""}>7 days</option>
            <option value="14" ${String(settings.quoteValidity) === "14" ? "selected" : ""}>14 days</option>
            <option value="30" ${String(settings.quoteValidity) === "30" ? "selected" : ""}>30 days</option>
            <option value="60" ${String(settings.quoteValidity) === "60" ? "selected" : ""}>60 days</option>
          </select>
          <label>Quote Footer / Notes</label><textarea id="companyQuoteFooter" placeholder="Terms, notes or other information shown on quotes.">${escapeHtml(settings.quoteFooter)}</textarea>
        </section>

        <section class="settings-section">
          <h2>👤 Customer Invoice Information</h2>
          <p class="muted">Choose which of your company details appear on customer invoices.</p>
          <label><input id="companyShowContactName" type="checkbox" ${settings.showContactName ? "checked" : ""}> Show contact name on invoices</label>
          <label><input id="companyShowPhone" type="checkbox" ${settings.showPhone ? "checked" : ""}> Show phone number on invoices</label>
          <label><input id="companyShowEmail" type="checkbox" ${settings.showEmail ? "checked" : ""}> Show email address on invoices</label>
          <label><input id="companyShowWebsite" type="checkbox" ${settings.showWebsite ? "checked" : ""}> Show website on invoices</label>
          <label><input id="companyShowAddress" type="checkbox" ${settings.showAddress ? "checked" : ""}> Show business address on invoices</label>
          <label>Currency</label>
          <select id="companyCurrency">
            <option value="GBP" ${settings.currency === "GBP" ? "selected" : ""}>GBP (£)</option>
            <option value="EUR" ${settings.currency === "EUR" ? "selected" : ""}>EUR (€)</option>
            <option value="USD" ${settings.currency === "USD" ? "selected" : ""}>USD ($)</option>
          </select>
        </section>

        <div id="companySettingsMessage" class="muted" style="margin-top:15px"></div>
        <div style="display:flex;justify-content:flex-end;margin-top:25px"><button id="saveCompanySettings" class="button primary" type="button">Save Company Settings</button></div>
      </div>`;

    document.getElementById("companyBackButton")?.addEventListener("click", () => window.renderManagementPage?.());
    document.getElementById("saveCompanySettings")?.addEventListener("click", saveCompanySettings);
  }).catch(error => {
    content.innerHTML = `<div class="panel"><h2>Company</h2><p class="muted">Could not load company settings: ${escapeHtml(error.message || error)}</p></div><button id="companyBackButton" class="button secondary" type="button" style="margin-top:16px">← Management</button>`;
    document.getElementById("companyBackButton")?.addEventListener("click", () => window.renderManagementPage?.());
  });
}

async function saveCompanySettings() {
  const message = document.getElementById("companySettingsMessage");
  const button = document.getElementById("saveCompanySettings");
  if (!message || !button) return;

  const current = getSettings();
  const next = {
    ...current,
    businessName: document.getElementById("companyBusinessName")?.value.trim() || "",
    contactName: document.getElementById("companyContactName")?.value.trim() || "",
    phone: document.getElementById("companyPhone")?.value.trim() || "",
    businessEmail: document.getElementById("companyEmail")?.value.trim() || "",
    address: document.getElementById("companyAddress")?.value.trim() || "",
    city: document.getElementById("companyCity")?.value.trim() || "",
    postcode: document.getElementById("companyPostcode")?.value.trim() || "",
    website: document.getElementById("companyWebsite")?.value.trim() || "",
    invoicePrefix: document.getElementById("companyInvoicePrefix")?.value.trim() || "INV-",
    nextInvoiceNumber: Number(document.getElementById("companyNextInvoiceNumber")?.value) || 1,
    paymentTerms: Number(document.getElementById("companyPaymentTerms")?.value) || 30,
    vatRate: Number(document.getElementById("companyVatRate")?.value) || 0,
    invoiceFooter: document.getElementById("companyInvoiceFooter")?.value || "",
    quotePrefix: document.getElementById("companyQuotePrefix")?.value.trim() || "QUO-",
    nextQuoteNumber: Number(document.getElementById("companyNextQuoteNumber")?.value) || 1,
    quoteValidity: Number(document.getElementById("companyQuoteValidity")?.value) || 30,
    quoteFooter: document.getElementById("companyQuoteFooter")?.value || "",
    currency: document.getElementById("companyCurrency")?.value || "GBP",
    showContactName: document.getElementById("companyShowContactName")?.checked === true,
    showPhone: document.getElementById("companyShowPhone")?.checked === true,
    showEmail: document.getElementById("companyShowEmail")?.checked === true,
    showWebsite: document.getElementById("companyShowWebsite")?.checked === true,
    showAddress: document.getElementById("companyShowAddress")?.checked === true
  };

  button.disabled = true;
  message.textContent = "Saving…";
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("You are not logged in.");
    const { error } = await supabase.from("user_settings").update({
      business_name: next.businessName, contact_name: next.contactName, phone: next.phone,
      email: next.businessEmail, address_line1: next.address, city: next.city, postcode: next.postcode,
      website: next.website, invoice_prefix: next.invoicePrefix, next_invoice_number: next.nextInvoiceNumber,
      invoice_payment_terms: next.paymentTerms, default_vat_rate: next.vatRate, invoice_footer: next.invoiceFooter,
      quote_prefix: next.quotePrefix, next_quote_number: next.nextQuoteNumber,
      quote_validity_days: next.quoteValidity, quote_footer: next.quoteFooter, currency: next.currency,
      show_contact_name_on_invoice: next.showContactName, show_phone_on_invoice: next.showPhone,
      show_email_on_invoice: next.showEmail, show_website_on_invoice: next.showWebsite,
      show_address_on_invoice: next.showAddress
    }).eq("user_id", user.id);
    if (error) throw error;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    message.textContent = "Company settings saved.";
    message.style.color = "#166534";
    window.dispatchEvent(new CustomEvent("jobpilot:company-ready"));
  } catch (error) {
    console.error("Company settings:", error);
    message.textContent = `Could not save settings: ${error?.message || error}`;
    message.style.color = "#b91c1c";
  } finally { button.disabled = false; }
}

window.renderManagementCompanyPage = renderManagementCompanyPage;
