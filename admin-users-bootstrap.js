import { showAdminUsers } from "./admin-users.js";

function setupAdminUsersNavigation() {
  const bottom = document.querySelector(".sidebar-bottom");
  const adminFeedback = document.getElementById("adminFeedbackButton");
  if (!bottom || !adminFeedback) return;

  if (adminFeedback.style.display === "none") return;
  if (document.getElementById("adminUsersButton")) return;

  const usersButton = document.createElement("button");
  usersButton.className = "nav-item";
  usersButton.id = "adminUsersButton";
  usersButton.type = "button";
  usersButton.textContent = "👥 Users";
  usersButton.addEventListener("click", showAdminUsers);
  bottom.appendChild(usersButton);

  if (!document.getElementById("jobpilot-admin-nav-style")) {
    const style = document.createElement("style");
    style.id = "jobpilot-admin-nav-style";
    style.textContent = `
      .sidebar-bottom {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        grid-template-rows: repeat(3, auto) !important;
        gap: 5px !important;
        width: 100% !important;
        align-items: stretch !important;
      }
      .sidebar-bottom .nav-item {
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
      }
    `;
    document.head.appendChild(style);
  }
}

const observer = new MutationObserver(setupAdminUsersNavigation);

function start() {
  const app = document.getElementById("app");
  if (!app) return;
  observer.observe(app, { childList: true, subtree: true });
  setupAdminUsersNavigation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
