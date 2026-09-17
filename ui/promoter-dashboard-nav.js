import { supabase } from "../supabase.js";

async function addPromoterDashboardLink() {
  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase.rpc("get_my_promoter_dashboard");
    if (error || !Array.isArray(data) || !data.length) return;

    if (document.getElementById("jobpilot-promoter-dashboard-button")) return;

    const sidebarBottom = document.querySelector(".sidebar-bottom");
    if (!sidebarBottom) return;

    const button = document.createElement("button");
    button.id = "jobpilot-promoter-dashboard-button";
    button.type = "button";
    button.className = "nav-item";
    button.textContent = "📣 Promoter Dashboard";
    button.addEventListener("click", () => {
      window.location.href = "/promoter-dashboard.html";
    });

    const settingsButton = sidebarBottom.querySelector('[data-page="settings"]');
    if (settingsButton) sidebarBottom.insertBefore(button, settingsButton);
    else sidebarBottom.insertBefore(button, sidebarBottom.firstChild);
  } catch (error) {
    console.warn("JobPilot promoter dashboard link:", error);
  }
}

function watchForAppRender() {
  addPromoterDashboardLink();
  const observer = new MutationObserver(() => addPromoterDashboardLink());
  observer.observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
}

watchForAppRender();
supabase.auth.onAuthStateChange(() => setTimeout(addPromoterDashboardLink, 0));
