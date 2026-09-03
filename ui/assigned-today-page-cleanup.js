function hideRedundantAssignedTodayPageCard() {
  if (!window.__jobPilotNormalUser) return;
  const page = document.getElementById("pageContent");
  if (!page) return;

  page.querySelectorAll(".stat-card").forEach(card => {
    const text = String(card.textContent || "").trim().toLowerCase();
    if (text === "today's jobs" || text.startsWith("today's jobs ")) {
      card.style.display = "none";
    }
  });
}

const assignedTodayPageObserver = new MutationObserver(hideRedundantAssignedTodayPageCard);
assignedTodayPageObserver.observe(document.body, { childList: true, subtree: true });
hideRedundantAssignedTodayPageCard();
