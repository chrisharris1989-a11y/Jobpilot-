import { supabase } from "../supabase.js";

(function () {
  const AUTOMATIONS = [
    ["appointment_reminders", "Appointment reminders", "Remind customers about upcoming appointments."],
    ["quote_followups", "Quote follow-ups", "Automatically follow up with customers after a quote is sent."],
    ["invoice_reminders", "Invoice/payment reminders", "Remind customers about outstanding invoices or payments."],
    ["job_completion_followups", "Job completion follow-ups", "Follow up with customers after a job is completed."],
    ["review_requests", "Review requests", "Ask customers for a review after completed work."],
    ["recurring_service_reminders", "Recurring service reminders", "Remind customers when recurring work is due."],
    ["customer_followups", "Customer follow-ups", "Send scheduled follow-ups to keep customers engaged."]
  ];

  let companyId = null;
  let loaded = false;
  let rendering = false;
  let saving = false;

  function isSettingsPage() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  async function getCompanyId() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("SMS settings company lookup:", error);
      return null;
    }

    return data?.company_id || null;
  }

  function addStyles() {
    if (document.getElementById("jobpilot-sms-settings-styles")) return;

    const style = document.createElement("style");
    style.id = "jobpilot-sms-settings-styles";
    style.textContent = `
      .sms-settings-section { margin-top: 18px; }
      .sms-settings-header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
      .sms-settings-header h2 { margin:0 0 6px; }
      .sms-settings-header p { margin:0; }
      .sms-toggle-row { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:18px 0; margin-top:10px; border-top:1px solid var(--border,#e5e7eb); border-bottom:1px solid var(--border,#e5e7eb); }
      .sms-toggle-copy strong { display:block; margin-bottom:4px; }
      .sms-toggle-copy span { color:var(--muted,#64748b); font-size:.92rem; }
      .sms-switch { position:relative; display:inline-flex; width:48px; height:28px; flex:0 0 auto; }
      .sms-switch input { opacity:0; width:0; height:0; position:absolute; }
      .sms-slider { position:absolute; inset:0; cursor:pointer; border-radius:999px; background:#cbd5e1; transition:.2s; }
      .sms-slider:before { content:""; position:absolute; width:22px; height:22px; left:3px; top:3px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:.2s; }
      .sms-switch input:checked + .sms-slider { background:#2563eb; }
      .sms-switch input:checked + .sms-slider:before { transform:translateX(20px); }
      .sms-automation-list { margin-top:18px; }
      .sms-automation-list[hidden] { display:none; }
      .sms-automation-title { margin:0 0 10px; font-size:1rem; }
      .sms-automation-option { display:flex; align-items:flex-start; gap:12px; padding:13px 0; border-bottom:1px solid var(--border,#e5e7eb); }
      .sms-automation-option:last-child { border-bottom:0; }
      .sms-automation-option input { margin-top:4px; width:18px; height:18px; flex:0 0 auto; }
      .sms-automation-option strong { display:block; margin-bottom:3px; }
      .sms-automation-option span { display:block; color:var(--muted,#64748b); font-size:.9rem; line-height:1.4; }
      .sms-settings-status { min-height:20px; margin-top:12px; font-size:.9rem; }
      .sms-settings-status.error { color:#dc2626; }
      .sms-settings-status.success { color:#16a34a; }
      .sms-settings-disabled { margin-top:14px; color:var(--muted,#64748b); font-size:.92rem; }
    `;
    document.head.appendChild(style);
  }

  function getSelectedTypes() {
    return Array.from(document.querySelectorAll("[data-sms-automation]:checked"))
      .map(input => input.value);
  }

  function setEnabledState(enabled) {
    const list = document.getElementById("smsAutomationList");
    const disabled = document.getElementById("smsAutomationDisabled");
    if (list) list.hidden = !enabled;
    if (disabled) disabled.hidden = enabled;
  }

  async function saveSettings() {
    if (!companyId || saving) return;
    saving = true;

    const enabled = Boolean(document.getElementById("smsAutomationEnabled")?.checked);
    const types = enabled ? getSelectedTypes() : [];
    const status = document.getElementById("smsSettingsStatus");

    if (status) {
      status.className = "sms-settings-status";
      status.textContent = "Saving...";
    }

    const { error } = await supabase
      .from("companies")
      .update({
        sms_automation_enabled: enabled,
        sms_automation_types: types
      })
      .eq("id", companyId);

    saving = false;

    if (error) {
      console.error("SMS settings save:", error);
      if (status) {
        status.className = "sms-settings-status error";
        status.textContent = "Unable to save SMS automation settings.";
      }
      return;
    }

    if (status) {
      status.className = "sms-settings-status success";
      status.textContent = "SMS automation settings saved.";
      setTimeout(() => {
        if (status) status.textContent = "";
      }, 2500);
    }
  }

  async function renderSmsSettings() {
    if (!isSettingsPage() || loaded || rendering) return;

    const panel = document.querySelector(".settings-panel");
    if (!panel || document.getElementById("sms-settings-section")) {
      if (document.getElementById("sms-settings-section")) loaded = true;
      return;
    }

    // Lock rendering immediately so repeated MutationObserver callbacks cannot
    // start multiple async renders before the first one finishes.
    rendering = true;

    try {
      addStyles();

      if (!companyId) companyId = await getCompanyId();
      if (!companyId) return;

      // Re-check after the async lookup because another render may have
      // completed while this one was waiting.
      if (document.getElementById("sms-settings-section")) {
        loaded = true;
        return;
      }

      const { data: company, error } = await supabase
        .from("companies")
        .select("sms_automation_enabled, sms_automation_types")
        .eq("id", companyId)
        .maybeSingle();

      if (error) {
        console.error("SMS settings load:", error);
        return;
      }

      const enabled = Boolean(company?.sms_automation_enabled);
      const selected = Array.isArray(company?.sms_automation_types)
        ? company.sms_automation_types
        : [];

      const section = document.createElement("section");
      section.id = "sms-settings-section";
      section.className = "settings-section sms-settings-section";
      section.innerHTML = `
        <div class="sms-settings-header">
          <div>
            <h2>SMS Automation</h2>
            <p>Choose which SMS messages JobPilot can send automatically.</p>
          </div>
        </div>

        <div class="sms-toggle-row">
          <div class="sms-toggle-copy">
            <strong>SMS Automation</strong>
            <span>Manual SMS can still be sent when automation is off.</span>
          </div>
          <label class="sms-switch" aria-label="SMS Automation">
            <input id="smsAutomationEnabled" type="checkbox" ${enabled ? "checked" : ""}>
            <span class="sms-slider"></span>
          </label>
        </div>

        <div id="smsAutomationList" class="sms-automation-list" ${enabled ? "" : "hidden"}>
          <h3 class="sms-automation-title">Select SMS to automate</h3>
          ${AUTOMATIONS.map(([value, title, description]) => `
            <label class="sms-automation-option">
              <input type="checkbox" data-sms-automation value="${value}" ${selected.includes(value) ? "checked" : ""}>
              <span>
                <strong>${title}</strong>
                <span>${description}</span>
              </span>
            </label>
          `).join("")}
        </div>

        <div id="smsAutomationDisabled" class="sms-settings-disabled" ${enabled ? "hidden" : ""}>
          Automated SMS are currently switched off for this account.
        </div>

        <div id="smsSettingsStatus" class="sms-settings-status" aria-live="polite"></div>
      `;

      panel.appendChild(section);
      loaded = true;

      document.getElementById("smsAutomationEnabled")?.addEventListener("change", async (event) => {
        setEnabledState(event.target.checked);
        await saveSettings();
      });

      document.querySelectorAll("[data-sms-automation]").forEach(input => {
        input.addEventListener("change", saveSettings);
      });
    } finally {
      rendering = false;
    }
  }

  const observer = new MutationObserver(() => {
    if (isSettingsPage()) renderSmsSettings();
    else {
      loaded = false;
      rendering = false;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  if (isSettingsPage()) renderSmsSettings();
})();
