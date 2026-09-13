// JobPilot regional phone utilities.
// Phase 1 supports the English-speaking markets defined in regional-settings.js.
// Storage is normalised to an E.164-style value where the country is known.

import { getDefaultRegionalSettings } from "./regional-settings.js";

const PHONE_MARKETS = Object.freeze({
  GB: Object.freeze({ callingCode: "44", trunkPrefix: "0" }),
  AU: Object.freeze({ callingCode: "61", trunkPrefix: "0" }),
  NZ: Object.freeze({ callingCode: "64", trunkPrefix: "0" }),
  IE: Object.freeze({ callingCode: "353", trunkPrefix: "0" }),
  CA: Object.freeze({ callingCode: "1", trunkPrefix: "" }),
  US: Object.freeze({ callingCode: "1", trunkPrefix: "" })
});

function clean(value) {
  return String(value ?? "").trim().replace(/[\u00a0\s().-]/g, "").replace(/[^\d+]/g, "");
}

function getSettingsCountry(settings = {}) {
  return String(
    settings.countryCode ||
    settings.country_code ||
    settings.phoneCountryCode ||
    settings.phone_country_code ||
    "GB"
  ).trim().toUpperCase();
}

function getMarket(countryCode = "GB") {
  const code = String(countryCode || "GB").trim().toUpperCase();
  return PHONE_MARKETS[code] ? { countryCode: code, ...PHONE_MARKETS[code] } : { countryCode: "GB", ...PHONE_MARKETS.GB };
}

export function getJobPilotPhoneContext(settings = {}) {
  const countryCode = getSettingsCountry(settings);
  const market = getMarket(countryCode);
  const regional = getDefaultRegionalSettings(market.countryCode);
  return Object.freeze({
    countryCode: market.countryCode,
    callingCode: market.callingCode,
    trunkPrefix: market.trunkPrefix,
    locale: regional.locale,
    phoneCountryCode: regional.phoneCountryCode
  });
}

export function normalizeJobPilotPhone(value, settings = {}) {
  const raw = clean(value);
  if (!raw) return "";

  const context = getJobPilotPhoneContext(settings);
  let digits = raw.replace(/^\+/, "");

  // An explicitly international number is preserved and normalised without guessing its country.
  if (raw.startsWith("+")) return `+${digits}`;

  // Numbers already beginning with this market's calling code are treated as international.
  if (digits.startsWith(context.callingCode)) return `+${digits}`;

  // North American numbers are stored as +1 followed by the 10-digit number.
  if ((context.countryCode === "US" || context.countryCode === "CA") && digits.length === 10) {
    return `+1${digits}`;
  }

  if (context.trunkPrefix && digits.startsWith(context.trunkPrefix)) {
    digits = digits.slice(context.trunkPrefix.length);
  }

  return digits ? `+${context.callingCode}${digits}` : "";
}

export function getJobPilotPhoneDigits(value, settings = {}) {
  return normalizeJobPilotPhone(value, settings).replace(/\D/g, "");
}

function groupDigits(digits, groups) {
  const parts = [];
  let offset = 0;
  for (const size of groups) {
    if (offset >= digits.length) break;
    parts.push(digits.slice(offset, offset + size));
    offset += size;
  }
  if (offset < digits.length) parts.push(digits.slice(offset));
  return parts.join(" ");
}

export function formatJobPilotPhone(value, settings = {}) {
  const normalized = normalizeJobPilotPhone(value, settings);
  if (!normalized) return "";

  const context = getJobPilotPhoneContext(settings);
  const digits = normalized.replace(/\D/g, "");
  const national = digits.startsWith(context.callingCode)
    ? digits.slice(context.callingCode.length)
    : digits;

  let formatted;
  switch (context.countryCode) {
    case "GB":
      formatted = national.length >= 10 ? groupDigits(national, [4, 3, 4]) : groupDigits(national, [4, 3, 4]);
      break;
    case "AU":
      formatted = national.length === 9 && national.startsWith("4")
        ? groupDigits(national, [3, 3, 3])
        : groupDigits(national, [1, 4, 4]);
      break;
    case "NZ":
      formatted = national.length >= 8 && national.startsWith("2")
        ? groupDigits(national, [2, 3, 4])
        : groupDigits(national, [1, 4, 4]);
      break;
    case "IE":
      formatted = groupDigits(national, [2, 3, 4]);
      break;
    case "US":
    case "CA":
      formatted = national.length === 10
        ? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
        : groupDigits(national, [3, 3, 4]);
      break;
    default:
      formatted = groupDigits(national, [3, 3, 4]);
  }

  return `+${context.callingCode} ${formatted}`.trim();
}

export function getJobPilotPhonePlaceholder(settings = {}) {
  const context = getJobPilotPhoneContext(settings);
  const examples = {
    GB: "+44 7700 900123",
    AU: "+61 412 345 678",
    NZ: "+64 21 123 4567",
    IE: "+353 87 123 4567",
    CA: "+1 (416) 555-0123",
    US: "+1 (202) 555-0123"
  };
  return examples[context.countryCode] || examples.GB;
}

export function getJobPilotCurrentPhoneSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

window.JobPilotPhone = Object.freeze({
  getContext: getJobPilotPhoneContext,
  normalize: normalizeJobPilotPhone,
  digits: getJobPilotPhoneDigits,
  format: formatJobPilotPhone,
  placeholder: getJobPilotPhonePlaceholder,
  getSettings: getJobPilotCurrentPhoneSettings
});
