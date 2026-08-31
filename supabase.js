import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qxoynttvipducubmczwl.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_PjukB_Du73D4ZzZJrpN_gw_IqK9TL3Z";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
