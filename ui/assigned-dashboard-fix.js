import { supabase } from "../supabase.js";

const MANAGER_ROLES = ["owner", "admin"];
let refreshTimer = null;
let refreshing = false;
let assignedJobQueryPatchInstalled = false;

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

// The dashboard's monthly calendar is already wired to the correct click handler.
// Its legacy query uses user_id, while assigned jobs use assigned_user_id. Install
// this narrowly-scoped rewrite immediately so the click cannot race the patch.
function installMonthlyCalendarQueryPatch() {
  const originalFrom = supabase.from.bind(supabase);
  supabase.from = table => {
    const builder = originalFrom(table);
    if (table !== "jobs") return builder;

    let monthlyCalendarQuery = false;
    return new Proxy(builder, {
      get(target, property, receiver) {
        if (property === "select") {
          return (columns, ...args) => {
            monthlyCalendarQuery = typeof columns === "string"
              && columns.includes("scheduled_date")
              && columns.includes("scheduled_time")
              && columns.includes("notes")
              && !columns.includes("price");
            const result = Reflect.get(target, property, receiver).call(target, columns, ...args);
            return result === target ? receiver : result;
          };
        }
        if (property === "eq") {
          return (column, value) => {
            const actualColumn = monthlyCalendarQuery && column === "user_id"
              ? "assigned_user_id"
              : column;
            const result = Reflect.get(target, property, receiver).call(target, actualColumn, value);
            return result === target ? receiver : result;
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });
  };
}

function installAssignedJobQueryPatch(userId) {
  if (assignedJobQueryPatchInstalled || !userId) return;
  assignedJobQueryPatchInstalled = true;

  const originalFrom = supabase.from.bind(supabase);
  supabase.from = table => {
    const builder = originalFrom(table);
    if (table !== "jobs") return builder;

    return new Proxy(builder, {
      get(target, property, receiver) {
        if (property !== "eq") return Reflect.get(target, property, receiver);
        const originalEq = target.eq;
        return (column, value) => {
          if (column === "user_id" && value === userId) {
            return originalEq.call(target, "assigned_user_id", value);
          }
          return originalEq.call(target, column, value);
        };
      }
    });
  };
}

// Install before any dashboard interaction or asynchronous membership lookup.
installMonthlyCalendarQueryPatch();

function findTodayJobsCard(cards) {
  return [...cards].find(card => {
    const text = String(card.textContent || "").trim().toLowerCase();
    return text.includes("today's jobs") && !text.includes("today's job value");
  }) || [...cards].find(card => String(card.textContent || "").trim().toLowerCase().includes("your jobs today"));
}

function findTodayValueCard(cards) {
  return [...cards].find(card => String(card.textContent || "").trim().toLowerCase().includes("today's job value"));
}

async function refreshAssignedDashboard() {
  if (refreshing) return;
  const stats = document.querySelector(".stats");
  if (!stats) return;
  const context = await getCurrentMembership();
  if (!context) return;
  if (MANAGER_ROLES.includes(String(context.membership.role || "").toLowerCase())) return;

  installAssignedJobQueryPatch(context.user.id);

  refreshing = true;
  try {
    const { user, membership } = context;
    const { start, end } = monthRange();
    const { data, error } = await supabase
      .from("jobs")
      .select("id,assigned_user_id,status,scheduled_date,scheduled_time,title,notes,customer_id")
      .eq("company_id", membership.company_id)
      .eq("assigned_user_id", user.id)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end);

    if (error) {
      console.error("JobPilot assigned dashboard jobs:", error);
      return;
    }

    const jobs = (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
    const todayJobs = jobs.filter(job => job.scheduled_date === todayIso());
    const cards = document.querySelectorAll(".stats .stat-card");
    const todayCard = findTodayJobsCard(cards);
    const todayValueCard = findTodayValueCard(cards);

    if (todayCard) {
      todayCard.style.display = "";
      todayCard.style.visibility = "visible";
      todayCard.removeAttribute("aria-hidden");
      todayCard.innerHTML = `<div class="stat-icon">📅</div><div><span>Today's Jobs</span><strong>${todayJobs.length}</strong></div>`;
      todayCard.style.gridColumn = "span 2";
      todayCard.style.cursor = "pointer";
      todayCard.setAttribute("role", "button");
      todayCard.setAttribute("tabindex", "0");
      todayCard.setAttribute("aria-label", "Open your assigned jobs today");
    }

    if (todayValueCard) {
      todayValueCard.style.display = "none";
      todayValueCard.setAttribute("aria-hidden", "true");
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