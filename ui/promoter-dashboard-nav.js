import { supabase } from "../supabase.js";

let checkTimer = null;
let promoterChecked = false;

async function addPromoterDashboardLink() {
  if (promoterChecked || document.getElementById("jobpilot-promoter-dashboard-button")) return;

  const sidebarBottom = document.querySelector(".sidebar-bottom");
  if (!sidebarBottom) return;

  promoterChecked = true;

  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase.rpc("get_my_promoter_dashboard");
    if (error || !Array.isArray(data) || !data.length) return;

    const button = document.createElement("button");
    button.id = "jobpilot-promoter-dashboard-button";
    button.type = "button";
    button.className = "nav-item";
    button.textContent = "📣 Promoter Dashboard";
    button.addEventListener("click", () => {
      window.location.href = "https://promoter.jobpilotcrm.com/";
    });

    const settingsButton = sidebarBottom.querySelector('[data-page="settings"]');
    if (settingsButton) sidebarBottom.insertBefore(button, settingsButton);
    else sidebarBottom.insertBefore(button, sidebarBottom.firstChild);
  } catch (error) {
    promoterChecked = false;
    console.warn("JobPilot promoter dashboard link:", error);
  }
}

function scheduleCheck() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(addPromoterDashboardLink, 100);
}

scheduleCheck();

const observer = new MutationObserver(() => {
  if (!document.getElementById("jobpilot-promoter-dashboard-button")) scheduleCheck();
});
observer.observe(document.getElementById("app") || document.body, { childList: true, subtree: true });

supabase.auth.onAuthStateChange(() => {
  promoterChecked = false;
  scheduleCheck();
});
