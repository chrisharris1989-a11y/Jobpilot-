// Keep the original Connections navigation item available.
// Settings cleanup modules may remove it while switching pages; reinserting the
// original DOM node preserves the click handler that app.js attached to it.

let originalConnectionsButton = null;

function captureConnectionsButton() {
  if (!originalConnectionsButton) {
    originalConnectionsButton = document.querySelector('.sidebar nav .nav-item[data-page="connections"]');
  }
}

function restoreConnectionsNavigation() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav) return;

  captureConnectionsButton();
  if (!originalConnectionsButton) return;
  if (nav.contains(originalConnectionsButton)) return;

  const management = document.getElementById("jobpilot-management-button");
  if (management) nav.insertBefore(originalConnectionsButton, management);
  else nav.appendChild(originalConnectionsButton);
}

const observer = new MutationObserver(restoreConnectionsNavigation);
observer.observe(document.body, { childList: true, subtree: true });

restoreConnectionsNavigation();
