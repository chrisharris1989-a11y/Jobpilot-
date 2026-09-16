// Mobile layout overrides for the company calendar.
// Keeps the full week visible without forcing the phone to scroll horizontally.

function addMobileCalendarStyles() {
  if (document.getElementById("jobpilot-company-calendar-mobile-style")) return;

  const style = document.createElement("style");
  style.id = "jobpilot-company-calendar-mobile-style";
  style.textContent = `
    @media (max-width: 640px) {
      #jobpilot-dashboard-calendar { width: 100%; max-width: 100%; overflow: hidden; }
      #jobpilot-dashboard-calendar .jp-calendar-wrap { width: 100%; max-width: 100%; overflow: hidden; border-radius: 10px; }
      #jobpilot-dashboard-calendar .jp-calendar-toolbar { padding: 8px; gap: 6px; }
      #jobpilot-dashboard-calendar .jp-calendar-toolbar h2 { font-size: 16px; }
      #jobpilot-dashboard-calendar .jp-calendar-toolbar p { display: none; }
      #jobpilot-dashboard-calendar .jp-calendar-actions { width: 100%; justify-content: space-between; gap: 3px; }
      #jobpilot-dashboard-calendar .jp-calendar-actions button { padding: 5px 7px; font-size: 11px; }

      #jobpilot-dashboard-calendar .jp-cal-week {
        width: 100%;
        min-width: 0;
      }
      #jobpilot-dashboard-calendar .jp-cal-week-head,
      #jobpilot-dashboard-calendar .jp-cal-week-body {
        grid-template-columns: 32px repeat(7, minmax(0, 1fr));
        width: 100%;
        min-width: 0;
      }
      #jobpilot-dashboard-calendar .jp-cal-week-body {
        height: 55vh;
        max-height: 430px;
        overflow-x: hidden;
        overflow-y: auto;
      }
      #jobpilot-dashboard-calendar .jp-cal-day-head { padding: 5px 1px; }
      #jobpilot-dashboard-calendar .jp-cal-day-head span { font-size: 8px; }
      #jobpilot-dashboard-calendar .jp-cal-day-head strong { font-size: 12px; }
      #jobpilot-dashboard-calendar .jp-cal-day-head.today strong { width: 24px; height: 24px; }
      #jobpilot-dashboard-calendar .jp-cal-time-col div { height: 44px; padding: 3px 2px; font-size: 7px; }
      #jobpilot-dashboard-calendar .jp-cal-day-column { background: repeating-linear-gradient(to bottom, transparent 0, transparent 43px, #eef0f3 43px, #eef0f3 44px); }
      #jobpilot-dashboard-calendar .jp-cal-slot { height: 44px; }
      #jobpilot-dashboard-calendar .jp-cal-job { left: 1px; right: 1px; min-height: 38px; padding: 2px; border-radius: 3px; }
      #jobpilot-dashboard-calendar .jp-cal-job strong { font-size: 7px; }
      #jobpilot-dashboard-calendar .jp-cal-job span { font-size: 7px; }
      #jobpilot-dashboard-calendar .jp-cal-job small { display: none; }

      #jobpilot-dashboard-calendar .jp-cal-month {
        width: 100%;
        min-width: 0;
      }
      #jobpilot-dashboard-calendar .jp-cal-month-day { min-height: 58px; padding: 3px; }
      #jobpilot-dashboard-calendar .jp-cal-month-head > div { padding: 5px 1px; font-size: 8px; }
      #jobpilot-dashboard-calendar .jp-cal-date { padding: 1px 2px; font-size: 9px; }
      #jobpilot-dashboard-calendar .jp-cal-month-job { padding: 2px; margin-top: 2px; font-size: 7px; }
      #jobpilot-dashboard-calendar .jp-cal-more { font-size: 7px; }
    }
  `;
  document.head.appendChild(style);
}

addMobileCalendarStyles();
