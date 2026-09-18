import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// Session-scoped user cache. Supabase auth.getUser() validates the current
// session, but many UI modules were independently calling it during the same
// page lifecycle. Reusing the in-flight/result promise avoids hundreds of
// duplicate Auth requests without changing the authenticated user returned.
let cachedUserPromise = null;

// Short-lived membership cache. Many UI modules need the same active membership
// during a page lifecycle. Cache the RLS-backed result briefly to avoid repeated
// PostgREST requests while still allowing permission changes to become visible.
let cachedMembershipUserId = null;
let cachedMembershipAt = 0;
let cachedMembershipPromise = null;
const MEMBERSHIP_CACHE_TTL_MS = 5 * 60 * 1000;

export async function getCachedCompanyMembership(userId, { forceRefresh = false } = {}) {
  if (!userId) return { data: null, error: null };

  const now = Date.now();
  const cacheValid = cachedMembershipUserId === userId
    && cachedMembershipPromise
    && !forceRefresh
    && (now - cachedMembershipAt) < MEMBERSHIP_CACHE_TTL_MS;

  if (cacheValid) return cachedMembershipPromise;

  cachedMembershipUserId = userId;
  cachedMembershipAt = now;
  cachedMembershipPromise = supabase
    .from("company_members")
    .select("company_id, role, status, permissions")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()
    .then(result => {
      if (cachedMembershipUserId === userId) cachedMembershipPromise = Promise.resolve(result);
      return result;
    })
    .catch(error => {
      if (cachedMembershipUserId === userId) {
        cachedMembershipPromise = null;
        cachedMembershipAt = 0;
      }
      return { data: null, error };
    });

  return cachedMembershipPromise;
}

export function clearCachedCompanyMembership() {
  cachedMembershipUserId = null;
  cachedMembershipAt = 0;
  cachedMembershipPromise = null;
}

export async function getCachedUserResponse() {
  if (!cachedUserPromise) {
    cachedUserPromise = supabase.auth.getUser().catch(error => ({
      data: { user: null },
      error
    }));
  }
  return cachedUserPromise;
}

supabase.auth.onAuthStateChange((event) => {
  // A sign-in/sign-out/token/user change must invalidate the cached identity.
  if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) {
    cachedUserPromise = null;
    clearCachedCompanyMembership();
  }
});
