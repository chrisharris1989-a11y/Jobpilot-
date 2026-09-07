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

rememberQuoteCreation();
window.addEventListener("load", () => setTimeout(generatePendingDocument, 700));
