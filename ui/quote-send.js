import { supabase } from "../supabase.js";
import { getJobPilotPhoneDigits } from "../regional-phone.js";

const CUSTOMER_PORTAL_URL = "https://portal.jobpilotcrm.co.uk/portal/";
const SEND_SMS_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/send-sms";

function getBusinessName() {
  try {
    const settings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
    return settings.businessName || "our business";
  } catch {
    return "our business";
  }
}

function normaliseWhatsAppNumber(phone) {
  return getJobPilotPhoneDigits(phone);
}

async function getDefaultMessagingService() {
  const context = window.JobPilotCompany || null;
  if (context?.company?.sms_automation_settings) {
    return context.company.sms_automation_settings.default_messaging_service === "whatsapp" ? "whatsapp" : "sms";
  }

  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = session?.user?.id;
  if (!userId) throw new Error("You are not logged in.");

  const { data: company, error } = await supabase
    .from("companies")
    .select("sms_automation_settings")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;

  return company?.sms_automation_settings?.default_messaging_service === "whatsapp" ? "whatsapp" : "sms";
}

async function inviteCustomerToPortal(customerId) {
  const { data, error } = await supabase.functions.invoke("invite-customer-portal", {
    body: { customer_id: customerId }
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "The customer portal invitation could not be sent.");
  return data;
}

function shortQuoteMessage(customer) {
  const businessName = getBusinessName();
  return `Hi ${customer.name}, please find your quote below. View it in your customer portal: ${CUSTOMER_PORTAL_URL} Thanks, ${businessName}`;
}

function emailQuoteMessage(quote, customer) {
  return [
    `Hi ${customer.name},`,
    "",
    "Here is the quote you requested.",
    "",
    "Your customer portal invitation has also been sent to your email.",
    CUSTOMER_PORTAL_URL,
    "",
    "Feel free to get in touch if you have any questions.",
    "",
    "Thanks."
  ].join("\n");
}

async function sendQuoteBySms(quote, customer) {
  const content = shortQuoteMessage(customer);
  if (content.length > 160) {
    throw new Error(`The quote SMS is ${content.length} characters and exceeds the 160-character SMS limit. Please shorten the customer or company name, or use WhatsApp/email.`);
  }

  const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error("You are not logged in.");

  const response = await fetch(SEND_SMS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      customer_id: customer.id,
      content,
      message_type: "quote",
      billable: true
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || result.message || "The quote SMS could not be sent.");
}

async function sendQuoteByWhatsApp(customer) {
  const number = normaliseWhatsAppNumber(customer.phone);
  if (!number) throw new Error("This customer does not have a valid phone number saved.");

  const url = `https://wa.me/${number}?text=${encodeURIComponent(shortQuoteMessage(customer))}`;
  window.location.href = url;
}

function isMobileShareDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
    (navigator.maxTouchPoints > 1 && window.matchMedia?.("(max-width: 1024px)")?.matches);
}

