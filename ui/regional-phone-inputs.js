// Apply the selected regional calling code to JobPilot phone inputs.
// App Preferences is the source of truth for the selected market.

function applyRegionalPhonePlaceholders(root = document) {
  const phoneApi = window.JobPilotPhone;
  if (!phoneApi) return;

  const placeholder = phoneApi.placeholder(phoneApi.getSettings());

  root.querySelectorAll('input[id="customerPhone"], input[type="tel"]').forEach(input => {
    input.dataset.regionalPhonePlaceholder = "true";
    input.placeholder = placeholder;
  });
}

function initRegionalPhoneInputs() {
  applyRegionalPhonePlaceholders();

  const observer = new MutationObserver(() => {
    applyRegionalPhonePlaceholders();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // App Preferences writes this event whenever the regional selection changes.
  window.addEventListener("jobpilot:preferences-changed", () => {
    applyRegionalPhonePlaceholders();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegionalPhoneInputs, { once: true });
} else {
  initRegionalPhoneInputs();
}
