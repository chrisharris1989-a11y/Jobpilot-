import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const clean = (v: unknown) => String(v ?? "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!url || !anon || !service || !resendKey || !fromEmail) return json({ error: "Email service is not configured." }, 500);

  const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user: caller } = {}, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const quoteId = clean(body.quote_id);
  const to = clean(body.to).toLowerCase();
  const pdfBase64 = clean(body.pdf_base64);
  if (!quoteId || !to || !to.includes("@") || !pdfBase64) return json({ error: "Quote, recipient email and PDF are required." }, 400);
  if (pdfBase64.length > 15_000_000) return json({ error: "The PDF is too large to email." }, 413);

  const { data: membership } = await admin.from("company_members").select("company_id, role, status").eq("user_id", caller.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return json({ error: "You are not an active company member." }, 403);

  const { data: quote, error: quoteError } = await admin.from("quotes").select("id, company_id, customer_id, quote_number, title, status").eq("id", quoteId).eq("company_id", membership.company_id).maybeSingle();
  if (quoteError || !quote) return json({ error: "Quote could not be found for your company." }, 404);

  const subject = `Quote ${clean(body.quote_number || quote.quote_number) || "from JobPilot"} from ${clean(body.business_name) || "your business"}`;
  const total = clean(body.total);
  const validUntil = clean(body.valid_until);
  const businessName = clean(body.business_name) || "your business";
  const customerName = clean(body.customer_name) || "there";
  const title = clean(body.quote_title) || "your quotation";
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><p>Hi ${clean(customerName).replace(/[<>]/g, "")},</p><p>Please find attached your quotation from <strong>${businessName.replace(/[<>]/g, "")}</strong>.</p><p><strong>${title.replace(/[<>]/g, "")}</strong>${total ? `<br>Total: <strong>${total.replace(/[<>]/g, "")}</strong>` : ""}${validUntil ? `<br>Valid until: ${validUntil.replace(/[<>]/g, "")}` : ""}</p><p>If you have any questions or would like to go ahead, please reply to this email.</p><p>Kind regards,<br>${businessName.replace(/[<>]/g, "")}</p></body></html>`;

  const resendBody: any = {
    from: fromEmail,
    to: [to],
    subject,
    html,
    attachments: [{ filename: clean(body.pdf_file_name) || `Quote-${quote.quote_number || quote.id}.pdf`, content: pdfBase64 }]
  };
  const replyTo = clean(body.reply_to);
  if (replyTo && replyTo.includes("@")) resendBody.reply_to = replyTo;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(resendBody)
  });
  const result = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) return json({ error: result?.message || result?.name || "Resend could not send the email." }, 502);

  return json({ success: true, email_id: result?.id || null });
});
