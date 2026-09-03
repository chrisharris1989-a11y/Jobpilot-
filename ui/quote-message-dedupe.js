// Prevent the Quote Message settings card from being inserted more than once.
// settings-admin-cleanup.js checks for the card before an async permission lookup;
// multiple MutationObserver callbacks can therefore pass that check concurrently.

function dedupeQuoteMessageSettings() {
  const sections = document.querySelectorAll("#jobpilot-quote-message-settings");
  if (sections.length <= 1) return;

  sections.forEach((section, index) => {
    if (index > 0) section.remove();
  });
}

const observer = new MutationObserver(dedupeQuoteMessageSettings);
observer.observe(document.body, { childList: true, subtree: true });

dedupeQuoteMessageSettings();
