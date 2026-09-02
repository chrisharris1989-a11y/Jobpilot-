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
}

const observer = new MutationObserver(removeSettingsAdminSections);
observer.observe(document.body, { childList: true, subtree: true });

removeSettingsAdminSections();
