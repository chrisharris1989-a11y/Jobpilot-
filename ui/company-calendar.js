import { supabase } from "../supabase.js";

let currentDate = new Date();
let currentView = "week";
let cachedJobs = [];
let cachedCustomers = [];

const pad = value => String(value).padStart(2, "0");
const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfWeek = date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const escapeHtml = value => String(value ?? "").replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const customerName = id => cachedCustomers.find(c => String(c.id) === String(id))?.name || "Customer";

function timeParts(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? [Number(match[1]), Number(match[2])] : [9, 0];
}

function formatTime(value) {
  if (!value) return "";
  const [h, m] = timeParts(value);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(date, options = {}) {
  return date.toLocaleDateString(undefined, { weekday: options.weekday, day: "numeric", month: options.month, year: options.year });
}

function rangeForView() {
  if (currentView === "month") {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const start = startOfWeek(first);
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const end = addDays(startOfWeek(last), 6);
    return { start, end };
  }
  const start = startOfWeek(currentDate);
  return { start, end: addDays(start, 6) };
}

async function loadCalendarData() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to view the calendar.");

  const { start, end } = rangeForView();
  const [jobsResult, customersResult] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,customer_id,scheduled_date,scheduled_time,status,price,notes")
      .gte("scheduled_date", iso(start))
      .lte("scheduled_date", iso(end))
      .order("scheduled_time", { ascending: true }),
    supabase.from("customers").select("id,name")
  ]);

  if (jobsResult.error) throw jobsResult.error;
  if (customersResult.error) throw customersResult.error;
  cachedJobs = jobsResult.data || [];
  cachedCustomers = customersResult.data || [];
}

function jobsForDate(date) {
  return cachedJobs.filter(job => job.scheduled_date === iso(date) && String(job.status || "").toLowerCase() !== "cancelled");
}

function openJob(jobId) {
  document.dispatchEvent(new CustomEvent("jobpilot:open-job", { detail: { jobId } }));
}

function openNewJob(date, time = "") {
  document.dispatchEvent(new CustomEvent("jobpilot:new-job", { detail: { date: iso(date), time } }));
}

function titleText() {
  if (currentView === "month") return currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const start = startOfWeek(currentDate);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) return `${start.toLocaleDateString(undefined, { month: "long" })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  return `${start.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

function statusClass(status) {
  const value = String(status || "scheduled").toLowerCase().replace(/[^a-z]/g, "");
  return `status-${value || "scheduled"}`;
}

function renderWeek(container) {
  const start = startOfWeek(currentDate);
  const hours = Array.from({ length: 13 }, (_, i) => i + 7);
  const html = `<div class="jp-cal-week"><div class="jp-cal-week-head"><div></div>${Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const today = iso(d) === iso(new Date());
    return `<div class="jp-cal-day-head ${today ? "today" : ""}"><span>${d.toLocaleDateString(undefined, { weekday: "short" })}</span><strong>${d.getDate()}</strong></div>`;
  }).join("")}</div><div class="jp-cal-week-body"><div class="jp-cal-time-col">${hours.map(h => `<div>${formatTime(`${pad(h)}:00`)}</div>`).join("")}</div>${Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const dayJobs = jobsForDate(d);
    return `<div class="jp-cal-day-column" data-date="${iso(d)}">${hours.map(h => `<button type="button" class="jp-cal-slot" data-date="${iso(d)}" data-time="${pad(h)}:00" aria-label="Add job ${iso(d)} ${pad(h)}:00"></button>`).join("")}${dayJobs.map(job => {
      const [h, m] = timeParts(job.scheduled_time);
      const top = ((h - 7) * 60 + m) / 60 * 56;
      return `<button type="button" class="jp-cal-job ${statusClass(job.status)}" style="top:${top}px" data-job-id="${escapeHtml(job.id)}"><strong>${escapeHtml(formatTime(job.scheduled_time) || "All day")}</strong><span>${escapeHtml(job.title || "Job")}</span><small>${escapeHtml(customerName(job.customer_id))}</small></button>`;
    }).join("")}</div>`;
  }).join("")}</div></div>`;
  container.innerHTML = html;
}

function renderMonth(container) {
  const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const start = startOfWeek(first);
  const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const end = addDays(startOfWeek(last), 6);
  const cells = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) cells.push(new Date(d));
  container.innerHTML = `<div class="jp-cal-month"><div class="jp-cal-month-head">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => `<div>${d}</div>`).join("")}</div><div class="jp-cal-month-grid">${cells.map(d => {
    const outside = d.getMonth() !== currentDate.getMonth();
    const today = iso(d) === iso(new Date());
    const dayJobs = jobsForDate(d);
    return `<div class="jp-cal-month-day ${outside ? "outside" : ""} ${today ? "today" : ""}" data-date="${iso(d)}"><button type="button" class="jp-cal-date" data-new-date="${iso(d)}">${d.getDate()}</button>${dayJobs.slice(0, 5).map(job => `<button type="button" class="jp-cal-month-job ${statusClass(job.status)}" data-job-id="${escapeHtml(job.id)}"><span>${escapeHtml(job.scheduled_time ? formatTime(job.scheduled_time) : "")}</span> ${escapeHtml(job.title || "Job")}</button>`).join("")}${dayJobs.length > 5 ? `<div class="jp-cal-more">+${dayJobs.length - 5} more</div>` : ""}</div>`;
  }).join("")}</div></div>`;
}

