// Apply the selected regional calling code to JobPilot phone inputs.
// This keeps the existing customer form stable while making the expected
// international format visible to the user.

function applyRegionalPhonePlaceholders(root = document) {
  const phoneApi = window.JobPilotPhone;
  if (!phoneApi) return;

  const placeholder = phoneApi.placeholder(phoneApi.getSettings());

  root.querySelectorAll('input[id="customerPhone"], input[type="tel"]').forEach(input => {
    if (!input.dataset.regionalPhonePlaceholder) {
      input.dataset.regionalPhonePlaceholder = "true";
    }
    input.placeholder = placeholder;
  });
}

function initRegionalPhoneInputs() {
  applyRegionalPhonePlaceholders();

  const observer = new MutationObserver(() => {
    applyRegionalPhonePlaceholders();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("jobpilot:regional-settings-changed", () => {
    applyRegionalPhonePlaceholders();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegionalPhoneInputs, { once: true });
} else {
  initRegionalPhoneInputs();
}
