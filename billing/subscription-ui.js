import { supabase } from "../supabase.js";
import { getCompanyContext } from "../company-context.js";

(function () {
  let started = false;

  function isSettings() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function manager() {
    const { membership } = getCompanyContext();
    return membership?.status === "active" && ["owner", "admin"].includes(membership.role);
  }

  async function render() {
    if (!isSettings() || !manager()) return;
    const panel = document.querySelector(".settings-panel");
    if (!panel || panel.querySelector("#jobpilot-billing-section")) return;

    const { data, error } = await supabase.rpc("get_my_company_entitlements");
    if (error || !data?.length) {
      console.error("JobPilot billing:", error);
      return;
    }

    const entitlement = data[0];
    const section = document.createElement("section");
    section.id = "jobpilot-billing-section";
    section.className = "settings-section";
    section.innerHTML = `
      <h2>Subscription</h2>
      <p style="color:#64748b;margin-top:0;">Your JobPilot plan and company billing.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0;">
        <div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;"><strong>${escapeHtml(capitalize(entitlement.plan))}</strong><div style="font-size:12px;color:#64748b;">Plan</div></div>
        <div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;"><strong>${entitlement.max_users}</strong><div style="font-size:12px;color:#64748b;">Maximum users</div></div>
        <div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;"><strong>${escapeHtml(capitalize(entitlement.subscription_status || "none"))}</strong><div style="font-size:12px;color:#64748b;">Billing status</div></div>
      </div>
      <div id="jobpilot-billing-message" style="margin:12px 0;"></div>
      <div id="jobpilot-billing-actions" style="display:flex;gap:10px;flex-wrap:wrap;"></div>
    `;
    panel.appendChild(section);

    const actions = section.querySelector("#jobpilot-billing-actions");
    if (entitlement.subscription_status && ["active", "trialing", "past_due", "canceled"].includes(entitlement.subscription_status)) {
      const manage = button("Manage billing", "button primary");
      manage.addEventListener("click", () => openBilling("portal"));
      actions.appendChild(manage);
    }

    if (entitlement.plan === "solo" || !entitlement.entitled) {
      [
        ["team", "Choose Team"],
        ["business", "Choose Business"],
        ["pro", "Choose Pro"],
      ].forEach(([plan, label]) => {
        const upgrade = button(label, "button");
        upgrade.addEventListener("click", () => openBilling("checkout", plan));
        actions.appendChild(upgrade);
      });
    }

    if (entitlement.cancel_at_period_end && entitlement.current_period_end) {
      const message = section.querySelector("#jobpilot-billing-message");
      message.textContent = `Your subscription is scheduled to end on ${new Date(entitlement.current_period_end).toLocaleDateString()}.`;
      message.style.color = "#92400e";
    }
  }

  async function openBilling(action, plan) {
    const section = document.getElementById("jobpilot-billing-section");
    const message = section?.querySelector("#jobpilot-billing-message");
    if (message) { message.textContent = "Opening Stripe billing..."; message.style.color = "#64748b"; }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("You are not logged in.");

      const response = await fetch("https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-billing-v1", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, plan, origin: window.location.origin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open Stripe billing.");
      if (!result.url) throw new Error("Stripe did not return a billing URL.");
      window.location.assign(result.url);
    } catch (error) {
      console.error("JobPilot billing error:", error);
      if (message) { message.textContent = error.message || String(error); message.style.color = "#b91c1c"; }
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
    new MutationObserver(() => render()).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("jobpilot:company-ready", render);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
