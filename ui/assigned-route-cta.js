function normaliseRouteText(value) {
  return String(value || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

function addAssignedRouteCta() {
  if (!window.__jobPilotNormalUser) return;
  const page = document.getElementById("pageContent");
  if (!page) return;

  const heading = [...page.querySelectorAll("h1,h2,h3")].find(element =>
    normaliseRouteText(element.textContent) === "🚐 today's jobs" ||
    normaliseRouteText(element.textContent) === "today's jobs"
  );
  if (!heading) return;
  if (page.querySelector("[data-assigned-route-cta]")) return;

  const actions = heading.closest(".page-actions");
  if (!actions) return;

  const existingRoute = page.querySelector("[data-open-assigned-route]");
  const stopCount = existingRoute?.querySelector("strong")?.textContent?.trim() || "";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button primary";
  button.dataset.assignedRouteCta = "true";
  button.textContent = `📍 Plan today's route${stopCount ? ` · ${stopCount} stops` : ""}`;
  button.setAttribute("aria-label", "Plan today's route for your assigned jobs");
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const routeCard = page.querySelector("[data-open-assigned-route]");
    if (routeCard) {
      routeCard.click();
      return;
    }
    console.error("JobPilot: assigned route control was not rendered.");
  });

  actions.appendChild(button);
}

function startAssignedRouteCta() {
  addAssignedRouteCta();
  const page = document.getElementById("pageContent");
  if (!page || page.dataset.assignedRouteCtaObserver === "true") return;
  page.dataset.assignedRouteCtaObserver = "true";
  const observer = new MutationObserver(() => addAssignedRouteCta());
  observer.observe(page, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAssignedRouteCta);
} else {
  startAssignedRouteCta();
}
