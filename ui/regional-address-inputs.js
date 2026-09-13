import { getJobPilotAddressContext } from "../regional-address.js";

function setLabelForInput(input, text) {
  const label = input?.previousElementSibling;
  if (label?.tagName === "LABEL") label.textContent = text;
}

function applyRegionalAddressInputs(root = document) {
  const addressApi = window.JobPilotAddress;
  if (!addressApi) return;
  const context = getJobPilotAddressContext();

  const fields = [
    ["#customerAddress", context.addressLabel, "Street address", "address-line1"],
    ["#customerCity", context.cityLabel, "", "address-level2"],
    ["#customerRegion", context.regionLabel, context.regionPlaceholder, "address-level1"],
    ["#customerPostcode", context.postalLabel, context.postalPlaceholder, "postal-code"],
    ["#companyAddress", context.addressLabel, "Street address", "address-line1"],
    ["#companyCity", context.cityLabel, "", "address-level2"],
    ["#companyAddressRegion", context.regionLabel, context.regionPlaceholder, "address-level1"],
    ["#companyPostcode", context.postalLabel, context.postalPlaceholder, "postal-code"]
  ];

  fields.forEach(([selector, label, placeholder, autocomplete]) => {
    const input = root.querySelector(selector);
    if (!input) return;
    setLabelForInput(input, label);
    if (placeholder) input.placeholder = placeholder;
    input.autocomplete = autocomplete;
  });

  const country = root.querySelector("#customerCountryCode");
  if (country) country.value = context.countryCode;
}

function init() {
  const observer = new MutationObserver(() => applyRegionalAddressInputs());
  observer.observe(document.body, { childList: true, subtree: true });
  applyRegionalAddressInputs();
  window.addEventListener("jobpilot:preferences-changed", () => applyRegionalAddressInputs());
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
