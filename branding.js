// =====================================================
// JOBPILOT BRANDING
// =====================================================
// Uses the approved JobPilot artwork directly so the
// in-app logo matches the saved brand artwork exactly.

const JOBPILOT_LOGO_IMAGE = "/jobpilot-logo.png";

function applyJobPilotBranding() {
  document.querySelectorAll(".logo-mark").forEach(mark => {
    if (mark.dataset.jobpilotLogo === "true") return;

    const wrapper = document.createElement("span");
    wrapper.className = "logo-mark";
    wrapper.dataset.jobpilotLogo = "true";
    wrapper.setAttribute("aria-label", "JobPilot");
    wrapper.setAttribute("role", "img");
    wrapper.style.backgroundImage = "none";
    wrapper.style.backgroundColor = "transparent";

    const image = document.createElement("img");
    image.src = JOBPILOT_LOGO_IMAGE;
    image.alt = "JobPilot";
    image.draggable = false;
    image.style.display = "block";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "contain";
    image.style.pointerEvents = "none";

    wrapper.appendChild(image);
    mark.replaceWith(wrapper);
  });
}

// The app renders its interface dynamically, so use event delegation.
document.addEventListener("click", event => {
  const logo = event.target.closest(".logo, .auth-logo");

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

// Force a fresh deployment after moving the approved image into Vite's public directory.
