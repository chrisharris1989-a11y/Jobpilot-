import { supabase } from "../supabase.js";

// Gate the dashboard until the logged-in user's role is known. The important
// part is that the gate is NOT released until the dashboard has been rendered
// and the User-specific restrictions have been applied.
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

async function resolveDashboardRole() {
  if (resolving) return;
  const content = gateContent();
  if (!content || !content.querySelector(".stats")) return;

  resolving = true;
  try {
    const managementUser = await isManagementUser();
    if (!managementUser) hideUserDashboardContent();
  } finally {
    // Release exactly once, after the role decision. Never release from the
    // initial module load, which was the source of the original half-second
    // manager-dashboard flash.
    const currentContent = document.getElementById("pageContent");
    if (currentContent) currentContent.classList.remove("jobpilot-role-gated");
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
