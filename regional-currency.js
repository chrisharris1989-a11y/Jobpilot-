// JobPilot regional currency utilities.
// Phase 1 keeps existing UK behaviour intact while allowing financial displays
// to follow the currency selected in Settings → App Preferences.

const SETTINGS_KEY = "jobpilot_settings";
const DEFAULT_CURRENCY = "GBP";
const SUPPORTED_CURRENCIES = Object.freeze(["GBP", "AUD", "NZD", "EUR", "CAD", "USD"]);

function readLocalSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function storeCurrency(currency) {
  const normalized = String(currency || "").trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(normalized)) return;
  const current = readLocalSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, currency: normalized }));
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

window.JobPilotCurrency = Object.freeze({
  getCurrency: getJobPilotCurrency,
  formatMoney: formatJobPilotMoney,
  getSymbol: getJobPilotCurrencySymbol,
  getSupportedCurrencies: getSupportedJobPilotCurrencies
});
