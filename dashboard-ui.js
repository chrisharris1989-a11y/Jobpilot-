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

  if (dashboard.parentElement !== bottom) bottom.insertBefore(dashboard, bottom.firstChild);

  if (!document.getElementById("jobpilot-nav-balance-style")) {
    const style = document.createElement("style");
    style.id = "jobpilot-nav-balance-style";
    style.textContent = `
      .sidebar-bottom { display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr))!important; grid-template-rows:repeat(2,auto)!important; gap:5px!important; width:100%!important; align-items:stretch!important; }
      .sidebar-bottom .nav-item { width:100%!important; min-width:0!important; box-sizing:border-box!important; margin:0!important; }
    `;
    document.head.appendChild(style);
  }
}

function hideUpcomingJobs() {
  document.querySelectorAll("#app *").forEach(element => {
    if (element.children.length > 0) return;
    if (String(element.textContent || "").trim().toLowerCase() !== "upcoming jobs") return;
    const panel = element.closest(".stat-card,.card,.dashboard-card,.panel,section,article");
    if (panel) panel.style.display = "none";
    else element.style.display = "none";
  });
}

function hideQuickActions() {
  document.querySelectorAll("#app *").forEach(element => {
    if (element.children.length > 0) return;
    if (String(element.textContent || "").trim().toLowerCase() !== "quick actions") return;
    const panel = element.closest(".panel,.card,.dashboard-card,section,article");
    if (panel) panel.style.display = "none";
    else element.style.display = "none";
  });
}

