import { supabase } from "../supabase.js";

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function install() {
  for (let i = 0; i < 100; i++) {
    if (typeof window.openQuoteBuilder === "function") break;
    await sleep(50);
  }
  if (typeof window.openQuoteBuilder !== "function" || window.__jobpilotQuoteDocxWrapped) return;
  const original = window.openQuoteBuilder;
  window.openQuoteBuilder = async function (...args) {
    // The builder owns the save UI. We only add the document step after it returns.
    const before = await supabase.auth.getUser();
    const userId = before?.data?.user?.id;
    let result;
    try {
      result = await original.apply(this, args);
    } finally {
      // quote-builder currently closes/reloads after a successful save, so a successful
      // result is not available to this wrapper. The normal quote list action below is
      // the reliable document-generation path.
    }
    return result;
  };
  window.__jobpilotQuoteDocxWrapped = true;
}
install();
