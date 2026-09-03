import { supabase } from "../supabase.js";

const MANAGEMENT_ROLES = ["owner", "admin"];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getAssignedDescriptions() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.company_id) return [];
  if (MANAGEMENT_ROLES.includes(String(membership.role || "").toLowerCase())) return [];

  const { data, error } = await supabase
    .from("jobs")
    .select("id,title,description,customer_id,scheduled_date,scheduled_time")
    .eq("company_id", membership.company_id)
    .eq("assigned_user_id", user.id)
    .eq("scheduled_date", today());

  if (error) throw error;
  return data || [];
}

function findJobPanel() {
  const content = document.getElementById("pageContent");
  if (!content) return null;
  const heading = [...content.querySelectorAll(".panel .panel-header h2")]
    .find(node => String(node.textContent || "").trim().length > 0);
  return heading?.closest(".panel") || null;
}

function installDescription(panel, job) {
  if (!panel || panel.querySelector("[data-assigned-job-description]") || !job) return;

  const header = panel.querySelector(".panel-header");
  if (!header) return;

  const box = document.createElement("div");
  box.setAttribute("data-assigned-job-description", "true");
  box.style.cssText = "margin:20px 0;padding:18px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:var(--background-secondary,#f8fafc);";
  box.innerHTML = `
    <div style="font-weight:700;font-size:16px;margin-bottom:8px">Description</div>
    <div style="white-space:pre-wrap;line-height:1.6;color:var(--text,#374151)">${esc(job.description || "No description provided.")}</div>
  `;
  header.insertAdjacentElement("afterend", box);
}

async function applyDescription() {
  const panel = findJobPanel();
  if (!panel || panel.querySelector("[data-assigned-job-description]")) return;

  const header = panel.querySelector(".panel-header");
  const titleNode = header?.querySelector("p");
  if (!titleNode) return;

  const raw = String(titleNode.textContent || "").trim();
  const title = raw.replace(/\s*·\s*\d{1,2}:\d{2}\s*$/, "").trim();
  if (!title) return;

  try {
    const jobs = await getAssignedDescriptions();
    const timeMatch = raw.match(/·\s*(\d{1,2}:\d{2})\s*$/);
    const time = timeMatch?.[1] || "";
    const job = jobs.find(item => {
      const itemTitle = String(item.title || "").trim();
      const itemTime = String(item.scheduled_time || "").slice(0, 5);
      return itemTitle === title && (!time || itemTime === time);
    }) || jobs.find(item => String(item.title || "").trim() === title);

    if (job) installDescription(panel, job);
  } catch (error) {
    console.error("JobPilot assigned job description:", error);
  }
}

const observer = new MutationObserver(() => {
  void applyDescription();
});

function init() {
  observer.observe(document.body, { childList: true, subtree: true });
  void applyDescription();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
