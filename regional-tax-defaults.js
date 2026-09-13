import { supabase } from "./supabase.js";
import { getJobPilotTaxProfile } from "./regional-tax.js";

const SETTINGS_KEY = "jobpilot_settings";

function syncLegacySettings(profile) {
  try {
    const current = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      ...current,
      vatRate: profile.defaultRate,
      taxRate: profile.defaultRate,
      taxLabel: profile.taxLabel,
      taxSystem: profile.taxSystem,
      taxEnabled: profile.enabledByDefault
    }));
  } catch {}
}

async function syncRegionalTaxDefaults(countryCode) {
  const profile = getJobPilotTaxProfile(countryCode || "GB");
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return profile;

  const { error } = await supabase.from("user_settings").update({
    default_vat_rate: profile.defaultRate,
    tax_system: profile.taxSystem,
    tax_label: profile.taxLabel,
    tax_rate: profile.defaultRate,
    tax_enabled: profile.enabledByDefault
  }).eq("user_id", user.id);

  if (error) {
    console.error("JobPilot regional tax defaults:", error);
    return profile;
  }

  syncLegacySettings(profile);
  window.JobPilotRegionalTaxSettings = {
    ...(window.JobPilotRegionalTaxSettings || {}),
    country_code: countryCode || "GB",
    tax_system: profile.taxSystem,
    tax_label: profile.taxLabel,
    tax_rate: profile.defaultRate,
    default_vat_rate: profile.defaultRate,
    tax_enabled: profile.enabledByDefault
  };
  window.dispatchEvent(new CustomEvent("jobpilot:tax-settings-changed", {
    detail: window.JobPilotRegionalTaxSettings
  }));

  return profile;
}

function updateVisibleTaxLabels(profile) {
  if (!profile || profile.taxLabel === "VAT") return;

  document.querySelectorAll("label, h2, h3, p, span, div").forEach(node => {
    if (node.children.length) return;
    const text = node.textContent || "";
    if (!/VAT/i.test(text)) return;
    node.textContent = text.replace(/VAT/gi, profile.taxLabel);
  });
}

async function apply() {
  const country = document.getElementById("jpPrefCountry")?.value || "GB";
  const profile = await syncRegionalTaxDefaults(country);
  updateVisibleTaxLabels(profile);
}

function start() {
  if (!document.body) return;

  void apply();

  const observer = new MutationObserver(() => {
    const country = document.getElementById("jpPrefCountry")?.value || "GB";
    updateVisibleTaxLabels(getJobPilotTaxProfile(country));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("change", event => {
    if (event.target?.id === "jpPrefCountry") void apply();
  });

  window.addEventListener("jobpilot:tax-settings-changed", event => {
    const country = event.detail?.country_code || document.getElementById("jpPrefCountry")?.value || "GB";
    updateVisibleTaxLabels(getJobPilotTaxProfile(country));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
