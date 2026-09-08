import { supabase } from "../../supabase.js";

const GC_INVOICE_PAYMENT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-invoice-payment";

function findInvoiceModal(button) {
  return button.closest(".modal") || button.closest(".modal-content") || button.parentElement?.parentElement || document.body;
}

async function resolveInvoice(modal) {
  const publicLink = modal.querySelector('a[href*="public-invoice.html?token="]');
  let token = null;

  if (publicLink) {
    try {
      token = new URL(publicLink.href, window.location.origin).searchParams.get("token");
    } catch {}
  }

  if (token) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id,invoice_number,total,public_token,customer_id,description")
      .eq("public_token", token)
      .maybeSingle();
    if (!error && data) return data;
  }

  const emailInput = modal.querySelector('input[type="email"]');
  const email = emailInput?.value?.trim();
  if (!email) return null;

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (!customer?.id) return null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id,invoice_number,total,public_token,customer_id,description")
    .eq("customer_id", customer.id)
    .neq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return invoice || null;
}

function addPaymentSelector(button) {
  if (button.dataset.gocardlessSelectorAdded === "true") return;
  button.dataset.gocardlessSelectorAdded = "true";

  const modal = findInvoiceModal(button);
  if (!modal || modal.querySelector("#jobpilotInvoicePaymentMethod")) return;

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
    const select = modal.querySelector("#jobpilotInvoicePaymentMethod");
    if (!select || select.value !== "gocardless") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Creating GoCardless payment link…";

    try {
      const invoice = await resolveInvoice(modal);
      if (!invoice?.id) throw new Error("Could not identify the invoice. Please close this window and try again.");
      if (Number(invoice.total || 0) <= 0) throw new Error("This invoice has no outstanding amount to collect.");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again before sending the invoice.");

      const response = await fetch(GC_INVOICE_PAYMENT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoice_id: invoice.id }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to create the GoCardless payment link.");

      const emailInput = modal.querySelector('input[type="email"]');
      const email = emailInput?.value?.trim();
      if (!email) throw new Error("Please enter the customer's email address.");

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
  const button = document.getElementById("sendInvoiceButton");
  if (button) addPaymentSelector(button);
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => {
  const button = document.getElementById("sendInvoiceButton");
  if (button) addPaymentSelector(button);
}, 250);
