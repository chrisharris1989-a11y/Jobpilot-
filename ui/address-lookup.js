import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "../regional-address.js";

const FIELD_GROUPS = [
  { postcode: "#customerPostcode", address: "#customerAddress", address2: "#customerAddress2", city: "#customerCity", region: "#customerRegion", country: "#customerCountryCode" },
  { postcode: "#companyPostcode", address: "#companyAddress", address2: "#companyAddress2", city: "#companyCity", region: "#companyAddressRegion", country: null }
];

function getCountryCode(group) {
  if (group.country) return document.querySelector(group.country)?.value || getJobPilotAddressContext().countryCode;
  return getJobPilotAddressContext().countryCode;
}

function removeExistingPicker(postcodeInput) { postcodeInput?.parentElement?.querySelector(".jobpilot-address-lookup")?.remove(); }

function createLookupUi(group, postcodeInput) {
  removeExistingPicker(postcodeInput);
  const wrapper = document.createElement("div");
  wrapper.className = "jobpilot-address-lookup";
  wrapper.style.marginTop = "6px";

  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.style.fontSize = "12px";
  status.style.margin = "2px 0 6px";
  status.style.opacity = "0.75";
  status.textContent = "Enter a postcode and use your address lookup service, or enter the address manually.";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary";
  button.textContent = "Find address";
  button.style.marginBottom = "6px";

  wrapper.append(button, status);
  postcodeInput.insertAdjacentElement("afterend", wrapper);

  button.addEventListener("click", () => {
    const countryCode = getCountryCode(group);
    const postcode = normalizeJobPilotPostalCode(postcodeInput.value.trim());

    if (!postcode) {
      status.textContent = "Enter a postcode first.";
      return;
    }

    status.textContent = countryCode === "GB"
      ? "Address lookup service is not configured yet. Please enter the address manually."
      : "Address lookup service is not configured yet for this region. Please enter the address manually.";
  });
}

function apply() {
  FIELD_GROUPS.forEach(group => {
    const postcodeInput = document.querySelector(group.postcode);
    if (!postcodeInput) return;
    if (!postcodeInput.parentElement?.querySelector(".jobpilot-address-lookup")) {
      createLookupUi(group, postcodeInput);
    }
  });
}

function init() {
  apply();
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.addedNodes.length > 0)) apply();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
