import { supabase } from "../supabase.js";

// Management dashboard: replace the financial "Today's Job Value" snapshot
// with a company-wide count of this month's active jobs.
const MANAGEMENT_ROLES = ["owner", "admin"];
let managementContext = null;
let loading = false;

function getMonthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

async function getManagementContext() {
  if (managementContext) return managementContext;
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return (managementContext = false);

    const { data, error } = await supabase
      .from("company_members")
      .select("role, company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const role = String(data?.role || "").toLowerCase();
    if (!MANAGEMENT_ROLES.includes(role) || !data?.company_id) {
      return (managementContext = false);
    }

    return (managementContext = { companyId: data.company_id });
  } catch (error) {
    console.error("JobPilot management month jobs access:", error);
    return (managementContext = false);
  }
}

async function applyManagementMonthCard() {
  if (loading) return;
  const stats = document.querySelector(".stats");
  if (!stats) return;

  const context = await getManagementContext();
  if (!context) return;

  const cards = [...stats.querySelectorAll(":scope > .stat-card")];
  const card = cards.find(item =>
    String(item.textContent || "").toLowerCase().includes("today's job value")
  );
  if (!card || card.dataset.managementMonthJobs === "true") return;

  loading = true;
  card.dataset.managementMonthJobs = "true";
  card.innerHTML = `<div class="stat-icon">🗓️</div><div><span>This Month's Jobs</span><strong>—</strong></div>`;
  card.setAttribute("aria-label", "This month's jobs");
  card.title = "This month's jobs";

  try {
    const { start, end } = getMonthRange();
    const { data, error } = await supabase
      .from("jobs")
      .select("id, status, scheduled_date")
      .eq("company_id", context.companyId)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end);

    if (error) throw error;

    const activeJobs = (data || []).filter(
      job => String(job.status || "").toLowerCase() !== "cancelled"
    );
    card.querySelector("strong").textContent = String(activeJobs.length);
  } catch (error) {
    console.error("JobPilot management month jobs:", error);
    card.querySelector("strong").textContent = "—";
  } finally {
    loading = false;
  }
}

const observer = new MutationObserver(() => {
  void applyManagementMonthCard();
});

function start() {
  observer.observe(document.body, { childList: true, subtree: true });
  void applyManagementMonthCard();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
