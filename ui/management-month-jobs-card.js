import { supabase } from "../supabase.js";

// Dashboard calendar card for company-wide monthly jobs.
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
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.company_id) return (managementContext = false);
    return (managementContext = { companyId: data.company_id });
  } catch (error) {
    console.error("JobPilot dashboard calendar access:", error);
    return (managementContext = false);
  }
}

function addCalendarStyles() {
  if (document.getElementById("jobpilot-dashboard-calendar-style")) return;
  const style = document.createElement("style");
  style.id = "jobpilot-dashboard-calendar-style";
  style.textContent = `
    #jobpilot-dashboard-calendar{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px}
    #jobpilot-dashboard-calendar .backdrop{position:absolute;inset:0;background:rgba(15,23,42,.48)}
    #jobpilot-dashboard-calendar .modal{position:relative;width:min(720px,94vw);max-height:82vh;overflow:auto;background:#fff;border-radius:14px;padding:14px;box-shadow:0 18px 55px rgba(15,23,42,.22)}
    #jobpilot-dashboard-calendar .header{display:flex;justify-content:space-between;align-items:center;gap:10px}
    #jobpilot-dashboard-calendar h2{margin:0;font-size:20px}
    #jobpilot-dashboard-calendar .muted{display:none}
    #jobpilot-dashboard-calendar .close{border:0;background:transparent;font-size:26px;line-height:1;cursor:pointer;padding:0 3px}
    #jobpilot-dashboard-calendar .nav{display:flex;justify-content:space-between;align-items:center;margin:10px 0 7px}
    #jobpilot-dashboard-calendar .nav button{border:1px solid #dbe2ea;background:#fff;border-radius:8px;padding:5px 10px;font-size:16px;cursor:pointer}
    #jobpilot-dashboard-calendar .nav .today{font-size:12px}
    #jobpilot-dashboard-calendar .grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid #e5e7eb;border-top:1px solid #e5e7eb}
    #jobpilot-dashboard-calendar .weekday{font-weight:700;font-size:11px;text-align:center;padding:6px 3px;background:#f8fafc;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
    #jobpilot-dashboard-calendar .day{min-height:62px;padding:5px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;background:#fff;cursor:pointer;text-align:left}
    #jobpilot-dashboard-calendar .day.muted{background:#f8fafc;color:#94a3b8}
    #jobpilot-dashboard-calendar .day.today{outline:2px solid #2563eb;outline-offset:-2px}
    #jobpilot-dashboard-calendar .day.selected{background:#eff6ff}
    #jobpilot-dashboard-calendar .number{font-weight:700;font-size:12px}
    #jobpilot-dashboard-calendar .job{margin-top:3px;padding:3px 4px;border-radius:4px;background:#e0f2fe;font-size:10px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #jobpilot-dashboard-calendar .more{font-size:10px;color:#475569;margin-top:2px}
    #jobpilot-dashboard-calendar .details{margin-top:9px;padding:9px;background:#f8fafc;border-radius:8px;min-height:16px}
    #jobpilot-dashboard-calendar .details h3{margin:0 0 5px;font-size:14px}
    #jobpilot-dashboard-calendar .details p{margin:3px 0;font-size:12px}
    @media(max-width:640px){#jobpilot-dashboard-calendar .modal{width:96vw;padding:10px;border-radius:10px}#jobpilot-dashboard-calendar .day{min-height:52px;padding:4px}#jobpilot-dashboard-calendar .job{font-size:8px}#jobpilot-dashboard-calendar .details{margin-top:8px}#jobpilot-dashboard-calendar h2{font-size:18px}}
  `;
  document.head.appendChild(style);
}

