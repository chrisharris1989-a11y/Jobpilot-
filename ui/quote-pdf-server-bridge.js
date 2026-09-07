import { supabase } from "../supabase.js";

(() => {
  if (window.__jobpilotQuotePdfServerBridgeInstalled) return;
  window.__jobpilotQuotePdfServerBridgeInstalled = true;

  const preview = () => window.__jobpilotServerQuotePdfPreview || window.__jobpilotPreviewQuotePdf;
  const generate = () => window.__jobpilotServerQuotePdfGenerate || window.__jobpilotGenerateQuotePdf;

  document.addEventListener("click", async e => {
    const button = e.target.closest(".jpq2-pdf");
    if (!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const n = (document.getElementById("pageTitle")?.textContent || "").replace(/^Quote #/i, "").trim();
    if (!n) return alert("Quote could not be identified.");
    const { data: q, error } = await supabase.from("quotes").select("id").eq("quote_number", n).maybeSingle();
    if (error) return alert(error.message);
    if (!q) return alert("Quote could not be found.");
    try { await preview()?.(q.id); } catch (x) { alert(x.message || "The PDF could not be generated."); }
  }, true);

  document.addEventListener("submit", async e => {
    const form = e.target.closest("#jpq2Form");
    if (!form) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const button = form.querySelector("#q2create");
    const msg = form.querySelector("#q2msg");
    button.disabled = true;
    button.textContent = "Creating…";
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("You are not logged in.");
      const { data: member, error: me } = await supabase.from("company_members").select("company_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
      if (me) throw me;
      if (!member) throw new Error("No active company membership was found.");

      const customerId = form.querySelector("#q2c")?.value;
      const { data: customer, error: ce } = await supabase.from("customers").select("*").eq("id", customerId).maybeSingle();
      if (ce) throw ce;
      if (!customer) throw new Error("Select a customer.");

      const { data: settings } = await supabase.from("user_settings").select("quote_prefix,next_quote_number").eq("user_id", user.id).maybeSingle();
      const prefix = settings?.quote_prefix || "QUO-";
      const nextNumber = Number(settings?.next_quote_number || 1);
      const quoteNumber = `${prefix}${String(nextNumber).padStart(5, "0")}`;
      const rows = [...form.querySelectorAll(".jpq2-line")].map(r => ({
        description: r.querySelector('[data-k="d"]')?.value.trim() || "",
        quantity: Number(r.querySelector('[data-k="q"]')?.value || 0),
        unit: r.querySelector('[data-k="u"]')?.value.trim() || "item",
        unit_price: Number(r.querySelector('[data-k="p"]')?.value || 0)
      })).filter(x => x.description || x.quantity || x.unit_price);
      const subtotal = rows.reduce((sum, x) => sum + x.quantity * x.unit_price, 0);
      const discount = Math.max(0, Number(form.querySelector("#q2disc")?.value || 0));
      const taxable = Math.max(0, subtotal - discount);
      const vatPercent = Number(form.querySelector("#q2vat")?.value || 0);
      const vat = taxable * vatPercent / 100;
      const total = taxable + vat;
      const details = {
        quoteDate: form.querySelector("#q2date")?.value || "",
        jobAddress: form.querySelector("#q2a")?.value.trim() || "",
        paymentTerms: form.querySelector("#q2pay")?.value.trim() || "",
        startDate: form.querySelector("#q2start")?.value || "",
        completion: form.querySelector("#q2comp")?.value.trim() || "",
        discount,
        lineItems: rows,
        acceptance: "I/We accept this quotation and agree to the stated terms and conditions.",
        templateId: form.querySelector("#q2tpl")?.value || null
      };
      const { data: quote, error: qe } = await supabase.from("quotes").insert({
        company_id: member.company_id,
        user_id: user.id,
        customer_id: customer.id,
        quote_number: quoteNumber,
        status: "draft",
        title: form.querySelector("#q2t")?.value.trim() || "Quotation",
        description: form.querySelector("#q2desc")?.value.trim() || "",
        subtotal,
        vat,
        total,
        vat_percent: vatPercent,
        valid_until: form.querySelector("#q2valid")?.value || null,
        notes: form.querySelector("#q2notes")?.value.trim() || "",
        details
      }).select("*").single();
      if (qe) throw qe;
      await supabase.from("user_settings").update({ next_quote_number: nextNumber + 1 }).eq("user_id", user.id);

      form.closest(".modal")?.remove();
      const fn = preview();
      if (!fn) throw new Error("Server PDF viewer is not ready. Please refresh JobPilot and try again.");
      await fn(quote.id);
      location.reload();
    } catch (x) {
      msg.textContent = x.message || "Could not create quote.";
      button.disabled = false;
      button.textContent = "Create Quote & PDF";
    }
  }, true);
})();
