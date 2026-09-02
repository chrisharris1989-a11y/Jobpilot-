// Final routing guard for Management > Accounting.
// The Management module already owns the Connections renderer; this guard only
// makes sure the Accounting card cannot fall through to the top-level Connections
// navigation and that the resulting page is labelled Accounting.

function labelManagementAccountingPage() {
  const management = document.getElementById("jobpilot-management-button");
  if (!management?.classList.contains("active")) return;

  const title = document.getElementById("pageTitle");
  if (title?.textContent.trim() === "Connections") title.textContent = "Accounting";

  const subtitle = document.getElementById("pageSubtitle");
  if (subtitle && (subtitle.textContent.trim() === "Connect the services your business uses with JobPilot." || subtitle.textContent.trim() === "")) {
    subtitle.textContent = "Manage your accounting and payment connections.";
  }

  const heading = document.querySelector("#pageContent .page-actions h2");
  if (heading?.textContent.trim() === "Connections") heading.textContent = "Accounting";
}

document.addEventListener("click", event => {
  const card = event.target.closest?.('[data-management-section="connections"]');
  if (!card) return;

  // Let the existing Management renderer handle the click, then normalise its
  // visible title once the page has rendered.
  setTimeout(labelManagementAccountingPage, 50);
  setTimeout(labelManagementAccountingPage, 200);
  setTimeout(labelManagementAccountingPage, 500);
});

const observer = new MutationObserver(labelManagementAccountingPage);
observer.observe(document.body, { childList: true, subtree: true });

labelManagementAccountingPage();
