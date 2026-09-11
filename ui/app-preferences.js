import { supabase } from "../supabase.js";

const STORAGE_KEY = "jobpilot_app_preferences";
const DEFAULTS = {
  theme: "system",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  weekStarts: "monday",
  defaultJobStatus: "scheduled",
  autoCompleteRecurring: false,
  showCompletedJobs: true,
  invoicePaymentTerms: 7,
  quoteValidityDays: 7,
  rememberLastPage: true,
  defaultDashboard: "overview"
};

function readPreferences() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

function writePreferences(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("jobpilot:preferences-changed", { detail: next }));
}

function applyTheme(theme) {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("jp-dark-mode", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

applyTheme(readPreferences().theme);
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (readPreferences().theme === "system") applyTheme("system");
});

async function loadInvoiceAndQuoteDefaults() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase
    .from("user_settings")
    .select("invoice_payment_terms,quote_validity_days")
    .eq("user_id", user.id)
    .maybeSingle();
  return {
    invoicePaymentTerms: Number(data?.invoice_payment_terms) || undefined,
    quoteValidityDays: Number(data?.quote_validity_days) || undefined
  };
}

async function saveBillingDefaults(user, invoicePaymentTerms, quoteValidityDays) {
  const { error } = await supabase
    .from("user_settings")
    .update({
      invoice_payment_terms: Number(invoicePaymentTerms),
      quote_validity_days: Number(quoteValidityDays)
    })
    .eq("user_id", user.id);
  if (error) throw error;
}

function preferenceRow(label, control, description = "") {
  return `<div class="jp-pref-row"><div class="jp-pref-copy"><strong>${label}</strong>${description ? `<small>${description}</small>` : ""}</div>${control}</div>`;
}

