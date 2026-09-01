import { supabase } from "./supabase.js";
import { ensureCompanyContext } from "./company-context.js";

async function initialiseCompanyContext() {
  try {
    await ensureCompanyContext();
  } catch (error) {
    console.error("JobPilot company bootstrap:", error);
  }
}

// Do not await Supabase work directly inside onAuthStateChange.
// Supabase's auth callback can hold an internal lock while it runs;
// deferring the company lookup prevents the application from hanging
// on the loading screen after sign-in.
supabase.auth.onAuthStateChange((_event, session) => {
  if (!session?.user) return;

  setTimeout(async () => {
    try {
      const context = await ensureCompanyContext();

      if (context.needsOnboarding) return;

      window.dispatchEvent(new CustomEvent("jobpilot:company-ready", {
        detail: context
      }));
    } catch (error) {
      console.error("JobPilot auth/company bootstrap:", error);
    }
  }, 0);
});

initialiseCompanyContext();
