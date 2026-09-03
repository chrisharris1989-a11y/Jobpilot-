import { supabase } from "../supabase.js";

const MANAGER_ROLES = ["owner", "admin"];
let refreshTimer = null;
let refreshing = false;

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function monthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

async function getCurrentMembership() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { user, membership: data };
}

function relevantJobs(rows, userId) {
  return (rows || []).filter(job => {
    if (String(job.status || "").toLowerCase() === "cancelled") return false;
    if (job.assigned_user_id) return String(job.assigned_user_id) === String(userId);
    return String(job.user_id) === String(userId);
  });
}

async function refreshAssignedDashboard() {
  if (refreshing) return;
  const stats = document.querySelector(".stats");
  if (!stats) return;
  const context = await getCurrentMembership();
  if (!context) return;
  if (MANAGER_ROLES.includes(String(context.membership.role || "").toLowerCase())) return;

  refreshing = true;
  try {
    const { user, membership } = context;
    const { start, end } = monthRange();
    const { data, error } = await supabase
      .from("jobs")
      .select("id,user_id,assigned_user_id,price,status,scheduled_date,scheduled_time,title,notes,customer_id")
      .eq("company_id", membership.company_id)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end);

    if (error) {
      console.error("JobPilot assigned dashboard jobs:", error);
      return;
    }

    const jobs = relevantJobs(data, user.id);
    const todayJobs = jobs.filter(job => job.scheduled_date === todayIso());
    const todayValue = todayJobs.reduce((total, job) => total + Number(job.price || 0), 0);
    const cards = document.querySelectorAll(".stats .stat-card");
    const todayCard = cards[4];
    const todayValueCard = cards[5];

    if (todayCard) {
      todayCard.innerHTML = `<div class="stat-icon">📅</div><div><span>Today's Jobs</span><strong>${todayJobs.length}</strong></div>`;
      todayCard.style.gridColumn = "span 2";
    }
    if (todayValueCard) {
      todayValueCard.innerHTML = `<div class="stat-icon">💰</div><div><span>Today's Job Value</span><strong>£${todayValue.toFixed(2)}</strong></div>`;
    }

    const monthCard = document.getElementById("jobpilot-user-month-jobs");
    if (monthCard) {
      const strong = monthCard.querySelector("strong");
      if (strong) strong.textContent = String(jobs.length);
      monthCard.dataset.assignedDashboardCount = "true";
    }
  } finally {
    refreshing = false;
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refreshAssignedDashboard(), 150);
}

const observer = new MutationObserver(scheduleRefresh);
const start = () => {
  const app = document.getElementById("app");
  if (!app) return;
  observer.observe(app, { childList: true, subtree: true });
  scheduleRefresh();
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
