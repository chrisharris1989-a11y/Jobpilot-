import { supabase } from "./supabase.js";
import { ensureCompanyContext } from "./company-context.js";

async function initialiseCompanyContext() {
  try {
    await ensureCompanyContext();
  } catch (error) {
    console.error("JobPilot company bootstrap:", error);
  }
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session?.user) return;

  try {
    const context = await ensureCompanyContext();

    if (context.needsOnboarding) return;

    window.dispatchEvent(new CustomEvent("jobpilot:company-ready", {
      detail: context
    }));
  } catch (error) {
    console.error("JobPilot auth/company bootstrap:", error);
  }
});

initialiseCompanyContext();
