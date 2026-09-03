import { supabase } from "../supabase.js";

// Management dashboard: company-wide monthly jobs card with an interactive calendar.
const MANAGEMENT_ROLES = ["owner", "admin"];
let managementContext = null;
let loading = false;

function getMonthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
}

async function getManagementContext() {
  if (managementContext) return managementContext;
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return (managementContext = false);
    const { data, error } = await supabase
      .from("company_members")
      .select("role, company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const role = String(data?.role || "").toLowerCase();
    if (!MANAGEMENT_ROLES.includes(role) || !data?.company_id) return (managementContext = false);
    return (managementContext = { companyId: data.company_id });
  } catch (error) {
    console.error("JobPilot management month jobs access:", error);
    return (managementContext = false);
  }
}

function addCalendarStyles() {
  if (document.getElementById("jobpilot-management-month-calendar-style")) return;
  const style = document.createElement("style");
  style.id = "jobpilot-management-month-calendar-style";
  style.textContent = `
    #jobpilot-management-month-calendar{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}
    #jobpilot-management-month-calendar .backdrop{position:absolute;inset:0;background:rgba(15,23,42,.48)}
    #jobpilot-management-month-calendar .modal{position:relative;width:min(920px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 24px 80px rgba(15,23,42,.25)}
    #jobpilot-management-month-calendar .header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    #jobpilot-management-month-calendar h2{margin:0;font-size:24px}
    #jobpilot-management-month-calendar .muted{margin:4px 0 0;color:#64748b}
    #jobpilot-management-month-calendar .close{border:0;background:transparent;font-size:30px;line-height:1;cursor:pointer;padding:0 4px}
    #jobpilot-management-month-calendar .nav{display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px}
    #jobpilot-management-month-calendar .nav button{border:1px solid #dbe2ea;background:#fff;border-radius:9px;padding:7px 13px;font-size:18px;cursor:pointer}
    #jobpilot-management-month-calendar .nav .today{font-size:14px}
    #jobpilot-management-month-calendar .grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid #e5e7eb;border-top:1px solid #e5e7eb}
    #jobpilot-management-month-calendar .weekday{font-weight:700;font-size:12px;text-align:center;padding:9px 4px;background:#f8fafc;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
    #jobpilot-management-month-calendar .day{min-height:92px;padding:7px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;background:#fff;cursor:pointer;text-align:left}
    #jobpilot-management-month-calendar .day.muted{background:#f8fafc;color:#94a3b8}
    #jobpilot-management-month-calendar .day.today{outline:2px solid #2563eb;outline-offset:-2px}
    #jobpilot-management-month-calendar .day.selected{background:#eff6ff}
    #jobpilot-management-month-calendar .number{font-weight:700;font-size:13px}
    #jobpilot-management-month-calendar .job{margin-top:5px;padding:4px 5px;border-radius:5px;background:#e0f2fe;font-size:11px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #jobpilot-management-month-calendar .more{font-size:11px;color:#475569;margin-top:3px}
    #jobpilot-management-month-calendar .details{margin-top:14px;padding:12px;background:#f8fafc;border-radius:10px;min-height:20px}
    #jobpilot-management-month-calendar .details h3{margin:0 0 7px;font-size:15px}
    #jobpilot-management-month-calendar .details p{margin:4px 0;font-size:13px}
    @media(max-width:640px){#jobpilot-management-month-calendar .modal{padding:12px;border-radius:12px}#jobpilot-management-month-calendar .day{min-height:64px;padding:5px}#jobpilot-management-month-calendar .job{font-size:9px}#jobpilot-management-month-calendar .details{margin-top:10px}#jobpilot-management-month-calendar h2{font-size:20px}}
  `;
  document.head.appendChild(style);
}

