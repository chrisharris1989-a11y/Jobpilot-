// Central JobPilot date/time formatting utilities.
// Display dates and times follow Settings → App Preferences, including the
// selected regional timezone. Stored timestamps remain unchanged.

const SETTINGS_KEY = "jobpilot_settings";
const APP_PREFERENCES_KEY = "jobpilot_app_preferences";
const DEFAULT_LOCALE = "en-GB";
const DEFAULT_TIMEZONE = "Europe/London";

function readLocalSettings() {
  try {
    const legacy = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const preferences = JSON.parse(localStorage.getItem(APP_PREFERENCES_KEY) || "{}");
    return { ...legacy, ...preferences };
  } catch {
    return {};
  }
}

function getSettings() {
  return readLocalSettings();
}

function getJobPilotLocale(fallback = DEFAULT_LOCALE) {
  const settings = getSettings();
  return String(settings.locale || fallback).trim() || fallback;
}

function getJobPilotTimezone() {
  const timezone = String(getSettings().timezone || DEFAULT_TIMEZONE).trim();
  return timezone || DEFAULT_TIMEZONE;
}

function getJobPilotTimeFormat() {
  const format = String(getSettings().timeFormat || "24h").trim().toLowerCase();
  return format === "12h" ? "12h" : "24h";
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function applyTimezone(options, settings = getSettings()) {
  if (options.timezone !== false) {
    options.timeZone = options.timezone || String(settings.timezone || DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE;
  }
  return options;
}

function applyTimeFormat(options, settings = getSettings()) {
  options.hour12 = String(settings.timeFormat || "24h").trim().toLowerCase() === "12h";
  return options;
}

function formatWithFallback(locale, options, date) {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(date);
  }
}

function formatJobPilotDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";

  const settings = getSettings();
  const locale = options.locale || getJobPilotLocale();
  const style = options.style || "short";
  const intlOptions = style === "long"
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    : style === "medium"
      ? { day: "numeric", month: "short", year: "numeric" }
      : { day: "numeric", month: "numeric", year: "numeric" };

  applyTimezone(intlOptions, settings);
  return formatWithFallback(locale, intlOptions, date);
}

function formatJobPilotMonthYear(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";
  const settings = getSettings();
  const locale = options.locale || getJobPilotLocale();
  const intlOptions = { month: "long", year: "numeric" };
  applyTimezone(intlOptions, settings);
  return formatWithFallback(locale, intlOptions, date);
}

function formatJobPilotTime(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";
  const settings = getSettings();
  const locale = options.locale || getJobPilotLocale();
  const intlOptions = { hour: "numeric", minute: "2-digit" };
  applyTimeFormat(intlOptions, settings);
  applyTimezone(intlOptions, settings);
  return formatWithFallback(locale, intlOptions, date);
}

function formatJobPilotDateTime(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";
  const settings = getSettings();
  const locale = options.locale || getJobPilotLocale();
  const intlOptions = {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  };
  applyTimeFormat(intlOptions, settings);
  applyTimezone(intlOptions, settings);
  return formatWithFallback(locale, intlOptions, date);
}

function formatJobPilotDateForInput(value) {
  const date = toDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

window.JobPilotDate = Object.freeze({
  getLocale: getJobPilotLocale,
  getTimezone: getJobPilotTimezone,
  getTimeFormat: getJobPilotTimeFormat,
  formatDate: formatJobPilotDate,
  formatMonthYear: formatJobPilotMonthYear,
  formatTime: formatJobPilotTime,
  formatDateTime: formatJobPilotDateTime,
  formatDateForInput: formatJobPilotDateForInput
});

window.addEventListener("jobpilot:preferences-changed", () => {
  window.dispatchEvent(new CustomEvent("jobpilot:date-format-changed"));
});
