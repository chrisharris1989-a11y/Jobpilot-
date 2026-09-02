// Keep top-level navigation items stable when Settings cleanup modules run.
// Connections is a top-level page and must not disappear when another tab is opened.

function restoreConnectionsNavigation() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav) return;
  if (nav.querySelector('.nav-item[data-page="connections"]')) return;

  const management = document.getElementById("jobpilot-management-button");
  const button = document.createElement("button");
  button.className = "nav-item";
  button.type = "button";
  button.dataset.page = "connections";
  button.textContent = "🔗 Connections";

  if (management) nav.insertBefore(button, management);
  else nav.appendChild(button);

  button.addEventListener("click", () => {
    if (typeof window.JobPilotShowPage === "function") {
      window.JobPilotShowPage("connections");
      return;
    }
    document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Connections"));
    document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode("Manage your connected services."));
  });
}

const observer = new MutationObserver(restoreConnectionsNavigation);
observer.observe(document.body, { childList: true, subtree: true });

restoreConnectionsNavigation();
