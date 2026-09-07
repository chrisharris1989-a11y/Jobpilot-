import { supabase } from "./supabase.js";

let jsPDFPromise;

function loadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPDFPromise) return jsPDFPromise;
  jsPDFPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error("PDF library failed to load"));
    script.onerror = () => reject(new Error("Unable to load PDF library"));
    document.head.appendChild(script);
  });
  return jsPDFPromise;
}

const money = (value, currency = "GBP") => new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value || 0));
const dateText = value => value ? new Date(value).toLocaleDateString("en-GB") : "";

export async function createQuotePdf(quoteId, { download = true } = {}) {
  if (!quoteId) throw new Error("Quote ID is required");
  const [{ data: quote, error: quoteError }, { data: user }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", quoteId).single(),
    supabase.auth.getUser()
  ]);
  if (quoteError) throw quoteError;
  const [{ data: customer }, { data: settings }] = await Promise.all([
    quote.customer_id ? supabase.from("customers").select("*").eq("id", quote.customer_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("user_settings").select("business_name,contact_name,phone,email,website,address_line1,city,postcode,default_vat_rate,quote_footer,quote_validity_days,currency").eq("user_id", user?.user?.id || quote.user_id).maybeSingle()
  ]);

  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const currency = settings?.currency || "GBP";
  const margin = 18;
  let y = 20;
  const pageHeight = 297;
  const lineHeight = 6;
  const ensure = amount => { if (y + amount > pageHeight - 20) { doc.addPage(); y = 20; } };
  const wrapped = (text, width) => doc.splitTextToSize(String(text || ""), width);
  const addWrapped = (text, x, width, size = 10) => { doc.setFontSize(size); const lines = wrapped(text, width); lines.forEach(line => { ensure(lineHeight); doc.text(line, x, y); y += lineHeight; }); };

  doc.setProperties({ title: `Quote ${quote.quote_number || quote.id}`, subject: "JobPilot quote", author: settings?.business_name || "JobPilot", creator: "JobPilot" });
  doc.setFontSize(20); doc.setFont(undefined, "bold"); doc.text(settings?.business_name || "JobPilot", margin, y); doc.setFont(undefined, "normal");
  y += 7;
  [settings?.contact_name, settings?.address_line1, settings?.city, settings?.postcode, settings?.phone, settings?.email, settings?.website].filter(Boolean).forEach(v => { doc.setFontSize(9); doc.text(String(v), margin, y); y += 4.5; });
  doc.setFontSize(24); doc.setFont(undefined, "bold"); doc.text("QUOTE", 192, 25, { align: "right" }); doc.setFont(undefined, "normal");
  doc.setFontSize(9); doc.text(`Quote: ${quote.quote_number || quote.id}`, 192, 32, { align: "right" }); doc.text(`Date: ${dateText(quote.created_at || quote.quote_date)}`, 192, 37, { align: "right" });
  if (quote.valid_until) doc.text(`Valid until: ${dateText(quote.valid_until)}`, 192, 42, { align: "right" });
  y = Math.max(y + 8, 55);

  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.text("Prepared for", margin, y); y += 6; doc.setFont(undefined, "normal");
  [customer?.name || customer?.customer_name, customer?.company_name, customer?.address, customer?.address_line1, customer?.city, customer?.postcode, customer?.phone, customer?.email].filter(Boolean).forEach(v => { doc.setFontSize(9); doc.text(String(v), margin, y); y += 4.5; });
  y += 8;

  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.text("Description", margin, y); doc.text("Amount", 192, y, { align: "right" }); y += 7; doc.setFont(undefined, "normal");
  addWrapped(quote.description || "Quoted work", margin, 135, 10);
  doc.setFontSize(10); doc.text(money(quote.subtotal, currency), 192, y - lineHeight, { align: "right" });
  y += 5;

  const subtotal = Number(quote.subtotal || 0); const vat = Number(quote.vat || 0); const total = Number(quote.total ?? subtotal + vat);
  doc.line(125, y, 192, y); y += 7;
  doc.setFontSize(10); doc.text("Subtotal", 150, y); doc.text(money(subtotal, currency), 192, y, { align: "right" }); y += 6;
  doc.text(`VAT`, 150, y); doc.text(money(vat, currency), 192, y, { align: "right" }); y += 7;
  doc.setFont(undefined, "bold"); doc.setFontSize(12); doc.text("Total", 150, y); doc.text(money(total, currency), 192, y, { align: "right" }); doc.setFont(undefined, "normal"); y += 14;

  if (settings?.quote_footer) { doc.setFont(undefined, "bold"); doc.setFontSize(10); doc.text("Terms / notes", margin, y); y += 6; doc.setFont(undefined, "normal"); addWrapped(settings.quote_footer, margin, 174, 9); }
  y += 8; ensure(30); doc.setFont(undefined, "bold"); doc.setFontSize(10); doc.text("Acceptance", margin, y); doc.setFont(undefined, "normal"); y += 8; doc.setFontSize(9); doc.text("I accept this quotation and authorise the work described above.", margin, y); y += 14; doc.line(margin, y, 95, y); doc.line(110, y, 192, y); y += 5; doc.text("Customer signature", margin, y); doc.text("Date", 110, y);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) { doc.setPage(page); doc.setFontSize(8); doc.text(`JobPilot • Page ${page} of ${pages}`, 192, 287, { align: "right" }); }
  if (download) doc.save(`Quote-${String(quote.quote_number || quote.id).replace(/[^a-z0-9_-]/gi, "-")}.pdf`);
  return doc;
}

function installQuoteButtons() {
  document.querySelectorAll(".quote-view[data-quote-id]").forEach(button => {
    if (button.dataset.pdfAttached === "true") return;
    const pdfButton = document.createElement("button");
    pdfButton.type = "button";
    pdfButton.className = "button secondary quote-pdf";
    pdfButton.dataset.quoteId = button.dataset.quoteId;
    pdfButton.textContent = "PDF Quote";
    pdfButton.addEventListener("click", async () => {
      pdfButton.disabled = true; pdfButton.textContent = "Creating PDF...";
      try { await createQuotePdf(pdfButton.dataset.quoteId); }
      catch (error) { console.error("Quote PDF error", error); alert(error?.message || "Unable to create PDF quote."); }
      finally { pdfButton.disabled = false; pdfButton.textContent = "PDF Quote"; }
    });
    button.insertAdjacentElement("afterend", pdfButton);
    button.dataset.pdfAttached = "true";
  });
}

installQuoteButtons();
new MutationObserver(installQuoteButtons).observe(document.body, { childList: true, subtree: true });
