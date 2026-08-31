// Prevent preference-only auth updates from rebuilding the entire app.
// Supabase emits USER_UPDATED when user metadata changes (for example,
// when a Connections selector is saved). The main app should remain on
// the current page for those updates.
import { supabase } from "../supabase.js";

const originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);

supabase.auth.onAuthStateChange = (callback) => {
  return originalOnAuthStateChange((event, session) => {
    if (event === "USER_UPDATED") return;
    return callback(event, session);
  });
};
