import { supabase } from "./supabase.js";

async function generateQuoteDocx(quoteId) {
  if (!quoteId) throw new Error("Quote could not be identified.");
  const { data, error } = await supabase.functions.invoke("generate-quote-docx", { body: { quoteId } });
  if (error) throw error;
  if (!(data instanceof Blob)) throw new Error("Word document could not be generated.");
  const type = data.type || "";
  if (!type.includes("word") && !type.includes("officedocument")) throw new Error("The server returned an invalid Word document.");
  return data;
}

async function downloadQuoteDocx(quoteId, filename = "quote.docx") {
  const blob = await generateQuoteDocx(quoteId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return blob;
}

window.__jobpilotGenerateQuoteDocx = generateQuoteDocx;
window.__jobpilotDownloadQuoteDocx = downloadQuoteDocx;
