import { supabase } from "./supabase.js";

// Dashboard-only UI enhancements.
const MANAGEMENT_ROLES = ["owner", "admin"];

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
    if (button) button.style.display = "none";
  });

  const bottom = document.querySelector(".sidebar-bottom");
  if (bottom) {
    bottom.style.borderTop = "0";
    bottom.style.paddingTop = "4px";
  }
}

function balanceTopNavigation() {
  const bottom = document.querySelector(".sidebar-bottom");
  const dashboard = getPageButton("dashboard");
  if (!bottom || !dashboard) return;

  if (dashboard.parentElement !== bottom) {
    bottom.insertBefore(dashboard, bottom.firstChild);
  }

  if (!document.getElementById("jobpilot-nav-balance-style")) {
    const style = document.createElement("style");
    style.id = "jobpilot-nav-balance-style";
    style.textContent = `
      .sidebar-bottom {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        grid-template-rows: repeat(2, auto) !important;
        gap: 5px !important;
        width: 100% !important;
        align-items: stretch !important;
      }
      .sidebar-bottom .nav-item {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        margin: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function hideUpcomingJobs() {
  const elements = document.querySelectorAll("#app *");
  elements.forEach(element => {
    if (element.children.length > 0) return;
    const text = String(element.textContent || "").trim().toLowerCase();
    if (text !== "upcoming jobs") return;
    const panel = element.closest(".stat-card, .card, .dashboard-card, .panel, section, article");
    if (panel) panel.style.display = "none";
    else element.style.display = "none";
  });
}

function hideQuickActions() {
  const elements = document.querySelectorAll("#app *");
  elements.forEach(element => {
    if (element.children.length > 0) return;
    const text = String(element.textContent || "").trim().toLowerCase();
    if (text !== "quick actions") return;
    const panel = element.closest(".panel, .card, .dashboard-card, section, article");
    if (panel) panel.style.display = "none";
    else element.style.display = "none";
  });
}

async function hasManagementAccess() {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("JobPilot dashboard management access:", error);
      return false;
    }
    return MANAGEMENT_ROLES.includes(String(data?.role || "").toLowerCase());
  } catch (error) {
    console.error("JobPilot dashboard management access:", error);
    return false;
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

function makeTodayJobsClickable() {
  const cards = document.querySelectorAll(".stats .stat-card");
  const card = cards[4];
  if (!card || card.dataset.routePlannerBound === "true") return;
  card.dataset.routePlannerBound = "true";
  card.style.cursor = "pointer";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", "Open Today's Route");
  card.title = "Open Today's Route";
  const openRoute = async () => {
    try {
      const module = await import("./route-planner.js");
      await module.openTodayRoute();
    } catch (error) {
      console.error("Today's route planner:", error);
      alert("Today's route planner could not be loaded. Please try again.");
    }
  };
  card.addEventListener("click", openRoute);
  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRoute();
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
  const activeTodayJobs = (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
  const jobCount = activeTodayJobs.length;
  const jobValue = activeTodayJobs.reduce((total, job) => total + Number(job.price || 0), 0);
  todayJobsCard.innerHTML = `
    <div class="stat-icon">📅</div>
    <div><span>Today's Jobs</span><strong>${jobCount}</strong></div>
  `;
  todayValueCard.innerHTML = `
    <div class="stat-icon">💰</div>
    <div><span>Today's Job Value</span><strong>£${jobValue.toFixed(2)}</strong></div>
  `;
  [todayJobsCard, todayValueCard].forEach(card => { card.style.gridColumn = "span 2"; });
}

function getWorkloadDateRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const format = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayNumber = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayNumber}`;
  };
  return {
    weekStart: format(weekStart),
    weekEnd: format(weekEnd),
    monthStart: format(monthStart),
    monthEnd: format(monthEnd)
  };
}

function makeUserWorkloadCard(id, label, icon) {
  const card = document.createElement("div");
  card.id = id;
  card.className = "stat-card";
  card.style.gridColumn = "span 2";
  card.innerHTML = `<div class="stat-icon">${icon}</div><div><span>${label}</span><strong>—</strong></div>`;
  return card;
}

