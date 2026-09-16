// Keep the dashboard's sixth card labelled Calendar.
// This runs after the legacy dashboard UI and handles both management and user cards.
function renameDashboardCalendarCards() {
  document.querySelectorAll(".stats .stat-card").forEach(card => {
    const label = card.querySelector("span");
    if (!label) return;
    const text = String(label.textContent || "").trim().toLowerCase();
    if (text === "this month's jobs") label.textContent = "Calendar";
  });
}

const observer = new MutationObserver(renameDashboardCalendarCards);

function start() {
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  renameDashboardCalendarCards();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
