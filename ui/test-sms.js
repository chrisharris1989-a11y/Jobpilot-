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

        const response = await fetch(SEND_SMS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ recipient, content, message_type: "test", billable: false })
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

  async function sendInvoiceByWhatsApp() {
    const pageTitle = document.getElementById("pageTitle")?.textContent?.trim() || "";
    const match = pageTitle.match(/^Invoice\s+#(.+)$/i);
    const invoiceNumber = match?.[1]?.trim();
    if (!invoiceNumber) throw new Error("Could not identify the invoice.");

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, public_token, customer_id")
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
    if (!customer?.phone) throw new Error("This customer does not have a phone number saved.");

    const settings = (() => {
      try {
        return JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
      } catch {
        return {};
      }
    })();

    const businessName = String(settings.businessName || "our business").trim();
    let whatsappNumber = String(customer.phone).replace(/\D/g, "");
    if (whatsappNumber.startsWith("0")) whatsappNumber = `44${whatsappNumber.substring(1)}`;
    if (!whatsappNumber) throw new Error("This customer does not have a valid phone number saved.");

    const paymentLink = `${window.location.origin}/public-invoice.html?token=${encodeURIComponent(invoice.public_token)}`;
    const message =
      `Hi ${customer.name},\n\n` +
      `Please find your invoice from ${businessName} below.\n\n` +
      `You can view and pay it securely here:\n${paymentLink}\n\n` +
      `Thank you,\n${businessName}`;

    window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  // Invoices are deliberately kept out of SMS. They are sent through the
  // existing WhatsApp flow so the full payment message can be retained.
  document.addEventListener("click", event => {
    const button = event.target?.closest?.("#sendInvoiceButton");
    if (!button || button.dataset.jobpilotInvoiceHandled === "1") return;

    button.dataset.jobpilotInvoiceHandled = "1";
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Opening WhatsApp...";

    sendInvoiceByWhatsApp()
      .catch(error => {
        console.error("JobPilot invoice WhatsApp error:", error);
        alert(error.message || "The invoice could not be sent.");
      })
      .finally(() => {
        button.disabled = false;
        button.textContent = originalText;
        button.dataset.jobpilotInvoiceHandled = "0";
      });
  }, true);

  const observer = new MutationObserver(addTestSmsSection);
  observer.observe(document.body, { childList: true, subtree: true });
  addTestSmsSection();
})();