import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "../regional-address.js";

const ADDRESS_LOOKUP_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_LOOKUP_INTERVAL_MS = 1100;
let lastLookupAt = 0;

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

function getCountryCode(group) {
  if (group.country) return document.querySelector(group.country)?.value || getJobPilotAddressContext().countryCode;
  return getJobPilotAddressContext().countryCode;
}

function removeExistingPicker(postcodeInput) {
  postcodeInput?.parentElement?.querySelector(".jobpilot-address-lookup")?.remove();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAddress(address) {
  const a = address.address || {};
  return [
    a.house_number ? `${a.house_number} ${a.road || ""}`.trim() : (a.road || ""),
    a.house_name || "",
    a.suburb || a.neighbourhood || "",
    a.city || a.town || a.village || a.municipality || "",
    a.county || a.state || "",
    a.postcode || ""
  ].filter(Boolean).join(", ");
}

function getAddressParts(address) {
  const a = address.address || {};
  const line1 = a.house_number && a.road
    ? `${a.house_number} ${a.road}`
    : (a.road || a.house_name || "");

  const line2 = a.house_name && line1 !== a.house_name
    ? a.house_name
    : (a.suburb || a.neighbourhood || "");

  return {
    line1,
    line2,
    city: a.city || a.town || a.village || a.municipality || "",
    region: a.county || a.state || "",
    postcode: a.postcode || ""
  };
}

async function waitForLookupRateLimit() {
  const elapsed = Date.now() - lastLookupAt;
  if (elapsed < MIN_LOOKUP_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_LOOKUP_INTERVAL_MS - elapsed));
  }
  lastLookupAt = Date.now();
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

  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.display = "none";
  select.setAttribute("aria-label", "Select address");

  const attribution = document.createElement("div");
  attribution.style.fontSize = "11px";
  attribution.style.marginTop = "4px";
  attribution.style.opacity = "0.75";
  attribution.innerHTML = "Address data © OpenStreetMap contributors";

  wrapper.append(button, status, select, attribution);
  postcodeInput.insertAdjacentElement("afterend", wrapper);

  button.addEventListener("click", async () => {
    const postcode = normalizeJobPilotPostalCode(postcodeInput.value.trim());
    const countryCode = getCountryCode(group);

    if (!postcode) {
      status.textContent = "Enter a postcode first.";
      return;
    }

    if (!["GB", "IE"].includes(countryCode)) {
      status.textContent = "Free address lookup is currently available for UK and Ireland. You can enter the address manually.";
      return;
    }

    button.disabled = true;
    select.style.display = "none";
    select.innerHTML = "";
    status.textContent = "Finding addresses...";

    try {
      await waitForLookupRateLimit();

      const params = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        limit: "50",
        countrycodes: countryCode.toLowerCase(),
        postalcode: postcode
      });

      const response = await fetch(`${ADDRESS_LOOKUP_ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) throw new Error(`Address lookup failed with HTTP ${response.status}`);

      const results = await response.json();
      const addresses = Array.isArray(results)
        ? results.filter(result => result?.address && (result.address.postcode || "").replace(/\s+/g, "").toUpperCase() === postcode.replace(/\s+/g, "").toUpperCase())
        : [];

      if (addresses.length === 0) {
        status.textContent = "No matching addresses were found. You can enter the address manually.";
        return;
      }

      select.innerHTML = `<option value="">Select an address...</option>` + addresses.map((address, index) =>
        `<option value="${index}">${escapeHtml(formatAddress(address))}</option>`
      ).join("");

      select.style.display = "block";
      status.textContent = `${addresses.length} address${addresses.length === 1 ? "" : "es"} found.`;

      select.onchange = () => {
        const address = addresses[Number(select.value)];
        if (!address) return;

        const parts = getAddressParts(address);
        const addressInput = document.querySelector(group.address);
        const address2Input = document.querySelector(group.address2);
        const cityInput = document.querySelector(group.city);
        const regionInput = document.querySelector(group.region);

        if (addressInput) addressInput.value = parts.line1;
        if (address2Input) address2Input.value = parts.line2;
        if (cityInput) cityInput.value = parts.city;
        if (regionInput) regionInput.value = parts.region;
        postcodeInput.value = normalizeJobPilotPostalCode(parts.postcode || postcode);

        [addressInput, address2Input, cityInput, regionInput, postcodeInput].forEach(input => {
          input?.dispatchEvent(new Event("input", { bubbles: true }));
          input?.dispatchEvent(new Event("change", { bubbles: true }));
        });

        status.textContent = "Address selected.";
        select.style.display = "none";
      };
    } catch (error) {
      console.error("JobPilot free address lookup failed:", error);
      status.textContent = "Address lookup is unavailable right now. You can enter the address manually.";
    } finally {
      button.disabled = false;
    }
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
    const added = mutations.some(mutation => mutation.addedNodes.length > 0);
    if (added) apply();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
