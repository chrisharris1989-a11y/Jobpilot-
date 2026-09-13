function buildAddCustomerLayout(form) {
  if (!form || form.dataset.jobpilotLayoutReady === "true") return;

  const actions = form.querySelector(".modal-actions");
  if (!actions) return;

  const fieldIds = [
    "customerName",
    "customerPhone",
    "customerEmail",
    "customerPostcode",
    "customerAddress",
    "customerAddress2",
    "customerCity",
    "customerRegion",
    "customerCountryCode",
    "customerNotes"
  ];

  const fields = new Map();

  fieldIds.forEach(id => {
    const control = form.querySelector(`#${id}`);
    if (!control) return;

    const wrapper = document.createElement("div");
    wrapper.className = "jobpilot-customer-field";

    const label = control.previousElementSibling;
    if (label?.tagName === "LABEL") {
      wrapper.appendChild(label);
    }

    wrapper.appendChild(control);
    fields.set(id, wrapper);
  });

  const makeSection = (title, ids, wideIds = []) => {
    const section = document.createElement("section");
    section.className = "jobpilot-customer-section";

    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "jobpilot-customer-grid";

    ids.forEach(id => {
      const field = fields.get(id);
      if (!field) return;
      if (wideIds.includes(id)) field.classList.add("jobpilot-customer-field-wide");
      grid.appendChild(field);
    });

    section.appendChild(grid);
    return section;
  };

  form.replaceChildren(
    makeSection("Customer details", [
      "customerName",
      "customerPhone",
      "customerEmail"
    ], ["customerEmail"]),
    makeSection("Address", [
      "customerPostcode",
      "customerAddress",
      "customerAddress2",
      "customerCity",
      "customerRegion",
      "customerCountryCode"
    ], ["customerPostcode", "customerAddress", "customerAddress2"]),
    makeSection("Additional information", [
      "customerNotes"
    ], ["customerNotes"]),
    actions
  );

  form.dataset.jobpilotLayoutReady = "true";
  moveAddressLookup(form);
}

function moveAddressLookup(form) {
  const postcodeField = form.querySelector("#customerPostcode")?.closest(".jobpilot-customer-field");
  const lookup = form.querySelector(".jobpilot-address-lookup");

  if (postcodeField && lookup && lookup.parentElement !== postcodeField) {
    postcodeField.appendChild(lookup);
  }
}

function apply() {
  const form = document.getElementById("customerForm");
  if (!form) return;

  buildAddCustomerLayout(form);
  moveAddressLookup(form);
}

function init() {
  apply();

  const observer = new MutationObserver(() => apply());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
