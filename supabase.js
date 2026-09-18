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
  }
});
