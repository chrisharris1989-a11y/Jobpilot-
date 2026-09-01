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
    section.innerHTML = "<h2>Subscription</h2><div id=\"jobpilot-subscription-content\"></div>";

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
    try {
      const { data, error } = await supabase.rpc("get_my_company_entitlements");
      if (error || !data?.length) {
        console.error("JobPilot billing:", error);
        section.remove();
        return;
      }

      const entitlement = data[0];
      content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <strong>JobPilot plan</strong>
            <div style="font-size:13px;color:#64748b;margin-top:3px;">
              ${escapeHtml(capitalize(entitlement.plan))} · Up to ${Number(entitlement.max_users) || 1} user${Number(entitlement.max_users) === 1 ? "" : "s"}
            </div>
          </div>
          <div id="jobpilot-upgrade-actions" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>
        <div id="jobpilot-upgrade-message" style="margin-top:10px;font-size:13px;"></div>
      `;

      const actions = content.querySelector("#jobpilot-upgrade-actions");

      if (entitlement.subscription_status && ["active", "trialing", "past_due", "canceled"].includes(entitlement.subscription_status)) {
        const manage = button("Manage billing", "button");
        manage.addEventListener("click", () => openBilling("portal"));
        actions.appendChild(manage);
      }

      let upgradePlans = [];
      if (entitlement.plan === "solo" || !entitlement.entitled) upgradePlans = ["team", "business", "pro"];
      if (entitlement.plan === "team" && entitlement.entitled) upgradePlans = ["business", "pro"];
      if (entitlement.plan === "business" && entitlement.entitled) upgradePlans = ["pro"];

      if (upgradePlans.length) {
        const upgrade = button("Upgrade account", "button primary");
        upgrade.addEventListener("click", () => showUpgradeOptions(actions, upgradePlans));
        actions.appendChild(upgrade);
      }

      if (entitlement.cancel_at_period_end && entitlement.current_period_end) {
        const message = content.querySelector("#jobpilot-upgrade-message");
        message.textContent = `Your subscription is scheduled to end on ${new Date(entitlement.current_period_end).toLocaleDateString()}.`;
        message.style.color = "#92400e";
      }

      content.dataset.loaded = "true";
    } finally {
      rendering = false;
    }
  }

  function showUpgradeOptions(actions, allowedPlans) {
    if (actions.querySelector("#jobpilot-upgrade-options")) return;

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

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
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
