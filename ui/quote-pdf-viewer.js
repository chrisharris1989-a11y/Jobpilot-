// JobPilot quote PDF viewer.
// Preview is explicitly invoked by Quote Forms. It never overrides browser-wide
// click/open/createElement APIs and does not parse PDF pages in JavaScript.
(() => {
  if (window.__jobpilotQuotePdfViewerInstalled) return;
  window.__jobpilotQuotePdfViewerInstalled = true;

  const originalAnchorClick = HTMLAnchorElement.prototype.click;

  async function captureGeneratedPdf(generate) {
    let capturedUrl = "";

    // The quote generator currently creates a temporary blob URL and triggers
    // a download. Intercept only that one synchronous anchor action while the
    // requested PDF is being generated, then immediately restore the prototype.
    HTMLAnchorElement.prototype.click = function () {
      if (this.href && (this.href.startsWith("blob:") || /\.pdf(?:$|[?#])/i.test(this.href))) {
        capturedUrl = this.href;
        return;
      }
      return originalAnchorClick.call(this);
    };

    try {
      await generate();
    } finally {
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }

    if (!capturedUrl) throw new Error("The quote PDF could not be prepared for preview.");

    // Copy the temporary blob before the generator revokes it.
    const response = await fetch(capturedUrl);
    if (!response.ok) throw new Error("The generated quote PDF could not be loaded.");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  function showViewer(url, title = "Quote PDF") {
    const existing = document.getElementById("jobpilot-quote-pdf-viewer");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "jobpilot-quote-pdf-viewer";
    modal.className = "modal show";
    modal.innerHTML = `
      <div class="modal-content" style="width:96vw;max-width:1100px;height:92vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border,#e5e7eb)">
          <div>
            <h2 style="margin:0">${title}</h2>
            <p style="margin:3px 0 0;color:#64748b;font-size:12px">Previewing inside JobPilot</p>
          </div>
          <div style="display:flex;gap:8px">
            <button type="button" class="button secondary" id="jpQuotePdfOpen">Open PDF</button>
            <button type="button" class="button secondary" id="jpQuotePdfClose">Close</button>
          </div>
        </div>
        <div style="flex:1;background:#eef0f3;padding:12px;min-height:0">
          <object id="jpQuotePdfObject" type="application/pdf" data="${url}" aria-label="Quote PDF preview" style="display:block;width:100%;height:100%;border:0;background:#fff">
            <div style="padding:35px;text-align:center;color:#64748b">
              This browser cannot display the PDF inside JobPilot. Use Open PDF instead.
            </div>
          </object>
        </div>
      </div>`;
    document.body.appendChild(modal);

    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      URL.revokeObjectURL(url);
      modal.remove();
    };

    modal.querySelector("#jpQuotePdfClose").onclick = cleanup;
    modal.addEventListener("click", event => {
      if (event.target === modal) cleanup();
    });
    modal.querySelector("#jpQuotePdfOpen").onclick = () => {
      window.open(url, "_blank", "noopener,noreferrer");
    };
  }

  window.__jobpilotPreviewQuotePdf = async generate => {
    const url = await captureGeneratedPdf(generate);
    showViewer(url);
  };

  window.__jobpilotShowQuotePdf = showViewer;
})();
