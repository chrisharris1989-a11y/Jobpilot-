const FUNCTION_URL = "https://ncitqqhxaxjhepfsnltk.supabase.co/functions/v1/public-invoice-v1";

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const paymentStatus = params.get("payment");
const container = document.getElementById("invoiceContainer");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

async function loadInvoice() {
  if (!token) {
    container.innerHTML = `<div class="invoice-card"><h2>Invalid invoice link</h2><p>This invoice link is missing or invalid.</p></div>`;
    return;
  }

  try {
    const response = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load invoice.");
    renderInvoice(result.invoice, result.customer, result.business);
  } catch (error) {
    container.innerHTML = `<div class="invoice-card"><h2>Unable to load invoice</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function renderInvoice(invoice, customer, business) {
  const paid = invoice.status === "paid";
  const businessName = business?.business_name || "Invoice";
  const contactName = business?.contact_name || "";
  const phone = business?.phone || "";
  const email = business?.email || "";
  const website = business?.website || "";
  const address = [business?.address_line1, business?.city, business?.postcode].filter(Boolean).map(escapeHtml).join("<br>");
  const customerAddress = [customer?.address_line1, customer?.city, customer?.postcode].filter(Boolean).map(escapeHtml).join("<br>");

  const contactDetails = [
    phone ? `<div>${escapeHtml(phone)}</div>` : "",
    email ? `<div>${escapeHtml(email)}</div>` : "",
    website ? `<div>${escapeHtml(website)}</div>` : ""
  ].join("");

  const paymentMessage = paymentStatus === "success"
    ? `<div class="invoice-message">Payment submitted successfully. Thank you.</div>`
    : "";

  container.innerHTML = `
    <div class="invoice-card">
      <div class="invoice-header">
        <div>
          <h1>${escapeHtml(businessName)}</h1>
          ${contactName ? `<p><strong>${escapeHtml(contactName)}</strong></p>` : ""}
          ${contactDetails ? `<div style="margin-top:12px;line-height:1.5">${contactDetails}</div>` : ""}
          ${address ? `<div style="margin-top:12px;line-height:1.5">${address}</div>` : ""}
        </div>
        <div style="text-align:right">
          <strong>Invoice #${escapeHtml(invoice.invoice_number || "—")}</strong>
          ${invoice.issue_date ? `<p>${escapeHtml(invoice.issue_date)}</p>` : ""}
          ${invoice.due_date ? `<p>Due: ${escapeHtml(invoice.due_date)}</p>` : ""}
        </div>
      </div>

      <hr>

      <h3>Bill To</h3>
      <p><strong>${escapeHtml(customer?.name || "Customer")}</strong></p>
      ${customerAddress ? `<p>${customerAddress}</p>` : ""}
      ${customer?.email ? `<p>${escapeHtml(customer.email)}</p>` : ""}

      ${invoice.description ? `<h3>Description</h3><p>${escapeHtml(invoice.description)}</p>` : ""}

      ${invoice.invoice_items?.length ? `
        <h3>Items</h3>
        ${invoice.invoice_items.map(item => `
          <div class="invoice-row">
            <span>${escapeHtml(item.description || "")}</span>
            <strong>${money(item.total)}</strong>
          </div>
        `).join("")}
      ` : ""}

      <div class="invoice-row"><span>Subtotal</span><strong>${money(invoice.subtotal)}</strong></div>
      ${Number(invoice.vat || 0) > 0 ? `<div class="invoice-row"><span>VAT</span><strong>${money(invoice.vat)}</strong></div>` : ""}
      <div class="invoice-row" style="border-bottom:0;padding-top:20px">
        <strong class="invoice-total">Total</strong>
        <strong class="invoice-total">${money(invoice.total)}</strong>
      </div>

      ${paid
        ? `<div class="invoice-message">✅ This invoice has been paid.</div>`
        : `<button id="payButton" class="pay-button">💳 Pay Online</button>`}

      ${business?.invoice_footer ? `<div class="invoice-message" style="border-top:1px solid #eee;padding-top:20px;white-space:pre-line">${escapeHtml(business.invoice_footer)}</div>` : ""}
      ${paymentMessage}
    </div>
  `;

  if (!paid) {
    document.getElementById("payButton")?.addEventListener("click", createPayment);
  }
}

async function createPayment() {
  const button = document.getElementById("payButton");
  if (!button) return;
  button.disabled = true;
  button.textContent = "Creating secure payment...";

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, origin: window.location.origin })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not create payment.");
    if (!result.url) throw new Error("Stripe did not return a payment URL.");
    window.location.href = result.url;
  } catch (error) {
    alert(`Could not create payment:\n\n${error.message}`);
    button.disabled = false;
    button.textContent = "💳 Pay Online";
  }
}

loadInvoice();
