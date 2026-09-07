import { supabase } from "../supabase.js";

const KEY = "jobpilot_pending_quote_docx";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function rememberQuoteCreation() {
  document.addEventListener("submit", e => {
    if (!e.target?.matches?.("#jpQuoteForm")) return;
    localStorage.setItem(KEY, JSON.stringify({ startedAt: Date.now() }));
  }, true);
}

async function generatePendingDocument() {
  let pending;
  try { pending = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { pending = null; }
  if (!pending?.startedAt || typeof window.__jobpilotDownloadQuoteDocx !== "function") return;

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return;
    const { data: quote } = await supabase.from("quotes")
      .select("id,quote_number,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (quote?.id && new Date(quote.created_at).getTime() >= pending.startedAt - 5000) {
      localStorage.removeItem(KEY);
      try {
        await window.__jobpilotDownloadQuoteDocx(quote.id, `${quote.quote_number || "quote"}.docx`);
      } catch (err) {
        console.error("JobPilot Word quote generation failed:", err);
        localStorage.setItem(KEY, JSON.stringify(pending));
      }
      return;
    }
    await sleep(500);
  }
}

// The Quotes page originally used View to open the internal quote profile. For the
// document workflow, View now produces the actual Word quote. Capture the click
// before app.js's older View handler so it cannot navigate away instead.
function installQuoteViewWordAction() {
  document.addEventListener("click", async event => {
    const button = event.target?.closest?.(".quote-view[data-quote-id]");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const quoteId = button.dataset.quoteId;
    if (!quoteId) return;

    if (typeof window.__jobpilotDownloadQuoteDocx !== "function") {
      alert("The Word quote generator is still loading. Please try again in a moment.");
      return;
    }

    if (button.dataset.wordBusy === "1") return;
    button.dataset.wordBusy = "1";
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Creating Word…";

    try {
      const { data: quote, error } = await supabase
        .from("quotes")
        .select("id,quote_number")
        .eq("id", quoteId)
        .maybeSingle();
      if (error) throw error;
      if (!quote) throw new Error("Quote could not be found.");

      await window.__jobpilotDownloadQuoteDocx(
        quote.id,
        `${quote.quote_number || "quote"}.docx`
      );
    } catch (err) {
      console.error("JobPilot Word quote View failed:", err);
      alert(err?.message || "The Word document could not be generated.");
    } finally {
      button.disabled = false;
      button.dataset.wordBusy = "0";
      button.textContent = originalText;
    }
  }, true);
}

rememberQuoteCreation();
installQuoteViewWordAction();
window.addEventListener("load", () => setTimeout(generatePendingDocument, 700));
