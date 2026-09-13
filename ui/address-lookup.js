import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "../regional-address.js";

const ADDRESS_LOOKUP_API_KEY = window.JOBPILOT_ADDRESS_LOOKUP_API_KEY || "";
const ADDRESS_LOOKUP_ENDPOINT = "https://api.ideal-postcodes.co.uk/v1/postcodes";

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

  wrapper.append(button, status, select);
  postcodeInput.insertAdjacentElement("afterend", wrapper);

  button.addEventListener("click", async () => {
    const postcode = normalizeJobPilotPostalCode(postcodeInput.value.trim());
    const countryCode = getCountryCode(group);

    if (!postcode) {
      status.textContent = "Enter a postcode first.";
      return;
    }

    if (!ADDRESS_LOOKUP_API_KEY) {
      status.textContent = "Address lookup needs to be connected before it can be used.";
      return;
    }

    if (!["GB", "IE"].includes(countryCode)) {
      status.textContent = "Address lookup for this country will use its regional provider.";
      return;
    }

    button.disabled = true;
    select.style.display = "none";
    select.innerHTML = "";
    status.textContent = "Finding addresses...";

    try {
      const response = await fetch(`${ADDRESS_LOOKUP_ENDPOINT}/${encodeURIComponent(postcode)}?api_key=${encodeURIComponent(ADDRESS_LOOKUP_API_KEY)}`);
      const data = await response.json();

      if (!response.ok || !Array.isArray(data.result) || data.result.length === 0) {
        throw new Error("No addresses found");
      }

      const addresses = data.result;
      select.innerHTML = `<option value="">Select an address...</option>` + addresses.map((address, index) => {
        const parts = [address.line_1, address.line_2, address.line_3, address.post_town, address.county]
          .filter(Boolean);
        return `<option value="${index}">${parts.join(", ")}</option>`;
      }).join("");

      select.style.display = "block";
      status.textContent = `${addresses.length} address${addresses.length === 1 ? "" : "es"} found.`;

      select.onchange = () => {
        const address = addresses[Number(select.value)];
        if (!address) return;

        const addressInput = document.querySelector(group.address);
        const address2Input = document.querySelector(group.address2);
        const cityInput = document.querySelector(group.city);
        const regionInput = document.querySelector(group.region);

        if (addressInput) addressInput.value = address.line_1 || "";
        if (address2Input) address2Input.value = address.line_2 || address.line_3 || "";
        if (cityInput) cityInput.value = address.post_town || "";
        if (regionInput) regionInput.value = address.county || address.district || "";
        postcodeInput.value = normalizeJobPilotPostalCode(address.postcode || postcode);

        [addressInput, address2Input, cityInput, regionInput, postcodeInput].forEach(input => {
          input?.dispatchEvent(new Event("input", { bubbles: true }));
          input?.dispatchEvent(new Event("change", { bubbles: true }));
        });

        status.textContent = "Address selected.";
        select.style.display = "none";
      };
    } catch (error) {
      console.error("JobPilot address lookup failed:", error);
      status.textContent = "No addresses found. You can enter the address manually.";
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
