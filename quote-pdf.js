import { supabase } from "./supabase.js";

let jsPdfPromise = null;

function loadJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPdfPromise) return jsPdfPromise;

  jsPdfPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-jobpilot-jspdf="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.jspdf?.jsPDF));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = true;
    script.dataset.jobpilotJspdf = "true";
    script.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error("PDF library loaded but jsPDF was unavailable."));
    };
    script.onerror = () => reject(new Error("Could not load the PDF generator."));
    document.head.appendChild(script);
  });

  return jsPdfPromise;
}

function money(value, currency = "GBP") {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP"
    }).format(Number(value || 0));
  } catch {
    return `£${Number(value || 0).toFixed(2)}`;
  }
}

function dateUk(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function safeFileName(value) {
  return String(value || "quote").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 6) {
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

async function imageToDataUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function fetchQuoteData(quoteId) {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to create a PDF quote.");

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteError) throw quoteError;
  if (!quote) throw new Error("Quote could not be found.");

  const [customerResult, settingsResult] = await Promise.all([
    quote.customer_id
      ? supabase.from("customers").select("*").eq("id", quote.customer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
  ]);

  if (customerResult.error) throw customerResult.error;
  if (settingsResult.error) throw settingsResult.error;

  return {
    quote,
    customer: customerResult.data || {},
    settings: settingsResult.data || {},
    user
  };
}

async function createQuotePdf(quoteId) {
  const button = document.querySelector(`[data-jobpilot-pdf-quote="${CSS.escape(String(quoteId))}"]`);
  if (button) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Creating PDF…";
  }

  try {
    const [{ jsPDF }, data] = await Promise.all([
      loadJsPdf().then(jsPDF => ({ jsPDF })),
      fetchQuoteData(quoteId)
    ]);

    const { quote, customer, settings } = data;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const currency = settings.currency || "GBP";
    const businessName = settings.business_name || "Your Business";
    const accent = [31, 41, 55];

    doc.setProperties({
      title: `Quote ${quote.quote_number || ""}`,
      subject: quote.title || "Quotation",
      author: businessName,
      creator: "JobPilot"
    });

    // Header
    let logo = await imageToDataUrl(settings.business_logo_url);
    if (logo) {
      try {
        const format = String(logo).includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(logo, format, margin, 14, 28, 18, undefined, "FAST");
      } catch {
        logo = null;
      }
    }

    const businessX = logo ? margin + 34 : margin;
    doc.setTextColor(...accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(businessName, businessX, 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const businessLines = [
      settings.contact_name,
      settings.phone,
      settings.email,
      settings.website,
      [settings.address_line1, settings.city, settings.postcode].filter(Boolean).join(", ")
    ].filter(Boolean);
    businessLines.slice(0, 5).forEach((line, index) => {
      doc.text(String(line), businessX, 27 + index * 4.5);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("QUOTE", pageWidth - margin, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Quote #${quote.quote_number || "—"}`, pageWidth - margin, 27, { align: "right" });
    doc.text(`Date: ${dateUk(quote.created_at || new Date())}`, pageWidth - margin, 32, { align: "right" });
    if (quote.valid_until) doc.text(`Valid until: ${dateUk(quote.valid_until)}`, pageWidth - margin, 37, { align: "right" });

    doc.setDrawColor(210, 214, 220);
    doc.line(margin, 50, pageWidth - margin, 50);

    // Customer block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("QUOTED TO", margin, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let customerY = 66;
    const customerLines = [
      customer.name || "Customer",
      customer.address_line1,
      [customer.city, customer.postcode].filter(Boolean).join(", "),
      customer.phone,
      customer.email
    ].filter(Boolean);
    customerLines.slice(0, 5).forEach(line => {
      doc.text(String(line), margin, customerY);
      customerY += 5;
    });

    // Quote title and description
    let y = Math.max(customerY + 8, 94);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    y = addWrappedText(doc, quote.title || "Quotation for requested work", margin, y, contentWidth, 7) + 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrappedText(doc, quote.description || "", margin, y, contentWidth, 5.5) + 8;

    // Amount summary
    const boxX = pageWidth - margin - 78;
    const boxW = 78;
    const subtotal = Number(quote.subtotal || 0);
    const vat = Number(quote.vat || 0);
    const total = Number(quote.total || subtotal + vat);
    const vatPercent = Number(quote.vat_percent || settings.default_vat_rate || 0);
    const boxH = vat ? 37 : 25;

    doc.setFillColor(247, 248, 250);
    doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(70, 75, 82);
    doc.text("Subtotal", boxX + 5, y + 8);
    doc.text(money(subtotal, currency), boxX + boxW - 5, y + 8, { align: "right" });
    if (vat) {
      doc.text(`VAT (${vatPercent}%)`, boxX + 5, y + 15);
      doc.text(money(vat, currency), boxX + boxW - 5, y + 15, { align: "right" });
      doc.setDrawColor(215, 218, 223);
      doc.line(boxX + 5, y + 19, boxX + boxW - 5, y + 19);
      doc.setTextColor(...accent);
      doc.setFont("helvetica", "bold");
      doc.text("Total", boxX + 5, y + 29);
      doc.text(money(total, currency), boxX + boxW - 5, y + 29, { align: "right" });
    } else {
      doc.setTextColor(...accent);
      doc.setFont("helvetica", "bold");
      doc.text("Total", boxX + 5, y + 17);
      doc.text(money(total, currency), boxX + boxW - 5, y + 17, { align: "right" });
    }
    doc.setFont("helvetica", "normal");

    // Terms / footer
    y += boxH + 18;
    if (y > pageHeight - 70) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(...accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Terms & Conditions", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y += 6;
    const footerText = settings.quote_footer || "This quotation is subject to the agreed scope of work. Please contact us if you have any questions about this quotation.";
    y = addWrappedText(doc, footerText, margin, y, contentWidth, 4.8) + 10;

    // Acceptance section
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(215, 218, 223);
    doc.roundedRect(margin, y, contentWidth, 39, 2, 2, "S");
    doc.setTextColor(...accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Quote acceptance", margin + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("I/We accept the quotation and agree to the scope of work and terms above.", margin + 5, y + 14);
    doc.text("Name:", margin + 5, y + 25);
    doc.line(margin + 20, y + 25, margin + 88, y + 25);
    doc.text("Signature:", margin + 100, y + 25);
    doc.line(margin + 121, y + 25, pageWidth - margin - 5, y + 25);
    doc.text("Date:", margin + 5, y + 34);
    doc.line(margin + 20, y + 34, margin + 88, y + 34);

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(225, 227, 231);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setTextColor(120, 125, 132);
      doc.setFontSize(7.5);
      doc.text(businessName, margin, pageHeight - 8);
      doc.text(`Quote #${quote.quote_number || "—"} · Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    doc.save(`${safeFileName(`Quote-${quote.quote_number || quote.id}`)}.pdf`);
  } catch (error) {
    console.error("JobPilot PDF quote:", error);
    alert(error?.message || "Could not create the PDF quote.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "PDF Quote";
    }
  }
}

function installPdfButtons() {
  document.querySelectorAll(".quote-view[data-quote-id]").forEach(viewButton => {
    const quoteId = viewButton.dataset.quoteId;
    if (!quoteId || viewButton.parentElement?.querySelector(`[data-jobpilot-pdf-quote="${CSS.escape(String(quoteId))}"]`)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary jobpilot-pdf-quote";
    button.dataset.jobpilotPdfQuote = quoteId;
    button.textContent = "PDF Quote";
    button.title = "Create a professional PDF quote";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      createQuotePdf(quoteId);
    });

    viewButton.insertAdjacentElement("afterend", button);
  });
}

const observer = new MutationObserver(() => installPdfButtons());
observer.observe(document.body, { childList: true, subtree: true });
installPdfButtons();
