import { supabase } from "./supabase.js";
import { ensureCompanyContext } from "./company-context.js";

let appLoaded = false;

async function loadApplication() {
  if (appLoaded) return;
  appLoaded = true;
  await import("./app.js");
}

async function initialise() {
  try {
    const context = await ensureCompanyContext();

    if (context.user && context.needsOnboarding) {
      return;
    }

    await loadApplication();
  } catch (error) {
    console.error("JobPilot bootstrap:", error);
    await loadApplication();
  }
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session?.user) return;

  try {
    const context = await ensureCompanyContext();

    if (context.needsOnboarding) return;

    if (!appLoaded) {
      await loadApplication();
    } else {
      window.dispatchEvent(new CustomEvent("jobpilot:company-ready", {
        detail: context
      }));
    }
  } catch (error) {
    console.error("JobPilot auth/company bootstrap:", error);
  }
});

initialise();
