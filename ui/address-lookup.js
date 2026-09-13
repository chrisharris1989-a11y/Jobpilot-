import { supabase } from "../supabase.js";
import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "../regional-address.js";

const FIELD_GROUPS = [
  {
    postcode: "#customerPostcode",
    address: "#customerAddress",
    address2: "#customerAddress2",
    city: "#customerCity",
    region: "#customerRegion",
    country: "#customerCountryCode"
  },
  {
    postcode: "#companyPostcode",
    address: "#companyAddress",
    address2: "#companyAddress2",
    city: "#companyCity",
    region: "#companyAddressRegion",
    country: null
  }
];

const MAX_RESULTS = 100;
const TABLE_NAME = "uk_address_lookup";

function getCountryCode(group) {
  if (group.country) {
    return document.querySelector(group.country)?.value || getJobPilotAddressContext().countryCode;
  }
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
  setField(group.address2, address.address_line2);
  setField(group.city, address.city);
  setField(group.region, address.region);
  if (group.country) setField(group.country, address.country_code || "GB");
  setField(group.postcode, address.postcode);
}

function formatResult(address) {
  const parts = [address.address_line1, address.address_line2, address.city, address.region]
    .filter(Boolean);
  return parts.join(", ");
}

async function lookupAddresses(postcode) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id,uprn,postcode,address_line1,address_line2,city,region,country_code")
    .eq("postcode", postcode)
    .order("address_line1", { ascending: true })
    .limit(MAX_RESULTS);

  if (error) throw error;
  return data || [];
}

function renderResults(wrapper, group, postcodeInput, results, status) {
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

  results.forEach(address => {
    const option = document.createElement("option");
    option.value = String(address.id);
    option.textContent = formatResult(address);
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    const selected = results.find(address => String(address.id) === select.value);
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

    if (countryCode !== "GB") {
      status.textContent = "Local UK address lookup is currently available for UK postcodes. You can enter the address manually for this region.";
      return;
    }

    button.disabled = true;
    status.textContent = "Finding addresses...";

    try {
      const results = await lookupAddresses(postcode);
      renderResults(wrapper, group, postcodeInput, results, status);
    } catch (error) {
      console.error("JobPilot address lookup failed", error);
      status.textContent = "Address lookup is temporarily unavailable. You can enter the address manually.";
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
    if (!postcodeInput.parentElement?.querySelector(".jobpilot-address-lookup")) {
      createLookupUi(group, postcodeInput);
    }
  });
}

function init() {
  apply();

  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => Array.from(mutation.addedNodes).some(hasRelevantField))) {
      apply();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
