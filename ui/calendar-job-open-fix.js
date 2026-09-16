function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function findJobRow(label) {
  const target = normalize(label);
  if (!target) return null;

  const rows = [...document.querySelectorAll(".job-row[data-job-id]")];
  const timeMatch = target.match(/^(\d{1,2}:\d{2})\s+(.*)$/);
  const targetTime = timeMatch?.[1] || "";
  const targetTitle = timeMatch?.[2] || target;

  return rows.find(row => {
    const text = normalize(row.textContent);
    const hasTitle = text.includes(normalize(targetTitle));
    const hasTime = !targetTime || text.includes(normalize(targetTime));
    return hasTitle && hasTime;
  }) || rows.find(row => normalize(row.textContent).includes(normalize(targetTitle))) || null;
}

function openJobFromCalendar(jobElement) {
  const strong = jobElement.querySelector("strong");
  const label = normalize(strong?.textContent || jobElement.textContent);
  if (!label) return;

  document.getElementById("jp-management-month-calendar")?.remove();

  const jobsButton = document.querySelector('[data-page="jobs"]');
  if (!jobsButton) return;
  jobsButton.click();

  const started = Date.now();
  const findAndOpen = () => {
    const row = findJobRow(label);
    if (row) {
      row.scrollIntoView({ block: "center", behavior: "instant" });
      setTimeout(() => row.click(), 100);
      return;
    }
    if (Date.now() - started < 5000) requestAnimationFrame(findAndOpen);
  };

  // Let the Jobs page finish its render and attach its normal job-row handlers
  // before triggering the existing Job Details behaviour.
  setTimeout(findAndOpen, 300);
}

function handleCalendarJobClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const jobElement = target?.closest?.("#jp-management-month-calendar .jp-mm-day-job, #jp-management-month-calendar .jp-mm-job");
  if (!jobElement) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openJobFromCalendar(jobElement);
}

document.addEventListener("click", handleCalendarJobClick, true);
