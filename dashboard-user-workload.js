import { supabase } from "./supabase.js";

// Adds workload snapshots for normal User accounts without changing
// the existing Owner/Admin dashboard cards.

const MANAGEMENT_ROLES = ["owner", "admin"];
let roleChecked = false;
let managementUser = false;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // JobPilot uses Monday-Sunday for the working week.
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    monthStart: formatDate(monthStart),
    monthEnd: formatDate(monthEnd)
  };
}

async function checkManagementRole() {
  if (roleChecked) return managementUser;
  roleChecked = true;

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
      console.error("JobPilot user workload role check:", error);
      return false;
    }

    managementUser = MANAGEMENT_ROLES.includes(String(data?.role || "").toLowerCase());
    return managementUser;
  } catch (error) {
    console.error("JobPilot user workload role check:", error);
    return false;
  }
}

function findTodayJobsCard(stats) {
  return [...stats.querySelectorAll(".stat-card")].find(card =>
    String(card.textContent || "").toLowerCase().includes("today's jobs")
  );
}

function makeCard(label, icon, value = "—") {
  const card = document.createElement("div");
  card.className = "stat-card jobpilot-user-workload-card";
  card.dataset.userWorkloadCard = label.toLowerCase().replace(/[^a-z]+/g, "-");
  card.innerHTML = `
    <div class="stat-icon">${icon}</div>
    <div><span>${label}</span><strong>${value}</strong></div>
  `;
  card.style.gridColumn = "span 2";
  return card;
}

async function updateWorkloadCards(stats) {
  if (managementUser) return;

  const todayCard = findTodayJobsCard(stats);
  if (!todayCard) return;

  let weekCard = stats.querySelector('[data-user-workload-card="this-week-s-jobs"]');
  let monthCard = stats.querySelector('[data-user-workload-card="this-month-s-jobs"]');

  if (!weekCard) {
    weekCard = makeCard("This Week's Jobs", "📆");
    todayCard.insertAdjacentElement("afterend", weekCard);
  }

  if (!monthCard) {
    monthCard = makeCard("This Month's Jobs", "🗓️");
    weekCard.insertAdjacentElement("afterend", monthCard);
  }

  if (stats.dataset.userWorkloadLoaded === "true") return;
  stats.dataset.userWorkloadLoaded = "true";

  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return;

  const { weekStart, weekEnd, monthStart, monthEnd } = getDateRanges();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, status, scheduled_date")
    .eq("user_id", user.id)
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", monthEnd);

  if (error) {
    console.error("JobPilot user workload:", error);
    return;
  }

  const activeJobs = (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
  const weekJobs = activeJobs.filter(job => job.scheduled_date >= weekStart && job.scheduled_date <= weekEnd);
  const monthJobs = activeJobs.filter(job => job.scheduled_date >= monthStart && job.scheduled_date <= monthEnd);

  weekCard.querySelector("strong").textContent = String(weekJobs.length);
  monthCard.querySelector("strong").textContent = String(monthJobs.length);
}

async function enhanceUserDashboard() {
  const stats = document.querySelector(".stats");
  if (!stats) return;

  const isManagement = await checkManagementRole();
  if (isManagement) return;

  await updateWorkloadCards(stats);
}

const observer = new MutationObserver(() => {
  enhanceUserDashboard();
});

function start() {
  const app = document.getElementById("app");
  if (!app) return;
  observer.observe(app, { childList: true, subtree: true });
  enhanceUserDashboard();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
