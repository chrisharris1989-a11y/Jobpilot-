import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const money = (value: unknown, currency = 'GBP') => {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  return `${symbol}${Number(value || 0).toFixed(2)}`;
};
const date = (value: unknown) => {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB');
};
const safe = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

function wrap(text: string, font: any, size: number, width: number) {
  const words = safe(text).split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

async function getData(supabase: any, quoteId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You are not logged in.');
  const { data: membership, error: membershipError } = await supabase
    .from('company_members').select('company_id,role').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) throw new Error('No active company membership was found.');

  const { data: quote, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).eq('company_id', membership.company_id).maybeSingle();
  if (quoteError) throw quoteError;
  if (!quote) throw new Error('Quote could not be found.');
  const { data: customer, error: customerError } = await supabase.from('customers').select('*').eq('id', quote.customer_id).eq('company_id', membership.company_id).maybeSingle();
  if (customerError) throw customerError;
  if (!customer) throw new Error('Customer could not be found.');
  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle();
  let template: any = null;
  if (quote.details?.templateId) {
    const { data } = await supabase.from('quote_templates').select('*').eq('id', quote.details.templateId).eq('company_id', membership.company_id).maybeSingle();
    template = data || null;
  }
  return { user, membership, quote, customer, settings: settings || {}, template };
}

