import {
  formatJobPilotPhone,
  getJobPilotPhonePlaceholder,
  getJobPilotCurrentPhoneSettings
} from "./regional-phone.js";

function isPhoneInput(input) {
  return input instanceof HTMLInputElement && input.type === "tel";
}

function applyPhoneInput(input) {
  if (!isPhoneInput(input) || input.dataset.jobpilotPhoneReady === "true") return;

  input.dataset.jobpilotPhoneReady = "true";
  input.inputMode = "tel";
  input.autocomplete = input.autocomplete || "tel";

  const updatePlaceholder = () => {
    if (!input.getAttribute("placeholder") || input.dataset.jobpilotRegionalPlaceholder === "true") {
      input.placeholder = getJobPilotPhonePlaceholder(getJobPilotCurrentPhoneSettings());
      input.dataset.jobpilotRegionalPlaceholder = "true";
    }
  };

  input.addEventListener("blur", () => {
    const value = input.value.trim();
    if (!value) return;
    const formatted = formatJobPilotPhone(value, getJobPilotCurrentPhoneSettings());
    if (formatted) input.value = formatted;
  });

  window.addEventListener("jobpilot:regional-settings-changed", updatePlaceholder);
  window.addEventListener("jobpilot:country-changed", updatePlaceholder);
  updatePlaceholder();
}

function scanPhoneInputs(root = document) {
  if (root instanceof HTMLInputElement) applyPhoneInput(root);
  root.querySelectorAll?.('input[type="tel"]').forEach(applyPhoneInput);
}

if (document.body) scanPhoneInputs();

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) scanPhoneInputs(node);
    });
  }
});

if (document.body) observer.observe(document.body, { childList: true, subtree: true });

window.JobPilotRegionalPhoneUI = Object.freeze({ scan: scanPhoneInputs });
