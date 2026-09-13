// JobPilot regional currency utilities.
// Phase 1 keeps existing UK behaviour intact while allowing financial displays
// to follow the currency selected in Settings → App Preferences.

const SETTINGS_KEY = "jobpilot_settings";
const APP_PREFERENCES_KEY = "jobpilot_app_preferences";
const DEFAULT_CURRENCY = "GBP";
const SUPPORTED_CURRENCIES = Object.freeze(["GBP", "AUD", "NZD", "EUR", "CAD", "USD"]);

function readLocalSettings() {
  try {
    const legacy = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const preferences = JSON.parse(localStorage.getItem(APP_PREFERENCES_KEY) || "{}");
    return { ...legacy, ...preferences };
  } catch {
    return {};
  }
}

function storeCurrency(currency) {
  const normalized = String(currency || "").trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(normalized)) return;

  try {
    const preferences = JSON.parse(localStorage.getItem(APP_PREFERENCES_KEY) || "{}");
    localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify({ ...preferences, currency: normalized }));
  } catch {
    localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify({ currency: normalized }));
  }

  window.dispatchEvent(new CustomEvent("jobpilot:currency-changed", { detail: { currency: normalized } }));
}

export function getJobPilotCurrency(fallback = DEFAULT_CURRENCY) {
  const currency = String(readLocalSettings().currency || "").trim().toUpperCase();
  return SUPPORTED_CURRENCIES.includes(currency) ? currency : fallback;
}

export function formatJobPilotMoney(value, options = {}) {
  const currency = options.currency || getJobPilotCurrency();
  const locale = options.locale || readLocalSettings().locale || "en-GB";
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: options.minimumFractionDigits ?? 2,
      maximumFractionDigits: options.maximumFractionDigits ?? 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function getJobPilotCurrencySymbol(currency = getJobPilotCurrency()) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol"
    }).formatToParts(0).find(part => part.type === "currency")?.value || currency;
  } catch {
    return currency;
  }
}

export function getSupportedJobPilotCurrencies() {
  return [...SUPPORTED_CURRENCIES];
}

document.addEventListener("change", event => {
  if (event.target?.id === "jpPrefCurrency") storeCurrency(event.target.value);
});

window.addEventListener("jobpilot:preferences-changed", event => {
  const currency = event.detail?.currency;
  if (currency) storeCurrency(currency);
});

window.JobPilotCurrency = Object.freeze({
  getCurrency: getJobPilotCurrency,
  formatMoney: formatJobPilotMoney,
  getSymbol: getJobPilotCurrencySymbol,
  getSupportedCurrencies: getSupportedJobPilotCurrencies
});
