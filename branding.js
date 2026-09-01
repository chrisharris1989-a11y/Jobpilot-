// =====================================================
// JOBPILOT BRANDING
// =====================================================
// Keeps the app logo consistent and makes the logo a
// convenient shortcut back to the Dashboard.

const JOBPILOT_ICON = "/jobpilot-icon.svg";

function applyJobPilotBranding() {
  document.querySelectorAll(".logo-mark").forEach(mark => {
    mark.textContent = "";
    mark.setAttribute("aria-hidden", "true");
    mark.style.backgroundImage = `url("${JOBPILOT_ICON}")`;
    mark.style.backgroundSize = "cover";
    mark.style.backgroundPosition = "center";
    mark.style.backgroundRepeat = "no-repeat";
  });
}

// The app renders its interface dynamically, so use event delegation.
document.addEventListener("click", event => {
  const logo = event.target.closest(".logo");

  if (!logo) return;

  const dashboardButton =
    document.querySelector('.nav-item[data-page="dashboard"]');

  if (dashboardButton) {
    dashboardButton.click();
  }
});

// Re-apply whenever app.js replaces the DOM.
const brandingObserver = new MutationObserver(applyJobPilotBranding);

function startBrandingObserver() {
  const app = document.getElementById("app");
  if (!app) return;

  brandingObserver.observe(app, {
    childList: true,
    subtree: true
  });

  applyJobPilotBranding();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startBrandingObserver);
} else {
  startBrandingObserver();
}
