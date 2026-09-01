// =====================================================
// JOBPILOT BRANDING
// =====================================================
// Keeps the app logo consistent and makes the logo a
// convenient shortcut back to the Dashboard.

const JOBPILOT_ICON = "/jobpilot-icon.svg";

function applyJobPilotBranding() {
  document.querySelectorAll(".logo-mark").forEach(mark => {
    if (mark.tagName === "IMG" && mark.getAttribute("src") === JOBPILOT_ICON) {
      return;
    }

    const image = document.createElement("img");
    image.src = JOBPILOT_ICON;
    image.alt = "JobPilot";
    image.width = 42;
    image.height = 42;
    image.setAttribute("aria-hidden", "false");

    mark.replaceWith(image);
    image.className = "logo-mark";
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
