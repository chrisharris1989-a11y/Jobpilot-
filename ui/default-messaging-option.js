import { supabase } from "../supabase.js";

(function () {
  const DEFAULT_CHANNEL = "sms";

  async function resolveCompany() {
    const context = window.JobPilotCompany || null;
    if (context?.company) return context.company;
    const { data: { session } = {} } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    const { data, error } = await supabase
      .from("companies")
      .select("id,owner_id,sms_automation_settings")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) {
      console.error("JobPilot default messaging company lookup:", error);
      return null;
    }
    return data || null;
  }

  async function addDefaultMessagingOption() {
    const settingsCard = document.getElementById("jobpilot-management-sms-settings-card");
    if (!settingsCard || document.getElementById("jobpilot-default-messaging-card")) return;

    const card = document.createElement("div");
    card.id = "jobpilot-default-messaging-card";
    card.style.marginTop = "12px";
    card.style.padding = "14px";
    card.style.borderRadius = "8px";
    card.style.background = "#f8fafc";
    card.style.border = "1px solid #e2e8f0";
    card.innerHTML = `
      <div style="font-weight:600;">Default messaging option</div>
      <div style="margin-top:4px;font-size:13px;color:#64748b;">Choose which messaging method should be selected by default when contacting customers.</div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <select id="jobpilot-default-messaging-channel" class="input" style="min-width:180px;max-width:260px;">
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <span id="jobpilot-default-messaging-save" style="font-size:13px;color:#64748b;"></span>
      </div>`;

    const autoOptions = document.getElementById("jobpilot-auto-sms-options");
    const settingsButtonRow = document.getElementById("jobpilot-sms-settings-button")?.parentElement;
    if (settingsButtonRow) settingsCard.insertBefore(card, settingsButtonRow);
    else if (autoOptions) autoOptions.insertAdjacentElement("afterend", card);
    else settingsCard.appendChild(card);

    const company = await resolveCompany();
    const select = document.getElementById("jobpilot-default-messaging-channel");
    const saveMessage = document.getElementById("jobpilot-default-messaging-save");
    if (!select || !company?.id) return;

    const settings = company.sms_automation_settings && typeof company.sms_automation_settings === "object"
      ? { ...company.sms_automation_settings }
      : {};
    select.value = settings.default_messaging_channel === "whatsapp" ? "whatsapp" : DEFAULT_CHANNEL;

    select.addEventListener("change", async () => {
      select.disabled = true;
      if (saveMessage) {
        saveMessage.textContent = "Saving...";
        saveMessage.style.color = "#64748b";
      }
      try {
        const payload = { ...settings, default_messaging_channel: select.value };
        const { error } = await supabase
          .from("companies")
          .update({ sms_automation_settings: payload })
          .eq("id", company.id);
        if (error) throw error;
        if (saveMessage) {
          saveMessage.textContent = "Saved.";
          saveMessage.style.color = "#166534";
        }
      } catch (error) {
        console.error("JobPilot default messaging setting error:", error);
        select.value = settings.default_messaging_channel === "whatsapp" ? "whatsapp" : DEFAULT_CHANNEL;
        if (saveMessage) {
          saveMessage.textContent = error.message || "Could not save this setting.";
          saveMessage.style.color = "#b91c1c";
        }
      } finally {
        select.disabled = false;
      }
    });
  }

  const originalRender = window.renderManagementBillingPage;
  if (typeof originalRender !== "function") {
    setTimeout(() => {
      const retry = window.renderManagementBillingPage;
      if (typeof retry !== "function") return;
      window.renderManagementBillingPage = async function (...args) {
        const result = await retry.apply(this, args);
        await addDefaultMessagingOption();
        return result;
      };
    }, 0);
    return;
  }

  window.renderManagementBillingPage = async function (...args) {
    const result = await originalRender.apply(this, args);
    await addDefaultMessagingOption();
    return result;
  };
})();
