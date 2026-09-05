import { supabase } from "../supabase.js";

(function () {
  let started = false;
  let rendering = false;
  let retryTimer = null;
  let retryCount = 0;

  const PLANS = {
    solo: { label: "Solo", users: 1, price: 4.99 },
    team: { label: "Team", users: 5, price: 14.99 },
    business: { label: "Business", users: 25, price: 59.99 },
    pro: { label: "Pro", users: 50, price: 99.99 }
  };

  function isSettings() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function getCompanyContext() {
    return window.JobPilotCompany || null;
  }

  async function resolveCompany() {
    const context = getCompanyContext();
    if (context?.company) return context.company;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("companies")
      .select("id,name,plan,max_users,owner_id,billing_status,test_mode")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      console.error("JobPilot company lookup:", error);
      return null;
    }

    return data || null;
  }

  function formatPrice(plan) {
    return `£${plan.price.toFixed(2)}/month`;
  }

  function populateBillingSection(section) {
    if (!section) return;
    if (!section.querySelector("#jobpilot-subscription-content")) {
      section.innerHTML = `
        <h2>Subscription</h2>
        <div id="jobpilot-subscription-content">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div>
              <strong>JobPilot plan</strong>
              <div id="jobpilot-plan-summary" style="font-size:13px;color:#64748b;margin-top:3px;">Loading plan...</div>
              <div id="jobpilot-plan-price" style="font-size:13px;color:#64748b;margin-top:2px;"></div>
            </div>
            <div id="jobpilot-upgrade-actions" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
          </div>
          <div id="jobpilot-test-badge" style="display:none;margin-top:10px;"></div>
          <div id="jobpilot-upgrade-options" style="display:none;margin-top:12px;"></div>
          <div id="jobpilot-upgrade-message" style="margin-top:10px;font-size:13px;"></div>
        </div>
      `;
    }
  }

  function findBillingSection(panel) {
    let section = panel.querySelector("#jobpilot-subscription-section");
    if (!section) {
      section = document.createElement("section");
      section.id = "jobpilot-subscription-section";
      section.className = "settings-section";
      const businessHeading = Array.from(panel.querySelectorAll("h2"))
        .find((heading) => heading.textContent.trim() === "Business Details");
      const businessSection = businessHeading?.closest(".settings-section");
      if (businessSection && businessSection.parentElement === panel) panel.insertBefore(section, businessSection);
      else if (businessHeading && businessHeading.parentElement === panel) panel.insertBefore(section, businessHeading);
      else panel.appendChild(section);
    }
    populateBillingSection(section);
    return section;
  }

  function addUpgradeButton(actions, allowedPlans, isTest) {
    if (!actions || !allowedPlans.length || actions.querySelector("#jobpilot-upgrade-button")) return;
    const upgrade = button(isTest ? "Change test plan" : "Upgrade account", "button primary");
    upgrade.id = "jobpilot-upgrade-button";
    upgrade.addEventListener("click", () => showUpgradeOptions(actions, allowedPlans, isTest));
    actions.appendChild(upgrade);
  }

  function renderFromCompany(panel, company) {
    const section = findBillingSection(panel);
    const content = section?.querySelector("#jobpilot-subscription-content");
    if (!content) return null;
    const planSummary = content.querySelector("#jobpilot-plan-summary");
    const planPrice = content.querySelector("#jobpilot-plan-price");
    const actions = content.querySelector("#jobpilot-upgrade-actions");
    const badge = content.querySelector("#jobpilot-test-badge");
    if (!planSummary || !planPrice || !actions) return null;

    const contextPlan = String(company?.plan || "solo").toLowerCase();
    const plan = PLANS[contextPlan] || PLANS.solo;
    const isTest = company?.test_mode === true;
    planSummary.textContent = `${plan.label} · Up to ${plan.users} user${plan.users === 1 ? "" : "s"}`;
    planPrice.textContent = formatPrice(plan);
    actions.innerHTML = "";

    if (badge) {
      badge.style.display = isTest ? "inline-block" : "none";
      if (isTest) badge.innerHTML = '<span style="display:inline-block;padding:4px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;">TEST</span>';
    }

    const allowedPlans = isTest
      ? Object.keys(PLANS).filter(name => name !== contextPlan)
      : ({
          solo: ["team", "business", "pro"],
          team: ["business", "pro"],
          business: ["pro"],
          pro: []
        }[contextPlan] || []);
    addUpgradeButton(actions, allowedPlans, isTest);
    return { company, contextPlan, plan, isTest };
  }

  async function render() {
    if (rendering || !isSettings()) return;
    const panel = document.querySelector(".settings-panel");
    if (!panel) return;
    rendering = true;
    try {
      const company = await resolveCompany();
      if (!company) {
        const section = findBillingSection(panel);
        const summary = section?.querySelector("#jobpilot-plan-summary");
        const price = section?.querySelector("#jobpilot-plan-price");
        const actions = section?.querySelector("#jobpilot-upgrade-actions");
        if (summary) summary.textContent = "Solo · Up to 1 user";
        if (price) price.textContent = formatPrice(PLANS.solo);
        addUpgradeButton(actions, ["team", "business", "pro"], false);
        scheduleRetry();
        return;
      }

      const rendered = renderFromCompany(panel, company);
      if (!rendered) return;
      retryCount = 0;

      if (rendered.isTest) return;

      try {
        const { data, error } = await supabase.rpc("get_my_company_entitlements");
        if (error || !data?.length) {
          console.error("JobPilot billing entitlement:", error);
          return;
        }
        const entitlement = data[0];
        const section = findBillingSection(panel);
        const planSummary = section?.querySelector("#jobpilot-plan-summary");
        const planPrice = section?.querySelector("#jobpilot-plan-price");
        const actions = section?.querySelector("#jobpilot-upgrade-actions");
        if (!planSummary || !planPrice || !actions) return;

        const actualPlan = String(entitlement.plan || rendered.contextPlan).toLowerCase();
        const actualPlanDetails = PLANS[actualPlan] || rendered.plan;
        planSummary.textContent = `${actualPlanDetails.label} · Up to ${actualPlanDetails.users} user${actualPlanDetails.users === 1 ? "" : "s"}`;
        planPrice.textContent = formatPrice(actualPlanDetails);

        const allowedPlans = {
          solo: ["team", "business", "pro"],
          team: ["business", "pro"],
          business: ["pro"],
          pro: []
        }[actualPlan] || [];
        addUpgradeButton(actions, allowedPlans, false);

        if (entitlement.subscription_status && ["active", "trialing", "past_due", "canceled"].includes(entitlement.subscription_status)) {
          if (!actions.querySelector("#jobpilot-manage-billing")) {
            const manage = button("Manage billing", "button");
            manage.id = "jobpilot-manage-billing";
            manage.addEventListener("click", () => openBilling("portal"));
            actions.insertBefore(manage, actions.firstChild);
          }
        }

        if (entitlement.cancel_at_period_end && entitlement.current_period_end) {
          const message = section.querySelector("#jobpilot-upgrade-message");
          message.textContent = `Your subscription is scheduled to end on ${new Date(entitlement.current_period_end).toLocaleDateString()}.`;
          message.style.color = "#92400e";
        }
      } catch (error) {
        console.error("JobPilot billing entitlement:", error);
      }
    } finally {
      rendering = false;
    }
  }

  function scheduleRetry() {
    if (retryTimer || retryCount >= 40) return;
    retryCount += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      render();
    }, 250);
  }

  function showUpgradeOptions(actions, allowedPlans, isTest) {
    const content = actions?.closest("#jobpilot-subscription-content");
    const existing = content?.querySelector("#jobpilot-upgrade-options");
    if (!existing) return;

    existing.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;width:100%;margin-top:12px;";
    existing.innerHTML = "";

    const labels = { team: "Team", business: "Business", pro: "Pro", solo: "Solo" };
    allowedPlans.forEach((planName) => {
      const plan = PLANS[planName];
      const option = button(`${labels[planName]} · ${formatPrice(plan)}`, "button");
      option.addEventListener("click", async () => {
        if (isTest) {
          const message = content.querySelector("#jobpilot-upgrade-message");
          if (message) {
            message.textContent = "Switching test plan...";
            message.style.color = "#64748b";
          }
          const { data, error } = await supabase.rpc("set_test_company_plan", { target_plan: planName });
          if (error) {
            console.error("JobPilot test billing error:", error);
            if (message) {
              message.textContent = error.message || "Could not change test plan.";
              message.style.color = "#b91c1c";
            }
            return;
          }
          if (message) {
            message.textContent = `Test plan changed to ${plan.label}. No Stripe payment was made.`;
            message.style.color = "#166534";
          }
          retryCount = 0;
          render();
          return;
        }
        openBilling("checkout", planName);
      });
      existing.appendChild(option);
    });
  }

  async function openBilling(action, plan) {
    const section = document.getElementById("jobpilot-subscription-section");
    const message = section?.querySelector("#jobpilot-upgrade-message");
    if (message) {
      message.textContent = "Opening Stripe billing...";
      message.style.color = "#64748b";
    }
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("You are not logged in.");
      const response = await fetch("https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-billing-v1", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, plan, origin: window.location.origin })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open Stripe billing.");
      if (!result.url) throw new Error("Stripe did not return a billing URL.");
      window.location.assign(result.url);
    } catch (error) {
      console.error("JobPilot billing error:", error);
      if (message) {
        message.textContent = error.message || String(error);
        message.style.color = "#b91c1c";
      }
    }
  }

  function button(text, className) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = text;
    return element;
  }

  async function start() {
    if (started) return;
    started = true;
    const { data: { session } } = await supabase.auth.getSession();
    window.__jobpilotBillingUserId = session?.user?.id || null;

    const observer = new MutationObserver((mutations) => {
      const billingSection = document.getElementById("jobpilot-subscription-section");
      const relevantMutation = mutations.some((mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return target && !billingSection?.contains(target);
      });
      if (relevantMutation) render();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("jobpilot:company-ready", () => { retryCount = 0; render(); });
    window.addEventListener("jobpilot:settings-ready", () => { retryCount = 0; render(); });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
