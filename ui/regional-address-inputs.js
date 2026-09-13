import { getJobPilotAddressContext } from "../regional-address.js";

function applyRegionalAddressInputs(root = document) {
  const addressApi = window.JobPilotAddress;
  if (!addressApi) return;
  const context = getJobPilotAddressContext();

  const address = root.querySelector("#customerAddress");
  const city = root.querySelector("#customerCity");
  const postcode = root.querySelector("#customerPostcode");
  const region = root.querySelector("#customerRegion");
  const country = root.querySelector("#customerCountryCode");

  if (country) country.value = context.countryCode;
  if (address) {
    address.placeholder = "Street address";
    const label = address.previousElementSibling;
    if (label?.tagName === "LABEL") label.textContent = context.addressLabel;
  }
  if (city) {
    const label = city.previousElementSibling;
    if (label?.tagName === "LABEL") label.textContent = context.cityLabel;
  }
  if (region) {
    const label = region.previousElementSibling;
    if (label?.tagName === "LABEL") label.textContent = context.regionLabel;
    region.placeholder = context.regionPlaceholder;
  }
  if (postcode) {
    const label = postcode.previousElementSibling;
    if (label?.tagName === "LABEL") label.textContent = context.postalLabel;
    postcode.placeholder = context.postalPlaceholder;
    postcode.autocomplete = "postal-code";
    postcode.dataset.regionalAddress = "true";
  }
}

function init() {
  const observer = new MutationObserver(() => applyRegionalAddressInputs());
  observer.observe(document.body, { childList: true, subtree: true });
  applyRegionalAddressInputs();
  window.addEventListener("jobpilot:preferences-changed", () => applyRegionalAddressInputs());
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
