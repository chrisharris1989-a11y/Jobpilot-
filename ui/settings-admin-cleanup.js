import { supabase } from "../supabase.js";

// Keep Settings focused on personal/app preferences.
// Company, connections/accounting and billing administration live under Management.

const REMOVED_SETTINGS_IDS = [
  "jobpilot-subscription-section",
  "jobpilot-accounting-group",
  "jobpilot-payments-group"
];

const REMOVED_SETTINGS_HEADINGS = new Set([
  "Business Details",
  "Connections",
  "📚 Accounting",
  "💳 Payments",
  "Subscription",
  "Invoice Settings",
  "Quote Settings",
  "Customer Invoice Information"
]);

function isSettingsPage() {
  return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
}

async function hasQuoteMessageAccess() {
  try {
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
      console.error("JobPilot quote message access:", error);
      return false;
    }

    return ["owner", "admin"].includes(String(data?.role || "").toLowerCase());
  } catch (error) {
    console.error("JobPilot quote message access:", error);
    return false;
  }
}

function preserveDocumentSettings() {
  const panel = document.querySelector(".settings-panel");
  if (!panel) return;

  const settings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
  const values = {
    settingsInvoicePrefix: settings.invoicePrefix || "INV-",
    settingsNextInvoiceNumber: settings.nextInvoiceNumber || 1,
    settingsPaymentTerms: settings.paymentTerms || 30,
    settingsVatRate: settings.vatRate ?? 20,
    settingsInvoiceFooter: settings.invoiceFooter || "",
    settingsQuotePrefix: settings.quotePrefix || "QUO-",
    settingsNextQuoteNumber: settings.nextQuoteNumber || 1,
    settingsQuoteValidity: settings.quoteValidity || 30,
    settingsQuoteFooter: settings.quoteFooter || ""
  };

  Object.entries(values).forEach(([id, value]) => {
    if (document.getElementById(id)) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.id = id;
    input.value = value;
    panel.appendChild(input);
  });
}

