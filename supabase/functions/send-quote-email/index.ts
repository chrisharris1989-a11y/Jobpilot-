import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const text = (v: unknown) => String(v ?? "").trim();

function escapeHtml(value: unknown) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Authentication required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (!supabaseUrl || !anonKey) throw new Error("Supabase function configuration is incomplete.");
    if (!resendKey) throw new Error("Resend is not configured yet. Add RESEND_API_KEY to the Supabase function secrets.");
    if (!fromEmail) throw new Error("Resend sender is not configured yet. Add RESEND_FROM_EMAIL to the Supabase function secrets.");

    const sb = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) return json({ error: "Authentication required." }, 401);

    const { quoteId } = await req.json();
    if (!quoteId) return json({ error: "quoteId is required." }, 400);

    const { data: membership, error: membershipError } = await sb
      .from("company_members")
      .select("company_id,role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: "No active company membership found." }, 403);

    const { data: quote, error: quoteError } = await sb
      .from("quotes")
      .select("id,customer_id,quote_number,status")
      .eq("id", quoteId)
      .eq("company_id", membership.company_id)
      .maybeSingle();
    if (quoteError) throw quoteError;
    if (!quote) return json({ error: "Quote not found." }, 404);

    const { data: customer, error: customerError } = await sb
      .from("customers")
      .select("id,name,email")
      .eq("id", quote.customer_id)
      .eq("company_id", membership.company_id)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer?.email) return json({ error: "This customer does not have an email address saved." }, 400);

    const { data: settings, error: settingsError } = await sb
      .from("user_settings")
      .select("business_name,email")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settingsError) throw settingsError;

    const businessName = text(settings?.business_name) || "our business";
    const replyTo = text(settings?.email) || fromEmail;
    const subject = `Quotation ${quote.quote_number || ""} from ${businessName}`.trim();
    const body = [
      `Hi ${customer.name || "there"},`,
      "",
      "Here is the quote you requested.",
      "",
      "Feel free to get in touch if you have any questions.",
      "",
      "Thanks.",
    ].join("\n");

    // Generate the exact same DOCX used by the existing Word quote download flow.
    const docxResponse = await fetch(`${supabaseUrl}/functions/v1/generate-quote-docx`, {
      method: "POST",
      headers: {
        Authorization: auth,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quoteId }),
    });
    if (!docxResponse.ok) {
      const detail = await docxResponse.text();
      throw new Error(`Quote document generation failed: ${detail || docxResponse.status}`);
    }

    const docxBytes = new Uint8Array(await docxResponse.arrayBuffer());
    if (docxBytes.length < 4 || docxBytes[0] !== 0x50 || docxBytes[1] !== 0x4b) {
      throw new Error("Quote document generation returned an invalid Word document.");
    }

    const filename = `${text(quote.quote_number) || "quote"}.docx`.replace(/[^a-z0-9._-]+/gi, "-");
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `jobpilot-quote-${quote.id}`,
      },
      body: JSON.stringify({
        from: fromEmail.includes("<") ? fromEmail : `${businessName} <${fromEmail}>`,
        to: [customer.email],
        reply_to: replyTo,
        subject,
        text: body,
        html: `<p>Hi ${escapeHtml(customer.name || "there")},</p><p>Here is the quote you requested.</p><p>Feel free to get in touch if you have any questions.</p><p>Thanks.</p>`,
        attachments: [{
          filename,
          content: toBase64(docxBytes),
        }],
        tags: [
          { name: "type", value: "quote" },
          { name: "quote_id", value: String(quote.id) },
        ],
      }),
    });

    const resendResult = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      console.error("Resend quote email failed", resendResponse.status, resendResult);
      throw new Error(text(resendResult?.message) || text(resendResult?.name) || `Resend returned ${resendResponse.status}.`);
    }

    const { error: statusError } = await sb
      .from("quotes")
      .update({ status: "sent" })
      .eq("id", quote.id)
      .eq("company_id", membership.company_id);
    if (statusError) throw statusError;

    return json({
      ok: true,
      emailId: resendResult?.id || null,
      customerEmail: customer.email,
      quoteId: quote.id,
    });
  } catch (error) {
    console.error("send-quote-email failed", error);
    return json({ error: error instanceof Error ? error.message : "Could not send quote email." }, 500);
  }
});
