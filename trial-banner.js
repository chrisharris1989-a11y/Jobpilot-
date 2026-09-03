import { supabase } from "./supabase.js";

(function () {
  let timer = null;
  let lastEndsAt = null;

  function injectStyles() {
    if (document.getElementById("jobpilot-trial-banner-styles")) return;
    const style = document.createElement("style");
    style.id = "jobpilot-trial-banner-styles";
    style.textContent = `
      .jobpilot-trial-badge {
        margin-left: auto;
        flex: 0 0 auto;
        min-width: 72px;
        padding: 7px 9px;
        border-radius: 9px;
        background: #eff6ff;
        border: 1px solid #dbeafe;
        color: #1d4ed8;
        text-align: center;
        line-height: 1.15;
      }
      .jobpilot-trial-badge-label {
        display: block;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .45px;
        text-transform: uppercase;
      }
      .jobpilot-trial-badge-days {
        display: block;
        margin-top: 2px;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }
      .jobpilot-trial-badge.urgent {
        background: #fff7ed;
        border-color: #fed7aa;
        color: #c2410c;
      }
      @media (max-width: 760px) {
        .jobpilot-trial-badge {
          min-width: 66px;
          padding: 6px 7px;
        }
        .jobpilot-trial-badge-label { font-size: 8px; }
        .jobpilot-trial-badge-days { font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
  }

  function upsertBadge(endsAt) {
    const logo = document.querySelector(".app-layout .sidebar .logo");
    if (!logo) return false;

    let badge = document.getElementById("jobpilot-trial-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "jobpilot-trial-badge";
      badge.className = "jobpilot-trial-badge";
      badge.setAttribute("aria-label", "Free trial time remaining");
      logo.appendChild(badge);
    }

    const remaining = new Date(endsAt).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(remaining / 86400000));

    badge.classList.toggle("urgent", days <= 3);
    badge.innerHTML = `
      <span class="jobpilot-trial-badge-label">Free trial</span>
      <span class="jobpilot-trial-badge-days">${days} ${days === 1 ? "day" : "days"} left</span>
    `;

    return true;
  }

  function removeBadge() {
    document.getElementById("jobpilot-trial-badge")?.remove();
  }

  async function loadTrial() {
    const { data, error } = await supabase.rpc("get_my_trial_status");
    if (error) {
      console.error("JobPilot trial countdown:", error);
      removeBadge();
      return;
    }

    const trial = Array.isArray(data) ? data[0] : data;
    if (!trial?.is_trial || !trial.trial_ends_at) {
      removeBadge();
      return;
    }

    lastEndsAt = trial.trial_ends_at;
    injectStyles();

    if (timer) clearInterval(timer);
    upsertBadge(lastEndsAt);
    timer = setInterval(() => {
      if (!upsertBadge(lastEndsAt)) return;
      if (new Date(lastEndsAt).getTime() <= Date.now()) {
        clearInterval(timer);
        timer = null;
        removeBadge();
      }
    }, 60000);
  }

  const observer = new MutationObserver(() => {
    if (lastEndsAt) upsertBadge(lastEndsAt);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setTimeout(loadTrial, 0);
    } else {
      lastEndsAt = null;
      if (timer) clearInterval(timer);
      timer = null;
      removeBadge();
    }
  });

  loadTrial();
})();
