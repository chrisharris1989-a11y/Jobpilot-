import { supabase } from "../supabase.js";

// Apply User dashboard restrictions synchronously whenever the base dashboard
// is rendered. This prevents the base company dashboard from ever becoming
// visible between app.js rendering and the later dashboard enhancement pass.
const MANAGEMENT_ROLES = ["owner", "admin"];
let managementUser = null;

function applyUserDashboardGuard() {
  if (managementUser !== false) return;

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
    const { data: { user } = {} } = await supabase.auth.getUser();
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
