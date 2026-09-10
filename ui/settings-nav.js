import { renderSettings } from "./settings.js";

function moveSettingsToBottom() {
  const sidebar = document.querySelector(".sidebar");
  const nav = sidebar?.querySelector("nav");
  const bottom = sidebar?.querySelector(".sidebar-bottom");
  if (!sidebar || !nav || !bottom) return;

  // Remove any Settings navigation button from the main navigation.
  nav.querySelectorAll(".nav-item").forEach(button => {
    if ((button.textContent || "").trim().toLowerCase().includes("settings")) {
      button.remove();
    }
  });

  // Remove any previously injected Settings button before recreating it.
  bottom.querySelectorAll(".nav-item").forEach(button => {
    if ((button.textContent || "").trim().toLowerCase().includes("settings")) {
      button.remove();
    }
  });

  const button = document.createElement("button");
  button.className = "nav-item";
  button.type = "button";
  button.dataset.page = "settings";
  button.textContent = "⚙️ Settings";
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");
    if (title) title.textContent = "Settings";
    if (subtitle) subtitle.textContent = "Manage your JobPilot settings.";

    renderSettings();
  });

  // Settings belongs with Feedback and Sign out at the bottom of the sidebar.
  bottom.insertBefore(button, bottom.firstChild);
}

const observer = new MutationObserver(moveSettingsToBottom);
observer.observe(document.body, { childList: true, subtree: true });

moveSettingsToBottom();
