import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qxoynttvipducubmczwl.supabase.co";
const supabaseKey = "sb_publishable_PjukB_Du73D4ZzZJrpN_gw_IqK9TL3Z";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
