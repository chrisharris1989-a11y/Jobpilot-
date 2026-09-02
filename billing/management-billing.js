import { supabase } from "../supabase.js";

(function () {
  const PLANS = {
    solo: { label: "Solo", users: 1, price: 14.99 },
    team: { label: "Team", users: 10, price: 39.99 },
    business: { label: "Business", users: 25, price: 74.99 },
    pro: { label: "Pro", users: 50, price: 119.99 }
  };

  const allowedPlans = {
    solo: ["team", "business", "pro"],
    team: ["business", "pro"],
    business: ["pro"],
    pro: []
  };

  function isBillingPage() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Billing";
  }

  function setHeader() {
    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");
    if (title) title.textContent = "Billing";
    if (subtitle) subtitle.textContent = "Manage your JobPilot subscription.";
  }

  function button(text, className = "button") {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = text;
    return el;
  }

  async function resolveCompany() {
    const context = window.JobPilotCompany || null;
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
      console.error("JobPilot billing company lookup:", error);
      return null;
    }
    return data || null;
  }

  function formatPrice(plan) {
    return `£${plan.price.toFixed(2)}/month`;
  }

  async function openBilling(action, plan, message) {
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

  async function renderManagementBillingPage() {
    if (!isBillingPage()) return;
    const content = document.getElementById("pageContent");
    if (!content) return;

    setHeader();
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.getElementById("jobpilot-management-button")?.classList.add("active");

    content.innerHTML = `
      <div class="page-actions">
        <div>
          <h2>💳 Billing</h2>
          <p>Manage your JobPilot subscription.</p>
        </div>
        <button id="jobpilot-billing-back" class="button secondary" type="button">← Back to Management</button>
      </div>
      <div class="content-grid">
        <div class="panel" id="jobpilot-management-billing-card">
          <div class="panel-header">
            <div>
              <h2>Current Plan</h2>
              <p id="jobpilot-management-plan-summary">Loading plan...</p>
            </div>
            <div id="jobpilot-management-plan-price"></div>
          </div>
          <div id="jobpilot-management-billing-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;"></div>
          <div id="jobpilot-management-upgrade-options" style="display:none;gap:8px;flex-wrap:wrap;margin-top:12px;"></div>
          <div id="jobpilot-management-billing-message" style="margin-top:12px;font-size:13px;"></div>
        </div>
      </div>`;

    document.getElementById("jobpilot-billing-back")?.addEventListener("click", () => {
      if (typeof window.renderSafeManagementLanding === "function") window.renderSafeManagementLanding();
      else if (typeof window.renderManagementPage === "function") window.renderManagementPage();
    });

    const summary = document.getElementById("jobpilot-management-plan-summary");
    const price = document.getElementById("jobpilot-management-plan-price");
    const actions = document.getElementById("jobpilot-management-billing-actions");
    const options = document.getElementById("jobpilot-management-upgrade-options");
    const message = document.getElementById("jobpilot-management-billing-message");

    const company = await resolveCompany();
    const contextPlan = String(company?.plan || "solo").toLowerCase();
    const fallback = PLANS[contextPlan] || PLANS.solo;

    function paint(planName, entitlement = null) {
      const details = PLANS[planName] || fallback;
      summary.textContent = `${details.label} · Up to ${details.users} user${details.users === 1 ? "" : "s"}`;
      price.textContent = formatPrice(details);
      actions.innerHTML = "";
      options.innerHTML = "";
      options.style.display = "none";

      if ((allowedPlans[planName] || []).length) {
        const upgrade = button("Upgrade account", "button primary");
        upgrade.addEventListener("click", () => {
          options.style.display = "flex";
          (allowedPlans[planName] || []).forEach(name => {
            const option = button(`${PLANS[name].label} · ${formatPrice(PLANS[name])}`, "button");
            option.addEventListener("click", () => openBilling("checkout", name, message));
            options.appendChild(option);
          });
        });
        actions.appendChild(upgrade);
      }

      const status = String(entitlement?.subscription_status || "").toLowerCase();
      if (["active", "trialing", "past_due", "canceled"].includes(status)) {
        const manage = button("Manage billing", "button");
        manage.addEventListener("click", () => openBilling("portal", null, message));
        actions.insertBefore(manage, actions.firstChild);
      }

      if (entitlement?.cancel_at_period_end && entitlement?.current_period_end) {
        message.textContent = `Your subscription is scheduled to end on ${new Date(entitlement.current_period_end).toLocaleDateString()}.`;
        message.style.color = "#92400e";
      }
    }

    paint(contextPlan);

    try {
      const { data, error } = await supabase.rpc("get_my_company_entitlements");
      if (!error && data?.length) {
        const entitlement = data[0];
        const actualPlan = String(entitlement.plan || contextPlan).toLowerCase();
        paint(actualPlan, entitlement);
      }
    } catch (error) {
      console.error("JobPilot billing entitlement:", error);
    }
  }

  window.renderManagementBillingPage = renderManagementBillingPage;
})();