function addStyles() {
  if (document.getElementById("jobpilot-company-calendar-style")) return;
  const style = document.createElement("style");
  style.id = "jobpilot-company-calendar-style";
  style.textContent = `
    .jp-calendar-wrap{background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden}
    .jp-calendar-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
    .jp-calendar-toolbar h2{margin:0;font-size:20px}.jp-calendar-toolbar p{margin:3px 0 0;color:#64748b;font-size:13px}
    .jp-calendar-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.jp-calendar-actions button{border:1px solid #dbe2ea;background:#fff;border-radius:8px;padding:7px 11px;cursor:pointer}.jp-calendar-actions button.active{background:#111827;color:#fff;border-color:#111827}
    .jp-cal-week{min-width:780px}.jp-cal-week-head,.jp-cal-week-body{display:grid;grid-template-columns:58px repeat(7,minmax(100px,1fr))}.jp-cal-week-head{border-bottom:1px solid #e5e7eb}.jp-cal-week-head>div{border-right:1px solid #e5e7eb}.jp-cal-day-head{text-align:center;padding:8px 4px}.jp-cal-day-head span{display:block;font-size:11px;color:#64748b}.jp-cal-day-head strong{display:block;font-size:16px}.jp-cal-day-head.today strong{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;width:30px;height:30px;background:#111827;color:#fff}
    .jp-cal-week-body{height:728px;overflow:auto}.jp-cal-time-col{background:#fafafa}.jp-cal-time-col div{height:56px;box-sizing:border-box;border-right:1px solid #e5e7eb;border-bottom:1px solid #eef0f3;padding:5px 5px;text-align:right;font-size:10px;color:#64748b}.jp-cal-day-column{position:relative;border-right:1px solid #e5e7eb;background:repeating-linear-gradient(to bottom,transparent 0,transparent 55px,#eef0f3 55px,#eef0f3 56px)}
    .jp-cal-slot{display:block;width:100%;height:56px;border:0;border-bottom:1px solid transparent;background:transparent;cursor:pointer}.jp-cal-slot:hover{background:rgba(37,99,235,.06)}
    .jp-cal-job{position:absolute;left:4px;right:4px;min-height:48px;border:0;border-radius:6px;padding:5px 6px;text-align:left;overflow:hidden;cursor:pointer;background:#e0f2fe;color:#0f172a}.jp-cal-job strong,.jp-cal-job span,.jp-cal-job small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jp-cal-job strong{font-size:10px}.jp-cal-job span{font-size:11px;font-weight:700}.jp-cal-job small{font-size:10px;color:#475569}.jp-cal-job.status-completed{background:#dcfce7}.jp-cal-job.status-cancelled{display:none}.jp-cal-job.status-overdue{background:#fee2e2}
    .jp-cal-month{min-width:700px}.jp-cal-month-head,.jp-cal-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.jp-cal-month-head>div{padding:9px;text-align:center;font-size:11px;font-weight:700;color:#64748b;background:#fafafa;border-right:1px solid #e5e7eb}.jp-cal-month-day{min-height:125px;border-top:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:5px;background:#fff}.jp-cal-month-day.outside{background:#fafafa;color:#94a3b8}.jp-cal-month-day.today{box-shadow:inset 0 0 0 2px #111827}.jp-cal-date{border:0;background:transparent;font-weight:700;cursor:pointer;padding:2px 4px}.jp-cal-month-job{display:block;width:100%;border:0;border-radius:5px;background:#e0f2fe;text-align:left;padding:4px 5px;margin-top:4px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.jp-cal-month-job.status-completed{background:#dcfce7}.jp-cal-month-job.status-cancelled{display:none}.jp-cal-more{font-size:10px;color:#64748b;margin-top:4px}
    @media(max-width:800px){.jp-calendar-wrap{overflow-x:auto}.jp-calendar-toolbar{position:sticky;left:0}.jp-cal-month-day{min-height:95px}}
  `;
  document.head.appendChild(style);
}

