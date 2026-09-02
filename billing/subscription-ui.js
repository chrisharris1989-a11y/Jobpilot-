import { supabase } from "../supabase.js";

(function () {
  let started = false;
  let rendering = false;
  let retryTimer = null;
  let retryCount = 0;

  function isSettings() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function getCompanyContext() {
    return window.JobPilotCompany || null;
  }

  function getCurrentSessionUserId() {
    return window.__jobpilotBillingUserId || null;
  }

  async function resolveCompany() {
    const context = getCompanyContext();
    if (context?.company) return context.company;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("companies")
      .select("id,name,plan,max_users,owner_id,billing_status")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      console.error("JobPilot company lookup:", error);
      return null;
    }

    return data || null;
  }

  function canManageBilling(company) {
    const context = getCompanyContext();
    const membership = context?.membership;
    if (membership?.status === "active" && ["owner", "admin"].includes(membership.role)) return true;
    return Boolean(company?.owner_id && company.owner_id === getCurrentSessionUserId());
  }

  function populateBillingSection(section) {
    if (!section) return;

    // A previous render can leave the card shell behind with its contents
    // missing. Always repair the contents before attempting to render data.
    if (!section.querySelector("#jobpilot-subscription-content")) {
      section.innerHTML = `
        <h2>Subscription</h2>
        <div id="jobpilot-subscription-content">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div>
              <strong>JobPilot plan</strong>
              <div id="jobpilot-plan-summary" style="font-size:13px;color:#64748b;margin-top:3px;">Loading plan...</div>
            </div>
            <div id="jobpilot-upgrade-actions" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
          </div>
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

  function renderFromCompany(panel, company) {
    const section = findBillingSection(panel);
    const content = section?.querySelector("#jobpilot-subscription-content");
    if (!content) return null;

    const planSummary = content.querySelector("#jobpilot-plan-summary");
    const actions = content.querySelector("#jobpilot-upgrade-actions");
    if (!planSummary || !actions) return null;

    const contextPlan = company?.plan || "solo";
    const contextMaxUsers = Number(company?.max_users) || (contextPlan === "solo" ? 1 : 10);
    planSummary.textContent = `${capitalize(contextPlan)} · Up to ${contextMaxUsers} user${contextMaxUsers === 1 ? "" : "s"}`;
    actions.innerHTML = "";

    const allowedPlans = {
      solo: ["team", "business", "pro"],
      team: ["business", "pro"],
      business: ["pro"],
      pro: []
    }[contextPlan] || [];

    if (canManageBilling(company) && allowedPlans.length) {
      const upgrade = button("Upgrade account", "button primary");
      upgrade.id = "jobpilot-upgrade-button";
      upgrade.addEventListener("click", () => showUpgradeOptions(actions, allowedPlans));
      actions.appendChild(upgrade);
    }

    return { company, contextPlan, contextMaxUsers };
  }

  async function render() {
    if (rendering || !isSettings()) return;

    const panel = document.querySelector(".settings-panel");
    if (!panel) return;

    rendering = true;
    try {
      const company = await resolveCompany();
      if (!company) {
        // Still create a usable visible card. Company data can be filled in
        // by a later retry without leaving an empty shell on screen.
        const section = findBillingSection(panel);
        const summary = section?.querySelector("#jobpilot-plan-summary");
        if (summary) summary.textContent = "Solo · Up to 1 user";
        scheduleRetry();
        return;
      }

      const rendered = renderFromCompany(panel, company);
      if (!rendered) return;
      retryCount = 0;

      try {
        const { data, error } = await supabase.rpc("get_my_company_entitlements");
        if (error || !data?.length) {
          console.error("JobPilot billing entitlement:", error);
          return;
        }

        const entitlement = data[0];
        const section = findBillingSection(panel);
        const planSummary = section?.querySelector("#jobpilot-plan-summary");
        const actions = section?.querySelector("#jobpilot-upgrade-actions");
        if (!planSummary || !actions) return;

        const actualPlan = entitlement.plan || rendered.contextPlan;
        const actualMaxUsers = Number(entitlement.max_users) || rendered.contextMaxUsers;
        planSummary.textContent = `${capitalize(actualPlan)} · Up to ${actualMaxUsers} user${actualMaxUsers === 1 ? "" : "s"}`;

        if (entitlement.subscription_status && ["active", "trialing", "past_due", "canceled"].includes(entitlement.subscription_status)) {
          if (!actions.querySelector("#jobpilot-manage-billing") && canManageBilling(company)) {
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

  function showUpgradeOptions(actions, allowedPlans) {
    if (actions.parentElement.querySelector("#jobpilot-upgrade-options")) return;

    const options = document.createElement("div");
    options.id = "jobpilot-upgrade-options";
    options.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;width:100%;margin-top:8px;";

    const labels = { team: "Upgrade to Team", business: "Upgrade to Business", pro: "Upgrade to Pro" };
    allowedPlans.forEach((plan) => {
      const option = button(labels[plan], "button");
      option.addEventListener("click", () => openBilling("checkout", plan));
      options.appendChild(option);
    });
    actions.parentElement.appendChild(options);
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

  function capitalize(value) {
    return String(value || "").replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
  }

  async function start() {
    if (started) return;
    started = true;

    const { data: { session } } = await supabase.auth.getSession();
    window.__jobpilotBillingUserId = session?.user?.id || null;

    const observer = new MutationObserver(() => render());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("jobpilot:company-ready", () => { retryCount = 0; render(); });
    window.addEventListener("jobpilot:settings-ready", () => { retryCount = 0; render(); });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
