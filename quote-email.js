import { supabase } from "./supabase.js";
import { createQuotePdf } from "./quote-pdf.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
}

async function createPdfBlobFromExistingGenerator(quoteId) {
  let capturedUrl = null;
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.dataset?.jobpilotPdfCapture === "true" || this.download) capturedUrl = this.href;
  };
  try {
    await createQuotePdf(quoteId);
    if (!capturedUrl) throw new Error("The PDF could not be prepared for email.");
    const response = await fetch(capturedUrl);
    if (!response.ok) throw new Error("The generated PDF could not be read.");
    return await response.blob();
  } finally {
    HTMLAnchorElement.prototype.click = originalClick;
    if (capturedUrl?.startsWith("blob:")) URL.revokeObjectURL(capturedUrl);
  }
}

async function sendQuoteEmail(quoteId, button) {
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, customer_id, quote_number, title, description, total, valid_until, status")
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteError) throw quoteError;
  if (!quote) throw new Error("Quote could not be found.");
  if (String(quote.status).toLowerCase() === "converted") throw new Error("This quote has already been converted to a job.");

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, email")
    .eq("id", quote.customer_id)
    .maybeSingle();
  if (customerError) throw customerError;
  if (!customer?.email) throw new Error("This customer does not have an email address saved.");

  const { data: settings } = await supabase.from("user_settings").select("business_name, email").maybeSingle();
  const businessName = settings?.business_name || "JobPilot business";
  const pdfBlob = await createPdfBlobFromExistingGenerator(quoteId);
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });

  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");

  const { data, error } = await supabase.functions.invoke("send-quote-email", {
    body: {
      quote_id: quote.id,
      to: customer.email,
      customer_name: customer.name,
      business_name: businessName,
      reply_to: settings?.email || null,
      quote_number: quote.quote_number,
      quote_title: quote.title,
      total: quote.total,
      valid_until: quote.valid_until,
      pdf_base64: base64,
      pdf_file_name: `Quote-${quote.quote_number || quote.id}.pdf`
    }
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "The quote email could not be sent.");

  await supabase.from("quotes").update({ status: "sent" }).eq("id", quote.id);
  return customer.email;
}

function installQuoteEmailButtons() {
  document.querySelectorAll(".quote-view[data-quote-id]").forEach(viewButton => {
    const quoteId = viewButton.dataset.quoteId;
    if (!quoteId || viewButton.parentElement?.querySelector(`[data-jobpilot-email-quote="${CSS.escape(String(quoteId))}"]`)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button primary jobpilot-email-quote";
    button.dataset.jobpilotEmailQuote = quoteId;
    button.textContent = "Email Quote";
    button.title = "Email the PDF quote to the customer";
    button.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = "Sending…";
      try {
        const email = await sendQuoteEmail(quoteId, button);
        alert(`Quote emailed successfully to ${email}.`);
      } catch (error) {
        console.error("JobPilot email quote:", error);
        alert(error?.message || "The quote could not be emailed.");
      } finally {
        button.disabled = false;
        button.textContent = button.dataset.originalText || "Email Quote";
      }
    });
    viewButton.insertAdjacentElement("afterend", button);
  });
}

const observer = new MutationObserver(installQuoteEmailButtons);
if (document.body) observer.observe(document.body, { childList: true, subtree: true });
installQuoteEmailButtons();
