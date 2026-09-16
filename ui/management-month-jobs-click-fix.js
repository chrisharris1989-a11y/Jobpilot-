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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
}

async function getManagementContext() {
  if (managementContext !== null) return managementContext;
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
    if (error || !data?.company_id || !MANAGEMENT_ROLES.includes(String(data.role || "").toLowerCase())) {
      return (managementContext = false);
    }
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
  if (label && label.textContent !== "Calendar") label.textContent = "Calendar";
  if (value && value.textContent !== "Open") value.textContent = "Open";
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
  let year = now.getFullYear();
  let month = now.getMonth();
  const overlay = document.createElement("div");
  overlay.id = "jp-management-month-calendar";
  overlay.innerHTML = `
    <div class="jp-mm-bg"></div>
    <div class="jp-mm-box" role="dialog" aria-modal="true" aria-label="Calendar">
      <div class="jp-mm-head"><h2 id="jp-mm-title"></h2><button id="jp-mm-close" type="button" aria-label="Close">×</button></div>
      <div class="jp-mm-nav"><button id="jp-mm-prev" type="button">‹</button><button id="jp-mm-today" type="button">Today</button><button id="jp-mm-next" type="button">›</button></div>
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
      #jp-management-month-calendar .jp-mm-box{position:relative;width:min(720px,94vw);max-height:82vh;overflow:auto;background:#fff;border-radius:12px;padding:12px;box-shadow:0 16px 48px rgba(15,23,42,.22)}
      #jp-management-month-calendar .jp-mm-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
      #jp-management-month-calendar h2{margin:0;font-size:17px}
      #jp-management-month-calendar #jp-mm-close{border:0;background:transparent;font-size:24px;cursor:pointer}
      #jp-management-month-calendar .jp-mm-nav{display:flex;justify-content:space-between;align-items:center;margin:6px 0 4px}
      #jp-management-month-calendar .jp-mm-nav button{border:1px solid #dbe2ea;background:#fff;border-radius:7px;padding:3px 8px;font-size:14px;cursor:pointer}
      #jp-management-month-calendar .jp-mm-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid #e5e7eb;border-top:1px solid #e5e7eb}
      #jp-management-month-calendar .jp-mm-wd{font-weight:700;font-size:10px;text-align:center;padding:4px 2px;background:#f8fafc;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
      #jp-management-month-calendar .jp-mm-day{min-height:48px;padding:3px;border:0;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;background:#fff;cursor:pointer;text-align:left}
      #jp-management-month-calendar .jp-mm-day.muted{background:#f8fafc;color:#94a3b8}
      #jp-management-month-calendar .jp-mm-day.today{outline:2px solid #2563eb;outline-offset:-2px}
      #jp-management-month-calendar .jp-mm-job{margin-top:2px;padding:2px 3px;border-radius:3px;background:#e0f2fe;font-size:8px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #jp-management-month-calendar .jp-mm-details{margin-top:6px;padding:7px;background:#f8fafc;border-radius:7px;font-size:10px}
      #jp-management-month-calendar .jp-mm-details p{margin:2px 0}
      @media(max-width:640px){#jp-management-month-calendar .jp-mm-box{width:94vw;padding:8px;border-radius:9px}#jp-management-month-calendar .jp-mm-day{min-height:42px}#jp-management-month-calendar .jp-mm-job{font-size:7px}}
    `;
    document.head.appendChild(style);
  }

  const grid = overlay.querySelector("#jp-mm-grid");
  const title = overlay.querySelector("#jp-mm-title");
  const details = overlay.querySelector("#jp-mm-details");
  const close = () => overlay.remove();
  overlay.querySelector("#jp-mm-close").addEventListener("click", close);
  overlay.querySelector(".jp-mm-bg").addEventListener("click", close);

  const show = iso => {
    const dayJobs = jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
    const date = new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    details.innerHTML = dayJobs.length
      ? `<strong>${escapeHtml(date)}</strong>${dayJobs.map(job => `<p><strong>${escapeHtml(job.scheduled_time ? `${job.scheduled_time} ` : "")}${escapeHtml(job.title || "Job")}</strong>${job.notes ? ` - ${escapeHtml(job.notes)}` : ""}</p>`).join("")}`
      : `<p>No planned jobs on ${escapeHtml(date)}.</p>`;
  };

  const render = () => {
    title.textContent = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    grid.innerHTML = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => `<div class="jp-mm-wd">${day}</div>`).join("");
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells = Math.ceil((offset + days) / 7) * 7;
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    for (let index = 0; index < cells; index++) {
      const number = index - offset + 1;
      const date = new Date(year, month, number);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const inMonth = number >= 1 && number <= days;
      const dayJobs = jobs.filter(job => job.scheduled_date === iso && String(job.status || "").toLowerCase() !== "cancelled");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `jp-mm-day${inMonth ? "" : " muted"}${iso === todayIso ? " today" : ""}`;
      button.innerHTML = `<div>${date.getDate()}</div>${dayJobs.slice(0, 3).map(job => `<div class="jp-mm-job">${escapeHtml(job.scheduled_time ? `${job.scheduled_time} ` : "")}${escapeHtml(job.title || "Job")}</div>`).join("")}${dayJobs.length > 3 ? `<div>+${dayJobs.length - 3} more</div>` : ""}`;
      button.addEventListener("click", () => show(iso));
      grid.appendChild(button);
    }
    show(todayIso);
  };

  overlay.querySelector("#jp-mm-prev").addEventListener("click", () => { if (--month < 0) { month = 11; year--; } render(); });
  overlay.querySelector("#jp-mm-next").addEventListener("click", () => { if (++month > 11) { month = 0; year++; } render(); });
  overlay.querySelector("#jp-mm-today").addEventListener("click", () => { const current = new Date(); year = current.getFullYear(); month = current.getMonth(); render(); });
  render();
}

async function openManagementCalendar() {
  if (opening) return;
  opening = true;
  try {
    const context = await getManagementContext();
    if (!context) return;
    const { start, end } = getMonthRange();
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, scheduled_date, scheduled_time, status, notes")
      .eq("company_id", context.companyId)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end);
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
  event.preventDefault();
  event.stopImmediatePropagation();
  void openManagementCalendar();
}

function handleKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target?.closest?.(".stats .stat-card");
  if (!card) return;
  const label = String(card.querySelector("span")?.textContent || "").trim().toLowerCase();
  if (label !== "calendar" && label !== "this month's jobs") return;
  const prepared = prepareCalendarCard();
  if (prepared !== card) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openManagementCalendar();
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
