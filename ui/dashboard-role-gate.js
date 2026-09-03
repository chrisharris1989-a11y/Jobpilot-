import { supabase } from "../supabase.js";

// Prevent the company dashboard from painting for normal Users, but never
// keep the entire application hidden while waiting for optional dashboard
// enhancements. The previous gate waited for six specific dashboard cards;
// if those enhancements were delayed or failed, #app stayed invisible.
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

function releaseGate() {
  const content = document.getElementById("pageContent");
  if (content) content.classList.remove("jobpilot-role-gated");

  const app = document.getElementById("app");
  if (app) app.classList.remove("jobpilot-app-gated");
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

    // Do not wait for dashboard-ui.js to finish adding optional User cards.
    // Hide the company-wide cards immediately, then release the app. The
    // User dashboard enhancements can continue rendering normally.
    hideUserDashboardContent();
    releaseGate();
  } catch (error) {
    console.error("JobPilot role gate:", error);
    // Fail safe for a normal User: hide company-wide dashboard content but
    // never leave the whole application permanently invisible.
    hideUserDashboardContent();
    releaseGate();
  }
}

// This style is installed before app.js runs so the initial company
// dashboard cannot paint before the role is known.
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
