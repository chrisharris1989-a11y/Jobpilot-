import { supabase } from "../../supabase.js";

const GC_INVOICE_PAYMENT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-invoice-payment";

function findInvoiceButton() {
  return document.getElementById("sendInvoiceButton");
}

async function resolveInvoice() {
  // The existing invoice profile keeps the invoice in the page title as:
  // "Invoice #123". Use that stable identifier rather than looking for a
  // non-existent email/public-link field in the invoice profile.
  const title = document.getElementById("pageTitle")?.textContent?.trim() || "";
  const match = title.match(/Invoice\s*#\s*(.+)$/i);
  const invoiceNumber = match?.[1]?.trim();

  if (invoiceNumber) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id,invoice_number,total,public_token,customer_id,description")
      .eq("invoice_number", invoiceNumber)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

async function resolveCustomerEmail(customerId) {
  if (!customerId) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("email")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error("GoCardless customer lookup:", error);
    return null;
  }

  return data?.email?.trim() || null;
}

function addPaymentSelector(button) {
  if (button.dataset.gocardlessSelectorAdded === "true") return;
  button.dataset.gocardlessSelectorAdded = "true";

  const wrapper = document.createElement("div");
  wrapper.style.margin = "14px 0";
  wrapper.style.padding = "12px";
  wrapper.style.border = "1px solid #e5e7eb";
  wrapper.style.borderRadius = "10px";
  wrapper.style.background = "#fff";

  wrapper.innerHTML = `
    <label for="jobpilotInvoicePaymentMethod" style="display:block;font-weight:600;margin-bottom:6px;">
      Payment method
    </label>
    <select id="jobpilotInvoicePaymentMethod" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;">
      <option value="stripe">Stripe</option>
      <option value="gocardless">GoCardless</option>
    </select>
    <div style="font-size:12px;color:#6b7280;margin-top:6px;">
      Choose how your customer will pay this invoice.
    </div>
  `;

  button.parentElement?.insertBefore(wrapper, button);

  button.addEventListener("click", async (event) => {
    const select = document.getElementById("jobpilotInvoicePaymentMethod");
    if (!select || select.value !== "gocardless") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Creating GoCardless payment link…";

    try {
      const invoice = await resolveInvoice();
      if (!invoice?.id) {
        throw new Error("Could not identify the invoice. Please close this window and try again.");
      }

      if (Number(invoice.total || 0) <= 0) {
        throw new Error("This invoice has no outstanding amount to collect.");
      }

      const email = await resolveCustomerEmail(invoice.customer_id);
      if (!email) {
        throw new Error("This customer does not have an email address saved. Add an email address to the customer and try again.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please sign in again before sending the invoice.");
      }

      const response = await fetch(GC_INVOICE_PAYMENT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoice_id: invoice.id }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Unable to create the GoCardless payment link.");
      }

      const invoiceLabel = invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Your invoice";
      const subject = `${invoiceLabel} from JobPilot`;
      const body = `Hello,\n\nPlease find your invoice below.\n\n${invoiceLabel}\nAmount due: £${Number(invoice.total).toFixed(2)}\n\nPay securely by GoCardless:\n${result.url}\n\nThank you.`;

      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      button.textContent = "Invoice email prepared";
    } catch (error) {
      console.error("GoCardless invoice send:", error);
      alert(error.message || "Unable to prepare the GoCardless invoice email.");
      button.disabled = false;
      button.textContent = originalText;
    }
  }, true);
}

const observer = new MutationObserver(() => {
  const button = findInvoiceButton();
  if (button) addPaymentSelector(button);
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => {
  const button = findInvoiceButton();
  if (button) addPaymentSelector(button);
}, 250);