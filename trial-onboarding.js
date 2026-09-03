import { supabase } from "./supabase.js";

(function () {
  let processingUserId = null;

  async function ensureTrialCompany(user) {
    if (!user || processingUserId === user.id) return;
    if (user.user_metadata?.jobpilot_trial_signup !== true) return;

    processingUserId = user.id;

    try {
      const { data: existingMembership, error: membershipError } = await supabase
        .from("company_members")
        .select("id,company_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (existingMembership?.company_id) return;

      const businessName = String(user.user_metadata?.jobpilot_business_name || "").trim();
      if (!businessName) {
        console.error("JobPilot trial: missing business name.");
        return;
      }

      const { error } = await supabase.rpc("create_my_company", {
        requested_plan: "solo",
        requested_name: businessName
      });

      if (error) {
        console.error("JobPilot trial signup:", error);
        if (error.message?.includes("five free JobPilot trial places")) {
          window.__jobpilotTrialSignupError = "The five free JobPilot trial places have already been claimed. Please contact us if you would like to subscribe.";
        } else if (error.message?.includes("already used a JobPilot free trial")) {
          window.__jobpilotTrialSignupError = "This email address has already used a JobPilot free trial.";
        } else {
          window.__jobpilotTrialSignupError = error.message || "We could not start your free trial.";
        }
        return;
      }

      window.__jobpilotTrialStarted = true;
      window.dispatchEvent(new CustomEvent("jobpilot:trial-ready"));
    } catch (error) {
      console.error("JobPilot trial onboarding:", error);
      window.__jobpilotTrialSignupError = error.message || "We could not start your free trial.";
    } finally {
      processingUserId = null;
    }
  }

  document.addEventListener("click", async (event) => {
    const button = event.target?.closest?.("#signupButton");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";
    const message = document.getElementById("authMessage");

    if (!email || password.length < 6) {
      if (message) {
        message.textContent = "Enter an email and a password of at least 6 characters.";
        message.style.color = "#dc2626";
      }
      return;
    }

    const businessName = window.prompt("What's your business name?");
    if (businessName === null) return;
    if (!businessName.trim() || businessName.trim().length > 120) {
      if (message) {
        message.textContent = "Enter a business name between 1 and 120 characters.";
        message.style.color = "#dc2626";
      }
      return;
    }

    if (message) {
      message.textContent = "Creating your free 30-day trial...";
      message.style.color = "#2563eb";
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          jobpilot_trial_signup: true,
          jobpilot_business_name: businessName.trim()
        }
      }
    });

    if (error) {
      if (message) {
        message.textContent = error.message;
        message.style.color = "#dc2626";
      }
      return;
    }

    if (data.session?.user) {
      await ensureTrialCompany(data.session.user);
      if (window.__jobpilotTrialSignupError) {
        await supabase.auth.signOut();
        if (message) {
          message.textContent = window.__jobpilotTrialSignupError;
          message.style.color = "#dc2626";
        }
        return;
      }
    }

    if (message) {
      message.textContent = data.session
        ? "Your free 30-day trial is ready. Loading JobPilot..."
        : "Account created. Check your email to confirm your account, then sign in to start your free 30-day trial.";
      message.style.color = "#166534";
    }
  }, true);

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      void ensureTrialCompany(session.user);
    }
  });

  window.addEventListener("jobpilot:trial-ready", () => {
    const message = document.getElementById("authMessage");
    if (message) {
      message.textContent = "Your free 30-day trial is ready. Loading JobPilot...";
      message.style.color = "#166534";
    }
  });
})();
