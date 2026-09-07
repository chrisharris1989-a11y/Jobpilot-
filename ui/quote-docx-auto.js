import { supabase } from "../supabase.js";

const KEY = "jobpilot_pending_quote_docx";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function money(value, currency = "GBP") {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function installPreviewStyles() {
  if (document.getElementById("jobpilot-quote-preview-styles")) return;
  const style = document.createElement("style");
  style.id = "jobpilot-quote-preview-styles";
  style.textContent = `
    .jp-quote-preview-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto}
    .jp-quote-preview{width:210mm;max-width:calc(100vw - 40px);min-height:297mm;box-sizing:border-box;overflow:visible;background:#fff;border-radius:2px;box-shadow:0 20px 60px rgba(0,0,0,.25);color:#111827}
    .jp-quote-preview-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:12mm 15mm 7mm;border-bottom:1px solid #e5e7eb;background:#fff}
    .jp-quote-preview-head h2{margin:0 0 5px;font-size:22px}.jp-quote-preview-head p{margin:0;color:#6b7280}
    .jp-quote-preview-close{border:0;background:transparent;font-size:28px;line-height:1;cursor:pointer;color:#6b7280}
    .jp-quote-preview-body{padding:10mm 15mm 12mm;box-sizing:border-box}.jp-quote-preview-company{display:flex;justify-content:space-between;gap:24px;margin-bottom:10mm}.jp-quote-preview-company h1{margin:0 0 5px;font-size:25px}.jp-quote-preview-logo{max-width:180px;max-height:80px;object-fit:contain}
    .jp-quote-preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:8mm}.jp-quote-preview-card{padding:16px;background:#f8fafc;border-radius:10px}.jp-quote-preview-card h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:.05em}.jp-quote-preview-card p{margin:3px 0;white-space:pre-line}
    .jp-quote-preview-table{width:100%;border-collapse:collapse;margin:7mm 0}.jp-quote-preview-table th,.jp-quote-preview-table td{padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}.jp-quote-preview-table th{font-size:12px;text-transform:uppercase;color:#64748b}.jp-quote-preview-num{text-align:right!important}
    .jp-quote-preview-totals{margin-left:auto;width:min(360px,100%)}.jp-quote-preview-total{display:flex;justify-content:space-between;padding:7px 0}.jp-quote-preview-total.grand{font-size:20px;font-weight:700;border-top:2px solid #111827;margin-top:6px;padding-top:12px}.jp-quote-preview-section{margin-top:8mm}.jp-quote-preview-section h3{margin-bottom:8px}.jp-quote-preview-section p{white-space:pre-line;line-height:1.5}.jp-quote-preview-actions{display:flex;gap:10px;justify-content:flex-end;padding:18px 15mm;border-top:1px solid #e5e7eb;background:#fff;position:sticky;bottom:0}.jp-quote-preview-actions button{cursor:pointer}.jp-quote-preview-loading{padding:50px;text-align:center;color:#64748b}
    @media(max-width:650px){.jp-quote-preview{width:100%;max-width:none}.jp-quote-preview-head{padding:20px 18px 14px}.jp-quote-preview-body{padding:24px 18px}.jp-quote-preview-grid{grid-template-columns:1fr}.jp-quote-preview-company{flex-direction:column}.jp-quote-preview-actions{flex-wrap:wrap;padding:18px}.jp-quote-preview-actions button{flex:1}.jp-quote-preview-table{font-size:13px}}
    @media print{.jp-quote-preview-backdrop{position:static;display:block;padding:0;background:#fff}.jp-quote-preview{width:210mm;max-width:none;min-height:297mm;box-shadow:none;border-radius:0}.jp-quote-preview-head{position:static}.jp-quote-preview-actions{display:none}.jp-quote-preview-table{break-inside:auto}.jp-quote-preview-table tr{break-inside:avoid}.jp-quote-preview-section{break-inside:avoid}}
  `;
  document.head.appendChild(style);
}

function closePreview() {
  document.getElementById("jobpilot-quote-preview")?.remove();
}

async function openQuotePreview(quoteId) {
  installPreviewStyles();
  closePreview();
  const backdrop = document.createElement("div");
  backdrop.id = "jobpilot-quote-preview";
  backdrop.className = "jp-quote-preview-backdrop";
  backdrop.innerHTML = `<div class="jp-quote-preview" role="dialog" aria-modal="true"><div class="jp-quote-preview-head"><div><h2>Quote Preview</h2><p>Loading quote…</p></div><button class="jp-quote-preview-close" aria-label="Close">×</button></div><div class="jp-quote-preview-loading">Loading quote details…</div></div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", e => { if (e.target === backdrop || e.target.closest(".jp-quote-preview-close")) closePreview(); });

  try {
    const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
    if (error) throw error;
    if (!quote) throw new Error("Quote could not be found.");

    const [{ data: customer }, { data: settings }] = await Promise.all([
      quote.customer_id ? supabase.from("customers").select("*").eq("id", quote.customer_id).maybeSingle() : { data: null },
      supabase.auth.getUser().then(async ({ data: { user } = {} }) => user ? supabase.from("user_settings").select("business_name,phone,email,website,address_line1,city,postcode,currency,business_logo_url,quote_footer").eq("user_id", user.id).maybeSingle() : { data: null })
    ]);

    const s = settings || {};
    const d = quote.details || {};
    const items = Array.isArray(d.lineItems) ? d.lineItems : [];
    const currency = s.currency || "GBP";
    const subtotal = Number(quote.subtotal ?? 0);
    const discount = Number(d.discount ?? 0);
    const vat = Number(quote.vat ?? 0);
    const total = Number(quote.total ?? Math.max(0, subtotal - discount) + vat);
    const customerAddress = [customer?.address_line1, customer?.address_line2, customer?.city, customer?.postcode].filter(Boolean).join("\n");
    const companyAddress = [s.address_line1, s.city, s.postcode].filter(Boolean).join(", ");
    const logo = s.business_logo_url ? `<img class="jp-quote-preview-logo" src="${esc(s.business_logo_url)}" alt="Company logo">` : "";

    const rows = items.length ? items.map(item => {
      const qty = Number(item.quantity ?? 1);
      const unit = Number(item.unit_price ?? item.unitPrice ?? 0);
      const line = qty * unit;
      return `<tr><td>${esc(item.description || item.name || "Item")}</td><td>${esc(item.unit || "")}</td><td class="jp-quote-preview-num">${qty}</td><td class="jp-quote-preview-num">${money(unit, currency)}</td><td class="jp-quote-preview-num">${money(line, currency)}</td></tr>`;
    }).join("") : `<tr><td colspan="5">No line items</td></tr>`;

    const body = `
      <div class="jp-quote-preview-head"><div><h2>${esc(quote.quote_number || "Quote")}</h2><p>${esc(quote.title || quote.name || "Quote")}</p></div><button class="jp-quote-preview-close" aria-label="Close">×</button></div>
      <div class="jp-quote-preview-body">
        <div class="jp-quote-preview-company"><div><h1>${esc(s.business_name || "JobPilot")}</h1>${companyAddress ? `<p>${esc(companyAddress)}</p>` : ""}${s.phone ? `<p>${esc(s.phone)}</p>` : ""}${s.email ? `<p>${esc(s.email)}</p>` : ""}${s.website ? `<p>${esc(s.website)}</p>` : ""}</div>${logo}</div>
        <div class="jp-quote-preview-grid">
          <div class="jp-quote-preview-card"><h4>Customer</h4><p><strong>${esc(customer?.name || customer?.full_name || "")}</strong></p>${customerAddress ? `<p>${esc(customerAddress)}</p>` : ""}${customer?.phone ? `<p>${esc(customer.phone)}</p>` : ""}${customer?.email ? `<p>${esc(customer.email)}</p>` : ""}</div>
          <div class="jp-quote-preview-card"><h4>Quote details</h4><p>Date: ${esc(quote.quote_date || quote.created_at?.slice(0,10) || "")}</p>${quote.valid_until ? `<p>Valid until: ${esc(quote.valid_until)}</p>` : ""}<p>Status: ${esc(quote.status || "Draft")}</p>${quote.job_address ? `<p>Site: ${esc(quote.job_address)}</p>` : ""}</div>
        </div>
        ${d.description || quote.description ? `<div class="jp-quote-preview-section"><h3>Work description</h3><p>${esc(d.description || quote.description)}</p></div>` : ""}
        <table class="jp-quote-preview-table"><thead><tr><th>Description</th><th>Unit</th><th class="jp-quote-preview-num">Qty</th><th class="jp-quote-preview-num">Unit price</th><th class="jp-quote-preview-num">Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="jp-quote-preview-totals"><div class="jp-quote-preview-total"><span>Subtotal</span><strong>${money(subtotal, currency)}</strong></div>${discount ? `<div class="jp-quote-preview-total"><span>Discount</span><strong>-${money(discount, currency)}</strong></div>` : ""}${vat ? `<div class="jp-quote-preview-total"><span>VAT</span><strong>${money(vat, currency)}</strong></div>` : ""}<div class="jp-quote-preview-total grand"><span>Total</span><strong>${money(total, currency)}</strong></div></div>
        ${d.payment || d.deposit ? `<div class="jp-quote-preview-section"><h3>Payment</h3><p>${esc(d.payment || d.deposit)}</p></div>` : ""}
        ${d.notes ? `<div class="jp-quote-preview-section"><h3>Notes</h3><p>${esc(d.notes)}</p></div>` : ""}
        ${d.terms ? `<div class="jp-quote-preview-section"><h3>Terms & conditions</h3><p>${esc(d.terms)}</p></div>` : ""}
        ${s.quote_footer ? `<div class="jp-quote-preview-section"><p>${esc(s.quote_footer)}</p></div>` : ""}
      </div>
      <div class="jp-quote-preview-actions"><button type="button" class="button secondary jp-preview-edit" data-quote-id="${esc(quote.id)}">Edit Quote</button><button type="button" class="button primary jp-preview-download" data-quote-id="${esc(quote.id)}">Download</button></div>`;
    backdrop.querySelector(".jp-quote-preview").innerHTML = body;

    backdrop.querySelector(".jp-preview-download").addEventListener("click", async e => {
      const button = e.currentTarget;
      button.disabled = true; button.textContent = "Creating Word…";
      try {
        await window.__jobpilotDownloadQuoteDocx(quote.id, `${quote.quote_number || "quote"}.docx`);
      } catch (err) {
        console.error("JobPilot Word quote download failed:", err);
        alert(err?.message || "The Word document could not be generated.");
      } finally { button.disabled = false; button.textContent = "Download"; }
    });

    backdrop.querySelector(".jp-preview-edit").addEventListener("click", () => {
      closePreview();
      document.querySelector(`.quote-edit[data-quote-id="${CSS.escape(quote.id)}"]`)?.click();
    });
  } catch (err) {
    console.error("JobPilot quote preview failed:", err);
    backdrop.querySelector(".jp-quote-preview").innerHTML = `<div class="jp-quote-preview-head"><div><h2>Quote Preview</h2></div><button class="jp-quote-preview-close" aria-label="Close">×</button></div><div class="jp-quote-preview-loading">${esc(err?.message || "Could not load the quote preview.")}</div>`;
  }
}

function rememberQuoteCreation() {
  document.addEventListener("submit", e => {
    if (!e.target?.matches?.("#jpQuoteForm")) return;
    localStorage.setItem(KEY, JSON.stringify({ startedAt: Date.now() }));
  }, true);
}

async function generatePendingDocument() {
  let pending;
  try { pending = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { pending = null; }
  if (!pending?.startedAt || typeof window.__jobpilotDownloadQuoteDocx !== "function") return;

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return;
    const { data: quote } = await supabase.from("quotes").select("id,quote_number,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (quote?.id && new Date(quote.created_at).getTime() >= pending.startedAt - 5000) {
      localStorage.removeItem(KEY);
      return;
    }
    await sleep(500);
  }
}

function installQuoteViewPreviewAction() {
  document.addEventListener("click", event => {
    const button = event.target?.closest?.(".quote-view[data-quote-id]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.dataset.previewBusy === "1") return;
    button.dataset.previewBusy = "1";
    openQuotePreview(button.dataset.quoteId).finally(() => { button.dataset.previewBusy = "0"; });
  }, true);
}

rememberQuoteCreation();
installQuoteViewPreviewAction();
window.addEventListener("load", () => setTimeout(generatePendingDocument, 700));
