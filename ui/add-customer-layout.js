import { supabase } from "../supabase.js";
import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "../regional-address.js";

const FORM_CONFIGS = {
  customerForm: {
    ids: {
      name: "customerName",
      phone: "customerPhone",
      email: "customerEmail",
      postcode: "customerPostcode",
      address: "customerAddress",
      address2: "customerAddress2",
      city: "customerCity",
      region: "customerRegion",
      country: "customerCountryCode",
      notes: "customerNotes"
    },
    edit: false
  },
  editCustomerForm: {
    ids: {
      name: "editCustomerName",
      phone: "editCustomerPhone",
      email: "editCustomerEmail",
      postcode: "editCustomerPostcode",
      address: "editCustomerAddress",
      address2: "editCustomerAddress2",
      city: "editCustomerCity",
      region: "editCustomerRegion",
      country: "editCustomerCountryCode",
      notes: "editCustomerNotes"
    },
    edit: true
  }
};

function makeField(form, id, labelText, type = "text", value = "") {
  const existing = form.querySelector(`#${id}`);
  if (existing) return existing;

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;

  const input = type === "textarea"
    ? document.createElement("textarea")
    : document.createElement("input");

  input.id = id;
  if (type !== "textarea") input.type = type;
  input.value = value || "";

  if (id.toLowerCase().includes("countrycode")) input.readOnly = true;

  form.appendChild(label);
  form.appendChild(input);
  return input;
}

function getLabel(control, fallback) {
  const byFor = control?.id
    ? control.form?.querySelector(`label[for="${control.id}"]`)
    : null;
  const previous = control?.previousElementSibling;
  return byFor || (previous?.tagName === "LABEL" ? previous : null) || fallback;
}

function wrapField(form, id, fallbackLabel) {
  const control = form.querySelector(`#${id}`);
  if (!control) return null;

  const wrapper = document.createElement("div");
  wrapper.className = "jobpilot-customer-field";

  const label = getLabel(control, fallbackLabel);
  if (label instanceof Element) wrapper.appendChild(label);
  else {
    const newLabel = document.createElement("label");
    newLabel.htmlFor = id;
    newLabel.textContent = label;
    wrapper.appendChild(newLabel);
  }

  wrapper.appendChild(control);
  return wrapper;
}

function makeSection(title, fields, wideIds = []) {
  const section = document.createElement("section");
  section.className = "jobpilot-customer-section";

  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "jobpilot-customer-grid";

  fields.forEach(field => {
    if (!field) return;
    if (wideIds.includes(field.dataset.jobpilotFieldId)) {
      field.classList.add("jobpilot-customer-field-wide");
    }
    grid.appendChild(field);
  });

  section.appendChild(grid);
  return section;
}

async function loadEditCustomerExtras(form, ids) {
  if (!form || form.dataset.jobpilotCustomerLoaded === "true") return;

  const name = form.querySelector(`#${ids.name}`)?.value?.trim() || "";
  const email = form.querySelector(`#${ids.email}`)?.value?.trim() || "";
  const phone = form.querySelector(`#${ids.phone}`)?.value?.trim() || "";
  if (!name && !email && !phone) return;

  let query = supabase
    .from("customers")
    .select("id,address_line2,address_region,address_country_code")
    .limit(1);

  if (email) query = query.eq("email", email);
  else if (phone) query = query.eq("phone", phone).eq("name", name);
  else query = query.eq("name", name);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return;

  form.dataset.jobpilotCustomerId = data.id || "";
  const address2 = form.querySelector(`#${ids.address2}`);
  const region = form.querySelector(`#${ids.region}`);
  const country = form.querySelector(`#${ids.country}`);

  if (address2 && !address2.value) address2.value = data.address_line2 || "";
  if (region && !region.value) region.value = data.address_region || "";
  if (country) country.value = data.address_country_code || getJobPilotAddressContext().countryCode;

  form.dataset.jobpilotCustomerLoaded = "true";
}

function installEditSaveSync(form, ids) {
  if (!form || form.dataset.jobpilotEditSaveSync === "true") return;
  form.dataset.jobpilotEditSaveSync = "true";

  form.addEventListener("submit", () => {
    const values = {
      address_line2: form.querySelector(`#${ids.address2}`)?.value?.trim() || null,
      address_region: form.querySelector(`#${ids.region}`)?.value?.trim() || null,
      address_country_code: form.querySelector(`#${ids.country}`)?.value || getJobPilotAddressContext().countryCode
    };

    const updateExtras = async () => {
      let customerId = form.dataset.jobpilotCustomerId || "";

      if (!customerId) {
        const name = form.querySelector(`#${ids.name}`)?.value?.trim() || "";
        const email = form.querySelector(`#${ids.email}`)?.value?.trim() || "";
        const phone = form.querySelector(`#${ids.phone}`)?.value?.trim() || "";

        let query = supabase.from("customers").select("id").limit(1);
        if (email) query = query.eq("email", email);
        else if (phone) query = query.eq("phone", phone).eq("name", name);
        else query = query.eq("name", name);

        const { data } = await query.maybeSingle();
        customerId = data?.id || "";
      }

      if (!customerId) return;
      await supabase.from("customers").update(values).eq("id", customerId);
    };

    setTimeout(updateExtras, 0);
  }, true);
}

