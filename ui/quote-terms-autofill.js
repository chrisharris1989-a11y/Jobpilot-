import "./app-preferences.js";
import { supabase } from "../supabase.js";

(() => {
  let templatePromise = null;

  async function loadQuoteTerms() {
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
        .eq("document_type", "quote_terms")
        .maybeSingle();

      if (error) {
        console.warn("JobPilot quote terms template lookup:", error);
        return "";
      }
      return data?.content || "";
    })();

    return templatePromise;
  }

  async function fillQuoteNotes(textarea) {
    if (!textarea || textarea.value.trim()) return;
    if (textarea.dataset.jpQuoteTermsLoading === "true") return;
    textarea.dataset.jpQuoteTermsLoading = "true";

    try {
      const template = await loadQuoteTerms();
      if (!template) {
        delete textarea.dataset.jpQuoteTermsLoading;
        return;
      }
      if (textarea.value.trim()) return;

      textarea.value = template;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.dataset.jpQuoteTermsHandled = "true";
    } catch (error) {
      console.warn("JobPilot quote terms autofill:", error);
      delete textarea.dataset.jpQuoteTermsLoading;
    }
  }

  function scan() {
    document.querySelectorAll("#quoteNotes").forEach(fillQuoteNotes);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("focusin", event => {
    if (event.target?.id === "quoteNotes") fillQuoteNotes(event.target);
  });

  scan();
})();
