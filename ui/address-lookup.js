import { supabase } from "../supabase.js";
import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "../regional-address.js";

const FIELD_GROUPS = [
  { postcode: "#customerPostcode", address: "#customerAddress", address2: "#customerAddress2", city: "#customerCity", region: "#customerRegion", country: "#customerCountryCode" },
  { postcode: "#companyPostcode", address: "#companyAddress", address2: "#companyAddress2", city: "#companyCity", region: "#companyAddressRegion", country: null }
];

function getCountryCode(group) {
  if (group.country) return document.querySelector(group.country)?.value || getJobPilotAddressContext().countryCode;
  return getJobPilotAddressContext().countryCode;
}

function removeExistingPicker(postcodeInput) {
  postcodeInput?.parentElement?.querySelector(".jobpilot-address-lookup")?.remove();
}

function setField(selector, value) {
  const field = document.querySelector(selector);
  if (!field) return;
  field.value = value || "";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function populateAddress(group, address) {
  setField(group.address, address.address_line1);
  setField(group.address2, [address.address_line2, address.address_line3].filter(Boolean).join(", "));
  setField(group.city, address.city);
  setField(group.region, address.region);
  if (group.country) setField(group.country, address.country_code || "GB");
  setField(group.postcode, address.postcode);
}

function formatResult(address) {
  return address.display_address || [address.address_line1, address.address_line2, address.address_line3, address.city, address.region, address.postcode].filter(Boolean).join(", ");
}

async function lookupAddresses(postcode, countryCode) {
  const { data, error } = await supabase.functions.invoke("postcoder-address-lookup", { body: { postcode, countryCode } });
  if (error) throw error;
  if (!data || !Array.isArray(data.results)) throw new Error(data?.error || "Address lookup returned an invalid response.");
  return data.results;
}

function renderResults(wrapper, group, results, status) {
  wrapper.querySelector(".jobpilot-address-results")?.remove();
  if (!results.length) {
    status.textContent = "No addresses were found for this postcode. You can enter the address manually.";
    return;
  }

  status.textContent = `${results.length} address${results.length === 1 ? "" : "es"} found.`;
  const select = document.createElement("select");
  select.className = "jobpilot-address-results";
  select.style.width = "100%";
  select.style.marginBottom = "6px";
  select.setAttribute("aria-label", "Select address");

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select an address...";
  select.appendChild(placeholder);

  results.forEach((address, index) => {
    const option = document.createElement("option");
    option.value = String(address.id || index);
    option.textContent = formatResult(address);
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    const selectedIndex = Number(select.selectedIndex) - 1;
    const selected = results[selectedIndex];
    if (!selected) return;
    populateAddress(group, selected);
    status.textContent = "Address selected. You can edit any field if needed.";
  });

  wrapper.insertBefore(select, status);
}

function createLookupUi(group, postcodeInput) {
  removeExistingPicker(postcodeInput);
  const wrapper = document.createElement("div");
  wrapper.className = "jobpilot-address-lookup";
  wrapper.style.marginTop = "6px";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary";
  button.textContent = "Find address";
  button.style.marginBottom = "6px";

  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.style.fontSize = "12px";
  status.style.margin = "2px 0 6px";
  status.style.opacity = "0.75";
  status.textContent = "Enter a postcode to find matching addresses.";

  wrapper.append(button, status);
  postcodeInput.insertAdjacentElement("afterend", wrapper);

  button.addEventListener("click", async () => {
    const countryCode = getCountryCode(group);
    const postcode = normalizeJobPilotPostalCode(postcodeInput.value.trim());
    if (!postcode) {
      status.textContent = "Enter a postcode first.";
      return;
    }

    button.disabled = true;
    status.textContent = "Finding addresses...";
    wrapper.querySelector(".jobpilot-address-results")?.remove();

    try {
      const results = await lookupAddresses(postcode, countryCode);
      renderResults(wrapper, group, results, status);
    } catch (error) {
      console.error("JobPilot Postcoder address lookup failed", error);
      const message = error?.message || "Address lookup is temporarily unavailable.";
      status.textContent = message.includes("Postcoder is not configured")
        ? "Address lookup is not configured yet. You can enter the address manually."
        : "Address lookup is temporarily unavailable. You can enter the address manually.";
    } finally {
      button.disabled = false;
    }
  });
}

function hasRelevantField(node) {
  if (!(node instanceof Element)) return false;
  return FIELD_GROUPS.some(group => {
    const selectors = [group.postcode, group.address, group.address2, group.city, group.region, group.country].filter(Boolean);
    return selectors.some(selector => node.matches(selector) || node.querySelector(selector));
  });
}

function apply() {
  FIELD_GROUPS.forEach(group => {
    const postcodeInput = document.querySelector(group.postcode);
    if (!postcodeInput) return;
    if (!postcodeInput.parentElement?.querySelector(".jobpilot-address-lookup")) createLookupUi(group, postcodeInput);
  });
}

function init() {
  apply();
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => Array.from(mutation.addedNodes).some(hasRelevantField))) apply();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