async function installQuoteMessageSettings() {
  if (!isSettingsPage()) return;

  const existing = document.getElementById("jobpilot-quote-message-settings");
  if (existing) return;

  // Quote message configuration is a management/company setting.
  // Normal users (members) must not see it.
  if (!(await hasQuoteMessageAccess())) return;

  const panel = document.querySelector(".settings-panel");
  if (!panel) return;

  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
  } catch {}

  const defaultTemplate = [
    "Hi {customer_name},",
    "",
    "Please find your quote from {business_name}.",
    "",
    "Quote #{quote_number}",
    "Amount: £{quote_total}",
    "Valid until: {valid_until}",
    "",
    "Please let us know if you would like to go ahead.",
    "",
    "Thank you."
  ].join("\n");

  const section = document.createElement("section");
  section.id = "jobpilot-quote-message-settings";
  section.className = "settings-section";
  section.innerHTML = `
    <h2>Quote Message</h2>
    <p class="muted">Customise the message that is pre-filled when you send a quote by WhatsApp.</p>
    <label for="jobpilotQuoteMessageTemplate">Message template</label>
    <textarea id="jobpilotQuoteMessageTemplate" rows="10" style="width:100%;resize:vertical" placeholder="Enter your quote message...">${escapeHtml(settings.quoteMessageTemplate || defaultTemplate)}</textarea>
    <p class="muted" style="margin:8px 0 0;font-size:13px">
      Available placeholders: {customer_name}, {quote_number}, {quote_total}, {valid_until}, {business_name}
    </p>
    <div style="display:flex;justify-content:flex-end;margin-top:14px">
      <button id="jobpilotSaveQuoteMessage" class="button primary" type="button">Save Quote Message</button>
    </div>
    <div id="jobpilotQuoteMessageStatus" class="muted" style="margin-top:8px"></div>
  `;

  panel.insertBefore(section, panel.firstElementChild);

  document.getElementById("jobpilotSaveQuoteMessage")?.addEventListener("click", () => {
    const textarea = document.getElementById("jobpilotQuoteMessageTemplate");
    const status = document.getElementById("jobpilotQuoteMessageStatus");
    if (!textarea) return;

    const value = textarea.value.trim() || defaultTemplate;
    try {
      const current = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
      current.quoteMessageTemplate = value;
      localStorage.setItem("jobpilot_settings", JSON.stringify(current));
      window.dispatchEvent(new Event("jobpilot-settings-updated"));
      if (status) {
        status.textContent = "Quote message saved.";
        status.style.color = "#16a34a";
      }
    } catch (error) {
      console.error("JobPilot quote message settings:", error);
      if (status) {
        status.textContent = "Could not save the quote message.";
        status.style.color = "#dc2626";
      }
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendCustomQuote(quoteId, button) {
  button.disabled = true;
  button.textContent = "Sending…";

  try {
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, customer_id, quote_number, description, total, valid_until, status")
      .eq("id", quoteId)
      .maybeSingle();

    if (quoteError) throw quoteError;
    if (!quote) throw new Error("Quote could not be found.");
    if (String(quote.status).toLowerCase() === "converted") {
      throw new Error("This quote has already been converted to a job.");
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("id", quote.customer_id)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!customer) throw new Error("The customer attached to this quote could not be found.");
    if (!customer.phone) throw new Error("This customer does not have a phone number saved.");

    let whatsappNumber = customer.phone.replace(/\D/g, "");
    if (whatsappNumber.startsWith("0")) whatsappNumber = "44" + whatsappNumber.substring(1);

    let settings = {};
    try { settings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}"); } catch {}

    const defaultTemplate = [
      "Hi {customer_name},",
      "",
      "Please find your quote from {business_name}.",
      "",
      "Quote #{quote_number}",
      "Amount: £{quote_total}",
      "Valid until: {valid_until}",
      "",
      "Please let us know if you would like to go ahead.",
      "",
      "Thank you."
    ].join("\n");

    const template = String(settings.quoteMessageTemplate || defaultTemplate);

    const replacements = {
      "{customer_name}": customer.name || "Customer",
      "{quote_number}": quote.quote_number || "—",
      "{quote_total}": Number(quote.total || 0).toFixed(2),
      "{valid_until}": quote.valid_until || "",
      "{business_name}": settings.businessName || "our business"
    };

    const message = template.replace(/\{customer_name\}|\{quote_number\}|\{quote_total\}|\{valid_until\}|\{business_name\}/g, match => replacements[match]);

    const { error: statusError } = await supabase
      .from("quotes")
      .update({ status: "sent" })
      .eq("id", quote.id);

    if (statusError) throw statusError;

    window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  } catch (error) {
    console.error("JobPilot send quote:", error);
    alert(error.message || "The quote could not be sent.");
    button.disabled = false;
    button.textContent = "📤 Send Quote";
  }
}

function installCustomQuoteSendButtons() {
  document.querySelectorAll(".quote-send[data-quote-id]").forEach(originalButton => {
    if (originalButton.dataset.quoteMessageCustomized === "true") return;

    const button = originalButton.cloneNode(true);
    button.dataset.quoteMessageCustomized = "true";
    originalButton.replaceWith(button);

    button.addEventListener("click", event => {
      event.stopPropagation();
      sendCustomQuote(button.dataset.quoteId, button);
    });
  });
}

function removeSettingsAdminSections() {
  if (!isSettingsPage()) return;

  REMOVED_SETTINGS_IDS.forEach(id => document.getElementById(id)?.remove());

  // Connections is a top-level navigation item. It must never be removed here.
  // Only remove old Connections content if it is actually inside Settings.
  document.querySelectorAll(".settings-section, .settings-group, .settings-card, .connection-group, section").forEach(section => {
    const heading = section.querySelector(":scope > h2, :scope > h3")?.textContent.trim();
    if (heading && REMOVED_SETTINGS_HEADINGS.has(heading)) section.remove();
  });

  // Remove document/invoice sections if they are rendered directly in the Settings panel.
  document.querySelectorAll(".settings-panel h2").forEach(heading => {
    const text = heading.textContent.trim();
    if (!REMOVED_SETTINGS_HEADINGS.has(text)) return;

    let node = heading;
    while (node) {
      const next = node.nextElementSibling;
      node.remove();
      if (!next) break;
      if (next.tagName === "HR") {
        next.remove();
        break;
      }
      if (next.tagName === "H2") break;
      node = next;
    }
  });

  document.getElementById("jobpilot-subscription-section")?.remove();
  preserveDocumentSettings();
  installQuoteMessageSettings();
  installCustomQuoteSendButtons();
}

const observer = new MutationObserver(removeSettingsAdminSections);
observer.observe(document.body, { childList: true, subtree: true });

removeSettingsAdminSections();
