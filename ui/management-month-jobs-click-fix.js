import { supabase } from "../supabase.js";

const MANAGEMENT_ROLES = ["owner", "admin"];
let managementContext = null;
let opening = false;

function getMonthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

function getCalendarDate() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(iso, options = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", options);
}

async function getManagementContext() {
  if (managementContext !== null) return managementContext;
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return (managementContext = false);
    const { data, error } = await supabase.from("company_members").select("role, company_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
    if (error || !data?.company_id || !MANAGEMENT_ROLES.includes(String(data.role || "").toLowerCase())) return (managementContext = false);
    return (managementContext = { companyId: data.company_id });
  } catch (error) {
    console.error("JobPilot dashboard calendar access:", error);
    return (managementContext = false);
  }
}

function getCalendarCard() {
  const stats = document.querySelector(".stats");
  if (!stats) return null;
  return [...stats.querySelectorAll(":scope > .stat-card")].find(card => {
    const label = String(card.querySelector("span")?.textContent || "").trim().toLowerCase();
    return label === "calendar" || label === "this month's jobs";
  }) || null;
}

function prepareCalendarCard() {
  const card = getCalendarCard();
  if (!card) return null;
  const label = card.querySelector("span");
  const value = card.querySelector("strong");
  const calendarDate = getCalendarDate();
  if (label && label.textContent !== "Calendar") label.textContent = "Calendar";
  if (value && value.textContent !== calendarDate) value.textContent = calendarDate;
  if (card.style.cursor !== "pointer") card.style.cursor = "pointer";
  if (card.getAttribute("role") !== "button") card.setAttribute("role", "button");
  if (card.getAttribute("tabindex") !== "0") card.setAttribute("tabindex", "0");
  if (card.getAttribute("aria-label") !== "Open calendar") card.setAttribute("aria-label", "Open calendar");
  if (card.title !== "Open calendar") card.title = "Open calendar";
  return card;
}

