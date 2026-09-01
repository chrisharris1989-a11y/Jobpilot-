import { supabase } from "../supabase.js";
import { getCompanyContext } from "../company-context.js";

(function () {
  let started = false;
  let rendering = false;

  function isSettings() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function manager() {
    const { membership } = getCompanyContext();
    return membership?.status === "active" && ["owner", "admin"].includes(membership.role);
  }

  function findBillingSection(panel) {
    const existing = panel.querySelector("#jobpilot-subscription-section");
    if (existing) return existing;

    const section = document.createElement("section");
    section.id = "jobpilot-subscription-section";
    section.className = "settings-section";
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

    const businessHeading = Array.from(panel.querySelectorAll("h2"))
      .find((heading) => heading.textContent.trim() === "Business Details");
    const businessSection = businessHeading?.closest(".settings-section");

    if (businessSection && businessSection.parentElement === panel) {
      panel.insertBefore(section, businessSection);
    } else if (businessHeading && businessHeading.parentElement === panel) {
      panel.insertBefore(section, businessHeading);
    } else {
      panel.appendChild(section);
    }

    return section;
  }

  async function render() {
    if (rendering || !isSettings() || !manager()) return;

    const panel = document.querySelector(".settings-panel");
    if (!panel) return;

    const section = findBillingSection(panel);
    const content = section?.querySelector("#jobpilot-subscription-content");
    if (!content || content.dataset.loaded === "true") return;

    rendering = true;

    const { company } = getCompanyContext();
    const contextPlan = company?.plan || "solo";
    const contextMaxUsers = Number(company?.max_users) || (contextPlan === "solo" ? 1 : 10);
    const planSummary = content.querySelector("#jobpilot-plan-summary");
    const actions = content.querySelector("#jobpilot-upgrade-actions");

    // Render the visible plan and upgrade action from the already-loaded
    // company context first. The card must never depend on the billing RPC
    // before showing useful UI.
    planSummary.textContent = `${capitalize(contextPlan)} · Up to ${contextMaxUsers} user${contextMaxUsers === 1 ? "" : "s"}`;

    let upgradePlans = [];
    if (contextPlan === "solo") upgradePlans = ["team", "business", "pro"];
    if (contextPlan === "team") upgradePlans = ["business", "pro"];
    if (contextPlan === "business") upgradePlans = ["pro"];

    if (upgradePlans.length && !actions.querySelector("#jobpilot-upgrade-button")) {
      const upgrade = button("Upgrade account", "button primary");
      upgrade.id = "jobpilot-upgrade-button";
      upgrade.addEventListener("click", () => showUpgradeOptions(actions, upgradePlans));
      actions.appendChild(upgrade);
    }

    content.dataset.loaded = "true";
    rendering = false;

    // Billing status is supplementary. If the RPC is unavailable, keep the
    // plan and Upgrade account UI visible rather than leaving a blank card.
    try {
      const { data, error } = await supabase.rpc("get_my_company_entitlements");
      if (error || !data?.length) {
        console.error("JobPilot billing entitlement:", error);
        return;
      }

      const entitlement = data[0];
      const actualPlan = entitlement.plan || contextPlan;
      const actualMaxUsers = Number(entitlement.max_users) || contextMaxUsers;
      planSummary.textContent = `${capitalize(actualPlan)} · Up to ${actualMaxUsers} user${actualMaxUsers === 1 ? "" : "s"}`;

      if (entitlement.subscription_status && ["active", "trialing", "past_due", "canceled"].includes(entitlement.subscription_status)) {
        const manage = button("Manage billing", "button");
        manage.addEventListener("click", () => openBilling("portal"));
        actions.insertBefore(manage, actions.firstChild);
      }

      if (entitlement.cancel_at_period_end && entitlement.current_period_end) {
        const message = content.querySelector("#jobpilot-upgrade-message");
        message.textContent = `Your subscription is scheduled to end on ${new Date(entitlement.current_period_end).toLocaleDateString()}.`;
        message.style.color = "#92400e";
      }
    } catch (error) {
      console.error("JobPilot billing entitlement:", error);
    }
  }

  function showUpgradeOptions(actions, allowedPlans) {
    if (actions.parentElement.querySelector("#jobpilot-upgrade-options")) return;

    const options = document.createElement("div");
    options.id = "jobpilot-upgrade-options";
    options.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;width:100%;margin-top:8px;";

    const labels = {
      team: "Upgrade to Team",
      business: "Upgrade to Business",
      pro: "Upgrade to Pro"
    };

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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
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

  function start() {
    if (started) return;
    started = true;
    const observer = new MutationObserver(() => render());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("jobpilot:company-ready", render);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
