import { supabase } from "../supabase.js";

const MANAGEMENT_ROLES = ["owner", "admin"];

const esc = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#039;");

const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function normaliseText(value) {
  return String(value || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

function isMonthCard(element) {
  return element instanceof HTMLElement && normaliseText(element.textContent).includes("this month's jobs");
}

function findMonthCard(target) {
  if (!(target instanceof Element)) return null;
  const card = target.closest(".stats .stat-card");
  return card && isMonthCard(card) ? card : null;
}

function createCalendarShell() {
  document.getElementById("jobpilot-month-calendar-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "jobpilot-month-calendar-overlay";
  overlay.innerHTML = `
    <div class="jobpilot-calendar-backdrop"></div>
    <div class="jobpilot-calendar-modal" role="dialog" aria-modal="true" aria-label="Your planned work calendar">
      <div class="jobpilot-calendar-header">
        <div><h2 id="jobpilot-calendar-title">Your planned work</h2><p>Your assigned planned work for this month</p></div>
        <button type="button" class="jobpilot-calendar-close" aria-label="Close">×</button>
      </div>
      <div class="jobpilot-calendar-nav">
        <button type="button" id="jobpilot-calendar-prev">‹</button>
        <button type="button" id="jobpilot-calendar-today">Today</button>
        <button type="button" id="jobpilot-calendar-next">›</button>
      </div>
      <div class="jobpilot-calendar-grid" id="jobpilot-calendar-grid"><p>Loading your jobs…</p></div>
      <div id="jobpilot-calendar-details" class="jobpilot-calendar-details"><p>Loading your jobs…</p></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".jobpilot-calendar-close").addEventListener("click", () => overlay.remove());
  overlay.querySelector(".jobpilot-calendar-backdrop").addEventListener("click", () => overlay.remove());
  return overlay;
}

async function getUserContext() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership, error } = await supabase
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!membership?.company_id) return null;
  return { user, membership };
}

async function loadAssignedJobs(year, month, context) {
  const start = isoDate(new Date(year, month, 1));
  const end = isoDate(new Date(year, month + 1, 0));
  const { data, error } = await supabase
    .from("jobs")
    .select("id,customer_id,title,scheduled_date,scheduled_time,status,notes,assigned_user_id")
    .eq("company_id", context.membership.company_id)
    .eq("assigned_user_id", context.user.id)
    .gte("scheduled_date", start)
    .lte("scheduled_date", end);
  if (error) throw error;
  return (data || []).filter(job => String(job.status || "").toLowerCase() !== "cancelled");
}

async function openAssignedMonthCalendar() {
  const overlay = createCalendarShell();
  const title = overlay.querySelector("#jobpilot-calendar-title");
  const grid = overlay.querySelector("#jobpilot-calendar-grid");
  const details = overlay.querySelector("#jobpilot-calendar-details");
  const context = await getUserContext();

  if (!context || MANAGEMENT_ROLES.includes(String(context.membership.role || "").toLowerCase())) {
    grid.innerHTML = "<p>This calendar is available for assigned users only.</p>";
    details.innerHTML = "";
    return;
  }

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let jobs = [];

  async function render(selectedDate = isoDate(new Date())) {
    try {
      jobs = await loadAssignedJobs(year, month, context);
      title.textContent = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      grid.innerHTML = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => `<div class="jobpilot-calendar-weekday">${day}</div>`).join("");
      const first = new Date(year, month, 1);
      const firstDay = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const previousDays = new Date(year, month, 0).getDate();
      const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
      const today = isoDate(new Date());

      for (let cell = 0; cell < totalCells; cell++) {
        const dayNumber = cell - firstDay + 1;
        const date = new Date(year, month, dayNumber);
        const iso = isoDate(date);
        const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
        const dayJobs = jobs.filter(job => job.scheduled_date === iso);
        const cellEl = document.createElement("button");
        cellEl.type = "button";
        cellEl.className = `jobpilot-calendar-day${inMonth ? "" : " muted"}${iso === today ? " today" : ""}${iso === selectedDate ? " selected" : ""}`;
        cellEl.innerHTML = `<span class="jobpilot-calendar-number">${inMonth ? dayNumber : (cell < firstDay ? previousDays + dayNumber : dayNumber - daysInMonth)}</span>${dayJobs.slice(0, 3).map(job => `<div class="jobpilot-calendar-job">${esc(job.scheduled_time ? job.scheduled_time + " " : "")}${esc(job.title || "Job")}</div>`).join("")}${dayJobs.length > 3 ? `<div class="jobpilot-calendar-more">+${dayJobs.length - 3} more</div>` : ""}`;
        cellEl.addEventListener("click", () => {
          grid.querySelectorAll(".jobpilot-calendar-day.selected").forEach(el => el.classList.remove("selected"));
          cellEl.classList.add("selected");
          const selectedJobs = jobs.filter(job => job.scheduled_date === iso);
          const displayDate = new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          details.innerHTML = selectedJobs.length
            ? `<h3>${esc(displayDate)}</h3>${selectedJobs.map(job => `<p><strong>${esc(job.scheduled_time ? job.scheduled_time + " — " : "")}${esc(job.title || "Job")}</strong>${job.notes ? ` — ${esc(job.notes)}` : ""}</p>`).join("")}`
            : `<p>No planned work on ${esc(displayDate)}.</p>`;
        });
        grid.appendChild(cellEl);
      }

      const initialIso = year === now.getFullYear() && month === now.getMonth() ? today : selectedDate;
      const initialJobs = jobs.filter(job => job.scheduled_date === initialIso);
      const displayDate = new Date(`${initialIso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      details.innerHTML = initialJobs.length
        ? `<h3>${esc(displayDate)}</h3>${initialJobs.map(job => `<p><strong>${esc(job.scheduled_time ? job.scheduled_time + " — " : "")}${esc(job.title || "Job")}</strong>${job.notes ? ` — ${esc(job.notes)}` : ""}</p>`).join("")}`
        : `<p>No planned work on ${esc(displayDate)}.</p>`;
    } catch (error) {
      console.error("JobPilot assigned monthly calendar:", error);
      details.innerHTML = "<p>Unable to load your planned work.</p>";
    }
  }

  overlay.querySelector("#jobpilot-calendar-prev").addEventListener("click", () => { month--; if (month < 0) { month = 11; year--; } render(); });
  overlay.querySelector("#jobpilot-calendar-next").addEventListener("click", () => { month++; if (month > 11) { month = 0; year++; } render(); });
  overlay.querySelector("#jobpilot-calendar-today").addEventListener("click", () => { const d = new Date(); year = d.getFullYear(); month = d.getMonth(); render(); });

  await render();
}

function handleMonthCardClick(event) {
  if (!findMonthCard(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  openAssignedMonthCalendar().catch(error => console.error("JobPilot monthly calendar:", error));
}

function handleMonthCardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (!findMonthCard(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  openAssignedMonthCalendar().catch(error => console.error("JobPilot monthly calendar:", error));
}

document.addEventListener("click", handleMonthCardClick, true);
document.addEventListener("keydown", handleMonthCardKeydown, true);