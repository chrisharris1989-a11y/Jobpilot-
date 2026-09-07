import { supabase } from "../supabase.js";

(() => {
  if (window.__jobpilotQuotePdfViewerInstalled) return;
  window.__jobpilotQuotePdfViewerInstalled = true;

  const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  }[char]));

  const money = (value, currency = "GBP") => {
    const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";
    return `${symbol}${Number(value || 0).toFixed(2)}`;
  };

  const date = value => value ? new Date(value).toLocaleDateString("en-GB") : "—";

  function styles() {
    if (document.getElementById("jpQuotePreviewStyles")) return;
    const style = document.createElement("style");
    style.id = "jpQuotePreviewStyles";
    style.textContent = `
      #jobpilot-quote-pdf-viewer .jp-preview-shell{width:96vw;max-width:1050px;height:92vh;display:flex;flex-direction:column;padding:0;overflow:hidden}
      #jobpilot-quote-pdf-viewer .jp-preview-body{flex:1;overflow:auto;background:#eef0f3;padding:24px}
      #jobpilot-quote-pdf-viewer .jp-preview-page{width:min(100%,820px);min-height:1060px;margin:0 auto;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.12);padding:52px 58px;color:#111827;font-family:Arial,Helvetica,sans-serif}
      #jobpilot-quote-pdf-viewer .jp-preview-head{display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #111827;padding-bottom:22px}
      #jobpilot-quote-pdf-viewer .jp-preview-brand{font-size:24px;font-weight:700}.jp-preview-small{font-size:12px;color:#64748b;line-height:1.55}
      #jobpilot-quote-pdf-viewer .jp-preview-title{text-align:right;font-size:25px;font-weight:700}.jp-preview-meta{text-align:right;font-size:12px;color:#475569;line-height:1.7}
      #jobpilot-quote-pdf-viewer .jp-preview-cols{display:grid;grid-template-columns:1fr 1fr;gap:42px;margin:30px 0}.jp-preview-label{font-size:10px;font-weight:700;color:#64748b;letter-spacing:.06em;margin-bottom:7px}
      #jobpilot-quote-pdf-viewer h3{font-size:17px;margin:0 0 8px}.jp-preview-desc{font-size:13px;line-height:1.6;margin:0 0 24px;white-space:pre-wrap}
      #jobpilot-quote-pdf-viewer table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}#jobpilot-quote-pdf-viewer th{text-align:left;background:#f1f5f9;padding:10px;font-size:11px}#jobpilot-quote-pdf-viewer td{padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:top}#jobpilot-quote-pdf-viewer .num{text-align:right;white-space:nowrap}
      #jobpilot-quote-pdf-viewer .jp-preview-total{width:300px;max-width:100%;margin:24px 0 0 auto}.jp-preview-total>div{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}.jp-preview-grand{border-top:2px solid #111827;margin-top:5px;padding-top:10px!important;font-size:17px!important;font-weight:700}
      #jobpilot-quote-pdf-viewer .jp-preview-section{margin-top:30px}.jp-preview-accept{border:1px solid #dbe1e8;padding:16px;margin-top:30px;font-size:12px;line-height:1.55}
      @media(max-width:700px){#jobpilot-quote-pdf-viewer .jp-preview-body{padding:10px}#jobpilot-quote-pdf-viewer .jp-preview-page{padding:28px 22px;min-height:auto}.jp-preview-head,.jp-preview-cols{grid-template-columns:1fr;display:grid}.jp-preview-title,.jp-preview-meta{text-align:left}.jp-preview-brand{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  async function getQuote(quoteId) {
    const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
    if (error) throw error;
    if (!quote) throw new Error("Quote could not be found.");
    const { data: customer, error: ce } = await supabase.from("customers").select("*").eq("id", quote.customer_id).maybeSingle();
    if (ce) throw ce;
    if (!customer) throw new Error("Customer could not be found.");
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}"); } catch {}
    return { quote, customer, settings };
  }

  function buildPreview({ quote: q, customer: c, settings: s }) {
    const d = q.details || {};
    const currency = s.currency || "GBP";
    const items = Array.isArray(d.lineItems) ? d.lineItems : [];
    const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
    const discount = Number(d.discount || 0);
    const calculatedSubtotal = Number(q.subtotal ?? subtotal);
    const vat = Number(q.vat || 0);
    const total = Number(q.total ?? Math.max(0, calculatedSubtotal - discount) + vat);
    const businessAddress = [s.address, s.city, s.postcode].filter(Boolean).join(", ");
    const customerAddress = [c.address_line1, c.address_line2, c.city, c.postcode].filter(Boolean).join(", ");
    const lineRows = items.length ? items.map(it => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.unit_price || 0);
      return `<tr><td>${esc(it.description || "")}</td><td class="num">${esc(it.quantity ?? "")}</td><td>${esc(it.unit || "")}</td><td class="num">${money(rate, currency)}</td><td class="num">${money(qty * rate, currency)}</td></tr>`;
    }).join("") : `<tr><td colspan="5" style="color:#64748b">No line items were added to this quote.</td></tr>`;

    return `<div class="jp-preview-page">
      <div class="jp-preview-head">
        <div><div class="jp-preview-brand">${esc(s.businessName || "JobPilot Business")}</div>${businessAddress ? `<div class="jp-preview-small">${esc(businessAddress)}</div>` : ""}${s.phone ? `<div class="jp-preview-small">${esc(s.phone)}</div>` : ""}${s.businessEmail ? `<div class="jp-preview-small">${esc(s.businessEmail)}</div>` : ""}${s.website ? `<div class="jp-preview-small">${esc(s.website)}</div>` : ""}</div>
        <div><div class="jp-preview-title">QUOTATION</div><div class="jp-preview-meta">Quote ${esc(q.quote_number || "—")}<br>Date: ${date(d.quoteDate || q.created_at)}<br>Valid until: ${date(q.valid_until)}</div></div>
      </div>
      <div class="jp-preview-cols">
        <div><div class="jp-preview-label">PREPARED FOR</div><h3>${esc(c.name || "Customer")}</h3>${customerAddress ? `<div class="jp-preview-small">${esc(customerAddress)}</div>` : ""}${c.phone ? `<div class="jp-preview-small">${esc(c.phone)}</div>` : ""}${c.email ? `<div class="jp-preview-small">${esc(c.email)}</div>` : ""}</div>
        <div><div class="jp-preview-label">JOB / SITE</div><div style="font-size:13px;line-height:1.55">${esc(d.jobAddress || "Not specified")}</div></div>
      </div>
      <h3>${esc(q.title || "Quotation")}</h3>
      ${q.description ? `<p class="jp-preview-desc">${esc(q.description)}</p>` : ""}
      <div class="jp-preview-label">SCOPE & PRICING</div>
      <table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>${lineRows}</tbody></table>
      <div class="jp-preview-total">
        <div><span>Subtotal</span><strong>${money(calculatedSubtotal, currency)}</strong></div>
        ${discount ? `<div><span>Discount</span><strong>-${money(discount, currency)}</strong></div>` : ""}
        <div><span>VAT (${Number(q.vat_percent || 0)}%)</span><strong>${money(vat, currency)}</strong></div>
        <div class="jp-preview-grand"><span>TOTAL</span><strong>${money(total, currency)}</strong></div>
      </div>
      ${d.paymentTerms ? `<div class="jp-preview-section"><div class="jp-preview-label">PAYMENT / DEPOSIT</div><div class="jp-preview-desc">${esc(d.paymentTerms)}</div></div>` : ""}
      ${d.startDate || d.completion ? `<div class="jp-preview-section"><div class="jp-preview-label">TIMING</div><div class="jp-preview-small">${d.startDate ? `Estimated start: ${esc(date(d.startDate))}` : ""}${d.startDate && d.completion ? " · " : ""}${d.completion ? `Estimated completion: ${esc(d.completion)}` : ""}</div></div>` : ""}
      ${q.notes || s.quoteFooter ? `<div class="jp-preview-section"><div class="jp-preview-label">NOTES / TERMS</div><div class="jp-preview-desc">${esc(q.notes || s.quoteFooter)}</div></div>` : ""}
      <div class="jp-preview-accept"><strong>ACCEPTANCE</strong><div style="margin-top:8px">${esc(d.acceptance || "I/We accept this quotation and agree to the stated terms and conditions.")}</div><div style="margin-top:22px;display:flex;justify-content:space-between;gap:20px"><span>Customer signature: ____________________</span><span>Date: __________</span></div></div>
    </div>`;
  }

  function showPreview(data) {
    styles();
    const existing = document.getElementById("jobpilot-quote-pdf-viewer");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "jobpilot-quote-pdf-viewer";
    modal.className = "modal show";
    modal.innerHTML = `<div class="modal-content jp-preview-shell"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border,#e5e7eb);background:#fff"><div><h2 style="margin:0">Quote Preview</h2><p style="margin:3px 0 0;color:#64748b;font-size:12px">Previewing inside JobPilot — no PDF is generated until you download or email it.</p></div><button type="button" class="button secondary" id="jpQuotePreviewClose">Close</button></div><div class="jp-preview-body">${buildPreview(data)}</div></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector("#jpQuotePreviewClose").onclick = close;
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
  }

  window.__jobpilotPreviewQuotePdf = async quoteId => {
    const data = await getQuote(quoteId);
    showPreview(data);
  };

  window.__jobpilotShowQuotePdf = showPreview;
})();
