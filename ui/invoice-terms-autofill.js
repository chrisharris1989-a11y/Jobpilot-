import { supabase } from "../supabase.js";

(() => {
  let templatePromise = null;

  async function loadInvoiceTerms() {
    if (templatePromise) return templatePromise;

    templatePromise = (async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return "";

      let companyId = null;

      const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!membershipError && membership?.company_id) {
        companyId = membership.company_id;
      } else {
        const { data: ownedCompany, error: ownerError } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();

        if (ownerError || !ownedCompany?.id) return "";
        companyId = ownedCompany.id;
      }

      const { data, error } = await supabase
        .from("company_document_templates")
        .select("content")
        .eq("company_id", companyId)
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
    if (!textarea) return;

    // Never overwrite notes the user has already entered.
    if (textarea.value.trim()) return;

    // Prevent duplicate requests while this textarea is waiting for the template.
    if (textarea.dataset.jpInvoiceTermsLoading === "true") return;
    textarea.dataset.jpInvoiceTermsLoading = "true";

    try {
      const template = await loadInvoiceTerms();

      // The template may have been unavailable during an earlier scan. If so,
      // allow a later scan to retry rather than permanently marking the field.
      if (!template) {
        delete textarea.dataset.jpInvoiceTermsLoading;
        return;
      }

      if (textarea.value.trim()) return;

      textarea.value = template;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.dataset.jpInvoiceTermsHandled = "true";
    } catch (error) {
      console.warn("JobPilot invoice terms autofill:", error);
      delete textarea.dataset.jpInvoiceTermsLoading;
    }
  }

  function scan() {
    document
      .querySelectorAll("#invoiceNotes")
      .forEach(textarea => fillInvoiceNotes(textarea));
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });

  // Also try when the invoice Notes field is focused. This covers cases where
  // the modal is rendered before the authenticated session has fully settled.
  document.addEventListener("focusin", event => {
    if (event.target?.id === "invoiceNotes") {
      fillInvoiceNotes(event.target);
    }
  });

  scan();
})();
