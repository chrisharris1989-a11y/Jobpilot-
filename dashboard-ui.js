import { supabase } from "./supabase.js";

// Dashboard-only UI enhancements.
// Keeps the existing app logic intact while making the dashboard cards
// useful and the navigation less repetitive.

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPageButton(page) {
  return document.querySelector(`.nav-item[data-page="${page}"]`);
}

function hideDuplicateNavigation() {
  ["customers", "jobs", "quotes", "invoices"].forEach(page => {
    const button = getPageButton(page);
    if (button) {
      button.style.display = "none";
    }
  });

  // The old navigation divider is no longer needed when the top navigation
  // only contains Dashboard, Feedback, Settings and Sign out.
  const bottom = document.querySelector(".sidebar-bottom");
  if (bottom) {
    bottom.style.borderTop = "0";
    bottom.style.paddingTop = "4px";
  }
}

function makeDashboardCardsClickable() {
  const cards = document.querySelectorAll(".stats .stat-card");
  const pages = ["jobs", "customers", "quotes", "invoices"];

  pages.forEach((page, index) => {
    const card = cards[index];
    if (!card) return;

    card.style.cursor = "pointer";
    card.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Open ${page}`);

    if (card.dataset.dashboardEnhanced === "true") return;
    card.dataset.dashboardEnhanced = "true";

    const openPage = () => {
      const button = getPageButton(page);
      if (button) button.click();
    };

    card.addEventListener("click", openPage);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPage();
      }
    });

    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-2px)";
      card.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.10)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.boxShadow = "";
    });
  });
}

async function updateTodaySnapshot() {
  const cards = document.querySelectorAll(".stats .stat-card");
  if (cards.length < 6) return;

  const todayJobsCard = cards[4];
  const todayValueCard = cards[5];

  if (todayJobsCard.dataset.todaySnapshot === "true") return;
  todayJobsCard.dataset.todaySnapshot = "true";
  todayValueCard.dataset.todaySnapshot = "true";

  const today = getTodayDate();

  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("jobs")
    .select("id, price, status, scheduled_date")
    .eq("user_id", user.id)
    .eq("scheduled_date", today);

  if (error) {
    console.error("Today's dashboard jobs:", error);
    return;
  }

  const activeTodayJobs = (data || []).filter(job =>
    String(job.status || "").toLowerCase() !== "cancelled"
  );

  const jobCount = activeTodayJobs.length;
  const jobValue = activeTodayJobs.reduce(
    (total, job) => total + Number(job.price || 0),
    0
  );

  todayJobsCard.innerHTML = `
    <div class="stat-icon">📅</div>
    <div>
      <span>Today's Jobs</span>
      <strong>${jobCount}</strong>
    </div>
  `;

  todayValueCard.innerHTML = `
    <div class="stat-icon">💰</div>
    <div>
      <span>Today's Job Value</span>
      <strong>£${jobValue.toFixed(2)}</strong>
    </div>
  `;

  [todayJobsCard, todayValueCard].forEach(card => {
    card.style.gridColumn = "span 2";
  });
}

function enhanceDashboard() {
  const stats = document.querySelector(".stats");
  if (!stats) return;

  hideDuplicateNavigation();
  makeDashboardCardsClickable();

  // The dashboard is rendered synchronously by app.js, so the first four
  // cards exist immediately. Add the two snapshot cards once per render.
  if (stats.dataset.snapshotCardsAdded !== "true") {
    stats.dataset.snapshotCardsAdded = "true";

    const todayJobsCard = document.createElement("div");
    todayJobsCard.className = "stat-card";
    todayJobsCard.innerHTML = `
      <div class="stat-icon">📅</div>
      <div>
        <span>Today's Jobs</span>
        <strong>—</strong>
      </div>
    `;

    const todayValueCard = document.createElement("div");
    todayValueCard.className = "stat-card";
    todayValueCard.innerHTML = `
      <div class="stat-icon">💰</div>
      <div>
        <span>Today's Job Value</span>
        <strong>£0.00</strong>
      </div>
    `;

    todayJobsCard.style.gridColumn = "span 2";
    todayValueCard.style.gridColumn = "span 2";

    stats.appendChild(todayJobsCard);
    stats.appendChild(todayValueCard);
  }

  // Re-run after the cards have been inserted so the live values populate.
  updateTodaySnapshot();
}

const observer = new MutationObserver(() => {
  enhanceDashboard();
});

function startDashboardEnhancement() {
  const app = document.getElementById("app");
  if (!app) return;

  observer.observe(app, {
    childList: true,
    subtree: true
  });

  enhanceDashboard();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startDashboardEnhancement);
} else {
  startDashboardEnhancement();
}