async function renderAppPreferences(content) {
  const local = readPreferences();
  const billing = await loadInvoiceAndQuoteDefaults();
  const prefs = { ...local, ...Object.fromEntries(Object.entries(billing).filter(([, value]) => value !== undefined)) };

  writePreferences(prefs);
  applyTheme(prefs.theme);

  content.innerHTML = `
    <section class="settings-page jp-settings-page jp-app-preferences">
      <header class="page-header"><h2>App Preferences</h2><p>Control how JobPilot looks and behaves for you.</p></header>
      <button class="jp-settings-back" type="button" data-pref-back>← Settings</button>

      <div class="jp-pref-section">
        <h3>Appearance</h3>
        ${preferenceRow("Theme", `<select id="jpPrefTheme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>`, "Choose the appearance used by JobPilot.")}
      </div>

      <div class="jp-pref-section">
        <h3>Date &amp; Time</h3>
        ${preferenceRow("Date format", `<select id="jpPrefDateFormat"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select>`)}
        ${preferenceRow("Time format", `<select id="jpPrefTimeFormat"><option value="24h">24-hour</option><option value="12h">12-hour</option></select>`)}
        ${preferenceRow("Week starts", `<select id="jpPrefWeekStarts"><option value="monday">Monday</option><option value="sunday">Sunday</option></select>`)}
      </div>

      <div class="jp-pref-section">
        <h3>Jobs</h3>
        ${preferenceRow("Default job status", `<select id="jpPrefJobStatus"><option value="scheduled">Scheduled</option><option value="pending">Pending</option><option value="in_progress">In Progress</option></select>`, "Status used when creating a new job.")}
        ${preferenceRow("Automatically complete recurring jobs", `<label class="jp-pref-switch"><input id="jpPrefAutoRecurring" type="checkbox"><span></span></label>`, "Automatically mark recurring jobs complete when their normal completion flow is reached.")}
        ${preferenceRow("Show completed jobs in job lists", `<label class="jp-pref-switch"><input id="jpPrefShowCompleted" type="checkbox"><span></span></label>`)}
      </div>

      <div class="jp-pref-section">
        <h3>Quotes &amp; Invoices</h3>
        ${preferenceRow("Default invoice payment terms", `<select id="jpPrefInvoiceTerms"><option value="1">1 day</option><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>`, "Used as the default due date when creating an invoice.")}
        ${preferenceRow("Default quote validity", `<select id="jpPrefQuoteValidity"><option value="7">7 days</option><option value="14">14 days</option><option value="21">21 days</option><option value="30">30 days</option></select>`, "Used as the default expiry period when creating a quote.")}
      </div>

      <div class="jp-pref-section">
        <h3>Navigation</h3>
        ${preferenceRow("Remember last opened page", `<label class="jp-pref-switch"><input id="jpPrefRememberPage" type="checkbox"><span></span></label>`, "Return to the last page you were using when you reopen JobPilot.")}
        ${preferenceRow("Default dashboard view", `<select id="jpPrefDashboard"><option value="overview">Overview</option><option value="today">Today's Jobs</option><option value="calendar">Calendar</option></select>`)}
      </div>

      <div id="jpPrefStatus" class="jp-document-status" role="status" aria-live="polite"></div>
    </section>`;

  const set = (id, value) => { const el = content.querySelector(id); if (el) el.value = String(value); };
  set("#jpPrefTheme", prefs.theme);
  set("#jpPrefDateFormat", prefs.dateFormat);
  set("#jpPrefTimeFormat", prefs.timeFormat);
  set("#jpPrefWeekStarts", prefs.weekStarts);
  set("#jpPrefJobStatus", prefs.defaultJobStatus);
  set("#jpPrefInvoiceTerms", prefs.invoicePaymentTerms);
  set("#jpPrefQuoteValidity", prefs.quoteValidityDays);
  set("#jpPrefDashboard", prefs.defaultDashboard);
  [
    ["#jpPrefAutoRecurring", prefs.autoCompleteRecurring],
    ["#jpPrefShowCompleted", prefs.showCompletedJobs],
    ["#jpPrefRememberPage", prefs.rememberLastPage]
  ].forEach(([selector, checked]) => { const el = content.querySelector(selector); if (el) el.checked = Boolean(checked); });

  content.querySelector("[data-pref-back]")?.addEventListener("click", () => window.dispatchEvent(new CustomEvent("jobpilot:settings-home")));

  const save = async () => {
    const next = {
      theme: content.querySelector("#jpPrefTheme").value,
      dateFormat: content.querySelector("#jpPrefDateFormat").value,
      timeFormat: content.querySelector("#jpPrefTimeFormat").value,
      weekStarts: content.querySelector("#jpPrefWeekStarts").value,
      defaultJobStatus: content.querySelector("#jpPrefJobStatus").value,
      autoCompleteRecurring: content.querySelector("#jpPrefAutoRecurring").checked,
      showCompletedJobs: content.querySelector("#jpPrefShowCompleted").checked,
      invoicePaymentTerms: Number(content.querySelector("#jpPrefInvoiceTerms").value),
      quoteValidityDays: Number(content.querySelector("#jpPrefQuoteValidity").value),
      rememberLastPage: content.querySelector("#jpPrefRememberPage").checked,
      defaultDashboard: content.querySelector("#jpPrefDashboard").value
    };
    writePreferences(next);
    applyTheme(next.theme);

    const status = content.querySelector("#jpPrefStatus");
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (user) await saveBillingDefaults(user, next.invoicePaymentTerms, next.quoteValidityDays);
      status.textContent = "Preferences saved.";
      status.style.color = "#166534";
    } catch (error) {
      console.error("JobPilot app preferences:", error);
      status.textContent = error?.message || "Preferences saved locally, but billing defaults could not be saved.";
      status.style.color = "#b91c1c";
    }
  };

  content.querySelectorAll("select,input").forEach(el => el.addEventListener("change", save));
}

function showPreferences() {
  const content = document.getElementById("pageContent");
  if (content) renderAppPreferences(content).catch(error => console.error("JobPilot preferences:", error));
}

document.addEventListener("click", event => {
  const card = event.target.closest?.('[data-settings-section="app-preferences"]');
  if (!card) return;
  event.preventDefault();
  showPreferences();
});

document.addEventListener("jobpilot:settings-home", () => {
  const content = document.getElementById("pageContent");
  if (!content) return;
  // settings.js owns the settings landing page; reload the settings route so its existing renderer is used.
  const settingsButton = document.querySelector('[data-page="settings"], [data-nav="settings"]');
  if (settingsButton) settingsButton.click();
});

window.addEventListener("jobpilot:preferences-changed", event => {
  const prefs = event.detail || readPreferences();
  applyTheme(prefs.theme);
});
