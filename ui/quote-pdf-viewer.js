// JobPilot quote PDF viewer.
// Generated quote PDFs are routed to an in-app preview through one narrow
// anchor hook. We deliberately do not override window.open(), document.createElement(),
// or document-wide click handling because those hooks can make the whole app sluggish.
(() => {
  if (window.__jobpilotQuotePdfViewerInstalled) return;
  window.__jobpilotQuotePdfViewerInstalled = true;

  const PDF_JS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  let pdfJsPromise;

  function loadPdfJs() {
    if (!pdfJsPromise) {
      pdfJsPromise = import(/* @vite-ignore */ PDF_JS).then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        return pdfjs;
      });
    }
    return pdfJsPromise;
  }

  async function captureGeneratedPdf(generate) {
    let capturedUrl = "";
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
    const response = await fetch(capturedUrl);
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
          <div><h2 style="margin:0">${title}</h2><p style="margin:3px 0 0;color:#64748b;font-size:12px">Previewing inside JobPilot</p></div>
          <div style="display:flex;gap:8px"><button type="button" class="button secondary" id="jpQuotePdfOpen">Open PDF</button><button type="button" class="button secondary" id="jpQuotePdfClose">Close</button></div>
        </div>
        <div id="jpQuotePdfPages" style="flex:1;overflow:auto;background:#eef0f3;padding:18px;text-align:center"></div>
      </div>`;
    document.body.appendChild(modal);

    let closed = false;
    let observer = null;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      observer?.disconnect();
      URL.revokeObjectURL(url);
      modal.remove();
    };
    modal.querySelector("#jpQuotePdfClose").onclick = cleanup;
    modal.addEventListener("click", e => { if (e.target === modal) cleanup(); });
    modal.querySelector("#jpQuotePdfOpen").onclick = () => window.open(url, "_blank", "noopener,noreferrer");

    const pages = modal.querySelector("#jpQuotePdfPages");
    pages.innerHTML = `<div style="padding:35px;color:#64748b">Loading quote PDF…</div>`;

    loadPdfJs()
      .then(pdfjs => pdfjs.getDocument({ url }).promise)
      .then(pdf => {
        if (closed) return;
        pages.innerHTML = "";

        const holders = [];
        const renderPage = async (pageNo, holder) => {
          if (closed || holder.dataset.rendered === "true") return;
          holder.dataset.rendered = "true";
          try {
            const page = await pdf.getPage(pageNo);
            const base = page.getViewport({ scale: 1 });
            const maxWidth = Math.max(300, Math.min(900, pages.clientWidth - 36));
            const scale = Math.min(1.25, maxWidth / base.width);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            canvas.style.cssText = "display:block;max-width:100%;height:auto;";
            holder.replaceChildren(canvas);
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          } catch (error) {
            holder.dataset.rendered = "false";
            holder.innerHTML = `<div style="padding:25px;color:#b91c1c">Page ${pageNo} could not be rendered.</div>`;
            console.error("JobPilot quote PDF page preview failed", error);
          }
        };

        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
          const holder = document.createElement("div");
          holder.style.cssText = "display:block;max-width:900px;min-height:120px;margin:0 auto 18px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;color:#64748b;";
          holder.textContent = `Loading page ${pageNo}…`;
          pages.appendChild(holder);
          holders.push({ pageNo, holder });
        }

        observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const item = holders.find(x => x.holder === entry.target);
            if (item) renderPage(item.pageNo, item.holder);
          }
        }, { root: pages, rootMargin: "400px 0px" });
        holders.forEach(x => observer.observe(x.holder));
        if (holders[0]) renderPage(1, holders[0].holder);
      })
      .catch(error => {
        console.error("JobPilot quote PDF preview failed", error);
        if (!closed) pages.innerHTML = `<div style="padding:35px;color:#b91c1c">Could not preview this PDF inside JobPilot. Use Open PDF to view it in the browser.</div>`;
      });
  }

  window.__jobpilotPreviewQuotePdf = async generate => {
    const url = await captureGeneratedPdf(generate);
    showViewer(url);
  };

  window.__jobpilotShowQuotePdf = showViewer;

  // Normal quote generation (including Create Quote & PDF and the old View PDF
  // button) should now preview inside JobPilot. The Forms Download action opts
  // out by setting this flag temporarily.
  HTMLAnchorElement.prototype.click = function () {
    if (window.__jobpilotQuotePdfViewerMode !== "download" && this.href && this.href.startsWith("blob:")) {
      const url = this.href;
      showViewer(url);
      return;
    }
    return originalAnchorClick.call(this);
  };
})();
