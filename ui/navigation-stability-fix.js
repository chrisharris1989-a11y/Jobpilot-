// Keep exactly one top-level Connections navigation item.
// app.js owns the original button and its click handler. Other UI modules may
// try to add or restore another Connections button; remove those duplicates.

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

  if (!nav.contains(originalConnectionsButton)) {
    const management = document.getElementById("jobpilot-management-button");
    if (management) nav.insertBefore(originalConnectionsButton, management);
    else nav.appendChild(originalConnectionsButton);
  }

  const connections = [...nav.querySelectorAll('.nav-item[data-page="connections"]')];
  connections.forEach(button => {
    if (button !== originalConnectionsButton) button.remove();
  });
}

const observer = new MutationObserver(restoreConnectionsNavigation);
observer.observe(document.body, { childList: true, subtree: true });

restoreConnectionsNavigation();
