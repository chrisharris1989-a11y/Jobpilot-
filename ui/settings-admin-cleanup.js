// Keep Settings focused on personal/app preferences.
// Company, connections/accounting and billing administration live under Management.

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

  // Connections is a top-level navigation item. It must never be removed here.
  // Only remove the old Connections content if it is actually inside Settings.
  document.querySelectorAll(".settings-section, .settings-group, .settings-card, .connection-group, section").forEach(section => {
    const heading = section.querySelector(":scope > h2, :scope > h3")?.textContent.trim();
    if (heading && REMOVED_SETTINGS_HEADINGS.has(heading)) section.remove();
  });

  // Subscription can be injected after Settings renders, so explicitly remove it again.
  document.getElementById("jobpilot-subscription-section")?.remove();
}

const observer = new MutationObserver(removeSettingsAdminSections);
observer.observe(document.body, { childList: true, subtree: true });

removeSettingsAdminSections();
