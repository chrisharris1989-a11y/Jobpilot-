import { supabase } from "../supabase.js";

// Apply User dashboard restrictions whenever the base dashboard is rendered.
// Do not classify a session as a normal User until Supabase auth hydration has
// completed; otherwise owners/admins can incorrectly receive the User dashboard.
const MANAGEMENT_ROLES = ["owner", "admin"];
let managementUser = null;
let roleResolved = false;

function applyUserDashboardGuard() {
  if (!roleResolved || managementUser !== false) return;

  const content = document.getElementById("pageContent");
  if (!content) return;

  const stats = content.querySelector(".stats");
  if (stats) {
    const cards = stats.querySelectorAll(":scope > .stat-card");
    [0, 1, 2, 3, 5].forEach(index => {
      const card = cards[index];
      if (card) card.style.display = "none";
    });
  }

  content.querySelectorAll(".panel").forEach(panel => {
    const text = String(panel.textContent || "").toLowerCase();
    if (text.includes("upcoming jobs") || text.includes("quick actions")) {
      panel.style.display = "none";
    }
  });
}

async function resolveRole() {
  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("User dashboard render guard:", error);
      return;
    }

    managementUser = MANAGEMENT_ROLES.includes(
      String(data?.role || "").toLowerCase()
    );
    roleResolved = true;

    if (!managementUser) applyUserDashboardGuard();
  } catch (error) {
    console.error("User dashboard render guard:", error);
  }
}

const observer = new MutationObserver(() => {
  applyUserDashboardGuard();
});

function start() {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  void resolveRole();

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user || roleResolved) return;
    void resolveRole();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
