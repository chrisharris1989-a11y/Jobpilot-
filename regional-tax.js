// JobPilot regional tax configuration.
// Tax terminology and defaults follow the selected business country.
// Rates are configurable business defaults, not legal/tax advice.

export const JOBPILOT_TAX_PROFILES = Object.freeze({
  GB: Object.freeze({ countryCode:"GB", taxSystem:"VAT", taxLabel:"VAT", defaultRate:20, registrationLabel:"VAT Number", enabledByDefault:true }),
  AU: Object.freeze({ countryCode:"AU", taxSystem:"GST", taxLabel:"GST", defaultRate:10, registrationLabel:"ABN / GST Number", enabledByDefault:false }),
  NZ: Object.freeze({ countryCode:"NZ", taxSystem:"GST", taxLabel:"GST", defaultRate:15, registrationLabel:"NZBN / GST Number", enabledByDefault:false }),
  IE: Object.freeze({ countryCode:"IE", taxSystem:"VAT", taxLabel:"VAT", defaultRate:23, registrationLabel:"VAT Number", enabledByDefault:false }),
  CA: Object.freeze({ countryCode:"CA", taxSystem:"GST/HST", taxLabel:"GST/HST", defaultRate:0, registrationLabel:"GST/HST Number", enabledByDefault:false }),
  US: Object.freeze({ countryCode:"US", taxSystem:"SALES_TAX", taxLabel:"Sales Tax", defaultRate:0, registrationLabel:"Tax ID", enabledByDefault:false })
});

export const DEFAULT_JOBPILOT_TAX_PROFILE = JOBPILOT_TAX_PROFILES.GB;

export function getJobPilotTaxProfile(countryCode="GB") {
  const code=String(countryCode||"").trim().toUpperCase();
  return JOBPILOT_TAX_PROFILES[code] || DEFAULT_JOBPILOT_TAX_PROFILE;
}

export function getJobPilotTaxContext(settings={}) {
  const profile=getJobPilotTaxProfile(settings.countryCode || settings.country_code || "GB");
  const label=String(settings.taxLabel || settings.tax_label || profile.taxLabel).trim() || profile.taxLabel;
  const system=String(settings.taxSystem || settings.tax_system || profile.taxSystem).trim() || profile.taxSystem;
  const rate=Number.isFinite(Number(settings.taxRate ?? settings.tax_rate)) ? Number(settings.taxRate ?? settings.tax_rate) : profile.defaultRate;
  const enabled=typeof (settings.taxEnabled ?? settings.tax_enabled)==="boolean" ? Boolean(settings.taxEnabled ?? settings.tax_enabled) : profile.enabledByDefault;
  const registrationLabel=String(settings.taxRegistrationLabel || settings.tax_registration_label || profile.registrationLabel).trim() || profile.registrationLabel;
  return Object.freeze({ countryCode:profile.countryCode, taxSystem:system, taxLabel:label, taxRate:rate, taxEnabled:enabled, taxRegistrationLabel:registrationLabel, taxRegistrationNumber:String(settings.taxRegistrationNumber || settings.tax_registration_number || "").trim() });
}

// Expose a read-only context for any AI/request layer that needs regional tax context.
window.JobPilotRegionalTax = Object.freeze({
  profiles: JOBPILOT_TAX_PROFILES,
  getProfile: getJobPilotTaxProfile,
  getContext: getJobPilotTaxContext
});