async function hasManagementAccess() {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.from("company_members").select("role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
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
  ["jobs", "customers", "quotes", "invoices"].forEach((page, index) => {
    const card = cards[index];
    if (!card) return;
    card.style.cursor = "pointer";
    card.style.transition = "transform .15s ease,box-shadow .15s ease";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Open ${page}`);
    if (card.dataset.dashboardEnhanced === "true") return;
    card.dataset.dashboardEnhanced = "true";
    const openPage = () => getPageButton(page)?.click();
    card.addEventListener("click", openPage);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPage(); }
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
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRoute(); }
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
  const { data, error } = await supabase.from("jobs").select("id, price, status, scheduled_date").eq("user_id", user.id).eq("scheduled_date", today);
  if (error) { console.error("Today's dashboard jobs:", error); return; }
  const activeTodayJobs = (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
  const jobValue = activeTodayJobs.reduce((total, job) => total + Number(job.price || 0), 0);
  todayJobsCard.innerHTML = `<div class="stat-icon">📅</div><div><span>Today's Jobs</span><strong>${activeTodayJobs.length}</strong></div>`;
  todayValueCard.innerHTML = `<div class="stat-icon">💰</div><div><span>Today's Job Value</span><strong>£${jobValue.toFixed(2)}</strong></div>`;
  [todayJobsCard, todayValueCard].forEach(card => { card.style.gridColumn = "span 2"; });
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  return { start: format(start), end: format(end), date: now };
}

function makeUserMonthCard() {
  const card = document.createElement("div");
  card.id = "jobpilot-user-month-jobs";
  card.className = "stat-card";
  card.style.gridColumn = "span 2";
  card.style.cursor = "pointer";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", "Open this month's planned work");
  card.title = "Open this month's planned work";
  card.innerHTML = `<div class="stat-icon">🗓️</div><div><span>This Month's Jobs</span><strong>—</strong></div>`;
  return card;
}

function openMonthCalendar(jobs, selectedDate = null) {
  document.getElementById("jobpilot-month-calendar-overlay")?.remove();
  const { date } = getMonthRange();
  let year = date.getFullYear();
  let month = date.getMonth();

  const overlay = document.createElement("div");
  overlay.id = "jobpilot-month-calendar-overlay";
  overlay.innerHTML = `
    <div class="jobpilot-calendar-backdrop"></div>
    <div class="jobpilot-calendar-modal" role="dialog" aria-modal="true" aria-label="Planned work calendar">
      <div class="jobpilot-calendar-header">
        <div><h2 id="jobpilot-calendar-title"></h2><p>Planned work for this month</p></div>
        <button type="button" class="jobpilot-calendar-close" aria-label="Close">×</button>
      </div>
      <div class="jobpilot-calendar-nav">
        <button type="button" id="jobpilot-calendar-prev">‹</button>
        <button type="button" id="jobpilot-calendar-today">Today</button>
        <button type="button" id="jobpilot-calendar-next">›</button>
      </div>
      <div class="jobpilot-calendar-grid" id="jobpilot-calendar-grid"></div>
      <div id="jobpilot-calendar-details" class="jobpilot-calendar-details"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  if (!document.getElementById("jobpilot-calendar-style")) {
    const style = document.createElement("style");
    style.id = "jobpilot-calendar-style";
    style.textContent = `
      #jobpilot-month-calendar-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}
      .jobpilot-calendar-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.48)}
      .jobpilot-calendar-modal{position:relative;width:min(920px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 24px 80px rgba(15,23,42,.25)}
      .jobpilot-calendar-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      .jobpilot-calendar-header h2{margin:0;font-size:24px}.jobpilot-calendar-header p{margin:4px 0 0;color:#64748b}
      .jobpilot-calendar-close{border:0;background:transparent;font-size:30px;line-height:1;cursor:pointer;padding:0 4px}
      .jobpilot-calendar-nav{display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px}.jobpilot-calendar-nav button{border:1px solid #dbe2ea;background:#fff;border-radius:9px;padding:7px 13px;font-size:18px;cursor:pointer}.jobpilot-calendar-nav #jobpilot-calendar-today{font-size:14px}
      .jobpilot-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid #e5e7eb;border-top:1px solid #e5e7eb}
      .jobpilot-calendar-weekday{font-weight:700;font-size:12px;text-align:center;padding:9px 4px;background:#f8fafc;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
      .jobpilot-calendar-day{min-height:92px;padding:7px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;background:#fff;cursor:pointer;text-align:left}.jobpilot-calendar-day.muted{background:#f8fafc;color:#94a3b8}.jobpilot-calendar-day.today{outline:2px solid #2563eb;outline-offset:-2px}.jobpilot-calendar-day.selected{background:#eff6ff}
      .jobpilot-calendar-number{font-weight:700;font-size:13px}.jobpilot-calendar-job{margin-top:5px;padding:4px 5px;border-radius:5px;background:#e0f2fe;font-size:11px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .jobpilot-calendar-more{font-size:11px;color:#475569;margin-top:3px}.jobpilot-calendar-details{margin-top:14px;padding:12px;background:#f8fafc;border-radius:10px;min-height:20px}.jobpilot-calendar-details h3{margin:0 0 7px;font-size:15px}.jobpilot-calendar-details p{margin:4px 0;font-size:13px}
      @media(max-width:640px){.jobpilot-calendar-modal{padding:12px;border-radius:12px}.jobpilot-calendar-day{min-height:64px;padding:5px}.jobpilot-calendar-job{font-size:9px}.jobpilot-calendar-details{margin-top:10px}.jobpilot-calendar-header h2{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  const title = overlay.querySelector("#jobpilot-calendar-title");
  const grid = overlay.querySelector("#jobpilot-calendar-grid");
  const details = overlay.querySelector("#jobpilot-calendar-details");
  const close = () => overlay.remove();
  overlay.querySelector(".jobpilot-calendar-close").addEventListener("click", close);
  overlay.querySelector(".jobpilot-calendar-backdrop").addEventListener("click", close);
  document.addEventListener("keydown", function calendarEscape(event){
    if (event.key === "Escape" && document.getElementById("jobpilot-month-calendar-overlay")) { close(); document.removeEventListener("keydown", calendarEscape); }
  });

  function renderDetails(iso) {
    const dayJobs = jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
    const displayDate = new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
    details.innerHTML = dayJobs.length ? `<h3>${displayDate}</h3>${dayJobs.map(job => `<p><strong>${job.scheduled_time ? job.scheduled_time + " — " : ""}${String(job.title || "Job")}</strong>${job.notes ? ` — ${String(job.notes).replace(/[<>]/g, "")}` : ""}</p>`).join("")}` : `<p>No planned work on ${displayDate}.</p>`;
  }

  function render() {
    title.textContent = new Date(year, month, 1).toLocaleDateString("en-GB", { month:"long", year:"numeric" });
    grid.innerHTML = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => `<div class="jobpilot-calendar-weekday">${day}</div>`).join("");
    const first = new Date(year, month, 1);
    const firstDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const todayIso = getTodayDate();
    for (let cell = 0; cell < totalCells; cell++) {
      const dayNumber = cell - firstDay + 1;
      const date = new Date(year, month, dayNumber);
      const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const dayJobs = jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
      const cellEl = document.createElement("button");
      cellEl.type = "button";
      cellEl.className = `jobpilot-calendar-day${inMonth ? "" : " muted"}${iso === todayIso ? " today" : ""}${iso === selectedDate ? " selected" : ""}`;
      cellEl.innerHTML = `<span class="jobpilot-calendar-number">${inMonth ? dayNumber : (cell < firstDay ? previousDays + dayNumber : dayNumber - daysInMonth)}</span>${dayJobs.slice(0,3).map(job => `<div class="jobpilot-calendar-job">${job.scheduled_time ? job.scheduled_time + " " : ""}${String(job.title || "Job").replace(/[<>]/g, "")}</div>`).join("")}${dayJobs.length > 3 ? `<div class="jobpilot-calendar-more">+${dayJobs.length-3} more</div>` : ""}`;
      cellEl.addEventListener("click", () => renderDetails(iso));
      grid.appendChild(cellEl);
    }
    if (selectedDate) renderDetails(selectedDate); else renderDetails(todayIso);
  }

  overlay.querySelector("#jobpilot-calendar-prev").addEventListener("click", () => { month--; if (month < 0) { month = 11; year--; } render(); });
  overlay.querySelector("#jobpilot-calendar-next").addEventListener("click", () => { month++; if (month > 11) { month = 0; year++; } render(); });
  overlay.querySelector("#jobpilot-calendar-today").addEventListener("click", () => { const now = new Date(); year = now.getFullYear(); month = now.getMonth(); render(); });
  render();
}

async function updateUserMonthSnapshot(managementUser) {
  if (managementUser) return;
  const stats = document.querySelector(".stats");
  if (!stats) return;
  const weekCard = document.getElementById("jobpilot-user-week-jobs");
  weekCard?.remove();

  let monthCard = document.getElementById("jobpilot-user-month-jobs");
  if (!monthCard) { monthCard = makeUserMonthCard(); stats.appendChild(monthCard); }
  if (monthCard.dataset.bound === "true") return;
  monthCard.dataset.bound = "true";

  const loadCalendar = async () => {
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return;
      const { start, end } = getMonthRange();
      const { data, error } = await supabase.from("jobs").select("id, customer_id, title, scheduled_date, scheduled_time, status, notes").eq("user_id", user.id).gte("scheduled_date", start).lte("scheduled_date", end);
      if (error) throw error;
      const activeJobs = (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
      monthCard.querySelector("strong").textContent = String(activeJobs.length);
      openMonthCalendar(activeJobs);
    } catch (error) {
      console.error("JobPilot user month calendar:", error);
      alert("The monthly work calendar could not be loaded. Please try again.");
    }
  };
  monthCard.addEventListener("click", loadCalendar);
  monthCard.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); loadCalendar(); } });
}

async function applyDashboardRoleVisibility() {
  const cards = document.querySelectorAll(".stats .stat-card");
  if (cards.length < 6) return;
  const managementUser = await hasManagementAccess();
  [0,1,2,3].forEach(index => { const card = cards[index]; if (card) card.style.display = managementUser ? "" : "none"; });
  const todayValueCard = cards[5];
  if (todayValueCard) { todayValueCard.style.display = managementUser ? "" : "none"; todayValueCard.setAttribute("aria-hidden", managementUser ? "false" : "true"); }
  if (!managementUser) { hideQuickActions(); showQuoteRequestPanel(); }
  await updateUserMonthSnapshot(managementUser);
}

function showQuoteRequestPanel() {
  const content = document.getElementById("pageContent");
  if (!content || document.getElementById("jobpilot-user-quote-request")) return;
  const panel = document.createElement("div");
  panel.id = "jobpilot-user-quote-request";
  panel.className = "panel";
  panel.style.marginTop = "20px";
  panel.innerHTML = `<div class="panel-header"><div><h2>💷 Request a Quote</h2><p>Send the job details to management and they can prepare the customer quote.</p></div><button id="jobpilot-request-quote-button" class="button primary" type="button">Request a Quote</button></div>`;
  content.appendChild(panel);
  document.getElementById("jobpilot-request-quote-button")?.addEventListener("click", () => { if (typeof window.showQuoteRequestForm === "function") window.showQuoteRequestForm(); else console.error("JobPilot: quote request form is not available."); });
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