async function standardPdf(data: any) {
  const { quote: q, customer: c, settings: s } = data;
  const d = q.details || {};
  const currency = s.currency || 'GBP';
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 42;
  const dark = rgb(0.07, 0.09, 0.12), muted = rgb(0.36, 0.40, 0.46), soft = rgb(0.95, 0.96, 0.97), border = rgb(0.84, 0.86, 0.89);
  let page = doc.addPage([W, H]);
  let y = H - 45;
  const newPage = () => { page = doc.addPage([W, H]); y = H - 45; };
  const ensure = (need: number) => { if (y - need < 45) newPage(); };
  const text = (value: string, x: number, size = 10, font = regular, color = dark) => { page.drawText(String(value || ''), { x, y, size, font, color }); };
  const paragraph = (value: string, x: number, width: number, size = 9.5, leading = 13, font = regular, color = dark) => {
    for (const line of String(value || '').split(/\r?\n/)) {
      const lines = wrap(line, font, size, width);
      for (const l of lines) { ensure(leading); page.drawText(l, { x, y, size, font, color }); y -= leading; }
      if (!lines.length) y -= leading;
    }
  };

  const businessName = s.business_name || s.businessName || 'JobPilot Business';
  const businessAddress = [s.address_line1 || s.address, s.city, s.postcode].filter(Boolean).join(', ');
  const customerAddress = [c.address_line1, c.address_line2, c.city, c.postcode].filter(Boolean).join(', ');

  page.drawText(businessName, { x: M, y, size: 20, font: bold, color: dark });
  const right = W - M;
  page.drawText('QUOTATION', { x: right - bold.widthOfTextAtSize('QUOTATION', 19), y, size: 19, font: bold, color: dark });
  y -= 25;
  if (businessAddress) { text(businessAddress, M, 8.5, regular, muted); y -= 12; }
  if (s.phone) { text(s.phone, M, 8.5, regular, muted); y -= 12; }
  if (s.email) { text(s.email, M, 8.5, regular, muted); y -= 12; }
  if (s.website) { text(s.website, M, 8.5, regular, muted); y -= 12; }
  const meta = [`Quote ${q.quote_number || '—'}`, `Date: ${date(d.quoteDate || q.created_at)}`, `Valid until: ${date(q.valid_until)}`];
  let my = H - 70;
  for (const line of meta) { page.drawText(line, { x: right - regular.widthOfTextAtSize(line, 8.5), y: my, size: 8.5, font: regular, color: muted }); my -= 12; }
  y -= 12;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1.5, color: dark }); y -= 24;

  page.drawText('PREPARED FOR', { x: M, y, size: 8, font: bold, color: muted });
  page.drawText('JOB / SITE', { x: W / 2, y, size: 8, font: bold, color: muted }); y -= 15;
  page.drawText(safe(c.name) || 'Customer', { x: M, y, size: 12, font: bold, color: dark });
  paragraph(customerAddress, M, W / 2 - M - 12, 8.5, 11, regular, muted);
  if (c.phone) { text(c.phone, M, 8.5, regular, muted); y -= 11; }
  if (c.email) { text(c.email, M, 8.5, regular, muted); y -= 11; }
  let jy = y + 48;
  for (const line of wrap(d.jobAddress || 'Not specified', regular, 9, W / 2 - M - 15)) { page.drawText(line, { x: W / 2, y: jy, size: 9, font: regular, color: dark }); jy -= 13; }
  y = Math.min(y, jy) - 22;

  page.drawText(safe(q.title) || 'Quotation', { x: M, y, size: 15, font: bold, color: dark }); y -= 18;
  if (q.description) { paragraph(q.description, M, W - 2 * M, 9, 13, regular, muted); y -= 10; }
  page.drawText('SCOPE & PRICING', { x: M, y, size: 8, font: bold, color: muted }); y -= 14;
  const cols = [M, M + 235, M + 285, M + 350, W - M];
  page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 22, color: soft });
  page.drawText('Description', { x: cols[0] + 7, y: y + 3, size: 8, font: bold, color: dark });
  page.drawText('Qty', { x: cols[1] + 7, y: y + 3, size: 8, font: bold, color: dark });
  page.drawText('Unit', { x: cols[2] + 7, y: y + 3, size: 8, font: bold, color: dark });
  page.drawText('Rate', { x: cols[3] + 7, y: y + 3, size: 8, font: bold, color: dark });
  page.drawText('Amount', { x: cols[4] - 50, y: y + 3, size: 8, font: bold, color: dark }); y -= 24;

  const items = Array.isArray(d.lineItems) ? d.lineItems : [];
  for (const item of items) {
    const descLines = wrap(item.description || '', regular, 8.5, 225);
    const h = Math.max(18, descLines.length * 11 + 5); ensure(h + 8);
    for (let i = 0; i < descLines.length; i++) page.drawText(descLines[i], { x: cols[0] + 7, y: y - i * 11, size: 8.5, font: regular, color: dark });
    page.drawText(String(item.quantity ?? ''), { x: cols[1] + 7, y, size: 8.5, font: regular, color: dark });
    page.drawText(String(item.unit || ''), { x: cols[2] + 7, y, size: 8.5, font: regular, color: dark });
    const rate = money(item.unit_price, currency), amount = money(Number(item.quantity || 0) * Number(item.unit_price || 0), currency);
    page.drawText(rate, { x: cols[3] + 7, y, size: 8.5, font: regular, color: dark });
    page.drawText(amount, { x: cols[4] - bold.widthOfTextAtSize(amount, 8.5), y, size: 8.5, font: regular, color: dark });
    page.drawLine({ start: { x: M, y: y - h + 3 }, end: { x: W - M, y: y - h + 3 }, thickness: 0.5, color: border });
    y -= h;
  }

  ensure(125); y -= 10;
  const subtotal = Number(q.subtotal || 0), discount = Number(d.discount || 0), vat = Number(q.vat || 0), total = Number(q.total || 0);
  const tx = W - M - 210;
  const rowTotal = (label: string, value: string, big = false) => { page.drawText(label, { x: tx, y, size: big ? 11 : 9, font: big ? bold : regular, color: dark }); page.drawText(value, { x: W - M - bold.widthOfTextAtSize(value, big ? 11 : 9), y, size: big ? 11 : 9, font: big ? bold : regular, color: dark }); y -= big ? 20 : 15; };
  rowTotal('Subtotal', money(subtotal, currency));
  if (discount) rowTotal('Discount', `-${money(discount, currency)}`);
  rowTotal(`VAT (${Number(q.vat_percent || 0)}%)`, money(vat, currency));
  page.drawLine({ start: { x: tx, y: y + 5 }, end: { x: W - M, y: y + 5 }, thickness: 1.2, color: dark }); y -= 4;
  rowTotal('TOTAL', money(total, currency), true);

  if (d.paymentTerms || d.startDate || d.completion) {
    ensure(70); y -= 12; page.drawText('PAYMENT & TIMING', { x: M, y, size: 8, font: bold, color: muted }); y -= 14;
    if (d.paymentTerms) { paragraph(d.paymentTerms, M, W - 2 * M, 9, 12); y -= 4; }
    if (d.startDate) { text(`Estimated start: ${date(d.startDate)}`, M, 9, regular, muted); y -= 12; }
    if (d.completion) { text(`Estimated completion: ${d.completion}`, M, 9, regular, muted); y -= 12; }
  }
  if (q.notes || s.quote_footer) {
    ensure(85); y -= 12; page.drawText('NOTES / TERMS', { x: M, y, size: 8, font: bold, color: muted }); y -= 14;
    paragraph(q.notes || s.quote_footer, M, W - 2 * M, 8.5, 11, regular, dark);
  }
  ensure(90); y -= 18; page.drawRectangle({ x: M, y: y - 58, width: W - 2 * M, height: 65, borderColor: border, borderWidth: 1 });
  page.drawText('ACCEPTANCE', { x: M + 12, y: y - 12, size: 8, font: bold, color: muted });
  paragraph(d.acceptance || 'I/We accept this quotation and agree to the stated terms and conditions.', M + 12, W - 2 * M - 24, 8.5, 11, regular, dark); y -= 44;
  page.drawText('Customer signature: ______________________________', { x: M + 12, y: y - 12, size: 8.5, font: regular, color: muted });
  page.drawText('Date: ____________', { x: W - M - 100, y: y - 12, size: 8.5, font: regular, color: muted });

  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) pages[i].drawText(`${i + 1} / ${pages.length}`, { x: W - M - 35, y: 22, size: 7, font: regular, color: muted });
  return await doc.save();
}

