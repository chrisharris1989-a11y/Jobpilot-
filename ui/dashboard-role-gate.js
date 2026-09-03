import { supabase } from "../supabase.js";

// Keep the dashboard gated while the normal dashboard is being transformed
// into the role-specific User dashboard. This prevents the base/company
// dashboard from ever being painted to a normal User.
const MANAGEMENT_ROLES = ["owner", "admin"];
let resolving = false;

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

  // dashboard-ui.js creates these only after the User-specific dashboard
  // restrictions and User dashboard panels have been applied.
  return Boolean(
    content.querySelector("#jobpilot-user-month-jobs") &&
    content.querySelector("#jobpilot-user-quote-request")
  );
}

function releaseGate() {
  const currentContent = document.getElementById("pageContent");
  if (currentContent) currentContent.classList.remove("jobpilot-role-gated");
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

  // Safety fallback: if an optional User panel failed to initialise, the
  // company-wide cards and panels have still been removed before revealing it.
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
    // Fail closed for the dashboard content: remove the company-wide cards
    // before allowing anything to become visible.
    hideUserDashboardContent();
    releaseGate();
  }
}

const style = document.createElement("style");
style.id = "jobpilot-role-gate-style";
style.textContent = `#pageContent.jobpilot-role-gated{visibility:hidden!important}`;
document.head.appendChild(style);

const observer = new MutationObserver(() => {
  gateContent();
  if (document.querySelector("#pageContent .stats")) {
    observer.disconnect();
    void resolveDashboardRole();
  }
});

function start() {
  const app = document.getElementById("app");
  if (!app) return;

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