function openDashboardCalendar(initialJobs = []) {
  document.getElementById("jobpilot-dashboard-calendar")?.remove();
  addCalendarStyles();
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let jobs = initialJobs;
  const overlay = document.createElement("div");
  overlay.id = "jobpilot-dashboard-calendar";
  overlay.innerHTML = `
    <div class="backdrop"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Calendar">
      <div class="header"><h2 id="dashboard-calendar-title"></h2><button class="close" type="button" aria-label="Close">×</button></div>
      <div class="nav"><button type="button" id="dashboard-calendar-prev">‹</button><button type="button" class="today" id="dashboard-calendar-today">Today</button><button type="button" id="dashboard-calendar-next">›</button></div>
      <div class="grid" id="dashboard-calendar-grid"></div>
      <div class="details" id="dashboard-calendar-details"><p>Loading jobs...</p></div>
    </div>`;
  document.body.appendChild(overlay);
  const title = overlay.querySelector("#dashboard-calendar-title");
  const grid = overlay.querySelector("#dashboard-calendar-grid");
  const details = overlay.querySelector("#dashboard-calendar-details");
  const close = () => overlay.remove();
  overlay.querySelector(".close").addEventListener("click", close);
  overlay.querySelector(".backdrop").addEventListener("click", close);
  const renderDetails = iso => {
    const dayJobs = jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
    const displayDate = window.JobPilotDate.formatDate(`${iso}T12:00:00`, { style: "long" });
    details.innerHTML = dayJobs.length
      ? `<h3>${escapeHtml(displayDate)}</h3>${dayJobs.map(job => `<p><strong>${escapeHtml(job.scheduled_time ? `${job.scheduled_time} - ` : "")}${escapeHtml(job.title || "Job")}</strong>${job.notes ? ` - ${escapeHtml(job.notes)}` : ""}</p>`).join("")}`
      : `<p>No planned jobs on ${escapeHtml(displayDate)}.</p>`;
  };
  const render = () => {
    title.textContent = window.JobPilotDate.formatMonthYear(new Date(year, month, 1));
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
  overlay.querySelector("#dashboard-calendar-prev").addEventListener("click", () => { month--; if (month < 0) { month = 11; year--; } render(); });
  overlay.querySelector("#dashboard-calendar-next").addEventListener("click", () => { month++; if (month > 11) { month = 0; year++; } render(); });
  overlay.querySelector("#dashboard-calendar-today").addEventListener("click", () => { const current = new Date(); year = current.getFullYear(); month = current.getMonth(); render(); });
  overlay.refreshJobs = nextJobs => { jobs = nextJobs || []; render(); };
  const escape = event => { if (event.key === "Escape") { close(); document.removeEventListener("keydown", escape); } };
  document.addEventListener("keydown", escape);
  render();
  return overlay;
}

async function applyDashboardCalendarCard() {
  if (loading) return;
  const stats = document.querySelector(".stats");
  if (!stats) return;
  const context = await getManagementContext();
  if (!context) return;
  const cards = [...stats.querySelectorAll(":scope > .stat-card")];
  const card = cards.find(item => String(item.textContent || "").toLowerCase().includes("today's job value") || String(item.textContent || "").toLowerCase().includes("calendar"));
  if (!card) return;

  const isAlreadyCorrect = card.dataset.dashboardCalendar === "true" &&
    String(card.querySelector("span")?.textContent || "").trim().toLowerCase() === "calendar" &&
    String(card.querySelector("strong")?.textContent || "").trim().toLowerCase() === "open";
  if (isAlreadyCorrect) return;

  loading = true;
  card.dataset.dashboardCalendar = "true";
  card.innerHTML = `<div class="stat-icon">📅</div><div><span>Calendar</span><strong>Open</strong></div>`;
  card.style.cursor = "pointer";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", "Open calendar");
  card.title = "Open calendar";

  const loadCalendar = async event => {
    event?.preventDefault();
    event?.stopImmediatePropagation();

    // Open immediately. The calendar should never wait for the database request.
    const overlay = openDashboardCalendar([]);

    try {
      const { start, end } = getMonthRange();
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, scheduled_date, scheduled_time, status, notes")
        .eq("company_id", context.companyId)
        .gte("scheduled_date", start)
        .lte("scheduled_date", end);
      if (error) throw error;
      if (overlay.isConnected) overlay.refreshJobs(data || []);
    } catch (error) {
      console.error("JobPilot dashboard calendar:", error);
      if (overlay.isConnected) {
        const details = overlay.querySelector("#dashboard-calendar-details");
        if (details) details.innerHTML = "<p>Jobs could not be loaded. Please try again.</p>";
      }
    }
  };
  card.addEventListener("click", loadCalendar);
  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") loadCalendar(event);
  });

  loading = false;
}

const observer = new MutationObserver(() => { void applyDashboardCalendarCard(); });

function start() {
  observer.observe(document.body, { childList: true, subtree: true });
  void applyDashboardCalendarCard();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
