import { supabase } from "../supabase.js";

(function () {
  const SEND_SMS_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/send-sms";
  const TEST_SECTION_ID = "jobpilot-test-sms-section";

  function addTestSmsSection() {
    const settingsCard = document.getElementById("jobpilot-management-sms-settings-card");
    if (!settingsCard || document.getElementById(TEST_SECTION_ID)) return;

    const section = document.createElement("div");
    section.id = TEST_SECTION_ID;
    section.style.marginTop = "16px";
    section.style.padding = "14px";
    section.style.border = "1px solid #e2e8f0";
    section.style.borderRadius = "8px";
    section.style.background = "#f8fafc";
    section.innerHTML = `
      <div style="font-weight:600;">Test SMS</div>
      <div style="margin-top:4px;font-size:13px;color:#64748b;">Send a test message to your own phone to confirm your SMS connection is working.</div>
      <div style="margin-top:12px;display:grid;gap:10px;">
        <div>
          <label for="jobpilot-test-sms-number" style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;">Mobile number</label>
          <input id="jobpilot-test-sms-number" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="+447700900123" style="width:100%;">
        </div>
        <div>
          <label for="jobpilot-test-sms-message" style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;">Message</label>
          <textarea id="jobpilot-test-sms-message" class="input" rows="3" maxlength="918" style="width:100%;resize:vertical;">Test SMS from JobPilot</textarea>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button id="jobpilot-test-sms-send" class="button" type="button">Send Test SMS</button>
          <div id="jobpilot-test-sms-status" style="font-size:13px;color:#64748b;"></div>
        </div>
      </div>`;

    settingsCard.appendChild(section);

    const numberInput = document.getElementById("jobpilot-test-sms-number");
    const messageInput = document.getElementById("jobpilot-test-sms-message");
    const sendButton = document.getElementById("jobpilot-test-sms-send");
    const status = document.getElementById("jobpilot-test-sms-status");

    sendButton?.addEventListener("click", async () => {
      const recipient = numberInput?.value.trim() || "";
      const content = messageInput?.value.trim() || "";
      if (!recipient) {
        status.textContent = "Enter a mobile number.";
        status.style.color = "#b91c1c";
        return;
      }
      if (!/^\+[1-9]\d{7,14}$/.test(recipient)) {
        status.textContent = "Enter the number in international format, for example +447700900123.";
        status.style.color = "#b91c1c";
        return;
      }
      if (!content) {
        status.textContent = "Enter a message.";
        status.style.color = "#b91c1c";
        return;
      }

      sendButton.disabled = true;
      sendButton.textContent = "Sending...";
      status.textContent = "Sending test SMS...";
      status.style.color = "#64748b";

      try {
        const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("You are not logged in.");

        const company = window.JobPilotCompany?.company || null;
        const companyName = String(company?.name || "JobPilot").trim();
        const sender = companyName.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 11).trim() || "JobPilot";

        const response = await fetch(SEND_SMS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ recipient, content, sender })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || result.message || "The SMS could not be sent.");

        status.textContent = "Test SMS sent successfully. Check your phone.";
        status.style.color = "#166534";
      } catch (error) {
        console.error("JobPilot test SMS error:", error);
        status.textContent = error.message || "The SMS could not be sent.";
        status.style.color = "#b91c1c";
      } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Send Test SMS";
      }
    });
  }

  const observer = new MutationObserver(addTestSmsSection);
  observer.observe(document.body, { childList: true, subtree: true });
  addTestSmsSection();
})();