function openManagementMonthCalendar(jobs) {
  document.getElementById("jobpilot-management-month-calendar")?.remove();
  addCalendarStyles();
  const { date } = getMonthRange();
  let year = date.getFullYear();
  let month = date.getMonth();
  const overlay = document.createElement("div");
  overlay.id = "jobpilot-management-month-calendar";
  overlay.innerHTML = `
    <div class="backdrop"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-label="This month's jobs">
      <div class="header"><div><h2 id="management-month-title"></h2><p class="muted">Company jobs planned for this month</p></div><button class="close" type="button" aria-label="Close">×</button></div>
      <div class="nav"><button type="button" id="management-month-prev">‹</button><button type="button" class="today" id="management-month-today">Today</button><button type="button" id="management-month-next">›</button></div>
      <div class="grid" id="management-month-grid"></div>
      <div class="details" id="management-month-details"><p>Select a date to see its jobs.</p></div>
    </div>`;
  document.body.appendChild(overlay);
  const title = overlay.querySelector("#management-month-title");
  const grid = overlay.querySelector("#management-month-grid");
  const details = overlay.querySelector("#management-month-details");
  const close = () => overlay.remove();
  overlay.querySelector(".close").addEventListener("click", close);
  overlay.querySelector(".backdrop").addEventListener("click", close);
  const renderDetails = iso => {
    const dayJobs = jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
    const displayDate = new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
    details.innerHTML = dayJobs.length
      ? `<h3>${escapeHtml(displayDate)}</h3>${dayJobs.map(job => `<p><strong>${escapeHtml(job.scheduled_time ? `${job.scheduled_time} — ` : "")}${escapeHtml(job.title || "Job")}</strong>${job.notes ? ` — ${escapeHtml(job.notes)}` : ""}</p>`).join("")}`
      : `<p>No planned jobs on ${escapeHtml(displayDate)}.</p>`;
  };
  const render = () => {
    title.textContent = new Date(year, month, 1).toLocaleDateString("en-GB", { month:"long", year:"numeric" });
    grid.innerHTML = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => `<div class="weekday">${day}</div>`).join("");
    const first = new Date(year, month, 1);
    const firstDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    for (let cell = 0; cell < totalCells; cell++) {
      const dayNumber = cell - firstDay + 1;
      const cellDate = new Date(year, month, dayNumber);
      const iso = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,"0")}-${String(cellDate.getDate()).padStart(2,"0")}`;
      const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const dayJobs = jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
      const day = document.createElement("button");
      day.type = "button";
      day.className = `day${inMonth ? "" : " muted"}${iso === todayIso ? " today" : ""}`;
      day.innerHTML = `<div class="number">${cellDate.getDate()}</div>${dayJobs.slice(0,3).map(job => `<div class="job">${escapeHtml(job.scheduled_time ? `${job.scheduled_time} ` : "")}${escapeHtml(job.title || "Job")}</div>`).join("")}${dayJobs.length > 3 ? `<div class="more">+${dayJobs.length - 3} more</div>` : ""}`;
      day.addEventListener("click", () => {
        overlay.querySelectorAll(".day.selected").forEach(el => el.classList.remove("selected"));
        day.classList.add("selected");
        renderDetails(iso);
      });
      grid.appendChild(day);
    }
  };
  overlay.querySelector("#management-month-prev").addEventListener("click", () => { month--; if (month < 0) { month = 11; year--; } render(); });
  overlay.querySelector("#management-month-next").addEventListener("click", () => { month++; if (month > 11) { month = 0; year++; } render(); });
  overlay.querySelector("#management-month-today").addEventListener("click", () => { const now = new Date(); year = now.getFullYear(); month = now.getMonth(); render(); });
  const escape = event => { if (event.key === "Escape") { close(); document.removeEventListener("keydown", escape); } };
  document.addEventListener("keydown", escape);
  render();
}

async function applyManagementMonthCard() {
  if (loading) return;
  const stats = document.querySelector(".stats");
  if (!stats) return;
  const context = await getManagementContext();
  if (!context) return;
  const cards = [...stats.querySelectorAll(":scope > .stat-card")];
  const card = cards.find(item => String(item.textContent || "").toLowerCase().includes("today's job value"));
  if (!card || card.dataset.managementMonthJobs === "true") return;

  loading = true;
  card.dataset.managementMonthJobs = "true";
  card.innerHTML = `<div class="stat-icon">🗓️</div><div><span>This Month's Jobs</span><strong>—</strong></div>`;
  card.style.cursor = "pointer";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", "Open this month's jobs calendar");
  card.title = "Open this month's jobs calendar";

  const loadCalendar = async event => {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    try {
      const { start, end } = getMonthRange();
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, scheduled_date, scheduled_time, status, notes")
        .eq("company_id", context.companyId)
        .gte("scheduled_date", start)
        .lte("scheduled_date", end);
      if (error) throw error;
      openManagementMonthCalendar(data || []);
    } catch (error) {
      console.error("JobPilot management month calendar:", error);
      alert("The monthly jobs calendar could not be loaded. Please try again.");
    }
  };
  card.addEventListener("click", loadCalendar);
  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") loadCalendar(event);
  });

  try {
    const { start, end } = getMonthRange();
    const { data, error } = await supabase
      .from("jobs")
      .select("id, status, scheduled_date")
      .eq("company_id", context.companyId)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end);
    if (error) throw error;
    const activeJobs = (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
    card.querySelector("strong").textContent = String(activeJobs.length);
  } catch (error) {
    console.error("JobPilot management month jobs:", error);
    card.querySelector("strong").textContent = "—";
  } finally {
    loading = false;
  }
}

const observer = new MutationObserver(() => { void applyManagementMonthCard(); });

function start() {
  observer.observe(document.body, { childList: true, subtree: true });
  void applyManagementMonthCard();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
