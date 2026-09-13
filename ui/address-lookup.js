import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "../regional-address.js";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const ADDRESS_LOOKUP_ENDPOINT = "https://overpass-api.de/api/interpreter";
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

function normalizePostcodeForRegex(postcode) {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

function formatAddress(tags, postcode) {
  const line1 = tags["addr:housenumber"] && tags["addr:street"]
    ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
    : (tags["addr:street"] || tags["addr:housename"] || "");
  const line2 = tags["addr:housename"] && line1 !== tags["addr:housename"]
    ? tags["addr:housename"]
    : (tags["addr:suburb"] || tags["addr:neighbourhood"] || "");
  const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || tags["addr:municipality"] || "";
  const region = tags["addr:county"] || tags["addr:state"] || "";

  return [line1, line2, city, region, tags["addr:postcode"] || postcode].filter(Boolean).join(", ");
}

function getAddressParts(tags, postcode) {
  const line1 = tags["addr:housenumber"] && tags["addr:street"]
    ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
    : (tags["addr:street"] || tags["addr:housename"] || "");
  const line2 = tags["addr:housename"] && line1 !== tags["addr:housename"]
    ? tags["addr:housename"]
    : (tags["addr:suburb"] || tags["addr:neighbourhood"] || "");

  return {
    line1,
    line2,
    city: tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || tags["addr:municipality"] || "",
    region: tags["addr:county"] || tags["addr:state"] || "",
    postcode: tags["addr:postcode"] || postcode
  };
}

async function waitForLookupRateLimit() {
  const elapsed = Date.now() - lastLookupAt;
  if (elapsed < MIN_LOOKUP_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_LOOKUP_INTERVAL_MS - elapsed));
  }
  lastLookupAt = Date.now();
}

async function getPostcodeBounds(postcode) {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", postcode);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "gb");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error(`Postcode location lookup failed with HTTP ${response.status}`);

  const results = await response.json();
  const result = Array.isArray(results) ? results[0] : null;
  if (!result?.boundingbox || result.boundingbox.length !== 4) return null;

  const [south, north, west, east] = [
    Number(result.boundingbox[0]),
    Number(result.boundingbox[1]),
    Number(result.boundingbox[2]),
    Number(result.boundingbox[3])
  ];

  if (![south, north, west, east].every(Number.isFinite)) return null;

  return { south, west, north, east };
}

async function getPostcodeAddresses(postcode) {
  const bounds = await getPostcodeBounds(postcode);
  if (!bounds) return [];

  const normalized = normalizePostcodeForRegex(postcode);
  const postcodeRegex = `^${normalized.slice(0, -3)} ?${normalized.slice(-3)}$`;
  const query = `[out:json][timeout:12];(nwr["addr:postcode"~"${postcodeRegex}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east}););out center tags;`;

  const response = await fetch(ADDRESS_LOOKUP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json"
    },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) throw new Error(`Address lookup failed with HTTP ${response.status}`);

  const data = await response.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const seen = new Set();

  return elements
    .map(element => element.tags || {})
    .filter(tags => tags["addr:postcode"] && normalizePostcodeForRegex(tags["addr:postcode"]) === normalized)
    .filter(tags => tags["addr:housenumber"] || tags["addr:housename"] || tags["addr:street"])
    .filter(tags => {
      const key = [tags["addr:housenumber"], tags["addr:housename"], tags["addr:street"], tags["addr:unit"], tags["addr:postcode"]]
        .filter(Boolean).join("|").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => formatAddress(a, postcode).localeCompare(formatAddress(b, postcode), undefined, { numeric: true }));
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
  attribution.textContent = "Address data © OpenStreetMap contributors";

  wrapper.append(button, status, select, attribution);
  postcodeInput.insertAdjacentElement("afterend", wrapper);

  button.addEventListener("click", async () => {
    const postcode = normalizeJobPilotPostalCode(postcodeInput.value.trim());
    const countryCode = getCountryCode(group);

    if (!postcode) {
      status.textContent = "Enter a postcode first.";
      return;
    }

    if (countryCode !== "GB") {
      status.textContent = "Free address lookup is currently available for UK addresses. You can enter the address manually.";
      return;
    }

    button.disabled = true;
    select.style.display = "none";
    select.innerHTML = "";
    status.textContent = "Finding addresses...";

    try {
      await waitForLookupRateLimit();
      const addresses = await getPostcodeAddresses(postcode);

      if (addresses.length === 0) {
        status.textContent = "No individual addresses were found for this postcode. You can enter the address manually.";
        return;
      }

      select.innerHTML = `<option value="">Select an address...</option>` + addresses.map((tags, index) =>
        `<option value="${index}">${escapeHtml(formatAddress(tags, postcode))}</option>`
      ).join("");

      select.style.display = "block";
      status.textContent = `${addresses.length} address${addresses.length === 1 ? "" : "es"} found.`;

      select.onchange = () => {
        const tags = addresses[Number(select.value)];
        if (!tags) return;

        const parts = getAddressParts(tags, postcode);
        const addressInput = document.querySelector(group.address);
        const address2Input = document.querySelector(group.address2);
        const cityInput = document.querySelector(group.city);
        const regionInput = document.querySelector(group.region);

        if (addressInput) addressInput.value = parts.line1;
        if (address2Input) address2Input.value = parts.line2;
        if (cityInput) cityInput.value = parts.city;
        if (regionInput) regionInput.value = parts.region;
        postcodeInput.value = normalizeJobPilotPostalCode(parts.postcode);

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
