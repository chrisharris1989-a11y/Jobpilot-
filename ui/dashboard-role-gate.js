import { supabase } from "../supabase.js";

// Prevent the manager dashboard from ever being painted for a normal User.
// This runs before app.js and keeps pageContent hidden until role-specific
// dashboard restrictions have been applied once.
const MANAGEMENT_ROLES = ["owner", "admin"];

function gateContent() {
  const content = document.getElementById("pageContent");
  if (content) content.classList.add("jobpilot-role-gated");
}

function hideUserOnlyDashboardContent() {
  const stats = document.querySelector(".stats");
  if (!stats) return;

  const cards = stats.querySelectorAll(":scope > .stat-card");
  [0, 1, 2, 3, 5].forEach(index => {
    const card = cards[index];
    if (card) card.style.display = "none";
  });

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

async function releaseRoleGate() {
  const managementUser = await isManagementUser();
  if (!managementUser) hideUserOnlyDashboardContent();

  const content = document.getElementById("pageContent");
  if (content) content.classList.remove("jobpilot-role-gated");
}

const style = document.createElement("style");
style.id = "jobpilot-role-gate-style";
style.textContent = `#pageContent.jobpilot-role-gated{visibility:hidden!important}`;
document.head.appendChild(style);

gateContent();

const observer = new MutationObserver(() => {
  gateContent();
  const content = document.getElementById("pageContent");
  if (!content?.querySelector(".stats")) return;
  observer.disconnect();
  releaseRoleGate();
});

const app = document.getElementById("app");
if (app) observer.observe(app, { childList: true, subtree: true });
releaseRoleGate();
