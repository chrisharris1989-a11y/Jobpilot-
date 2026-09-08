import { supabase } from "../supabase.js";

let activeQuoteId = null;

function showMessage(message, isError = false) {
  const target = document.querySelector("#jobpilot-send-quote-modal #jpSendQuoteMessage");
  if (!target) return;
  target.textContent = message;
  target.style.color = isError ? "#b91c1c" : "";
}

document.addEventListener("click", (event) => {
  const sendButton = event.target?.closest?.(".quote-send[data-quote-id]");
  if (sendButton?.dataset?.quoteId) activeQuoteId = sendButton.dataset.quoteId;
}, true);

document.addEventListener("click", async (event) => {
  const emailButton = event.target?.closest?.("#jpSendQuoteEmail");
  if (!emailButton) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (!activeQuoteId) {
    showMessage("The quote could not be identified. Please close this window and try again.", true);
    return;
  }

  const modal = document.getElementById("jobpilot-send-quote-modal");
  const whatsappButton = modal?.querySelector("#jpSendQuoteWhatsApp");
  const originalText = emailButton.textContent;

  emailButton.disabled = true;
  if (whatsappButton) whatsappButton.disabled = true;
  emailButton.textContent = "Sending quote…";
  showMessage("Generating the Word document and sending the email…");

  try {
    const { data, error } = await supabase.functions.invoke("send-quote-email", {
      body: { quoteId: activeQuoteId },
    });

    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "The quote could not be sent.");

    emailButton.textContent = "✓ Quote sent";
    showMessage(`Quote sent to ${data.customerEmail}.`);
    setTimeout(() => modal?.remove(), 1200);
  } catch (error) {
    console.error("JobPilot Resend quote email:", error);
    emailButton.disabled = false;
    if (whatsappButton) whatsappButton.disabled = false;
    emailButton.textContent = originalText || "📧 Email Word document";
    showMessage(error?.message || "The quote could not be sent. Please try again.", true);
  }
}, true);
