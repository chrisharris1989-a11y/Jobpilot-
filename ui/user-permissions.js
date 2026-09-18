import { supabase } from "../supabase.js";

const DEFAULT_USER_PERMISSIONS = {
  customers: true,
  jobs: true,
  quotes: true,
  invoices: true,
  connections: false,
  management: false,
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
    if (!user) {
      permissions = { ...DEFAULT_USER_PERMISSIONS };
      loaded = true;
      return permissions;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("role, permissions")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    // If the membership lookup is blocked or temporarily fails, use the
    // canonical company owner record before falling back to restricted access.
    if (membershipError) {
      const { data: ownedCompany, error: ownerError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ownerError) throw membershipError;
      if (ownedCompany) {
        permissions = { all: true };
        loaded = true;
        return permissions;
      }
      throw membershipError;
    }

    const role = String(membership?.role || "").toLowerCase();

    // Owners/admins always have full management access. If an owner record was
    // created without a matching company_members row (which can happen for
    // older/test accounts), fall back to the canonical companies.owner_id.
    if (role === "owner" || role === "admin") {
      permissions = { all: true };
    } else if (!membership) {
      const { data: ownedCompany, error: ownerError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ownerError) throw ownerError;

      permissions = ownedCompany
        ? { all: true }
        : { ...DEFAULT_USER_PERMISSIONS };
    } else {
      permissions = {
        ...DEFAULT_USER_PERMISSIONS,
        ...(membership.permissions || {})
      };
    }
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

export function isRestrictedUser() {
  return loaded && permissions.all !== true;
}

export function getPermissions() {
  return { ...permissions };
}

window.JobPilotPermissions = {
  load: loadUserPermissions,
  can,
  get: getPermissions,
  isRestrictedUser
};
