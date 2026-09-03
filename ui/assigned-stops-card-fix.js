function isAssignedTodayJobsPage(page) {
  const heading = page?.querySelector("h2");
  return String(heading?.textContent || "").toLowerCase().includes("today's jobs");
}

function ensureAssignedStopsCard() {
  if (!window.__jobPilotNormalUser) return;
  const page = document.getElementById("pageContent");
  if (!page || !isAssignedTodayJobsPage(page)) return;
  if (page.querySelector("[data-open-assigned-route]")) return;

  const rows = [...page.querySelectorAll("[data-assigned-job-id]")];
  if (!rows.length) return;

  const card = document.createElement("div");
  card.className = "stats";
  card.style.marginBottom = "20px";
  card.innerHTML = `
    <div class="stat-card" data-forced-assigned-route style="cursor:pointer" role="button" tabindex="0" aria-label="Open route planner for your assigned jobs">
      <div class="stat-icon">📍</div>
      <div><span>Stops</span><strong>${rows.length}</strong></div>
    </div>`;

  const jobsPanel = rows[0].closest(".panel");
  if (jobsPanel) page.insertBefore(card, jobsPanel);
  else page.appendChild(card);

  const open = () => {
    if (typeof window.__jobPilotOpenAssignedRoutePlanner === "function") {
      window.__jobPilotOpenAssignedRoutePlanner();
      return;
    }
    console.error("JobPilot: assigned route planner is not available yet.");
  };

  const target = card.querySelector("[data-forced-assigned-route]");
  target.addEventListener("click", open);
  target.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
}

const assignedStopsFixObserver = new MutationObserver(() => ensureAssignedStopsCard());

function startAssignedStopsCardFix() {
  const page = document.getElementById("pageContent");
  if (!page) return;
  assignedStopsFixObserver.observe(page, { childList: true, subtree: true });
  ensureAssignedStopsCard();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAssignedStopsCardFix);
} else {
  startAssignedStopsCardFix();
}
