import { supabase } from "../supabase.js";

(() => {
  let templatePromise = null;

  async function loadInvoiceTerms() {
    if (templatePromise) return templatePromise;

    templatePromise = (async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return "";

      const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership?.company_id) return "";

      const { data, error } = await supabase
        .from("company_document_templates")
        .select("content")
        .eq("company_id", membership.company_id)
        .eq("document_type", "invoice_terms")
        .maybeSingle();

      if (error) {
        console.warn("JobPilot invoice terms template lookup:", error);
        return "";
      }

      return data?.content || "";
    })();

    return templatePromise;
  }

  async function fillInvoiceNotes(textarea) {
    if (!textarea || textarea.dataset.jpInvoiceTermsHandled === "true") return;
    textarea.dataset.jpInvoiceTermsHandled = "true";

    // Never overwrite notes that the user has already entered.
    if (textarea.value.trim()) return;

    const template = await loadInvoiceTerms();
    if (!template || textarea.value.trim()) return;

    textarea.value = template;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function scan() {
    document
      .querySelectorAll("#invoiceNotes")
      .forEach(textarea => fillInvoiceNotes(textarea));
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
})();
