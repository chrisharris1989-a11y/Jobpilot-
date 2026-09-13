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
          <textarea id="jobpilot-test-sms-message" class="input" rows="3" maxlength="160" style="width:100%;resize:vertical;">Test SMS from JobPilot</textarea>
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
          body: JSON.stringify({ recipient, content, sender, message_type: "test", billable: false })
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

  function buildInvoiceSms(customerName, businessName, invoiceNumber, total, paymentLink) {
    const amount = `£${Number(total || 0).toFixed(2)}`;
    const name = String(customerName || "there").trim();
    const company = String(businessName || "our business").trim();
    const number = String(invoiceNumber || "").trim();

    // The current send-sms Edge Function enforces a 160-character SMS limit.
    // Keep the payment URL intact and progressively shorten the surrounding text.
    const messages = [
      `Hi ${name}, invoice #${number} from ${company} is ${amount}. Pay securely: ${paymentLink}`,
      `Invoice #${number} from ${company}: ${amount}. Pay securely: ${paymentLink}`,
      `Invoice #${number}: ${amount}. Pay securely: ${paymentLink}`,
      `Invoice ${number}: ${amount}. Pay: ${paymentLink}`,
      `${amount} due for invoice ${number}. Pay: ${paymentLink}`
    ];

    return messages.find(message => message.length <= 160) || null;
  }

  async function sendInvoiceBySmsOrWhatsApp() {
    const pageTitle = document.getElementById("pageTitle")?.textContent?.trim() || "";
    const match = pageTitle.match(/^Invoice\s+#(.+)$/i);
    const invoiceNumber = match?.[1]?.trim();

    if (!invoiceNumber) {
      throw new Error("Could not identify the invoice.");
    }

    const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error("You are not logged in.");

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, public_token, customer_id")
      .eq("invoice_number", invoiceNumber)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Invoice could not be found.");
    if (!invoice.public_token) throw new Error("This invoice does not have a payment link yet.");

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("id", invoice.customer_id)
      .maybeSingle();

    if (customerError) throw customerError;

    const phone = String(customer?.phone || "").trim();
    if (!phone) throw new Error("This customer does not have a phone number saved.");

    const paymentLink = `${window.location.origin}/public-invoice.html?token=${encodeURIComponent(invoice.public_token)}`;
    const company = window.JobPilotCompany?.company || null;
    const localSettings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
    const businessName = String(company?.name || localSettings.businessName || "our business").trim();

    const message = buildInvoiceSms(
      customer?.name,
      businessName,
      invoice.invoice_number,
      invoice.total,
      paymentLink
    );

    if (!message) {
      throw new Error("The invoice payment link is too long to fit in a single SMS. WhatsApp backup is available for this invoice.");
    }

    const recipient = phone.startsWith("+")
      ? phone
      : phone.replace(/\D/g, "").replace(/^0/, "44").replace(/^/, "+");

    const sender = businessName
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .slice(0, 11)
      .trim() || "JobPilot";

    try {
      const response = await fetch(SEND_SMS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          recipient,
          content: message,
          sender,
          message_type: "invoice",
          billable: true
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        // A 4xx response normally means the request/message is invalid and
        // should not silently trigger WhatsApp. Reserve WhatsApp for genuine
        // SMS/provider failures.
        if (response.status >= 400 && response.status < 500) {
          throw new Error(result.error || result.message || "The invoice SMS could not be sent.");
        }
        throw new Error(result.error || result.message || "The invoice SMS could not be sent.");
      }

      alert("Invoice sent by SMS successfully.");
      return;
    } catch (smsError) {
      console.error("JobPilot invoice SMS failed, using WhatsApp backup:", smsError);

      // Do not use WhatsApp for a client-side/validation error. This prevents
      // an over-length SMS or bad request from unexpectedly opening WhatsApp.
      const errorMessage = String(smsError?.message || "");
      if (errorMessage.toLowerCase().includes("160") || errorMessage.toLowerCase().includes("too long") || errorMessage.toLowerCase().includes("invalid")) {
        throw smsError;
      }

      let whatsappNumber = phone.replace(/\D/g, "");
      if (whatsappNumber.startsWith("0")) {
        whatsappNumber = "44" + whatsappNumber.substring(1);
      }

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.location.href = whatsappUrl;
    }
  }

  // Invoice messaging is intentionally SMS-first. WhatsApp is only the backup
  // when the SMS provider cannot send the invoice.
  document.addEventListener("click", event => {
    const button = event.target?.closest?.("#sendInvoiceButton");
    if (!button || button.dataset.jobpilotMessagingHandled === "1") return;

    button.dataset.jobpilotMessagingHandled = "1";
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Sending by SMS...";

    sendInvoiceBySmsOrWhatsApp()
      .catch(error => {
        console.error("JobPilot invoice messaging error:", error);
        alert(error.message || "The invoice could not be sent.");
      })
      .finally(() => {
        button.disabled = false;
        button.textContent = originalText;
        button.dataset.jobpilotMessagingHandled = "0";
      });
  }, true);

  const observer = new MutationObserver(addTestSmsSection);
  observer.observe(document.body, { childList: true, subtree: true });
  addTestSmsSection();
})();
