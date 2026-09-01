import { supabase } from "./supabase.js";

export async function invokeAuthenticatedFunction(functionName, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    ...(options.headers || {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
  return supabase.functions.invoke(functionName, { ...options, headers });
}
