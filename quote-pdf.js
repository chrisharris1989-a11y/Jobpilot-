import { supabase } from "./supabase.js";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
  } catch {
    return {};
  }
}

async function createQuotePdf(quoteId, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Preparing…";

  try {
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, customer_id, quote_number, description, subtotal, vat, total, valid_until, notes, status")
      .eq("id", quoteId)
      .maybeSingle();

    if (quoteError) throw quoteError;
    if (!quote) throw new Error("Quote could not be found.");

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, email, address_line1, city, postcode")
      .eq("id", quote.customer_id)
      .maybeSingle();

    if (customerError) throw customerError;

    const settings = getSettings();
    const businessName = settings.businessName || "JobPilot Business";
    const businessPhone = settings.phone || settings.businessPhone || "";
    const businessEmail = settings.email || settings.businessEmail || "";
    const businessAddress = settings.address || settings.addressLine1 || "";
    const businessCity = settings.city || "";
    const businessPostcode = settings.postcode || "";

    const customerAddress = [
      customer?.address_line1,
      customer?.city,
      customer?.postcode
    ].filter(Boolean).map(escapeHtml).join("<br>");

    const companyAddress = [
      businessAddress,
      businessCity,
      businessPostcode
    ].filter(Boolean).map(escapeHtml).join("<br>");

    const notes = quote.notes
      ? escapeHtml(quote.notes).replace(/\n/g, "<br>")
      : "";

    const description = escapeHtml(quote.description || "Quote for requested work")
      .replace(/\n/g, "<br>");

    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=900");
    if (!popup) {
      throw new Error("The PDF window was blocked. Please allow pop-ups for JobPilot and try again.");
    }

    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quote ${escapeHtml(quote.quote_number || "")}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; font-size: 13px; line-height: 1.5; }
  .sheet { max-width: 780px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; gap: 30px; border-bottom: 3px solid #111827; padding-bottom: 18px; }
  .brand h1 { margin: 0 0 5px; font-size: 28px; }
  .brand p, .meta p { margin: 2px 0; color: #4b5563; }
  .meta { text-align: right; }
  .meta h2 { margin: 0 0 5px; font-size: 22px; }
  .section { margin-top: 26px; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; }
  .customer-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .description { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; min-height: 100px; white-space: normal; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th { text-align: left; background: #f3f4f6; padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
  td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .amount { text-align: right; white-space: nowrap; }
  .totals { margin-left: auto; width: 300px; margin-top: 18px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .grand-total { border-top: 2px solid #111827; margin-top: 6px; padding-top: 10px; font-size: 18px; font-weight: 700; }
  .notes { border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 18px; }
  .footer { margin-top: 45px; padding-top: 12px; border-top: 1px solid #d1d5db; color: #6b7280; font-size: 11px; text-align: center; }
  .screen-actions { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; }
  .screen-actions button { border: 0; border-radius: 6px; padding: 10px 14px; cursor: pointer; font-weight: 700; }
  .print { background: #111827; color: #fff; }
  .close { background: #e5e7eb; color: #111827; }
  @media print { .screen-actions { display: none; } }
  @media (max-width: 650px) { .top, .columns { grid-template-columns: 1fr; display: block; } .meta { text-align: left; margin-top: 18px; } .totals { width: 100%; } }
</style>
</head>
<body>
<div class="screen-actions">
  <button class="print" onclick="window.print()">Print / Save PDF</button>
  <button class="close" onclick="window.close()">Close</button>
</div>
<div class="sheet">
  <div class="top">
    <div class="brand">
      <h1>${escapeHtml(businessName)}</h1>
      ${companyAddress ? `<p>${companyAddress}</p>` : ""}
      ${businessPhone ? `<p>${escapeHtml(businessPhone)}</p>` : ""}
      ${businessEmail ? `<p>${escapeHtml(businessEmail)}</p>` : ""}
    </div>
    <div class="meta">
      <h2>QUOTE</h2>
      <p><strong>Quote #:</strong> ${escapeHtml(quote.quote_number || "—")}</p>
      <p><strong>Valid until:</strong> ${formatDate(quote.valid_until)}</p>
      <p><strong>Status:</strong> ${escapeHtml(quote.status || "draft")}</p>
    </div>
  </div>

  <div class="section columns">
    <div>
      <div class="label">Prepared for</div>
      <div class="customer-name">${escapeHtml(customer?.name || "Customer")}</div>
      ${customerAddress ? `<div>${customerAddress}</div>` : ""}
      ${customer?.phone ? `<div>${escapeHtml(customer.phone)}</div>` : ""}
      ${customer?.email ? `<div>${escapeHtml(customer.email)}</div>` : ""}
    </div>
    <div>
      <div class="label">Quote details</div>
      <div class="description">${description}</div>
    </div>
  </div>

  <div class="section">
    <div class="label">Pricing</div>
    <table>
      <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
      <tbody><tr><td>${description}</td><td class="amount">${money(quote.subtotal)}</td></tr></tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><strong>${money(quote.subtotal)}</strong></div>
      <div class="total-row"><span>VAT</span><strong>${money(quote.vat)}</strong></div>
      <div class="total-row grand-total"><span>Total</span><span>${money(quote.total)}</span></div>
    </div>
  </div>

  ${notes ? `<div class="notes"><div class="label">Notes / Terms</div><div>${notes}</div></div>` : ""}

  <div class="footer">
    Thank you for the opportunity to quote for your work.
  </div>
</div>
<script>
  window.addEventListener("load", () => setTimeout(() => window.print(), 250));
</script>
</body>
</html>`);
    popup.document.close();
    popup.focus();
  } catch (error) {
    console.error("JobPilot quote PDF:", error);
    alert(error.message || "The quote PDF could not be prepared.");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function installQuotePdfButtons() {
  const deleteButton = document.getElementById("deleteQuote");
  if (!deleteButton) return;

  const quotePageActions = deleteButton.parentElement;
  if (!quotePageActions || quotePageActions.querySelector(".quote-pdf-button")) return;

  const pageTitle = document.getElementById("pageTitle")?.textContent || "";
  const quoteNumber = pageTitle.replace(/^Quote #/i, "").trim();

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary quote-pdf-button";
  button.textContent = "📄 PDF Quote";
  button.title = "Open a print-ready PDF version of this quote";

  button.addEventListener("click", async event => {
    event.stopPropagation();

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("id, quote_number")
      .eq("quote_number", quoteNumber)
      .maybeSingle();

    if (error || !quote) {
      alert("The quote could not be found for PDF generation.");
      return;
    }

    await createQuotePdf(quote.id, button);
  });

  quotePageActions.insertBefore(button, deleteButton);
}

const quotePdfObserver = new MutationObserver(() => installQuotePdfButtons());
quotePdfObserver.observe(document.body, { childList: true, subtree: true });
installQuotePdfButtons();