function showSendChoiceModal(quote, customer, triggerButton) {
  const existing = document.getElementById("jobpilot-send-quote-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "jobpilot-send-quote-modal";
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:520px">
      <div class="modal-header">
        <div>
          <h2>Send Quote</h2>
          <p>Choose how you want to send quote #${escapeHtml(quote.quote_number || "—")} to ${escapeHtml(customer.name || "the customer")}.</p>
        </div>
        <button class="close" type="button">×</button>
      </div>
      <div style="display:grid;gap:12px;margin-top:8px">
        <button id="jpSendQuoteDefault" type="button" class="button primary" style="width:100%">Send quote</button>
        <button id="jpSendQuoteEmail" type="button" class="button secondary" style="width:100%">📧 Email Word document</button>
      </div>
      <div id="jpSendQuoteMessage" class="muted" style="margin-top:14px"></div>
      <div class="modal-actions" style="margin-top:14px">
        <button type="button" class="button secondary close">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => modal.remove()));

  const message = modal.querySelector("#jpSendQuoteMessage");
  const defaultButton = modal.querySelector("#jpSendQuoteDefault");
  const emailButton = modal.querySelector("#jpSendQuoteEmail");

  (async () => {
    try {
      const service = await getDefaultMessagingService();
      defaultButton.textContent = service === "sms" ? "📱 Send quote via SMS" : "📱 Send quote via WhatsApp";
    } catch (error) {
      console.warn("JobPilot default messaging service:", error);
      defaultButton.textContent = "📱 Send quote";
    }
  })();

  defaultButton.addEventListener("click", async () => {
    try {
      defaultButton.disabled = true;
      emailButton.disabled = true;
      defaultButton.textContent = "Preparing quote…";

      if (customer.email) {
        try {
          await inviteCustomerToPortal(customer.id);
        } catch (portalError) {
          console.warn("JobPilot customer portal invitation:", portalError);
          message.textContent = "The quote will still be sent, but the customer portal invitation could not be sent.";
        }
      }

      const service = await getDefaultMessagingService();

      if (service === "sms") {
        if (!customer.phone) throw new Error("This customer does not have a phone number saved.");
        await sendQuoteBySms(quote, customer);
        message.textContent = "Quote SMS sent successfully.";
        message.style.color = "#166534";
      } else {
        await sendQuoteByWhatsApp(customer);
      }

      await markQuoteSent(quote.id);
      if (service === "whatsapp") modal.remove();
    } catch (error) {
      message.textContent = error.message || "The quote could not be sent.";
      message.style.color = "#b91c1c";
      defaultButton.disabled = false;
      emailButton.disabled = false;
      defaultButton.textContent = "📱 Send quote";
    }
  });

  emailButton.addEventListener("click", async () => {
    let blobUrl = null;
    try {
      if (!customer.email) throw new Error("This customer does not have an email address saved.");
      if (typeof window.__jobpilotGenerateQuoteDocx !== "function") {
        throw new Error("The Word quote generator is not available. Please refresh JobPilot and try again.");
      }

      emailButton.disabled = true;
      defaultButton.disabled = true;
      emailButton.textContent = "Preparing Word document…";
      message.textContent = "Generating the full quote document…";

      try {
        await inviteCustomerToPortal(customer.id);
      } catch (portalError) {
        console.warn("JobPilot customer portal invitation:", portalError);
        message.textContent = "The quote will still be prepared, but the customer portal invitation could not be sent.";
      }

      const blob = await window.__jobpilotGenerateQuoteDocx(quote.id);
      const filename = `${quote.quote_number || "quote"}.docx`;
      const file = new File([blob], filename, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const businessName = getBusinessName();
      const subject = `Quotation ${quote.quote_number || ""} from ${businessName}`.trim();
      const body = emailQuoteMessage(quote, customer);

      if (isMobileShareDevice() && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: subject, text: body, files: [file] });
          await markQuoteSent(quote.id);
          modal.remove();
          return;
        } catch (shareError) {
          if (shareError?.name === "AbortError") {
            message.textContent = "Email cancelled.";
            emailButton.disabled = false;
            defaultButton.disabled = false;
            emailButton.textContent = "📧 Email Word document";
            return;
          }
          console.warn("JobPilot native file share unavailable:", shareError);
        }
      }

      blobUrl = URL.createObjectURL(blob);
      message.innerHTML = `
        <div style="display:grid;gap:10px">
          <div><strong>The Word quote is ready.</strong></div>
          <div>Download the Word document first, then open your email and attach it.</div>
          <a id="jpDownloadQuoteDocx" class="button primary" href="${blobUrl}" download="${escapeHtml(filename)}" style="text-align:center;text-decoration:none">⬇️ Download Word document</a>
          <button id="jpOpenQuoteEmail" type="button" class="button secondary">📧 Open email</button>
        </div>
      `;
      emailButton.style.display = "none";

      const downloadButton = modal.querySelector("#jpDownloadQuoteDocx");
      const openEmailButton = modal.querySelector("#jpOpenQuoteEmail");

      downloadButton.addEventListener("click", async () => {
        try {
          await markQuoteSent(quote.id);
        } catch (error) {
          console.error("JobPilot quote status update:", error);
        }
      });

      openEmailButton.addEventListener("click", async () => {
        try {
          await markQuoteSent(quote.id);
        } catch (error) {
          console.error("JobPilot quote status update:", error);
        }
        window.location.href = `mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      });

      modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        modal.remove();
      }));
    } catch (error) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      console.error("JobPilot email quote:", error);
      message.textContent = error.message || "The quote could not be prepared for email.";
      emailButton.disabled = false;
      defaultButton.disabled = false;
      emailButton.textContent = "📧 Email Word document";
    }
  });

  triggerButton.disabled = false;
}

async function markQuoteSent(quoteId) {
  const { error } = await supabase
    .from("quotes")
    .update({ status: "sent" })
    .eq("id", quoteId);
  if (error) throw error;
}

async function loadQuoteAndCustomer(quoteId) {
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, customer_id, quote_number, description, subtotal, vat, total, valid_until, status")
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteError) throw quoteError;
  if (!quote) throw new Error("Quote could not be found.");
  if (String(quote.status).toLowerCase() === "converted") {
    throw new Error("This quote has already been converted to a job.");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, phone, email")
    .eq("id", quote.customer_id)
    .maybeSingle();
  if (customerError) throw customerError;
  if (!customer) throw new Error("The customer attached to this quote could not be found.");

  return { quote, customer };
}

function installImprovedQuoteSendButtons() {
  document.querySelectorAll(".quote-view[data-quote-id]").forEach(viewButton => {
    const quoteId = viewButton.dataset.quoteId;
    if (!quoteId) return;

    const oldButton = viewButton.parentElement?.querySelector(`.quote-send[data-quote-id="${CSS.escape(quoteId)}"]`);
    if (!oldButton) return;

    if (oldButton.dataset.jobpilotImproved === "true") return;
    oldButton.dataset.jobpilotImproved = "true";

    const replacement = oldButton.cloneNode(true);
    replacement.dataset.jobpilotImproved = "true";
    replacement.textContent = "📤 Send Quote";
    oldButton.replaceWith(replacement);

    replacement.addEventListener("click", async event => {
      event.stopPropagation();
      replacement.disabled = true;
      replacement.textContent = "Loading…";

      try {
        const { quote, customer } = await loadQuoteAndCustomer(quoteId);
        if (!customer.phone && !customer.email) {
          throw new Error("This customer has neither a phone number nor an email address saved.");
        }
        showSendChoiceModal(quote, customer, replacement);
      } catch (error) {
        console.error("JobPilot send quote:", error);
        alert(error.message || "The quote could not be sent.");
        replacement.disabled = false;
        replacement.textContent = "📤 Send Quote";
      }
    });
  });
}

const observer = new MutationObserver(() => installImprovedQuoteSendButtons());
if (document.body) observer.observe(document.body, { childList: true, subtree: true });
installImprovedQuoteSendButtons();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