async function lookupEditAddress(form, ids, postcodeInput, wrapper, status, button) {
  const countryCode = form.querySelector(`#${ids.country}`)?.value || getJobPilotAddressContext().countryCode;
  const postcode = normalizeJobPilotPostalCode(postcodeInput.value.trim());
  if (!postcode) {
    status.textContent = "Enter a postcode first.";
    return;
  }

  button.disabled = true;
  status.textContent = "Finding addresses...";
  wrapper.querySelector(".jobpilot-address-results")?.remove();

  try {
    const { data, error } = await supabase.functions.invoke("postcoder-address-lookup", {
      body: { postcode, countryCode }
    });
    if (error) throw error;

    const results = Array.isArray(data?.results) ? data.results : [];
    if (!results.length) {
      status.textContent = "No addresses were found for this postcode. You can enter the address manually.";
      return;
    }

    const select = document.createElement("select");
    select.className = "jobpilot-address-results";
    select.setAttribute("aria-label", "Select address");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select an address...";
    select.appendChild(placeholder);

    results.forEach((address, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = address.display_address || [address.address_line1, address.address_line2, address.address_line3, address.city, address.region, address.postcode].filter(Boolean).join(", ");
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      const address = results[Number(select.value)];
      if (!address) return;

      const set = (id, value) => {
        const field = form.querySelector(`#${id}`);
        if (!field) return;
        field.value = value || "";
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      };

      set(ids.address, address.address_line1);
      set(ids.address2, [address.address_line2, address.address_line3].filter(Boolean).join(", "));
      set(ids.city, address.city);
      set(ids.region, address.region);
      set(ids.country, address.country_code || countryCode);
      set(ids.postcode, address.postcode);
      status.textContent = "Address selected. You can edit any field if needed.";
    });

    wrapper.insertBefore(select, status);
    status.textContent = `${results.length} address${results.length === 1 ? "" : "es"} found.`;
  } catch (error) {
    console.error("JobPilot edit customer address lookup failed", error);
    status.textContent = "Address lookup is temporarily unavailable. You can enter the address manually.";
  } finally {
    button.disabled = false;
  }
}

function addEditLookup(form, ids, postcodeField) {
  if (!postcodeField || postcodeField.parentElement?.querySelector(".jobpilot-address-lookup")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "jobpilot-address-lookup";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary";
  button.textContent = "Find address";

  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.textContent = "Enter a postcode to find matching addresses.";

  wrapper.append(button, status);
  postcodeField.insertAdjacentElement("afterend", wrapper);

  button.addEventListener("click", () => lookupEditAddress(form, ids, postcodeField, wrapper, status, button));
}

function buildCustomerFormLayout(form) {
  if (!form || form.querySelector(".jobpilot-customer-section")) return;

  const config = FORM_CONFIGS[form.id];
  if (!config) return;

  const { ids } = config;
  const actions = form.querySelector(".modal-actions");
  if (!actions) return;

  if (config.edit) {
    makeField(form, ids.address2, "Address line 2");
    makeField(form, ids.region, "County / Region");
    makeField(form, ids.country, "Country");
    installEditSaveSync(form, ids);
  }

  const fields = new Map();
  const labels = {
    name: "Name *",
    phone: "Phone",
    email: "Email",
    postcode: "Postcode",
    address: "Address",
    address2: "Address line 2",
    city: "Town / City",
    region: "County / Region",
    country: "Country",
    notes: "Notes"
  };

  Object.entries(ids).forEach(([key, id]) => {
    const field = wrapField(form, id, labels[key]);
    if (field) {
      field.dataset.jobpilotFieldId = id;
      fields.set(key, field);
    }
  });

  const postcodeField = fields.get("postcode");
  if (config.edit) {
    form.dataset.jobpilotLayoutReady = "true";
  }

  form.replaceChildren(
    makeSection("Customer details", [fields.get("name"), fields.get("phone"), fields.get("email")], [ids.email]),
    makeSection("Address", [fields.get("postcode"), fields.get("address"), fields.get("address2"), fields.get("city"), fields.get("region"), fields.get("country")], [ids.postcode, ids.address, ids.address2]),
    makeSection("Additional information", [fields.get("notes")], [ids.notes]),
    actions
  );

  form.dataset.jobpilotLayoutReady = "true";

  if (config.edit) {
    const postcodeInput = form.querySelector(`#${ids.postcode}`);
    addEditLookup(form, ids, postcodeInput);
    loadEditCustomerExtras(form, ids);
  }
}

function moveAddLookup(form) {
  const postcodeField = form.querySelector("#customerPostcode")?.closest(".jobpilot-customer-field");
  const lookup = form.querySelector(".jobpilot-address-lookup");
  if (postcodeField && lookup && lookup.parentElement !== postcodeField) postcodeField.appendChild(lookup);
}

function apply() {
  Object.keys(FORM_CONFIGS).forEach(formId => {
    const form = document.getElementById(formId);
    if (!form) return;
    buildCustomerFormLayout(form);
    if (formId === "customerForm") moveAddLookup(form);
  });
}

function init() {
  apply();
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => Array.from(mutation.addedNodes).some(node => {
      return node instanceof Element && (node.matches("#customerForm") || node.matches("#editCustomerForm") || node.querySelector?.("#customerForm, #editCustomerForm"));
    }))) apply();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