async function customPdf(data: any): Promise<Uint8Array | null> {
  const { quote: q, customer: c, settings: s, template, supabase } = data;
  if (!template?.file_path || !template?.field_layout || !Object.keys(template.field_layout).length) return null;
  const { data: file, error } = await supabase.storage.from('quote-templates').download(template.file_path);
  if (error || !file) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (template.file_type !== 'application/pdf') return null;
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const d = q.details || {};
  const values: Record<string, string> = {
    business_name: s.business_name || '', business_address: [s.address_line1 || s.address, s.city, s.postcode].filter(Boolean).join(', '), business_phone: s.phone || '', business_email: s.email || '', business_website: s.website || '', customer_name: c.name || '',
    customer_address: [c.address_line1, c.address_line2, c.city, c.postcode].filter(Boolean).join(', '), customer_phone: c.phone || '', customer_email: c.email || '', quote_number: q.quote_number || '', quote_date: date(d.quoteDate || q.created_at), valid_until: date(q.valid_until), job_address: d.jobAddress || '', title: q.title || '', description: q.description || '', subtotal: money(q.subtotal, s.currency || 'GBP'), discount: money(d.discount, s.currency || 'GBP'), vat: money(q.vat, s.currency || 'GBP'), total: money(q.total, s.currency || 'GBP'), payment_terms: d.paymentTerms || '', start_date: date(d.startDate), completion: d.completion || '', notes: q.notes || s.quote_footer || '', acceptance: d.acceptance || ''
  };
  const pages = doc.getPages();
  for (const [field, cfg] of Object.entries(template.field_layout as Record<string, any>)) {
    const value = values[field]; if (!value) continue;
    const page = pages[Math.max(0, Number(cfg.page || 1) - 1)]; if (!page) continue;
    const size = Number(cfg.size || 10), x = Number(cfg.x || 40), y = Number(cfg.y || 40), width = Number(cfg.width || 500);
    wrap(value, font, size, width).forEach((line, i) => page.drawText(line, { x, y: y - i * size * 1.25, size, font, color: rgb(0.07, 0.09, 0.12) }));
  }
  return await doc.save();
}

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      if (req.method !== 'POST') throw new Error('POST required.');
      const auth = req.headers.get('Authorization');
      if (!auth) throw new Error('Authorization required.');
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
      const { quoteId } = await req.json();
      if (!quoteId) throw new Error('quoteId is required.');
      const data = await getData(supabase, quoteId);
      data.supabase = supabase;
      const bytes = await customPdf(data) || await standardPdf(data);
      return new Response(bytes as BodyInit, { status: 200, headers: { ...cors, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${data.quote.quote_number || 'quote'}.pdf"`, 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('generate-quote-pdf', error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }
};