function openCalendar(jobs) {
  document.getElementById("jp-management-month-calendar")?.remove();
  const now = new Date();
  let anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let view = "month";
  let selectedIso = isoDate(anchor);
  const overlay = document.createElement("div");
  overlay.id = "jp-management-month-calendar";
  overlay.innerHTML = `
    <div class="jp-mm-bg"></div>
    <div class="jp-mm-box" role="dialog" aria-modal="true" aria-label="Calendar">
      <div class="jp-mm-head"><h2 id="jp-mm-title"></h2><button id="jp-mm-close" type="button" aria-label="Close">×</button></div>
      <div class="jp-mm-nav"><button id="jp-mm-prev" type="button">‹</button><button id="jp-mm-today" type="button">Today</button><button id="jp-mm-next" type="button">›</button></div>
      <div class="jp-mm-views" role="group" aria-label="Calendar view"><button type="button" data-view="day">Day</button><button type="button" data-view="week">Week</button><button type="button" data-view="month">Month</button></div>
      <div class="jp-mm-grid" id="jp-mm-grid"></div>
      <div class="jp-mm-details" id="jp-mm-details">Select a date to see jobs.</div>
    </div>`;
  document.body.appendChild(overlay);

  if (!document.getElementById("jp-mm-style")) {
    const style = document.createElement("style");
    style.id = "jp-mm-style";
    style.textContent = `
      #jp-management-month-calendar{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:8px}
      #jp-management-month-calendar .jp-mm-bg{position:absolute;inset:0;background:rgba(15,23,42,.48)}
      #jp-management-month-calendar .jp-mm-box{position:relative;width:min(760px,94vw);max-height:84vh;overflow:auto;background:#fff;border-radius:12px;padding:12px;box-shadow:0 16px 48px rgba(15,23,42,.22)}
      #jp-management-month-calendar .jp-mm-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
      #jp-management-month-calendar h2{margin:0;font-size:17px}
      #jp-management-month-calendar #jp-mm-close{border:0;background:transparent;font-size:24px;cursor:pointer}
      #jp-management-month-calendar .jp-mm-nav{display:flex;justify-content:space-between;align-items:center;margin:6px 0 4px}
      #jp-management-month-calendar .jp-mm-nav button,#jp-management-month-calendar .jp-mm-views button{border:1px solid #dbe2ea;background:#fff;border-radius:7px;padding:3px 8px;font-size:14px;cursor:pointer}
      #jp-management-month-calendar .jp-mm-views{display:flex;justify-content:center;gap:4px;margin:5px 0 7px}
      #jp-management-month-calendar .jp-mm-views button.active{font-weight:700;box-shadow:inset 0 -2px 0 #2563eb}
      #jp-management-month-calendar .jp-mm-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid #e5e7eb;border-top:1px solid #e5e7eb}
      #jp-management-month-calendar .jp-mm-wd{font-weight:700;font-size:10px;text-align:center;padding:4px 2px;background:#f8fafc;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
      #jp-management-month-calendar .jp-mm-day{min-height:48px;padding:3px;border:0;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;background:#fff;cursor:pointer;text-align:left}
      #jp-management-month-calendar .jp-mm-day.muted{background:#f8fafc;color:#94a3b8}
      #jp-management-month-calendar .jp-mm-day.today{outline:2px solid #2563eb;outline-offset:-2px}
      #jp-management-month-calendar .jp-mm-day.selected{box-shadow:inset 0 0 0 2px #2563eb}
      #jp-management-month-calendar .jp-mm-job{margin-top:2px;padding:2px 3px;border-radius:3px;background:#e0f2fe;font-size:8px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #jp-management-month-calendar .jp-mm-details{margin-top:6px;padding:7px;background:#f8fafc;border-radius:7px;font-size:10px}
      #jp-management-month-calendar .jp-mm-details p{margin:2px 0}
      #jp-management-month-calendar .jp-mm-day-view{display:grid;grid-template-columns:64px 1fr;border:1px solid #e5e7eb}
      #jp-management-month-calendar .jp-mm-time{min-height:34px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:5px;font-size:9px;color:#64748b}
      #jp-management-month-calendar .jp-mm-slot{min-height:34px;border-bottom:1px solid #e5e7eb;padding:4px}
      #jp-management-month-calendar .jp-mm-day-job{display:block;margin:0 0 3px;padding:4px 6px;border-radius:5px;background:#e0f2fe;font-size:10px}
      #jp-management-month-calendar .jp-mm-week{display:grid;grid-template-columns:48px repeat(7,minmax(0,1fr));border:1px solid #e5e7eb;overflow-x:auto}
      #jp-management-month-calendar .jp-mm-week > div{min-width:0}
      #jp-management-month-calendar .jp-mm-week-head{font-weight:700;font-size:9px;text-align:center;padding:5px 2px;background:#f8fafc;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
      #jp-management-month-calendar .jp-mm-week-cell{min-height:34px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:2px}
      @media(max-width:640px){#jp-management-month-calendar .jp-mm-box{width:94vw;padding:8px;border-radius:9px}#jp-management-month-calendar .jp-mm-day{min-height:42px}#jp-management-month-calendar .jp-mm-job{font-size:7px}#jp-management-month-calendar .jp-mm-week{grid-template-columns:34px repeat(7,minmax(0,1fr));overflow:hidden}#jp-management-month-calendar .jp-mm-week-head{font-size:7px}#jp-management-month-calendar .jp-mm-day-job{font-size:8px}}
    `;
    document.head.appendChild(style);
  }

  const grid = overlay.querySelector("#jp-mm-grid");
  const title = overlay.querySelector("#jp-mm-title");
  const details = overlay.querySelector("#jp-mm-details");
  const close = () => overlay.remove();
  overlay.querySelector("#jp-mm-close").addEventListener("click", close);
  overlay.querySelector(".jp-mm-bg").addEventListener("click", close);

  const jobsForDate = iso => jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
  const showDetails = iso => {
    const dayJobs = jobsForDate(iso);
    const date = dateLabel(iso);
    details.innerHTML = dayJobs.length
      ? `<strong>${escapeHtml(date)}</strong>${dayJobs.map(job => `<p><strong>${escapeHtml(job.scheduled_time ? `${job.scheduled_time} ` : "")}${escapeHtml(job.title || "Job")}</strong>${job.notes ? ` - ${escapeHtml(job.notes)}` : ""}</p>`).join("")}`
      : `<p>No planned jobs on ${escapeHtml(date)}.</p>`;
  };
  const jobHtml = job => `<div class="jp-mm-day-job"><strong>${escapeHtml(job.scheduled_time ? `${job.scheduled_time} ` : "")}${escapeHtml(job.title || "Job")}</strong>${job.notes ? `<div>${escapeHtml(job.notes)}</div>` : ""}</div>`;

  const renderMonth = () => {
    title.textContent = new Date(anchor.getFullYear(), anchor.getMonth(), 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    grid.className = "jp-mm-grid";
    grid.innerHTML = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => `<div class="jp-mm-wd">${day}</div>`).join("");
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const cells = Math.ceil((offset + days) / 7) * 7;
    const todayIso = isoDate(new Date());
    for (let index = 0; index < cells; index++) {
      const number = index - offset + 1;
      const date = new Date(anchor.getFullYear(), anchor.getMonth(), number);
      const iso = isoDate(date);
      const inMonth = number >= 1 && number <= days;
      const dayJobs = jobsForDate(iso);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `jp-mm-day${inMonth ? "" : " muted"}${iso === todayIso ? " today" : ""}${iso === selectedIso ? " selected" : ""}`;
      button.innerHTML = `<div>${date.getDate()}</div>${dayJobs.slice(0, 3).map(job => `<div class="jp-mm-job">${escapeHtml(job.scheduled_time ? `${job.scheduled_time} ` : "")}${escapeHtml(job.title || "Job")}</div>`).join("")}${dayJobs.length > 3 ? `<div>+${dayJobs.length - 3} more</div>` : ""}`;
      button.addEventListener("click", () => { selectedIso = iso; showDetails(iso); renderMonth(); });
      grid.appendChild(button);
    }
    showDetails(selectedIso);
  };

  const renderDay = () => {
    const iso = selectedIso;
    title.textContent = dateLabel(iso);
    grid.className = "jp-mm-day-view";
    grid.innerHTML = "";
    const dayJobs = jobsForDate(iso);
    for (let hour = 7; hour <= 19; hour++) {
      const time = `${String(hour).padStart(2, "0")}:00`;
      const left = document.createElement("div"); left.className = "jp-mm-time"; left.textContent = time;
      const right = document.createElement("div"); right.className = "jp-mm-slot";
      dayJobs.filter(job => String(job.scheduled_time || "").slice(0, 2) === String(hour).padStart(2, "0")).forEach(job => right.insertAdjacentHTML("beforeend", jobHtml(job)));
      grid.append(left, right);
    }
    showDetails(iso);
  };

  const startOfWeek = date => { const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  const renderWeek = () => {
    const start = startOfWeek(new Date(`${selectedIso}T12:00:00`));
    const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    title.textContent = `${dates[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${dates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    grid.className = "jp-mm-week";
    grid.innerHTML = `<div class="jp-mm-week-head"></div>${dates.map(d => `<div class="jp-mm-week-head">${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}</div>`).join("")}`;
    for (let hour = 7; hour <= 19; hour++) {
      const time = `${String(hour).padStart(2, "0")}:00`;
      grid.insertAdjacentHTML("beforeend", `<div class="jp-mm-time">${time}</div>`);
      dates.forEach(date => {
        const cell = document.createElement("div"); cell.className = "jp-mm-week-cell";
        const dayJobs = jobsForDate(isoDate(date)).filter(job => String(job.scheduled_time || "").slice(0, 2) === String(hour).padStart(2, "0"));
        dayJobs.forEach(job => cell.insertAdjacentHTML("beforeend", jobHtml(job)));
        grid.appendChild(cell);
      });
    }
  };

  const render = () => {
    overlay.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    if (view === "day") renderDay();
    else if (view === "week") renderWeek();
    else renderMonth();
  };

  overlay.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => { view = button.dataset.view; render(); }));
  overlay.querySelector("#jp-mm-prev").addEventListener("click", () => {
    if (view === "day") anchor.setDate(anchor.getDate() - 1);
    else if (view === "week") anchor.setDate(anchor.getDate() - 7);
    else anchor.setMonth(anchor.getMonth() - 1);
    selectedIso = isoDate(anchor); render();
  });
  overlay.querySelector("#jp-mm-next").addEventListener("click", () => {
    if (view === "day") anchor.setDate(anchor.getDate() + 1);
    else if (view === "week") anchor.setDate(anchor.getDate() + 7);
    else anchor.setMonth(anchor.getMonth() + 1);
    selectedIso = isoDate(anchor); render();
  });
  overlay.querySelector("#jp-mm-today").addEventListener("click", () => { anchor = new Date(); selectedIso = isoDate(anchor); render(); });
  render();
}

async function openManagementCalendar() {
  if (opening) return;
  opening = true;
  try {
    const context = await getManagementContext();
    if (!context) return;
    const { start, end } = getMonthRange();
    const { data, error } = await supabase.from("jobs").select("id, title, scheduled_date, scheduled_time, status, notes").eq("company_id", context.companyId).gte("scheduled_date", start).lte("scheduled_date", end);
    if (error) throw error;
    openCalendar(data || []);
  } catch (error) {
    console.error("JobPilot management calendar:", error);
    alert("The calendar could not be loaded. Please try again.");
  } finally {
    opening = false;
  }
}

function handleClick(event) {
  const card = event.target?.closest?.(".stats .stat-card");
  if (!card) return;
  const label = String(card.querySelector("span")?.textContent || "").trim().toLowerCase();
  if (label !== "calendar" && label !== "this month's jobs") return;
  const prepared = prepareCalendarCard();
  if (prepared !== card) return;
  event.preventDefault(); event.stopImmediatePropagation(); void openManagementCalendar();
}

function handleKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target?.closest?.(".stats .stat-card");
  if (!card) return;
  const label = String(card.querySelector("span")?.textContent || "").trim().toLowerCase();
  if (label !== "calendar" && label !== "this month's jobs") return;
  const prepared = prepareCalendarCard();
  if (prepared !== card) return;
  event.preventDefault(); event.stopImmediatePropagation(); void openManagementCalendar();
}

function start() {
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeydown, true);
  const observer = new MutationObserver(() => prepareCalendarCard());
  observer.observe(document.body, { childList: true, subtree: true });
  prepareCalendarCard();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
