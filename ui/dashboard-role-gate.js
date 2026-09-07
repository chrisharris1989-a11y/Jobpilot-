import { supabase } from "../supabase.js";

// Prevent the company dashboard from painting before the user's role is known.
// IMPORTANT: Supabase auth hydration can finish after this module loads, so a
// missing user must never be treated as a normal User permanently.
const MANAGEMENT_ROLES = ["owner", "admin"];
let resolving = false;
let resolved = false;

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

async function getRole() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("JobPilot role gate:", error);
    throw error;
  }

  return String(data?.role || "").toLowerCase();
}

function releaseGate() {
  const content = document.getElementById("pageContent");
  if (content) content.classList.remove("jobpilot-role-gated");

  const app = document.getElementById("app");
  if (app) app.classList.remove("jobpilot-app-gated");
}

async function resolveDashboardRole() {
  if (resolving || resolved) return;
  resolving = true;

  try {
    const role = await getRole();

    // Auth has not hydrated yet. Keep the gate in place and let the auth
    // listener below retry once Supabase has restored the session.
    if (role === null) return;

    resolved = true;
    const managementUser = MANAGEMENT_ROLES.includes(role);

    if (!managementUser) hideUserDashboardContent();
    releaseGate();
  } catch (error) {
    // Do not permanently classify the account as a normal User because of a
    // transient auth/RLS request. Release the visual gate and let the normal
    // application/RLS rules continue to enforce access while we retry.
    releaseGate();
  } finally {
    resolving = false;
  }
}

const style = document.createElement("style");
style.id = "jobpilot-role-gate-style";
style.textContent = `
  #app.jobpilot-app-gated{visibility:hidden!important}
  #pageContent.jobpilot-role-gated{visibility:hidden!important}
`;
document.head.appendChild(style);
gateApp();

function start() {
  const app = document.getElementById("app");
  if (!app) return;

  gateApp();
  gateContent();
  void resolveDashboardRole();

  // Re-run after Supabase restores the authenticated session. This fixes the
  // race where the role gate previously saw no user during initial hydration
  // and permanently rendered the User dashboard for company owners/admins.
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) return;
    if (resolved) return;
    void resolveDashboardRole();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
