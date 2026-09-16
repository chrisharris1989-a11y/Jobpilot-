import { renderCompanyCalendar } from "./company-calendar.js";
import "./company-calendar-mobile.js";

let listenersBound = false;
let dashboardCalendarRendered = false;
let calendarDismissed = false;

function addCalendarCloseButton(calendarPanel) {
  const toolbar = calendarPanel.querySelector(".jp-calendar-toolbar");
  if (!toolbar || toolbar.querySelector("#jp-cal-close")) return;

  const actions = toolbar.querySelector(".jp-calendar-actions");
  if (!actions) return;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.id = "jp-cal-close";
  closeButton.textContent = "Close";
  closeButton.setAttribute("aria-label", "Close calendar");
  closeButton.addEventListener("click", () => {
    calendarDismissed = true;
    dashboardCalendarRendered = false;
    calendarPanel.remove();
  });
  actions.appendChild(closeButton);
}

function renderDashboardCalendar() {
  const content = document.getElementById("pageContent");
  const dashboardButton = document.querySelector('.nav-item[data-page="dashboard"].active');
  if (!content || !dashboardButton || dashboardCalendarRendered || calendarDismissed) return;

  const calendarPanel = document.createElement("section");
  calendarPanel.id = "jobpilot-dashboard-calendar";
  calendarPanel.style.marginTop = "24px";
  content.appendChild(calendarPanel);
  dashboardCalendarRendered = true;
  void renderCompanyCalendar(calendarPanel).then(() => addCalendarCloseButton(calendarPanel));
}

function bindCalendarEvents() {
  if (listenersBound) return;
  listenersBound = true;

  document.addEventListener("jobpilot:open-job", event => {
    const jobId = event.detail?.jobId;
    if (!jobId) return;

    const jobsButton = document.querySelector('[data-page="jobs"]');
    if (jobsButton) jobsButton.click();

    setTimeout(() => {
      document.dispatchEvent(new CustomEvent("jobpilot:calendar-open-job", { detail: { jobId } }));
    }, 0);
  });

  document.addEventListener("jobpilot:new-job", event => {
    const jobsButton = document.querySelector('[data-page="jobs"]');
    if (jobsButton) jobsButton.click();

    setTimeout(() => {
      document.dispatchEvent(new CustomEvent("jobpilot:calendar-new-job", { detail: event.detail }));
    }, 0);
  });
}

function start() {
  bindCalendarEvents();

  const observer = new MutationObserver(() => {
    const dashboardButton = document.querySelector('.nav-item[data-page="dashboard"].active');
    if (dashboardButton) {
      renderDashboardCalendar();
    } else {
      dashboardCalendarRendered = false;
      calendarDismissed = false;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  renderDashboardCalendar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
