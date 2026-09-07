import { supabase } from "./supabase.js";

async function extractFunctionError(error) {
  if (!error) return null;
  try {
    const response = error.context;
    if (response && typeof response.clone === "function") {
      const clone = response.clone();
      const contentType = (clone.headers.get("content-type") || "").toLowerCase();
      const body = await clone.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          if (parsed?.error) return String(parsed.error);
          if (parsed?.message) return String(parsed.message);
        } catch {}
        if (!contentType.includes("word") && !contentType.includes("officedocument")) return body;
      }
    }
  } catch (parseError) {
    console.warn("Could not read Word generator error response:", parseError);
  }
  return error.message || null;
}

function isDocxContentType(type = "") {
  const value = String(type).toLowerCase();
  return value.includes("word") || value.includes("officedocument") || value.includes("application/octet-stream");
}

async function generateQuoteDocx(quoteId) {
  if (!quoteId) throw new Error("Quote could not be identified.");

  const { data, error } = await supabase.functions.invoke("generate-quote-docx", {
    body: { quoteId }
  });

  if (error) {
    const detail = await extractFunctionError(error);
    throw new Error(detail || "The Word document generator failed.");
  }

  // Supabase Functions may expose a binary response as Blob, ArrayBuffer or Uint8Array
  // depending on the browser/runtime. Normalise all supported binary forms to a Blob.
  if (data instanceof Blob) {
    if (!isDocxContentType(data.type)) {
      const probe = await data.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(probe);
      if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04)) {
        throw new Error("The server returned an invalid Word document.");
      }
    }
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  if (ArrayBuffer.isView(data)) {
    return new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  // Some runtimes return the binary body as a plain object/typed representation.
  if (data && typeof data === "object" && Array.isArray(data.data)) {
    return new Blob([new Uint8Array(data.data)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  throw new Error("Word document could not be generated.");
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
