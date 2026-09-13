import { getJobPilotAddressContext } from "../regional-address.js";

function applyRegionalAddressInputs(root = document) {
  const addressApi = window.JobPilotAddress;
  if (!addressApi) return;
  const context = getJobPilotAddressContext();

  const address = root.querySelector("#customerAddress");
  const city = root.querySelector("#customerCity");
  const postcode = root.querySelector("#customerPostcode");
  const region = root.querySelector("#customerRegion");

  if (address) {
    address.placeholder = context.countryCode === "GB" ? "Street address" : "Street address";
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

function ensureCustomerAddressRegionField() {
  const postcode = document.getElementById("customerPostcode");
  if (!postcode || document.getElementById("customerRegion")) return;
  const label = document.createElement("label");
  label.textContent = "County";
  const input = document.createElement("input");
  input.id = "customerRegion";
  input.autocomplete = "address-level1";
  postcode.parentElement?.insertBefore(label, postcode);
  postcode.parentElement?.insertBefore(input, postcode);
}

function init() {
  const observer = new MutationObserver(() => {
    ensureCustomerAddressRegionField();
    applyRegionalAddressInputs();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  ensureCustomerAddressRegionField();
  applyRegionalAddressInputs();
  window.addEventListener("jobpilot:preferences-changed", () => applyRegionalAddressInputs());
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
