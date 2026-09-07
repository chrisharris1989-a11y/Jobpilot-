import { supabase } from "./supabase.js";

const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function readErrorResponse(response) {
  try {
    const text = await response.text();
    if (!text) return `Word document generation failed (${response.status}).`;
    try {
      const parsed = JSON.parse(text);
      return String(parsed?.error || parsed?.message || text);
    } catch {
      return text;
    }
  } catch {
    return `Word document generation failed (${response.status}).`;
  }
}

function looksLikeDocx(bytes) {
  return bytes?.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

async function generateQuoteDocx(quoteId) {
  if (!quoteId) throw new Error("Quote could not be identified.");

  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("JobPilot Supabase configuration is missing.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-quote-docx`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": supabaseKey,
      "Content-Type": "application/json",
      "Accept": DOCX_CONTENT_TYPE
    },
    body: JSON.stringify({ quoteId })
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!looksLikeDocx(bytes)) {
    const preview = new TextDecoder().decode(bytes.slice(0, 1000));
    let detail = "The server returned an invalid Word document.";
    try {
      const parsed = JSON.parse(preview);
      detail = String(parsed?.error || parsed?.message || detail);
    } catch {
      if (preview.trim() && !contentType.includes("word") && !contentType.includes("officedocument")) {
        detail = preview.trim();
      }
    }
    throw new Error(detail);
  }

  return new Blob([buffer], { type: DOCX_CONTENT_TYPE });
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
