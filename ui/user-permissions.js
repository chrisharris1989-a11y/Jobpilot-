import { supabase } from "../supabase.js";

const DEFAULT_USER_PERMISSIONS = {
  customers: true,
  jobs: true,
  quotes: true,
  invoices: true,
  connections: false,
  tools: true,
  calculators: true,
  business_overview: false,
  job_planner: false,
  reports: false,
  settings: true
};

let permissions = { ...DEFAULT_USER_PERMISSIONS };
let loaded = false;

export async function loadUserPermissions() {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) { permissions = { ...DEFAULT_USER_PERMISSIONS }; loaded = true; return permissions; }
    const { data: membership, error } = await supabase
      .from("company_members")
      .select("role, permissions")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const role = String(membership?.role || "").toLowerCase();
    if (role === "owner" || role === "admin") permissions = { all: true };
    else permissions = { ...DEFAULT_USER_PERMISSIONS, ...(membership?.permissions || {}) };
  } catch (error) {
    console.error("JobPilot permissions:", error);
    permissions = { ...DEFAULT_USER_PERMISSIONS };
  }
  loaded = true;
  return permissions;
}

export function can(permission) {
  if (!loaded) return false;
  return permissions.all === true || permissions[permission] === true;
}

export function isRestrictedUser() { return loaded && permissions.all !== true; }
export function getPermissions() { return { ...permissions }; }
window.JobPilotPermissions = { load: loadUserPermissions, can, get: getPermissions, isRestrictedUser };
