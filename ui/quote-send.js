import { supabase } from "../supabase.js";

const BUTTON_SELECTOR = ".quote-send[data-quote-id]";

function getBusinessName() {
  try {
    const settings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
    return settings.businessName || "our business";
  } catch {
    return "our business";
  }
}

function normaliseWhatsAppNumber(phone) {
  let number = String(phone || "").replace(/\D/g, "");
  if (number.startsWith("0")) number = `44${number.substring(1)}`;
  return number;
}

function shortWhatsAppMessage(quote, customer) {
  const businessName = getBusinessName();
  return [
    `Hi ${customer.name},`,
    "",
    `Your quote from ${businessName} is ready.`,
    `Quote #${quote.quote_number || "—"}`,
    `Description: ${quote.description || "Requested work"}`,
    `Total: £${Number(quote.total || 0).toFixed(2)}`,
    quote.valid_until ? `Valid until: ${quote.valid_until}` : "",
    "",
    "Please let us know if you would like to go ahead.",
    "Thank you."
  ].filter(Boolean).join("\n");
}

function emailQuoteMessage(quote, customer) {
  const businessName = getBusinessName();
  return [
    `Dear ${customer.name},`,
    "",
    `Thank you for giving ${businessName} the opportunity to provide you with a quotation.`,
    "",
    "Please find your full quotation attached to this email as a Word document.",
    "",
    `Quotation number: ${quote.quote_number || "—"}`,
    `Description: ${quote.description || "Requested work"}`,
    `Total quotation value: £${Number(quote.total || 0).toFixed(2)}`,
    quote.valid_until ? `Quotation valid until: ${quote.valid_until}` : "",
    "",
    "If you have any questions about the quotation, or would like to proceed with the work, please don't hesitate to get in touch.",
    "",
    "We look forward to hearing from you.",
    "",
    "Kind regards,",
    businessName
  ].filter(Boolean).join("\n");
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
        <button id="jpSendQuoteWhatsApp" type="button" class="button primary" style="width:100%">📱 Send short quote via WhatsApp</button>
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
  const whatsappButton = modal.querySelector("#jpSendQuoteWhatsApp");
  const emailButton = modal.querySelector("#jpSendQuoteEmail");

  whatsappButton.addEventListener("click", async () => {
    try {
      const number = normaliseWhatsAppNumber(customer.phone);
      if (!number) throw new Error("This customer does not have a valid phone number saved.");

      whatsappButton.disabled = true;
      whatsappButton.textContent = "Opening WhatsApp…";
      await markQuoteSent(quote.id);

      const url = `https://wa.me/${number}?text=${encodeURIComponent(shortWhatsAppMessage(quote, customer))}`;
      window.location.href = url;
      modal.remove();
    } catch (error) {
      message.textContent = error.message || "The quote could not be sent via WhatsApp.";
      whatsappButton.disabled = false;
      whatsappButton.textContent = "📱 Send short quote via WhatsApp";
    }
  });

  emailButton.addEventListener("click", async () => {
    try {
      if (!customer.email) throw new Error("This customer does not have an email address saved.");
      if (typeof window.__jobpilotGenerateQuoteDocx !== "function") {
        throw new Error("The Word quote generator is not available. Please refresh JobPilot and try again.");
      }

      emailButton.disabled = true;
      whatsappButton.disabled = true;
      emailButton.textContent = "Preparing Word document…";
      message.textContent = "Generating the full quote document…";

      const blob = await window.__jobpilotGenerateQuoteDocx(quote.id);
      const filename = `${quote.quote_number || "quote"}.docx`;
      const file = new File([blob], filename, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const businessName = getBusinessName();
      const subject = `Quotation ${quote.quote_number || ""} from ${businessName}`.trim();
      const body = emailQuoteMessage(quote, customer);

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: subject, text: body, files: [file] });
        await markQuoteSent(quote.id);
        modal.remove();
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      await markQuoteSent(quote.id);
      window.location.href = `mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      modal.remove();
    } catch (error) {
      if (error?.name === "AbortError") {
        message.textContent = "Email cancelled.";
      } else {
        console.error("JobPilot email quote:", error);
        message.textContent = error.message || "The quote could not be prepared for email.";
      }
      emailButton.disabled = false;
      whatsappButton.disabled = false;
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
