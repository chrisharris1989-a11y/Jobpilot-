import { supabase } from "./supabase.js";

const MANAGEMENT_ROLES = ["owner", "admin"];

async function getManagementContext() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("company_members").select("company_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (error || !data || !MANAGEMENT_ROLES.includes(String(data.role || "").toLowerCase())) return null;
  return { user, ...data };
}

function setPageHeader() {
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Requests";
  if (subtitle) subtitle.textContent = "Review requests submitted by your team and customers.";
}

