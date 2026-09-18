import "./company-calendar-mobile.js";

let listenersBound = false;

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
    calendarPanel.remove();
  });
  actions.appendChild(closeButton);
}

function openCalendarJob(jobId) {
  if (!jobId) return;

  const overlay = document.getElementById("jp-management-month-calendar");
  overlay?.remove();

  const jobsButton = document.querySelector('[data-page="jobs"]');
  if (!jobsButton) return;

  const pageContent = document.getElementById("pageContent");
  if (pageContent) pageContent.dataset.calendarOpeningJob = String(jobId);

  jobsButton.click();

  const started = Date.now();
  const tryOpen = () => {
    const targetId = String(jobId);
    const row = [...document.querySelectorAll(".job-row[data-job-id]")]
      .find(item => String(item.dataset.jobId) === targetId);

    if (row) {
      row.scrollIntoView({ block: "center", behavior: "instant" });
      row.click();
      if (pageContent) delete pageContent.dataset.calendarOpeningJob;
      return;
    }

    if (Date.now() - started < 5000) {
      requestAnimationFrame(tryOpen);
    } else if (pageContent) {
      delete pageContent.dataset.calendarOpeningJob;
    }
  };

  requestAnimationFrame(tryOpen);
}

function bindCalendarEvents() {
  if (listenersBound) return;
  listenersBound = true;

  document.addEventListener("jobpilot:open-job", event => {
    openCalendarJob(event.detail?.jobId);
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


}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
