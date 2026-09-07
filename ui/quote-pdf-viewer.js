import { supabase } from "../supabase.js";

(() => {
  if (window.__jobpilotQuotePdfViewerInstalled) return;
  window.__jobpilotQuotePdfViewerInstalled = true;

  let activeUrl = null;

  async function serverPdf(quoteId) {
    if (!quoteId) throw new Error("Quote could not be identified.");
    const { data, error } = await supabase.functions.invoke("generate-quote-pdf", {
      body: { quoteId }
    });
    if (error) throw error;
    if (!(data instanceof Blob)) throw new Error("The PDF server returned an invalid document.");
    if (data.type && !data.type.includes("application/pdf")) {
      let message = "The PDF server returned an error.";
      try { message = JSON.parse(await data.text()).error || message; } catch {}
      throw new Error(message);
    }
    return data;
  }

  function styles() {
    if (document.getElementById("jpQuotePdfServerStyles")) return;
    const style = document.createElement("style");
    style.id = "jpQuotePdfServerStyles";
    style.textContent = `
      #jobpilot-quote-pdf-viewer .jp-pdf-shell{width:96vw;max-width:1200px;height:94vh;display:flex;flex-direction:column;padding:0;overflow:hidden}
      #jobpilot-quote-pdf-viewer .jp-pdf-body{flex:1;min-height:0;background:#e9edf2;padding:10px}
      #jobpilot-quote-pdf-viewer iframe{display:block;width:100%;height:100%;border:0;background:#fff;border-radius:6px}
      #jobpilot-quote-pdf-viewer .jp-pdf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border,#e5e7eb);background:#fff}
      #jobpilot-quote-pdf-viewer .jp-pdf-head h2{margin:0}.jp-pdf-head p{margin:3px 0 0;color:#64748b;font-size:12px}
      #jobpilot-quote-pdf-viewer .jp-pdf-actions{display:flex;gap:8px;align-items:center}
      @media(max-width:700px){#jobpilot-quote-pdf-viewer .jp-pdf-shell{width:100vw;height:100vh}#jobpilot-quote-pdf-viewer .jp-pdf-body{padding:0}}
    `;
    document.head.appendChild(style);
  }

  async function downloadPdf(quoteId) {
    const blob = await serverPdf(quoteId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quote.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function showPdf(quoteId, mode = "view") {
    styles();
    const existing = document.getElementById("jobpilot-quote-pdf-viewer");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "jobpilot-quote-pdf-viewer";
    modal.className = "modal show";
    modal.innerHTML = `<div class="modal-content jp-pdf-shell"><div class="jp-pdf-head"><div><h2>Quote PDF</h2><p>PDF generated securely by JobPilot — your browser is only displaying the finished document.</p></div><div class="jp-pdf-actions"><button type="button" class="button secondary" id="jpQuotePdfDownload">Download PDF</button><button type="button" class="button secondary" id="jpQuotePdfClose">Close</button></div></div><div class="jp-pdf-body"><div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b">Generating secure PDF…</div></div></div>`;
    document.body.appendChild(modal);

    const close = () => {
      if (activeUrl) { URL.revokeObjectURL(activeUrl); activeUrl = null; }
      modal.remove();
    };
    modal.querySelector("#jpQuotePdfClose").onclick = close;
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    modal.querySelector("#jpQuotePdfDownload").onclick = async () => {
      const button = modal.querySelector("#jpQuotePdfDownload");
      button.disabled = true;
      try { await downloadPdf(quoteId); } catch (error) { alert(error.message || "The PDF could not be downloaded."); }
      finally { button.disabled = false; }
    };

    try {
      const blob = await serverPdf(quoteId);
      activeUrl = URL.createObjectURL(blob);
      modal.querySelector(".jp-pdf-body").innerHTML = `<iframe title="JobPilot quote PDF" src="${activeUrl}"></iframe>`;
      if (mode === "download") await downloadPdf(quoteId);
    } catch (error) {
      modal.querySelector(".jp-pdf-body").innerHTML = `<div style="padding:30px;color:#b91c1c">${String(error.message || "The PDF could not be generated.").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;", "'":"&#039;"}[c]))}</div>`;
    }
  }

  window.__jobpilotServerQuotePdf = serverPdf;
  window.__jobpilotGenerateQuotePdf = async quoteId => downloadPdf(quoteId);
  window.__jobpilotPreviewQuotePdf = async quoteId => showPdf(quoteId, "view");
  window.__jobpilotShowQuotePdf = async quoteId => showPdf(quoteId, "view");
})();
