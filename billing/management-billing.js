import { supabase } from "../supabase.js";

(function () {
  const PLANS = {
    solo: { label: "Solo", users: 1, price: 7.49 },
    team: { label: "Team", users: 5, price: 24.99 },
    business: { label: "Business", users: 10, price: 59.99 },
    pro: { label: "Pro", users: 15, price: 99.99 }
  };

  const allowedPlans = {
    solo: ["team", "business", "pro"],
    team: ["solo", "business", "pro"],
    business: ["solo", "team", "pro"],
    pro: ["solo", "team", "business"]
  };

  const SMS_AUTOMATIONS = [
    { key: "quote_follow_up", label: "Quote follow up", description: "Send an SMS follow up for a quote." },
    { key: "appointment_confirmed", label: "Appointment confirmed", description: "Send an SMS when an appointment is confirmed." },
    { key: "appointment_reminder", label: "Appointment reminder", description: "Send an SMS reminder before an upcoming appointment." },
    { key: "appointment_rescheduled", label: "Appointment rescheduled", description: "Send an SMS when an appointment is rescheduled." },
    { key: "invoice_overdue", label: "Invoice overdue", description: "Send an SMS when an invoice becomes overdue." }
  ];

  const SMS_DEFAULT_CONFIG = {
    quote_follow_up: { value: 3, unit: "days", message: "Hi {customer_name}, just following up on the quote we sent you. Please let us know if you have any questions." },
    appointment_confirmed: { value: 0, unit: "minutes", message: "Hi {customer_name}, your appointment has been confirmed for {appointment_date} at {appointment_time}." },
    appointment_reminder: { value: 24, unit: "hours", message: "Hi {customer_name}, this is a reminder that your appointment is on {appointment_date} at {appointment_time}." },
    appointment_rescheduled: { value: 0, unit: "minutes", message: "Hi {customer_name}, your appointment has been rescheduled to {appointment_date} at {appointment_time}." },
    invoice_overdue: { value: 7, unit: "days overdue", message: "Hi {customer_name}, invoice {invoice_number} is now overdue. Please let us know if you have any questions." }
  };

  function isBillingPage() { return document.getElementById("pageTitle")?.textContent.trim() === "Billing"; }
  function setHeader() {
    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");
    if (title) title.textContent = "Billing";
    if (subtitle) subtitle.textContent = "Manage your JobPilot subscription.";
  }
  function button(text, className = "button") {
    const el = document.createElement("button");
    el.type = "button"; el.className = className; el.textContent = text; return el;
  }
  async function resolveCompany() {
    const context = window.JobPilotCompany || null;
    if (context?.company) return context.company;
    const { data: { session } = {} } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    const { data, error } = await supabase.from("companies").select("id,name,plan,max_users,owner_id,billing_status,test_mode,sms_automation_enabled,sms_automation_settings").eq("owner_id", userId).maybeSingle();
    if (error) { console.error("JobPilot billing company lookup:", error); return null; }
    return data || null;
  }
  function formatPrice(plan) { return `£${plan.price.toFixed(2)}/month`; }
  async function switchTestPlan(plan, message) {
    if (message) { message.textContent = "Switching test plan..."; message.style.color = "#64748b"; }
    try {
      const { data, error } = await supabase.rpc("set_test_company_plan", { target_plan: plan });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (message) { message.textContent = `Test plan changed to ${PLANS[plan].label}. No Stripe payment was made.`; message.style.color = "#166534"; }
      return result;
    } catch (error) {
      console.error("JobPilot test billing error:", error);
      if (message) { message.textContent = error.message || "Could not change test plan."; message.style.color = "#b91c1c"; }
      return null;
    }
  }
  async function openBilling(action, plan, message) {
    if (message) { message.textContent = action === "portal" ? "Opening Stripe billing portal..." : "Opening Stripe secure checkout..."; message.style.color = "#64748b"; }
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("You are not logged in.");
      if (!["checkout", "change_plan", "portal"].includes(action)) throw new Error("Billing management is not available yet.");
      const response = await fetch("https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-billing-v1", {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, plan, origin: window.location.origin })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open Stripe billing.");
      if (!result.url && !result.changed) throw new Error("Stripe did not return a billing result.");
      if (result.url) window.location.assign(result.url); else if (result.changed) window.location.reload();
    } catch (error) {
      console.error("JobPilot billing error:", error);
      if (message) { message.textContent = error.message || String(error); message.style.color = "#b91c1c"; }
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
        <div><h2>💳 Billing</h2><p>Manage your JobPilot subscription.</p></div>
        <button id="jobpilot-billing-back" class="button secondary" type="button">← Back to Management</button>
      </div>
      <div class="content-grid">
        <div class="panel" id="jobpilot-management-billing-card">
          <div class="panel-header"><div><h2>Current Plan</h2><p id="jobpilot-management-plan-summary">Loading plan...</p></div><div id="jobpilot-management-plan-price"></div></div>
          <div id="jobpilot-management-test-badge" style="display:none;margin-top:10px;"></div>
          <div id="jobpilot-management-billing-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;"></div>
          <div id="jobpilot-management-upgrade-options" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;"></div>
          <div id="jobpilot-management-billing-message" style="margin-top:12px;font-size:13px;"></div>
        </div>
        <div class="panel" id="jobpilot-management-sms-settings-card">
          <div class="panel-header"><div><h2>SMS Settings</h2><p>Control automatic SMS while keeping manual SMS available.</p></div></div>
          <div style="margin-top:12px;padding:12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
              <div><div style="font-weight:600;">Auto SMS</div><div id="jobpilot-auto-sms-description" style="margin-top:4px;font-size:13px;color:#64748b;">Automatically send SMS when your configured automations are triggered.</div></div>
              <label style="position:relative;display:inline-flex;align-items:center;cursor:pointer;flex:0 0 auto;"><input id="jobpilot-auto-sms-toggle" type="checkbox" style="position:absolute;opacity:0;width:1px;height:1px;pointer-events:none;"><span id="jobpilot-auto-sms-track" style="display:block;width:46px;height:26px;border-radius:999px;background:#cbd5e1;transition:background .2s;position:relative;"><span id="jobpilot-auto-sms-knob" style="position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s;"></span></span></label>
            </div>
          </div>
          <div id="jobpilot-auto-sms-options" style="display:none;margin-top:12px;padding:14px;border-radius:8px;background:#fff;border:1px solid #e2e8f0;">
            <div style="font-weight:600;">Choose automated messages</div><div style="margin-top:4px;font-size:13px;color:#64748b;">Select which messages JobPilot is allowed to send automatically.</div>
            <div id="jobpilot-auto-sms-checklist" style="margin-top:12px;display:grid;gap:8px;"></div><div id="jobpilot-auto-sms-save-message" style="margin-top:10px;font-size:13px;color:#64748b;"></div>
          </div>
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;"><button id="jobpilot-sms-settings-button" class="button secondary" type="button">SMS Settings</button></div>
          <div id="jobpilot-sms-settings-message" style="margin-top:10px;font-size:13px;"></div>
          <div id="jobpilot-sms-provider-card" class="panel" style="display:none;margin-top:12px;">
            <div class="panel-header"><div><h2>SMS Settings</h2><p>Configure when automated messages are sent and what they say.</p></div></div>
            <div id="jobpilot-sms-config-list" style="margin-top:16px;display:grid;gap:16px;"></div>
            <div style="margin-top:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><button id="jobpilot-sms-config-save" class="button" type="button">Save SMS Settings</button><div id="jobpilot-sms-config-message" style="font-size:13px;color:#64748b;"></div></div>
          </div>
        </div>
      </div>`;

    document.getElementById("jobpilot-billing-back")?.addEventListener("click", () => {
      if (typeof window.renderSafeManagementLanding === "function") window.renderSafeManagementLanding();
      else if (typeof window.renderManagementPage === "function") window.renderManagementPage();
    });
    const company = await resolveCompany();
    const autoSmsToggle = document.getElementById("jobpilot-auto-sms-toggle");
    const autoSmsTrack = document.getElementById("jobpilot-auto-sms-track");
    const autoSmsKnob = document.getElementById("jobpilot-auto-sms-knob");
    const autoSmsDescription = document.getElementById("jobpilot-auto-sms-description");
    const autoSmsOptions = document.getElementById("jobpilot-auto-sms-options");
    const autoSmsChecklist = document.getElementById("jobpilot-auto-sms-checklist");
    const autoSmsSaveMessage = document.getElementById("jobpilot-auto-sms-save-message");
    const autoSmsEnabled = company?.sms_automation_enabled === true;
    let automationSettings = (company?.sms_automation_settings && typeof company.sms_automation_settings === "object") ? { ...company.sms_automation_settings } : {};
    let smsConfig = {};
    Object.keys(SMS_DEFAULT_CONFIG).forEach(key => { smsConfig[key] = { ...SMS_DEFAULT_CONFIG[key], ...(automationSettings.config?.[key] || {}) }; });

    function paintAutoSms(enabled) {
      if (autoSmsToggle) autoSmsToggle.checked = enabled;
      if (autoSmsTrack) autoSmsTrack.style.background = enabled ? "#2563eb" : "#cbd5e1";
      if (autoSmsKnob) autoSmsKnob.style.left = enabled ? "23px" : "3px";
      if (autoSmsDescription) autoSmsDescription.textContent = enabled ? "Auto SMS is ON. Choose which automated messages you want to send. Manual SMS remains available." : "Auto SMS is OFF. No automatic SMS will be sent. Manual SMS remains available.";
      if (autoSmsOptions) autoSmsOptions.style.display = enabled ? "block" : "none";
    }
    async function saveAutomationSettings(messageElement, successText = "Saved.") {
      if (!company?.id) throw new Error("Your company could not be identified.");
      const payload = { ...automationSettings, config: smsConfig };
      const { error } = await supabase.from("companies").update({ sms_automation_settings: payload }).eq("id", company.id);
      if (error) throw error;
      automationSettings = payload;
      if (messageElement) { messageElement.textContent = successText; messageElement.style.color = "#166534"; }
    }
    function renderAutomationChecklist() {
      if (!autoSmsChecklist) return;
      autoSmsChecklist.innerHTML = "";
      SMS_AUTOMATIONS.forEach(item => {
        const label = document.createElement("label");
        label.style.display = "flex"; label.style.alignItems = "flex-start"; label.style.gap = "10px"; label.style.padding = "10px"; label.style.border = "1px solid #e2e8f0"; label.style.borderRadius = "8px"; label.style.cursor = "pointer"; label.style.background = "#f8fafc";
        const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = automationSettings[item.key] === true; checkbox.style.marginTop = "2px"; checkbox.style.flex = "0 0 auto";
        const text = document.createElement("div"); text.innerHTML = `<div style="font-weight:600;">${item.label}</div><div style="margin-top:3px;font-size:12px;color:#64748b;">${item.description}</div>`;
        checkbox.addEventListener("change", async () => {
          const previous = !checkbox.checked; automationSettings[item.key] = checkbox.checked; checkbox.disabled = true;
          if (autoSmsSaveMessage) { autoSmsSaveMessage.textContent = "Saving..."; autoSmsSaveMessage.style.color = "#64748b"; }
          try { await saveAutomationSettings(autoSmsSaveMessage); }
          catch (error) { console.error("JobPilot SMS automation selection error:", error); automationSettings[item.key] = previous; checkbox.checked = previous; if (autoSmsSaveMessage) { autoSmsSaveMessage.textContent = error.message || "Could not save this setting."; autoSmsSaveMessage.style.color = "#b91c1c"; } }
          finally { checkbox.disabled = false; }
        });
        label.appendChild(checkbox); label.appendChild(text); autoSmsChecklist.appendChild(label);
      });
    }
    function renderSmsConfig() {
      const list = document.getElementById("jobpilot-sms-config-list"); if (!list) return; list.innerHTML = "";
      const fields = {
        quote_follow_up: { label: "Quote follow up", timing: "Send after", unit: "days" },
        appointment_confirmed: { label: "Appointment confirmed", timing: "Send after", unit: "minutes" },
        appointment_reminder: { label: "Appointment reminder", timing: "Send before", unit: "hours" },
        appointment_rescheduled: { label: "Appointment rescheduled", timing: "Send after", unit: "minutes" },
        invoice_overdue: { label: "Invoice overdue", timing: "Send after", unit: "days overdue" }
      };
      Object.entries(fields).forEach(([key, field]) => {
        const config = smsConfig[key];
        const card = document.createElement("div"); card.style.padding = "14px"; card.style.border = "1px solid #e2e8f0"; card.style.borderRadius = "8px"; card.style.background = "#f8fafc";
        const title = document.createElement("div"); title.style.fontWeight = "600"; title.textContent = field.label; card.appendChild(title);
        const timingRow = document.createElement("div"); timingRow.style.display = "flex"; timingRow.style.alignItems = "center"; timingRow.style.gap = "8px"; timingRow.style.flexWrap = "wrap"; timingRow.style.marginTop = "10px";
        const timingLabel = document.createElement("span"); timingLabel.textContent = field.timing;
        const number = document.createElement("input"); number.type = "number"; number.min = "0"; number.step = "1"; number.value = Number.isFinite(Number(config.value)) ? Number(config.value) : 0; number.style.width = "90px"; number.className = "input";
        const unit = document.createElement("span"); unit.textContent = field.unit; timingRow.append(timingLabel, number, unit); card.appendChild(timingRow);
        const messageLabel = document.createElement("div"); messageLabel.style.marginTop = "14px"; messageLabel.style.fontWeight = "600"; messageLabel.textContent = "Message"; card.appendChild(messageLabel);
        const textarea = document.createElement("textarea");
        textarea.rows = 3;
        textarea.maxLength = 160;
        textarea.value = (config.message || "").slice(0, 160);
        textarea.placeholder = "Type the SMS you want customers to receive...";
        textarea.style.width = "100%"; textarea.style.marginTop = "6px"; textarea.style.resize = "vertical"; textarea.className = "input";
        card.appendChild(textarea);
        const characterCount = document.createElement("div"); characterCount.style.marginTop = "4px"; characterCount.style.fontSize = "12px"; characterCount.style.color = "#64748b"; characterCount.textContent = `${textarea.value.length}/160 characters`; card.appendChild(characterCount);
        const help = document.createElement("div"); help.style.marginTop = "6px"; help.style.fontSize = "12px"; help.style.color = "#64748b"; help.textContent = "Available placeholders: {customer_name}, {appointment_date}, {appointment_time}, {invoice_number}"; card.appendChild(help);
        textarea.addEventListener("input", () => { if (textarea.value.length > 160) textarea.value = textarea.value.slice(0, 160); smsConfig[key].message = textarea.value; characterCount.textContent = `${textarea.value.length}/160 characters`; });
        number.addEventListener("input", () => { smsConfig[key].value = Math.max(0, Number(number.value) || 0); });
        list.appendChild(card);
      });
    }
    renderAutomationChecklist(); renderSmsConfig(); paintAutoSms(autoSmsEnabled);
    autoSmsToggle?.addEventListener("change", async () => {
      const enabled = Boolean(autoSmsToggle.checked); autoSmsToggle.disabled = true;
      try { if (!company?.id) throw new Error("Your company could not be identified."); const { error } = await supabase.from("companies").update({ sms_automation_enabled: enabled }).eq("id", company.id); if (error) throw error; paintAutoSms(enabled); }
      catch (error) { console.error("JobPilot SMS automation setting error:", error); paintAutoSms(!enabled); const message = document.getElementById("jobpilot-sms-settings-message"); if (message) { message.textContent = error.message || "Could not save the Auto SMS setting."; message.style.color = "#b91c1c"; } }
      finally { autoSmsToggle.disabled = false; }
    });
    document.getElementById("jobpilot-sms-settings-button")?.addEventListener("click", () => {
      const card = document.getElementById("jobpilot-sms-provider-card"); const message = document.getElementById("jobpilot-sms-settings-message"); if (!card) return;
      const isOpen = card.style.display !== "none"; card.style.display = isOpen ? "none" : "block"; if (message) message.textContent = "";
    });
    document.getElementById("jobpilot-sms-config-save")?.addEventListener("click", async () => {
      const message = document.getElementById("jobpilot-sms-config-message"); const saveButton = document.getElementById("jobpilot-sms-config-save"); if (saveButton) saveButton.disabled = true;
      if (message) { message.textContent = "Saving..."; message.style.color = "#64748b"; }
      try { await saveAutomationSettings(message, "SMS settings saved."); }
      catch (error) { console.error("JobPilot SMS configuration save error:", error); if (message) { message.textContent = error.message || "Could not save SMS settings."; message.style.color = "#b91c1c"; } }
      finally { if (saveButton) saveButton.disabled = false; }
    });
    const summary = document.getElementById("jobpilot-management-plan-summary");
    const price = document.getElementById("jobpilot-management-plan-price");
    const badge = document.getElementById("jobpilot-management-test-badge");
    const actions = document.getElementById("jobpilot-management-billing-actions");
    const options = document.getElementById("jobpilot-management-upgrade-options");
    const message = document.getElementById("jobpilot-management-billing-message");
    const contextPlan = String(company?.plan || "solo").toLowerCase(); const fallback = PLANS[contextPlan] || PLANS.solo; const isTest = company?.test_mode === true;
    if (isTest && badge) { badge.style.display = "inline-block"; badge.innerHTML = '<span style="display:inline-block;padding:4px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;">TEST</span>'; }
    async function paint(planName, entitlement = null) {
      const details = PLANS[planName] || fallback; summary.textContent = `${details.label} · Up to ${details.users} user${details.users === 1 ? "" : "s"}`; price.textContent = formatPrice(details); actions.innerHTML = ""; options.innerHTML = "";
      const planChoices = isTest ? Object.keys(PLANS).filter(name => name !== planName) : (allowedPlans[planName] || []);
      if (planChoices.length) {
        const changeLabel = document.createElement("div"); changeLabel.style.width = "100%"; changeLabel.style.marginBottom = "4px"; changeLabel.style.fontWeight = "600"; changeLabel.textContent = isTest ? "Change test plan" : "Change plan"; options.appendChild(changeLabel);
        planChoices.forEach(name => { const option = button(`${PLANS[name].label} · ${formatPrice(PLANS[name])}`, "button"); option.addEventListener("click", async () => { if (isTest) { const result = await switchTestPlan(name, message); if (result) await paint(String(result.plan || name).toLowerCase(), null); return; } const confirmed = window.confirm(`Are you sure you want to change your plan to ${PLANS[name].label} at ${formatPrice(PLANS[name])}?`); if (confirmed) openBilling("change_plan", name, message); }); options.appendChild(option); });
      } else { const current = document.createElement("div"); current.style.marginTop = "12px"; current.style.fontSize = "13px"; current.textContent = "You are on the highest available plan."; options.appendChild(current); }
      const status = String(entitlement?.subscription_status || company?.billing_status || "").toLowerCase();
      if (!isTest && ["active", "trialing", "past_due", "canceled"].includes(status)) { const manage = button("Change payment method", "button secondary"); manage.addEventListener("click", () => openBilling("portal", planName, message)); actions.appendChild(manage); }
    }
    await paint(contextPlan);
    if (!isTest) {
      try { const { data, error } = await supabase.rpc("get_my_company_entitlements"); if (!error && data?.length) { const entitlement = data[0]; const actualPlan = String(entitlement.plan || contextPlan).toLowerCase(); await paint(actualPlan, entitlement); if (entitlement.cancel_at_period_end && entitlement.current_period_end) { message.textContent = `Your subscription is scheduled to end on ${new Date(entitlement.current_period_end).toLocaleDateString()}.`; message.style.color = "#92400e"; } } }
      catch (error) { console.error("JobPilot billing entitlement:", error); }
    }
  }
  window.renderManagementBillingPage = renderManagementBillingPage;
})();