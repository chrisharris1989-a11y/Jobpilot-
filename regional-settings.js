// JobPilot regional configuration foundation.
// Phase 1 intentionally supports English-speaking markets only.
// Keep shared product functionality country-neutral; regional behaviour can be
// enabled against these settings in later phases without changing core modules.

export const JOBPILOT_ENGLISH_MARKETS = Object.freeze({
  GB: Object.freeze({
    countryCode: "GB",
    countryName: "United Kingdom",
    locale: "en-GB",
    currency: "GBP",
    timezone: "Europe/London",
    dateFormat: "DD/MM/YYYY",
    phoneCountryCode: "GB",
    phoneCallingCode: "+44"
  }),
  AU: Object.freeze({
    countryCode: "AU",
    countryName: "Australia",
    locale: "en-AU",
    currency: "AUD",
    timezone: "Australia/Sydney",
    dateFormat: "DD/MM/YYYY",
    phoneCountryCode: "AU",
    phoneCallingCode: "+61"
  }),
  NZ: Object.freeze({
    countryCode: "NZ",
    countryName: "New Zealand",
    locale: "en-NZ",
    currency: "NZD",
    timezone: "Pacific/Auckland",
    dateFormat: "DD/MM/YYYY",
    phoneCountryCode: "NZ",
    phoneCallingCode: "+64"
  }),
  IE: Object.freeze({
    countryCode: "IE",
    countryName: "Ireland",
    locale: "en-IE",
    currency: "EUR",
    timezone: "Europe/Dublin",
    dateFormat: "DD/MM/YYYY",
    phoneCountryCode: "IE",
    phoneCallingCode: "+353"
  }),
  CA: Object.freeze({
    countryCode: "CA",
    countryName: "Canada",
    locale: "en-CA",
    currency: "CAD",
    timezone: "America/Toronto",
    dateFormat: "YYYY-MM-DD",
    phoneCountryCode: "CA",
    phoneCallingCode: "+1"
  }),
  US: Object.freeze({
    countryCode: "US",
    countryName: "United States",
    locale: "en-US",
    currency: "USD",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    phoneCountryCode: "US",
    phoneCallingCode: "+1"
  })
});

export const DEFAULT_JOBPILOT_MARKET = JOBPILOT_ENGLISH_MARKETS.GB;

export function getJobPilotMarket(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  return JOBPILOT_ENGLISH_MARKETS[code] || null;
}

export function isSupportedJobPilotMarket(countryCode) {
  return Boolean(getJobPilotMarket(countryCode));
}

export function getDefaultRegionalSettings(countryCode = "GB") {
  return getJobPilotMarket(countryCode) || DEFAULT_JOBPILOT_MARKET;
}
