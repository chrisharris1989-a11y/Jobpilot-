import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun } from "docx";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const money = (v: number, currency = "GBP") => `${({GBP:"£",EUR:"€",USD:"$"} as Record<string,string>)[currency] || currency + " "}${Number(v || 0).toFixed(2)}`;
const text = (v: unknown) => String(v ?? "").trim();

type Logo = { data: Uint8Array; type: "png" | "jpg" | "gif" | "bmp" | "svg" };
async function fetchLogo(url: string | null): Promise<Logo | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const type = contentType.includes("png") ? "png" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : contentType.includes("gif") ? "gif" : contentType.includes("bmp") ? "bmp" : contentType.includes("svg") ? "svg" : null;
    if (!type) return null;
    const data = new Uint8Array(await response.arrayBuffer());
    if (!data.length || data.length > 5 * 1024 * 1024) return null;
    return { data, type };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Authentication required." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(url, key, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Authentication required." }, 401);
    const { quoteId } = await req.json();
    if (!quoteId) return json({ error: "quoteId is required." }, 400);

    const { data: membership, error: me } = await sb.from("company_members").select("company_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
    if (me) throw me;
    if (!membership) return json({ error: "No active company membership found." }, 403);
    const { data: quote, error: qe } = await sb.from("quotes").select("*").eq("id", quoteId).eq("company_id", membership.company_id).maybeSingle();
    if (qe) throw qe;
    if (!quote) return json({ error: "Quote not found." }, 404);
    const { data: customer, error: ce } = await sb.from("customers").select("*").eq("id", quote.customer_id).eq("company_id", membership.company_id).maybeSingle();
    if (ce) throw ce;
    const { data: settings } = await sb.from("user_settings").select("business_name,phone,email,website,address_line1,city,postcode,currency,quote_footer,business_logo_url").eq("user_id", user.id).maybeSingle();
    const s = settings || {}, d = quote.details || {}, items = Array.isArray(d.lineItems) ? d.lineItems : [];
    const currency = text(s.currency) || "GBP", subtotal = Number(quote.subtotal || 0), discount = Number(d.discount || 0), vat = Number(quote.vat || 0), total = Number(quote.total || Math.max(0, subtotal - discount) + vat);
    const companyAddress = [s.address_line1, s.city, s.postcode].filter(Boolean).join(", ");
    const customerAddress = [customer?.address_line1, customer?.address_line2, customer?.city, customer?.postcode].filter(Boolean).join(", ");
    const logo = await fetchLogo(text(s.business_logo_url) || null);
    const cell = (v: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v || "", bold })] })] });
    const rows = [new TableRow({ children: [cell("Description", true), cell("Qty", true), cell("Unit", true), cell("Unit price", true), cell("Total", true)] })];
    for (const item of items) rows.push(new TableRow({ children: [cell(text(item.description)), cell(String(Number(item.quantity ?? 0))), cell(text(item.unit) || "item"), cell(money(Number(item.unit_price || 0), currency)), cell(money(Number(item.quantity || 0) * Number(item.unit_price || 0), currency))] }));
    const headerChildren: Paragraph[] = [];
    if (logo) headerChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new ImageRun({ data: logo.data, transformation: { width: 180, height: 90 }, type: logo.type })] }));
    headerChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: text(s.business_name) || "JobPilot", bold: true, size: 34 })] }));
    headerChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "QUOTATION", bold: true, size: 24 })] }));
    const doc = new Document({ sections: [{ properties: {}, children: [
      ...headerChildren,
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ children: [cell(`Quote number: ${text(quote.quote_number)}`), cell(`Quote date: ${text(d.quoteDate) || text(quote.created_at).slice(0,10)}`)] }),
        new TableRow({ children: [cell(`Valid until: ${text(quote.valid_until)}`), cell(`Status: ${text(quote.status) || "draft"}`)] })
      ] }),
      new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: "From", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: text(s.business_name) })] }),
      new Paragraph({ children: [new TextRun({ text: companyAddress })] }),
      new Paragraph({ children: [new TextRun({ text: [s.phone, s.email, s.website].filter(Boolean).join("  |  ") })] }),
      new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: "Customer", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: text(customer?.name), bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: customerAddress })] }),
      new Paragraph({ children: [new TextRun({ text: [customer?.phone, customer?.email].filter(Boolean).join("  |  ") })] }),
      new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: text(quote.title), bold: true, size: 24 })] }),
      new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: text(quote.description) })] }),
      new Paragraph({ children: [new TextRun({ text: "Job / site address: ", bold: true }), new TextRun({ text: text(d.jobAddress) })] }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 }, top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } }, rows }),
      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 180 }, children: [new TextRun({ text: `Subtotal: ${money(subtotal, currency)}` })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Discount: ${money(discount, currency)}` })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `VAT: ${money(vat, currency)}` })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 80, after: 220 }, children: [new TextRun({ text: `TOTAL: ${money(total, currency)}`, bold: true, size: 26 })] }),
      new Paragraph({ children: [new TextRun({ text: "Payment / deposit: ", bold: true }), new TextRun({ text: text(d.paymentTerms) })] }),
      new Paragraph({ children: [new TextRun({ text: "Estimated start: ", bold: true }), new TextRun({ text: text(d.startDate) })] }),
      new Paragraph({ children: [new TextRun({ text: "Estimated completion: ", bold: true }), new TextRun({ text: text(d.completion) })] }),
      new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: "Terms, exclusions and additional information", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: text(quote.notes) || text(s.quote_footer) })] }),
      new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: "Acceptance", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: text(d.acceptance) || "I/We accept this quotation and agree to the stated terms and conditions." })] }),
      new Paragraph({ spacing: { before: 250 }, children: [new TextRun({ text: "Signature: ______________________________    Date: __________________" })] })
    ] }] });
    const bytes = await Packer.toBuffer(doc);
    const safe = (text(quote.quote_number) || "quote").replace(/[^a-z0-9_-]+/gi, "-");
    return new Response(bytes, { headers: { ...cors, "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${safe}.docx"`, "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Could not generate Word document." }, 500);
  }
});
