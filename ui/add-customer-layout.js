function buildAddCustomerLayout(form) {
  if (!form || form.dataset.jobpilotLayoutReady === "true") return;

  const directChildren = Array.from(form.children);
  const actions = directChildren.find(node => node.classList.contains("modal-actions"));
  if (!actions) return;

  const fields = new Map();
  let currentField = null;

  for (const node of directChildren) {
    if (node === actions) continue;

    if (node.tagName === "LABEL") {
      currentField = document.createElement("div");
      currentField.className = "jobpilot-customer-field";
      const label = node;
      currentField.appendChild(label);
      form.removeChild(node);
      fields.set(label.textContent.trim(), currentField);
      continue;
    }

    if (currentField) {
      currentField.appendChild(node);
      if (node.id) fields.set(node.id, currentField);
    }
  }

  const getField = id => fields.get(id);
  const makeSection = (title, ids, wideIds = []) => {
    const section = document.createElement("section");
    section.className = "jobpilot-customer-section";

    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "jobpilot-customer-grid";

    ids.forEach(id => {
      const field = getField(id);
      if (!field || field.parentElement === grid) return;
      if (wideIds.includes(id)) field.classList.add("jobpilot-customer-field-wide");
      grid.appendChild(field);
    });

    section.appendChild(grid);
    return section;
  };

  form.innerHTML = "";

  form.appendChild(makeSection("Customer details", [
    "customerName",
    "customerPhone",
    "customerEmail"
  ], ["customerEmail"]));

  form.appendChild(makeSection("Address", [
    "customerPostcode",
    "customerAddress",
    "customerAddress2",
    "customerCity",
    "customerRegion",
    "customerCountryCode"
  ], ["customerPostcode", "customerAddress", "customerAddress2"]));

  form.appendChild(makeSection("Additional information", [
    "customerNotes"
  ], ["customerNotes"]));

  form.appendChild(actions);
  form.dataset.jobpilotLayoutReady = "true";
}

function apply() {
  const form = document.getElementById("customerForm");
  if (form) buildAddCustomerLayout(form);
}

function init() {
  apply();
  const observer = new MutationObserver(() => apply());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
