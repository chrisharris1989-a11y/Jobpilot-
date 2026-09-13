import { getJobPilotAddressContext } from "../regional-address.js";

const REGIONAL_ADDRESS_SELECTORS = [
  "#customerAddress",
  "#customerCity",
  "#customerRegion",
  "#customerPostcode",
  "#customerCountryCode",
  "#companyAddress",
  "#companyCity",
  "#companyAddressRegion",
  "#companyPostcode"
];

function setLabelForInput(input, text) {
  const label = input?.previousElementSibling;
  if (label?.tagName === "LABEL" && label.textContent !== text) {
    label.textContent = text;
  }
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
    if (placeholder && input.placeholder !== placeholder) input.placeholder = placeholder;
    if (input.autocomplete !== autocomplete) input.autocomplete = autocomplete;
  });

  const country = root.querySelector("#customerCountryCode");
  if (country && country.value !== context.countryCode) {
    country.value = context.countryCode;
  }
}

function nodeContainsRegionalAddressField(node) {
  if (!(node instanceof Element)) return false;

  return REGIONAL_ADDRESS_SELECTORS.some(selector => {
    try {
      return node.matches(selector) || Boolean(node.querySelector(selector));
    } catch {
      return false;
    }
  });
}

function init() {
  const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node =>
        nodeContainsRegionalAddressField(node)
      )
    );

    if (relevant) applyRegionalAddressInputs();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  applyRegionalAddressInputs();
  window.addEventListener("jobpilot:preferences-changed", () => applyRegionalAddressInputs());
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
