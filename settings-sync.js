import { supabase } from "./supabase.js";

let lastSyncedUserId = null;
let syncInProgress = false;

const SETTINGS_KEY = "jobpilot_settings";

function mergeIntoLocalStorage(dbSettings) {
  const current = JSON.parse(
    localStorage.getItem(SETTINGS_KEY) || "{}"
  );

  const merged = {
    ...current,
    businessName: dbSettings.business_name ?? current.businessName ?? "",
    contactName: dbSettings.contact_name ?? current.contactName ?? "",
    phone: dbSettings.phone ?? current.phone ?? "",
    businessEmail: dbSettings.email ?? current.businessEmail ?? "",
    address: dbSettings.address_line1 ?? current.address ?? "",
    postcode: dbSettings.postcode ?? current.postcode ?? "",
    website: dbSettings.website ?? current.website ?? "",
    invoicePrefix: dbSettings.invoice_prefix ?? current.invoicePrefix ?? "INV-",
    nextInvoiceNumber: dbSettings.next_invoice_number ?? current.nextInvoiceNumber ?? 1,
    paymentTerms: dbSettings.invoice_payment_terms ?? current.paymentTerms ?? 30,
    vatRate: dbSettings.default_vat_rate ?? current.vatRate ?? 20,
    invoiceFooter: dbSettings.invoice_footer ?? current.invoiceFooter ?? "",
    quotePrefix: dbSettings.quote_prefix ?? current.quotePrefix ?? "QUO-",
    nextQuoteNumber: dbSettings.next_quote_number ?? current.nextQuoteNumber ?? 1,
    quoteValidity: dbSettings.quote_validity_days ?? current.quoteValidity ?? 30,
    quoteFooter: dbSettings.quote_footer ?? current.quoteFooter ?? "",
    currency: dbSettings.currency ?? current.currency ?? "GBP",
    showContactName: dbSettings.show_contact_name_on_invoice !== false,
    showPhone: dbSettings.show_phone_on_invoice !== false,
    showEmail: dbSettings.show_email_on_invoice !== false,
    showWebsite: dbSettings.show_website_on_invoice !== false,
    showAddress: dbSettings.show_address_on_invoice === true
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

function applyToSettingsForm(settings) {
  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element && value !== undefined && value !== null) {
      element.value = value;
    }
  };

  setValue("settingsBusinessName", settings.businessName);
  setValue("settingsContactName", settings.contactName);
  setValue("settingsPhone", settings.phone);
  setValue("settingsBusinessEmail", settings.businessEmail);
  setValue("settingsAddress", settings.address);
  setValue("settingsPostcode", settings.postcode);
  setValue("settingsWebsite", settings.website);
  setValue("settingsInvoicePrefix", settings.invoicePrefix);
  setValue("settingsNextInvoiceNumber", settings.nextInvoiceNumber);
  setValue("settingsPaymentTerms", settings.paymentTerms);
  setValue("settingsVatRate", settings.vatRate);
  setValue("settingsInvoiceFooter", settings.invoiceFooter);
  setValue("settingsQuotePrefix", settings.quotePrefix);
  setValue("settingsNextQuoteNumber", settings.nextQuoteNumber);
  setValue("settingsQuoteValidity", settings.quoteValidity);
  setValue("settingsQuoteFooter", settings.quoteFooter);
  setValue("settingsCurrency", settings.currency);

  const checks = {
    settingsShowContactName: settings.showContactName,
    settingsShowPhone: settings.showPhone,
    settingsShowEmail: settings.showEmail,
    settingsShowWebsite: settings.showWebsite,
    settingsShowAddress: settings.showAddress
  };

  for (const [id, checked] of Object.entries(checks)) {
    const element = document.getElementById(id);
    if (element) element.checked = checked;
  }
}

async function syncSettingsFromSupabase(force = false) {
  if (syncInProgress) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const settingsFormExists =
    document.getElementById("settingsBusinessName") ||
    document.getElementById("settingsShowAddress");

  if (!force && !settingsFormExists && lastSyncedUserId === user.id) {
    return;
  }

  syncInProgress = true;

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select(`
        business_name,
        contact_name,
        phone,
        email,
        website,
        address_line1,
        city,
        postcode,
        invoice_prefix,
        next_invoice_number,
        invoice_payment_terms,
        default_vat_rate,
        invoice_footer,
        quote_prefix,
        next_quote_number,
        quote_validity_days,
        quote_footer,
        currency,
        show_contact_name_on_invoice,
        show_phone_on_invoice,
        show_email_on_invoice,
        show_website_on_invoice,
        show_address_on_invoice
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Settings sync:", error);
      return;
    }

    if (!data) return;

    const settings = mergeIntoLocalStorage(data);
    applyToSettingsForm(settings);
    lastSyncedUserId = user.id;
  } finally {
    syncInProgress = false;
  }
}

// Sync after authentication changes.
supabase.auth.onAuthStateChange(() => {
  setTimeout(() => syncSettingsFromSupabase(true), 0);
});

// Detect when the Settings page is rendered by app.js.
const observer = new MutationObserver(() => {
  if (document.getElementById("settingsBusinessName")) {
    syncSettingsFromSupabase();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also try once when the script loads.
syncSettingsFromSupabase(true);