function bindEvents(container) {
  container.querySelector("#jp-cal-prev")?.addEventListener("click", async () => { currentDate = currentView === "month" ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1) : addDays(currentDate, -7); await renderCompanyCalendar(container); });
  container.querySelector("#jp-cal-next")?.addEventListener("click", async () => { currentDate = currentView === "month" ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) : addDays(currentDate, 7); await renderCompanyCalendar(container); });
  container.querySelector("#jp-cal-today")?.addEventListener("click", async () => { currentDate = new Date(); await renderCompanyCalendar(container); });
  container.querySelector("#jp-cal-week")?.addEventListener("click", async () => { currentView = "week"; await renderCompanyCalendar(container); });
  container.querySelector("#jp-cal-month")?.addEventListener("click", async () => { currentView = "month"; await renderCompanyCalendar(container); });
  container.querySelectorAll("[data-job-id]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); openJob(button.dataset.jobId); }));
  container.querySelectorAll("[data-new-date]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const d = new Date(`${button.dataset.newDate}T12:00:00`); openNewJob(d); }));
  container.querySelectorAll(".jp-cal-slot").forEach(button => button.addEventListener("click", () => { const d = new Date(`${button.dataset.date}T12:00:00`); openNewJob(d, button.dataset.time); }));
}

export async function renderCompanyCalendar(container) {
  addStyles();
  container.innerHTML = `<div class="jp-calendar-wrap"><div class="jp-calendar-toolbar"><div><h2>${escapeHtml(titleText())}</h2><p>View and manage your scheduled jobs.</p></div><div class="jp-calendar-actions"><button type="button" id="jp-cal-prev" aria-label="Previous">‹</button><button type="button" id="jp-cal-today">Today</button><button type="button" id="jp-cal-next" aria-label="Next">›</button><button type="button" id="jp-cal-week" class="${currentView === "week" ? "active" : ""}">Week</button><button type="button" id="jp-cal-month" class="${currentView === "month" ? "active" : ""}">Month</button></div></div><div id="jp-calendar-body"><p style="padding:20px">Loading calendar…</p></div></div>`;
  try {
    await loadCalendarData();
    const body = container.querySelector("#jp-calendar-body");
    if (currentView === "week") renderWeek(body); else renderMonth(body);
    bindEvents(container);
  } catch (error) {
    console.error("JobPilot calendar:", error);
    container.querySelector("#jp-calendar-body").innerHTML = `<div style="padding:20px"><strong>Unable to load the calendar.</strong><p>${escapeHtml(error.message || "Please try again.")}</p><button type="button" class="button secondary" id="jp-cal-retry">Retry</button></div>`;
    container.querySelector("#jp-cal-retry")?.addEventListener("click", () => renderCompanyCalendar(container));
  }
}
