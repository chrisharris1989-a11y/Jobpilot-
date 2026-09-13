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

export const JOBPILOT_REGIONAL_TIMEZONES = Object.freeze({
  GB: Object.freeze([
    Object.freeze({ value: "Europe/London", label: "UK time" })
  ]),
  AU: Object.freeze([
    Object.freeze({ value: "Australia/Sydney", label: "Eastern Australia" }),
    Object.freeze({ value: "Australia/Adelaide", label: "Central Australia" }),
    Object.freeze({ value: "Australia/Brisbane", label: "Queensland" }),
    Object.freeze({ value: "Australia/Darwin", label: "Northern Territory" }),
    Object.freeze({ value: "Australia/Perth", label: "Western Australia" })
  ]),
  NZ: Object.freeze([
    Object.freeze({ value: "Pacific/Auckland", label: "New Zealand" })
  ]),
  IE: Object.freeze([
    Object.freeze({ value: "Europe/Dublin", label: "Ireland" })
  ]),
  CA: Object.freeze([
    Object.freeze({ value: "America/St_Johns", label: "Newfoundland" }),
    Object.freeze({ value: "America/Halifax", label: "Atlantic" }),
    Object.freeze({ value: "America/Toronto", label: "Eastern" }),
    Object.freeze({ value: "America/Winnipeg", label: "Central" }),
    Object.freeze({ value: "America/Regina", label: "Saskatchewan" }),
    Object.freeze({ value: "America/Edmonton", label: "Mountain" }),
    Object.freeze({ value: "America/Vancouver", label: "Pacific" }),
    Object.freeze({ value: "America/Whitehorse", label: "Yukon" })
  ]),
  US: Object.freeze([
    Object.freeze({ value: "America/New_York", label: "Eastern" }),
    Object.freeze({ value: "America/Chicago", label: "Central" }),
    Object.freeze({ value: "America/Denver", label: "Mountain" }),
    Object.freeze({ value: "America/Phoenix", label: "Arizona (Mountain, no DST)" }),
    Object.freeze({ value: "America/Los_Angeles", label: "Pacific" }),
    Object.freeze({ value: "America/Anchorage", label: "Alaska" }),
    Object.freeze({ value: "Pacific/Honolulu", label: "Hawaii" })
  ])
});

export const DEFAULT_JOBPILOT_MARKET = JOBPILOT_ENGLISH_MARKETS.GB;

export function getJobPilotMarket(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  return JOBPILOT_ENGLISH_MARKETS[code] || null;
}

export function isSupportedJobPilotMarket(countryCode) {
  return Boolean(getJobPilotMarket(countryCode));
}

export function getJobPilotRegionalTimezones(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  return JOBPILOT_REGIONAL_TIMEZONES[code] || [];
}

export function getDefaultRegionalSettings(countryCode = "GB") {
  return getJobPilotMarket(countryCode) || DEFAULT_JOBPILOT_MARKET;
}
