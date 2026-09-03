function isAssignedTodayPage() {
  const page = document.getElementById("pageContent");
  if (!page) return false;
  const heading = [...page.querySelectorAll("h1,h2,h3")].find(el =>
    String(el.textContent || "").trim().toLowerCase() === "🚐 today's jobs" ||
    String(el.textContent || "").trim().toLowerCase() === "today's jobs"
  );
  return !!heading;
}

function showAssignedStops() {
  if (!window.__jobPilotNormalUser || !isAssignedTodayPage()) return;

  const page = document.getElementById("pageContent");
  const stops = page?.querySelector("[data-open-assigned-route]");
  if (!stops) return;

  // Keep the route-planning Stops control visible even if another UI cleanup
  // script has applied a generic card visibility rule.
  stops.style.setProperty("display", "flex", "important");
  stops.style.setProperty("visibility", "visible", "important");
  stops.style.setProperty("opacity", "1", "important");
  stops.removeAttribute("aria-hidden");
  stops.setAttribute("aria-label", "Plan a route for your assigned jobs today");
  stops.title = "Plan a route for your assigned jobs today";
}

const assignedStopsVisibilityObserver = new MutationObserver(showAssignedStops);
assignedStopsVisibilityObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
showAssignedStops();
