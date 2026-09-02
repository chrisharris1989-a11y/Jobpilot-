// Connections now lives inside Management > Accounting.
// Do not expose a separate top-level Connections navigation item.

function removeTopLevelConnections() {
  document.querySelectorAll('.sidebar nav .nav-item[data-page="connections"]').forEach(button => button.remove());
}

const observer = new MutationObserver(removeTopLevelConnections);
observer.observe(document.body, { childList: true, subtree: true });

removeTopLevelConnections();
