import { supabase } from "../supabase.js";

// Gate the entire app before app.js renders anything. The previous version
// gated only #pageContent, which still allowed the base dashboard to briefly
// appear while the User-specific dashboard was being prepared.
const MANAGEMENT_ROLES = ["owner", "admin"];
let resolving = false;

function gateApp() {
  const app = document.getElementById("app");
  if (app) app.classList.add("jobpilot-app-gated");
  return app;
}

function gateContent() {
  const content = document.getElementById("pageContent");
  if (content) content.classList.add("jobpilot-role-gated");
  return content;
}

function hideUserDashboardContent() {
  const stats = document.querySelector(".stats");
  if (stats) {
    const cards = stats.querySelectorAll(":scope > .stat-card");
    [0, 1, 2, 3, 5].forEach(index => {
      const card = cards[index];
      if (card) card.style.display = "none";
    });
  }

  document.querySelectorAll("#pageContent *").forEach(element => {
    if (element.children.length > 0) return;
    const text = String(element.textContent || "").trim().toLowerCase();
    if (text !== "quick actions" && text !== "upcoming jobs") return;
    const panel = element.closest(".panel,.card,.dashboard-card,.stat-card,section,article");
    if (panel) panel.style.display = "none";
    else element.style.display = "none";
  });
}

async function isManagementUser() {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("JobPilot role gate:", error);
      return false;
    }

    return MANAGEMENT_ROLES.includes(String(data?.role || "").toLowerCase());
  } catch (error) {
    console.error("JobPilot role gate:", error);
    return false;
  }
}

function userDashboardIsReady() {
  const content = document.getElementById("pageContent");
  if (!content) return false;

  // Wait for the User-specific dashboard elements created by dashboard-ui.js.
  // At this point the base company dashboard has already been transformed.
  const monthCard = content.querySelector("#jobpilot-user-month-jobs");
  const quotePanel = content.querySelector("#jobpilot-user-quote-request");
  const stats = content.querySelector(".stats");
  const cards = stats?.querySelectorAll(":scope > .stat-card") || [];

  if (!monthCard || !quotePanel || cards.length < 6) return false;

  const companyCardsHidden = [0, 1, 2, 3].every(index =>
    cards[index] && getComputedStyle(cards[index]).display === "none"
  );

  const todayJobsVisible = cards[4] && getComputedStyle(cards[4]).display !== "none";
  const todayValueHidden = cards[5] && getComputedStyle(cards[5]).display === "none";

  return companyCardsHidden && todayJobsVisible && todayValueHidden;
}

function releaseGate() {
  const content = document.getElementById("pageContent");
  if (content) content.classList.remove("jobpilot-role-gated");

  const app = document.getElementById("app");
  if (app) app.classList.remove("jobpilot-app-gated");
}

async function waitForUserDashboard() {
  const started = Date.now();
  const timeout = 6000;

  while (Date.now() - started < timeout) {
    hideUserDashboardContent();

    if (userDashboardIsReady()) {
      releaseGate();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Safety fallback: never expose the company-wide dashboard to a normal User.
  hideUserDashboardContent();
  releaseGate();
}

async function resolveDashboardRole() {
  if (resolving) return;
  const content = gateContent();
  if (!content || !content.querySelector(".stats")) return;

  resolving = true;
  try {
    const managementUser = await isManagementUser();

    if (managementUser) {
      releaseGate();
      return;
    }

    await waitForUserDashboard();
  } catch (error) {
    console.error("JobPilot role gate:", error);
    hideUserDashboardContent();
    releaseGate();
  }
}

// This style is installed before app.js runs, and the app element itself is
// gated immediately. That makes the transition atomic from the user's point
// of view: there is no intermediate dashboard frame to paint.
const style = document.createElement("style");
style.id = "jobpilot-role-gate-style";
style.textContent = `
  #app.jobpilot-app-gated{visibility:hidden!important}
  #pageContent.jobpilot-role-gated{visibility:hidden!important}
`;
document.head.appendChild(style);
gateApp();

const observer = new MutationObserver(() => {
  gateApp();
  gateContent();
  if (document.querySelector("#pageContent .stats")) {
    observer.disconnect();
    void resolveDashboardRole();
  }
});

function start() {
  const app = document.getElementById("app");
  if (!app) return;

  gateApp();
  gateContent();
  observer.observe(app, { childList: true, subtree: true });

  if (document.querySelector("#pageContent .stats")) {
    observer.disconnect();
    void resolveDashboardRole();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
