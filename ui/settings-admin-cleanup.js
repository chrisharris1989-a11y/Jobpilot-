// Keep Settings focused on personal/app preferences.
// Company, connections and billing/accounting administration live under Management.

const REMOVED_SETTINGS_IDS = [
  "jobpilot-subscription-section",
  "jobpilot-accounting-group",
  "jobpilot-payments-group"
];

const REMOVED_SETTINGS_HEADINGS = new Set([
  "Business Details",
  "Connections",
  "📚 Accounting",
  "💳 Payments",
  "Subscription"
]);

function isSettingsPage() {
  return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
}

function removeSettingsAdminSections() {
  if (!isSettingsPage()) return;

  REMOVED_SETTINGS_IDS.forEach(id => document.getElementById(id)?.remove());
  document.querySelectorAll('.nav-item[data-page="connections"]').forEach(button => button.remove());

  // Remove sections/groups regardless of which UI module created them.
  document.querySelectorAll("h2, h3").forEach(heading => {
    const text = heading.textContent.trim();
    if (!REMOVED_SETTINGS_HEADINGS.has(text)) return;

    const section = heading.closest(".settings-section, .settings-group, .settings-card, .connection-group, section");
    if (section) section.remove();
  });

  // Subscription can be injected after Settings renders, so explicitly remove it again.
  document.getElementById("jobpilot-subscription-section")?.remove();
}

const observer = new MutationObserver(removeSettingsAdminSections);
observer.observe(document.body, { childList: true, subtree: true });

removeSettingsAdminSections();
