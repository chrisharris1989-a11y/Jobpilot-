import { supabase } from "./supabase.js";

(function () {
  let processingUserId = null;

  const PLANS = {
    solo: { label: "Solo", price: "£7.49/month", users: "1 user" },
    team: { label: "Team", price: "£24.99/month", users: "Up to 5 users" },
    business: { label: "Business", price: "£59.99/month", users: "Up to 10 users" },
    pro: { label: "Pro", price: "£99.99/month", users: "Up to 15 users" }
  };

  function showPlanSelector() {
    return new Promise((resolve) => {
      const existing = document.getElementById("jobpilotPlanSelector");
      if (existing) existing.remove();

      const overlay = document.createElement("div");
      overlay.id = "jobpilotPlanSelector";
      overlay.innerHTML = `
        <div class="jobpilot-plan-backdrop"></div>
        <div class="jobpilot-plan-modal" role="dialog" aria-modal="true" aria-labelledby="jobpilotPlanTitle">
          <button type="button" class="jobpilot-plan-close" aria-label="Close">&times;</button>
          <div class="jobpilot-plan-header">
            <h2 id="jobpilotPlanTitle">Choose your JobPilot plan</h2>
            <p>Your first 7 days are free. Choose the plan that best fits your business.</p>
          </div>
          <div class="jobpilot-plan-grid">
            ${Object.entries(PLANS).map(([id, plan]) => `
              <button type="button" class="jobpilot-plan-card" data-plan="${id}">
                <span class="jobpilot-plan-name">${plan.label}</span>
                <strong>${plan.price}</strong>
                <span>${plan.users}</span>
              </button>
            `).join("")}
          </div>
          <p class="jobpilot-plan-note">You won't be charged during the 7-day trial.</p>
        </div>
      `;

      const style = document.createElement("style");
      style.id = "jobpilotPlanSelectorStyles";
      style.textContent = `
        #jobpilotPlanSelector { position: fixed; inset: 0; z-index: 100000; display: grid; place-items: center; padding: 20px; }
        .jobpilot-plan-backdrop { position: absolute; inset: 0; background: rgba(15, 23, 42, .58); }
        .jobpilot-plan-modal { position: relative; width: min(720px, 100%); max-height: calc(100vh - 40px); overflow: auto; background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 24px 70px rgba(0,0,0,.25); font-family: inherit; }
        .jobpilot-plan-close { position: absolute; top: 10px; right: 14px; border: 0; background: transparent; font-size: 30px; line-height: 1; cursor: pointer; color: #64748b; }
        .jobpilot-plan-header { padding-right: 28px; margin-bottom: 22px; }
        .jobpilot-plan-header h2 { margin: 0 0 7px; font-size: 24px; color: #0f172a; }
        .jobpilot-plan-header p { margin: 0; color: #64748b; font-size: 14px; }
        .jobpilot-plan-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .jobpilot-plan-card { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; text-align: left; border: 1px solid #dbe2ea; border-radius: 12px; background: #fff; padding: 17px; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
        .jobpilot-plan-card:hover { border-color: #2563eb; box-shadow: 0 8px 24px rgba(37,99,235,.12); transform: translateY(-1px); }
        .jobpilot-plan-name { font-size: 16px; font-weight: 700; color: #0f172a; }
        .jobpilot-plan-card strong { font-size: 18px; color: #2563eb; }
        .jobpilot-plan-card span:last-child { font-size: 13px; color: #64748b; }
        .jobpilot-plan-note { margin: 18px 0 0; text-align: center; color: #64748b; font-size: 13px; }
        @media (max-width: 560px) { .jobpilot-plan-grid { grid-template-columns: 1fr; } .jobpilot-plan-modal { padding: 22px; } }
      `;
      document.head.appendChild(style);
      document.body.appendChild(overlay);

      const finish = (plan) => {
        overlay.remove();
        resolve(plan || null);
      };

      overlay.querySelectorAll("[data-plan]").forEach((button) => {
        button.addEventListener("click", () => finish(button.dataset.plan));
      });
      overlay.querySelector(".jobpilot-plan-close")?.addEventListener("click", () => finish(null));
      overlay.querySelector(".jobpilot-plan-backdrop")?.addEventListener("click", () => finish(null));
    });
  }

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
      const selectedPlan = String(user.user_metadata?.jobpilot_plan || "").trim().toLowerCase();
      if (!businessName) {
        console.error("JobPilot trial: missing business name.");
        return;
      }
      if (!PLANS[selectedPlan]) {
        console.error("JobPilot trial: missing or invalid plan.");
        return;
      }

      const { error } = await supabase.rpc("create_my_company", {
        requested_plan: selectedPlan,
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

    const selectedPlan = await showPlanSelector();
    if (!selectedPlan) return;

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
      message.textContent = `Creating your ${PLANS[selectedPlan].label} free 7-day trial...`;
      message.style.color = "#2563eb";
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          jobpilot_trial_signup: true,
          jobpilot_business_name: businessName.trim(),
          jobpilot_plan: selectedPlan
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
        ? `Your ${PLANS[selectedPlan].label} 7-day trial is ready. Loading JobPilot...`
        : `Account created. Please check your email (including your junk/spam folder) to confirm your account, then sign in to start your ${PLANS[selectedPlan].label} 7-day trial.`;
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
      message.textContent = "Your free 7-day trial is ready. Loading JobPilot...";
      message.style.color = "#166534";
    }
  });
})();
