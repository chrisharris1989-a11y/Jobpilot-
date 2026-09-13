// Central JobPilot address configuration.
// Keeps address labels, postal-code conventions and regional defaults
// consistent across supported English-speaking markets.

const REGIONAL_ADDRESSES = Object.freeze({
  GB: Object.freeze({
    countryCode: "GB",
    addressLabel: "Address",
    cityLabel: "Town / City",
    regionLabel: "County",
    postalLabel: "Postcode",
    postalPlaceholder: "e.g. CB8 8AA",
    regionPlaceholder: "e.g. Suffolk"
  }),
  AU: Object.freeze({
    countryCode: "AU",
    addressLabel: "Street address",
    cityLabel: "Suburb / City",
    regionLabel: "State / Territory",
    postalLabel: "Postcode",
    postalPlaceholder: "e.g. 2000",
    regionPlaceholder: "e.g. NSW"
  }),
  NZ: Object.freeze({
    countryCode: "NZ",
    addressLabel: "Street address",
    cityLabel: "Town / City",
    regionLabel: "Region",
    postalLabel: "Postcode",
    postalPlaceholder: "e.g. 6011",
    regionPlaceholder: "e.g. Wellington"
  }),
  IE: Object.freeze({
    countryCode: "IE",
    addressLabel: "Address",
    cityLabel: "Town / City",
    regionLabel: "County",
    postalLabel: "Eircode",
    postalPlaceholder: "e.g. D02 X285",
    regionPlaceholder: "e.g. Dublin"
  }),
  CA: Object.freeze({
    countryCode: "CA",
    addressLabel: "Street address",
    cityLabel: "City / Town",
    regionLabel: "Province / Territory",
    postalLabel: "Postal code",
    postalPlaceholder: "e.g. M5V 3A8",
    regionPlaceholder: "e.g. Ontario"
  }),
  US: Object.freeze({
    countryCode: "US",
    addressLabel: "Street address",
    cityLabel: "City",
    regionLabel: "State",
    postalLabel: "ZIP code",
    postalPlaceholder: "e.g. 10001",
    regionPlaceholder: "e.g. New York"
  })
});

export function getJobPilotAddressConfig(countryCode = "GB") {
  const code = String(countryCode || "").trim().toUpperCase();
  return REGIONAL_ADDRESSES[code] || REGIONAL_ADDRESSES.GB;
}

export function getJobPilotCurrentAddressSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("jobpilot_app_preferences") || "{}");
    return settings && typeof settings === "object" ? settings : {};
  } catch {
    return {};
  }
}

export function getJobPilotAddressContext(settings = getJobPilotCurrentAddressSettings()) {
  const countryCode = String(settings?.countryCode || "GB").trim().toUpperCase();
  return {
    ...getJobPilotAddressConfig(countryCode),
    countryCode
  };
}

export function normalizeJobPilotPostalCode(value, countryCode = "GB") {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  const code = String(countryCode || "GB").trim().toUpperCase();
  if (!raw) return "";
  if (code === "GB" || code === "IE" || code === "CA" || code === "NZ") return raw.toUpperCase();
  return raw;
}

export function formatJobPilotAddress(address = {}, options = {}) {
  const countryCode = String(address.address_country_code || options.countryCode || "GB").trim().toUpperCase();
  const config = getJobPilotAddressConfig(countryCode);
  return [
    address.address_line1,
    address.address_line2,
    address.city,
    address.address_region,
    address.postcode,
    options.includeCountry ? countryCode : null
  ].filter(Boolean).join("\n");
}

window.JobPilotAddress = Object.freeze({
  getConfig: getJobPilotAddressConfig,
  getContext: getJobPilotAddressContext,
  normalizePostalCode: normalizeJobPilotPostalCode,
  format: formatJobPilotAddress
});
