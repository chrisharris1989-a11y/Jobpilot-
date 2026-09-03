function normaliseAssignedTodayText(value) {
  return String(value || "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hideRedundantAssignedTodayPageCard() {
  if (!window.__jobPilotNormalUser) return;

  const page = document.getElementById("pageContent");
  const title = normaliseAssignedTodayText(document.getElementById("pageTitle")?.textContent);
  if (!page || title !== "today's jobs") return;

  // The Dashboard must keep its Today's Jobs card. Only remove the duplicate
  // card when the User is actually on the dedicated Today's Jobs page.
  page.querySelectorAll(".stat-card,.card,.dashboard-card").forEach(card => {
    const text = normaliseAssignedTodayText(card.textContent);
    if (text === "today's jobs" || text.startsWith("today's jobs ")) {
      card.style.display = "none";
      card.setAttribute("aria-hidden", "true");
    }
  });

  // Also catch a card whose heading is wrapped in another element/class.
  page.querySelectorAll("h1,h2,h3,h4,h5,h6,span,strong,p").forEach(element => {
    if (normaliseAssignedTodayText(element.textContent) !== "today's jobs") return;
    const card = element.closest(".stat-card,.card,.dashboard-card");
    if (card) {
      card.style.display = "none";
      card.setAttribute("aria-hidden", "true");
    }
  });
}

const assignedTodayPageObserver = new MutationObserver(() => {
  hideRedundantAssignedTodayPageCard();
});

assignedTodayPageObserver.observe(document.body, { childList: true, subtree: true });
hideRedundantAssignedTodayPageCard();