async function updateUserWorkloadSnapshots(managementUser) {
  if (managementUser) return;

  const stats = document.querySelector(".stats");
  if (!stats) return;

  let weekCard = document.getElementById("jobpilot-user-week-jobs");
  let monthCard = document.getElementById("jobpilot-user-month-jobs");

  if (!weekCard) {
    weekCard = makeUserWorkloadCard("jobpilot-user-week-jobs", "This Week's Jobs", "📆");
    stats.appendChild(weekCard);
  }
  if (!monthCard) {
    monthCard = makeUserWorkloadCard("jobpilot-user-month-jobs", "This Month's Jobs", "🗓️");
    stats.appendChild(monthCard);
  }

  if (stats.dataset.userWorkloadLoaded === "true") return;
  stats.dataset.userWorkloadLoaded = "true";

  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return;

    const { weekStart, weekEnd, monthStart, monthEnd } = getWorkloadDateRanges();
    const { data, error } = await supabase
      .from("jobs")
      .select("id, status, scheduled_date")
      .eq("user_id", user.id)
      .gte("scheduled_date", monthStart)
      .lte("scheduled_date", monthEnd);

    if (error) throw error;

    const activeJobs = (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
    const weekJobs = activeJobs.filter(job => job.scheduled_date >= weekStart && job.scheduled_date <= weekEnd);
    const monthJobs = activeJobs.filter(job => job.scheduled_date >= monthStart && job.scheduled_date <= monthEnd);

    weekCard.querySelector("strong").textContent = String(weekJobs.length);
    monthCard.querySelector("strong").textContent = String(monthJobs.length);
  } catch (error) {
    console.error("JobPilot user workload snapshots:", error);
  }
}

async function applyDashboardRoleVisibility() {
  const cards = document.querySelectorAll(".stats .stat-card");
  if (cards.length < 6) return;
  const managementUser = await hasManagementAccess();

  // Normal users do not need the business-wide Jobs, Customers, Quotes or Invoices cards.
  [0, 1, 2, 3].forEach(index => {
    const card = cards[index];
    if (card) card.style.display = managementUser ? "" : "none";
  });

  const todayValueCard = cards[5];
  if (todayValueCard) {
    todayValueCard.style.display = managementUser ? "" : "none";
    todayValueCard.setAttribute("aria-hidden", managementUser ? "false" : "true");
  }

  if (!managementUser) {
    hideQuickActions();
    showQuoteRequestPanel();
  }

  await updateUserWorkloadSnapshots(managementUser);
}

function showQuoteRequestPanel() {
  const content = document.getElementById("pageContent");
  if (!content || document.getElementById("jobpilot-user-quote-request")) return;

  const panel = document.createElement("div");
  panel.id = "jobpilot-user-quote-request";
  panel.className = "panel";
  panel.style.marginTop = "20px";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>💷 Request a Quote</h2>
        <p>Send the job details to management and they can prepare the customer quote.</p>
      </div>
      <button id="jobpilot-request-quote-button" class="button primary" type="button">Request a Quote</button>
    </div>
  `;
  content.appendChild(panel);
  document.getElementById("jobpilot-request-quote-button")?.addEventListener("click", () => {
    if (typeof window.showQuoteRequestForm === "function") window.showQuoteRequestForm();
    else console.error("JobPilot: quote request form is not available.");
  });
}

function enhanceDashboard() {
  const stats = document.querySelector(".stats");
  if (!stats) return;
  hideDuplicateNavigation();
  balanceTopNavigation();
  hideUpcomingJobs();
  makeDashboardCardsClickable();
  if (stats.dataset.snapshotCardsAdded !== "true") {
    stats.dataset.snapshotCardsAdded = "true";
    const todayJobsCard = document.createElement("div");
    todayJobsCard.className = "stat-card";
    todayJobsCard.innerHTML = `<div class="stat-icon">📅</div><div><span>Today's Jobs</span><strong>—</strong></div>`;
    const todayValueCard = document.createElement("div");
    todayValueCard.className = "stat-card";
    todayValueCard.innerHTML = `<div class="stat-icon">💰</div><div><span>Today's Job Value</span><strong>£0.00</strong></div>`;
    todayJobsCard.style.gridColumn = "span 2";
    todayValueCard.style.gridColumn = "span 2";
    stats.appendChild(todayJobsCard);
    stats.appendChild(todayValueCard);
  }
  makeTodayJobsClickable();
  updateTodaySnapshot();
  applyDashboardRoleVisibility();
}

const observer = new MutationObserver(() => enhanceDashboard());

function startDashboardEnhancement() {
  const app = document.getElementById("app");
  if (!app) return;
  observer.observe(app, { childList: true, subtree: true });
  enhanceDashboard();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startDashboardEnhancement);
else startDashboardEnhancement();
