// =====================================================
// JOBPILOT BRANDING
// =====================================================
// Keeps the app logo consistent and makes the logo a
// convenient shortcut back to the Dashboard.

const JOBPILOT_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="JobPilot" focusable="false">
  <defs>
    <linearGradient id="jp-bg" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#06144f"/>
      <stop offset="0.55" stop-color="#0644d8"/>
      <stop offset="1" stop-color="#11c7f2"/>
    </linearGradient>
    <linearGradient id="jp-p" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#0878f4"/>
      <stop offset="1" stop-color="#12c9ef"/>
    </linearGradient>
    <linearGradient id="jp-j" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dce8f8"/>
    </linearGradient>
    <filter id="jp-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#00144d" flood-opacity="0.42"/>
    </filter>
  </defs>
  <rect x="8" y="8" width="496" height="496" rx="104" fill="url(#jp-bg)"/>
  <circle cx="256" cy="256" r="174" fill="none" stroke="#ffffff" stroke-width="22" opacity="0.96"/>
  <path d="M256 53 L273 94 L256 87 L239 94 Z" fill="#ffffff"/>
  <path d="M459 256 L418 273 L425 256 L418 239 Z" fill="#ffffff"/>
  <g filter="url(#jp-shadow)">
    <path d="M207 398 H142 L215 326 L238 211 C241 196 252 184 267 179 L292 171 L270 202 L256 224 L238 320 C235 337 225 353 212 364 Z" fill="url(#jp-j)"/>
    <path d="M272 207 L324 123 L302 184 Z" fill="url(#jp-p)"/>
    <circle cx="285" cy="185" r="31" fill="#0a2d93"/>
    <circle cx="285" cy="185" r="17" fill="#ffffff"/>
    <path d="M276 224 H375 C417 224 439 246 439 280 C439 314 417 336 375 336 H289 L301 294 H370 C385 294 394 289 394 280 C394 271 385 266 370 266 H265 Z" fill="url(#jp-p)"/>
  </g>
</svg>`;

function applyJobPilotBranding() {
  document.querySelectorAll(".logo-mark").forEach(mark => {
    if (mark.dataset.jobpilotLogo === "true") return;

    const wrapper = document.createElement("span");
    wrapper.className = "logo-mark";
    wrapper.dataset.jobpilotLogo = "true";
    wrapper.setAttribute("aria-label", "JobPilot");
    wrapper.setAttribute("role", "img");
    wrapper.innerHTML = JOBPILOT_LOGO_SVG;

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
