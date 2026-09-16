import { renderCompanyCalendar } from "./company-calendar.js";

let listenersBound = false;

function openCalendar(button) {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  button.classList.add("active");

  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  const content = document.getElementById("pageContent");
  if (!content) return;

  if (title) title.textContent = "Calendar";
  if (subtitle) subtitle.textContent = "View and manage your scheduled work.";
  void renderCompanyCalendar(content);
}

function ensureCalendarButton() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav) return false;

  let button = nav.querySelector('[data-page="calendar"]');
  if (!button) {
    button = document.createElement("button");
    button.className = "nav-item";
    button.type = "button";
    button.dataset.page = "calendar";
    button.textContent = "🗓️ Calendar";

    const jobsButton = nav.querySelector('[data-page="jobs"]');
    if (jobsButton) jobsButton.insertAdjacentElement("afterend", button);
    else nav.prepend(button);
  }

  if (!button.dataset.calendarBound) {
    button.dataset.calendarBound = "true";
    button.addEventListener("click", () => openCalendar(button));
  }

  return true;
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
  ensureCalendarButton();

  const observer = new MutationObserver(() => {
    ensureCalendarButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
