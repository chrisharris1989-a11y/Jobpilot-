import { supabase } from "../supabase.js";

// Keep the app shell hidden until both authentication/role checks and the
// first real app render are complete. This prevents the raw header/sidebar
// from flashing briefly between the loading screen and the enhanced UI.
const MANAGEMENT_ROLES = ["owner", "admin"];
let resolving = false;
let roleResolved = false;
let customerPortalRedirecting = false;

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

async function getCurrentUser() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  return user || null;
}

async function isCustomerPortalUser(user) {
  if (!user) return false;
  const { data, error } = await supabase
    .from("customer_portal_accounts")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("JobPilot portal account check:", error);
    return false;
  }

  return Boolean(data?.id);
}

async function isManagementUser(user) {
  if (!user) return false;

  try {
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

function releaseWhenInitialScreenExists() {
  if (!roleResolved || customerPortalRedirecting) return;

  const app = document.getElementById("app");
  if (!app) return;

  // Wait until app.js has replaced the loading screen with the actual login
  // or application shell. Releasing the gate earlier is what caused the
  // unstyled/raw header to become visible for a frame during startup.
  const ready = app.querySelector(".app-layout, .auth-page");
  if (!ready) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      releaseGate();
    });
  });
}

async function resolveDashboardRole() {
  if (resolving) return;
  resolving = true;

  try {
    const user = await getCurrentUser();

    if (!user) {
      roleResolved = true;
      releaseWhenInitialScreenExists();
      return;
    }

    if (await isCustomerPortalUser(user)) {
      customerPortalRedirecting = true;
      window.location.replace("/portal/");
      return;
    }

    const managementUser = await isManagementUser(user);

    if (!managementUser) {
      hideUserDashboardContent();
    }

    roleResolved = true;
    releaseWhenInitialScreenExists();
  } catch (error) {
    console.error("JobPilot role gate:", error);
    roleResolved = true;
    releaseWhenInitialScreenExists();
  }
}

const style = document.createElement("style");
style.id = "jobpilot-role-gate-style";
style.textContent = `
  #app.jobpilot-app-gated { visibility: hidden !important; }
  #pageContent.jobpilot-role-gated { visibility: hidden !important; }
`;
document.head.appendChild(style);

gateApp();

gateContent();

const readinessObserver = new MutationObserver(() => {
  releaseWhenInitialScreenExists();
});

function start() {
  const app = document.getElementById("app");
  if (!app) return;

  gateApp();
  gateContent();
  readinessObserver.observe(app, { childList: true, subtree: true });
  void resolveDashboardRole();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
