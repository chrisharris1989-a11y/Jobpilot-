// =====================================================
// JOBPILOT HEADER NAVIGATION ORDER
// Reorders the existing navigation without changing any
// page handlers or authentication behaviour.
// =====================================================

(function () {
  const STYLE_ID = "jobpilot-header-nav-reorder-style";
  const NAV_ID = "jobpilot-reordered-nav";

  const ORDER = [
    "dashboard",
    "settings",
    "connections",
    "finance",
    "adminFeedback",
    "users",
    "feedback",
    "logout"
  ];

  function identify(button) {
    if (!button) return null;

    if (button.id === "logoutButton") return "logout";
    if (button.id === "feedbackButton") return "feedback";
    if (button.id === "adminFeedbackButton") return "adminFeedback";

    const page = button.dataset?.page;
    if (page === "dashboard") return "dashboard";
    if (page === "settings") return "settings";
    if (page === "connections") return "connections";
    if (page === "finance") return "finance";
    if (page === "users") return "users";

    const text = String(button.textContent || "").trim().replace(/\s+/g, " ");
    if (/^Finance$/i.test(text)) return "finance";
    if (/^Users$/i.test(text)) return "users";
    if (/^BetaFeedback$/i.test(text)) return "adminFeedback";
    if (/^Beta Feedback$/i.test(text)) return "adminFeedback";

    return null;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${NAV_ID} {
        display: flex !important;
        flex-direction: column !important;
      }

      #${NAV_ID} .nav-item {
        width: 100%;
      }
    `;
    document.head.appendChild(style);
  }

  function reorder() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const buttons = [...sidebar.querySelectorAll(".nav-item")];
    if (!buttons.length) return;

    let nav = document.getElementById(NAV_ID);
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = NAV_ID;
      nav.className = "jobpilot-reordered-nav";

      const logo = sidebar.querySelector(":scope > .logo");
      if (logo) logo.after(nav);
      else sidebar.prepend(nav);
    }

    const keyed = new Map();
    const unknown = [];

    buttons.forEach(button => {
      const key = identify(button);
      if (key && !keyed.has(key)) keyed.set(key, button);
      else if (!key) unknown.push(button);
    });

    // Requested order first, except Feedback and Sign out are held back
    // until the end so any existing core application tabs stay above them.
    ["dashboard", "settings", "connections", "finance", "adminFeedback", "users"]
      .forEach(key => {
        const button = keyed.get(key);
        if (button) nav.appendChild(button);
      });

    unknown.forEach(button => nav.appendChild(button));

    ["feedback", "logout"].forEach(key => {
      const button = keyed.get(key);
      if (button) nav.appendChild(button);
    });

    sidebar.querySelectorAll(":scope > nav, :scope > .sidebar-bottom").forEach(container => {
      if (container.id === NAV_ID) return;
      if (!container.querySelector(".nav-item")) container.remove();
    });

    addStyles();
  }

  const observer = new MutationObserver(() => reorder());

  function start() {
    const app = document.getElementById("app");
    if (!app) return;

    observer.observe(app, { childList: true, subtree: true });
    reorder();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
