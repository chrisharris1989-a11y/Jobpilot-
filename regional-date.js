// Central JobPilot date formatting utilities.
// Display dates always follow the locale selected in Settings → App Preferences.

const SETTINGS_KEY = "jobpilot_settings";
const APP_PREFERENCES_KEY = "jobpilot_app_preferences";
const DEFAULT_LOCALE = "en-GB";

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
  const timezone = String(getSettings().timezone || "").trim();
  return timezone || undefined;
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatJobPilotDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";

  const locale = options.locale || getJobPilotLocale();
  const style = options.style || "short";
  const intlOptions = style === "long"
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    : style === "medium"
      ? { day: "numeric", month: "short", year: "numeric" }
      : { day: "numeric", month: "numeric", year: "numeric" };

  if (options.timezone !== false) {
    const timezone = options.timezone || getJobPilotTimezone();
    if (timezone) intlOptions.timeZone = timezone;
  }

  try {
    return new Intl.DateTimeFormat(locale, intlOptions).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, intlOptions).format(date);
  }
}

function formatJobPilotMonthYear(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";
  const locale = options.locale || getJobPilotLocale();
  const intlOptions = { month: "long", year: "numeric" };
  const timezone = options.timezone || getJobPilotTimezone();
  if (timezone) intlOptions.timeZone = timezone;

  try {
    return new Intl.DateTimeFormat(locale, intlOptions).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, intlOptions).format(date);
  }
}

function formatJobPilotDateTime(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";
  const locale = options.locale || getJobPilotLocale();
  const intlOptions = {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  };
  const timezone = options.timezone || getJobPilotTimezone();
  if (timezone) intlOptions.timeZone = timezone;

  try {
    return new Intl.DateTimeFormat(locale, intlOptions).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, intlOptions).format(date);
  }
}

function formatJobPilotDateForInput(value) {
  const date = toDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

window.JobPilotDate = Object.freeze({
  getLocale: getJobPilotLocale,
  getTimezone: getJobPilotTimezone,
  formatDate: formatJobPilotDate,
  formatMonthYear: formatJobPilotMonthYear,
  formatDateTime: formatJobPilotDateTime,
  formatDateForInput: formatJobPilotDateForInput
});

window.addEventListener("jobpilot:preferences-changed", () => {
  window.dispatchEvent(new CustomEvent("jobpilot:date-format-changed"));
});
