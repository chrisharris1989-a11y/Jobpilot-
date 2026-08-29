// =====================================================
// JOBPILOT SETTINGS UI
// Integrations belong on Connections, not Settings.
// This keeps the Settings page focused on JobPilot's
// own application/account settings.
// =====================================================

(function () {
  function isSettingsPage() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function removeStripeFromSettings() {
    if (!isSettingsPage()) return;

    const status = document.getElementById("stripeConnectionStatus");
    const button = document.getElementById("connectStripeButton");

    if (!status && !button) return;

    const card = status?.closest(".connection-card") || button?.closest(".connection-card");

    if (card) {
      card.remove();
      return;
    }

    // Fallback for the original unwrapped markup: remove the smallest
    // common ancestor containing both Stripe controls without touching
    // the rest of the Settings form.
    let container = status || button;
    while (container && container.parentElement) {
      container = container.parentElement;
      if (
        container.contains(status) &&
        container.contains(button)
      ) {
        const headings = container.querySelectorAll("h2");
        if (headings.length <= 1) {
          container.remove();
        }
        break;
      }
    }
  }

  const observer = new MutationObserver(removeStripeFromSettings);
  observer.observe(document.body, { childList: true, subtree: true });
  removeStripeFromSettings();
})();
