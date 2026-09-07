// Navigation stability helpers.
// Connections now lives inside Management > Accounting.
// Do not expose a separate top-level Connections navigation item.

const LAST_PAGE_KEY = "jobpilot.lastPage";
const VALID_PAGES = new Set([
  "dashboard",
  "customers",
  "jobs",
  "quotes",
  "invoices",
  "connections",
  "settings"
]);

function removeTopLevelConnections() {
  document.querySelectorAll('.sidebar nav .nav-item[data-page="connections"]').forEach(button => button.remove());
}

function rememberCurrentPage(event) {
  const button = event.target.closest?.('.nav-item[data-page]');
  if (!button) return;

  const page = button.dataset.page;
  if (VALID_PAGES.has(page)) {
    localStorage.setItem(LAST_PAGE_KEY, page);
  }
}

function restoreLastPage() {
  const nav = document.querySelector('.sidebar nav');
  if (!nav || nav.dataset.lastPageRestored === "true") return;

  const savedPage = localStorage.getItem(LAST_PAGE_KEY);
  if (!VALID_PAGES.has(savedPage)) return;

  const button = nav.querySelector(`.nav-item[data-page="${savedPage}"]`);
  if (!button) return;

  nav.dataset.lastPageRestored = "true";
  button.click();
}

// Capture navigation before app.js handlers run so the selected page is
// remembered immediately. On refresh, app.js initially renders Dashboard;
// once that navigation is recreated, restore the page the user was viewing.
document.addEventListener("click", rememberCurrentPage, true);

const observer = new MutationObserver(() => {
  removeTopLevelConnections();
  queueMicrotask(restoreLastPage);
});

observer.observe(document.body, { childList: true, subtree: true });

removeTopLevelConnections();
queueMicrotask(restoreLastPage);
