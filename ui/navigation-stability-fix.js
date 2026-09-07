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
  "settings"
]);

const MANAGEMENT_SECTIONS = new Set([
  "Users & Team",
  "Quote Requests",
  "Company",
  "Connections",
  "Billing",
  "Import & Export"
]);

function removeTopLevelConnections() {
  document.querySelectorAll('.sidebar nav .nav-item[data-page="connections"]').forEach(button => button.remove());
}

function saveCurrentScreen() {
  const title = document.getElementById("pageTitle")?.textContent?.trim();
  if (!title) return;

  const navButton = document.querySelector(`.nav-item[data-page]`);
  const pageButton = [...document.querySelectorAll(".nav-item[data-page]")]
    .find(button => button.classList.contains("active"));

  if (pageButton?.dataset.page && VALID_PAGES.has(pageButton.dataset.page)) {
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ type: "page", value: pageButton.dataset.page }));
    return;
  }

  if (title === "Today's Route") {
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ type: "route" }));
    return;
  }

  if (title === "Management" || MANAGEMENT_SECTIONS.has(title)) {
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ type: "management", value: title }));
  }
}

function rememberNavigationClick(event) {
  const target = event.target.closest?.("button, [role='button'], .nav-item");
  if (!target) return;

  // Top-level pages are known immediately. For dynamically rendered screens,
  // wait until their click handler has rendered the destination before saving it.
  const page = target.dataset?.page;
  if (page && VALID_PAGES.has(page)) {
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ type: "page", value: page }));
  } else {
    setTimeout(saveCurrentScreen, 0);
  }
}

function restoreLastPage() {
  const nav = document.querySelector('.sidebar nav');
  if (!nav || nav.dataset.lastPageRestored === "true") return;

  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(LAST_PAGE_KEY) || "null");
  } catch {
    saved = null;
  }

  if (!saved) return;

  if (saved.type === "page" && VALID_PAGES.has(saved.value)) {
    const button = nav.querySelector(`.nav-item[data-page="${saved.value}"]`);
    if (!button) return;

    nav.dataset.lastPageRestored = "true";
    button.click();
    return;
  }

  if (saved.type === "management") {
    const managementButton = document.getElementById("jobpilot-management-button");
    if (!managementButton) return;

    nav.dataset.lastPageRestored = "true";
    managementButton.click();

    if (saved.value === "Management") return;

    // Management renders its section cards asynchronously after navigation.
    const wanted = saved.value;
    const findSection = () => {
      const card = document.querySelector(`[data-management-section]`);
      const matching = [...document.querySelectorAll("[data-management-section]")]
        .find(item => item.textContent.trim().includes(wanted));
      if (matching) {
        matching.click();
        return;
      }
      if (card) setTimeout(findSection, 50);
    };
    setTimeout(findSection, 0);
    return;
  }

  if (saved.type === "route") {
    const dashboard = nav.querySelector('.nav-item[data-page="dashboard"]');
    if (!dashboard) return;

    nav.dataset.lastPageRestored = "true";
    dashboard.click();

    const findRoute = () => {
      const routeButton = document.querySelector("[data-open-assigned-route], [data-assigned-route-cta]");
      if (routeButton) {
        routeButton.click();
        return;
      }
      setTimeout(findRoute, 50);
    };
    setTimeout(findRoute, 0);
  }
}

document.addEventListener("click", rememberNavigationClick, true);

const observer = new MutationObserver(() => {
  removeTopLevelConnections();
  queueMicrotask(restoreLastPage);
});

observer.observe(document.body, { childList: true, subtree: true });

removeTopLevelConnections();
queueMicrotask(restoreLastPage);
