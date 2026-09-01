import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qxoynttvipducubmczwl.supabase.co";
const supabaseKey = "sb_publishable_PjukB_Du73D4ZzZJrpN_gw_IqK9TL3Z";

export const supabase = createClient(supabaseUrl, supabaseKey);

const originalInvoke = supabase.functions.invoke.bind(supabase.functions);
supabase.functions.invoke = async (functionName, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    ...(options.headers || {}),
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {})
  };
  return originalInvoke(functionName, { ...options, headers });
};
