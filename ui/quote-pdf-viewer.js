// JobPilot quote PDF viewer.
// Render quote PDFs with PDF.js inside JobPilot instead of an iframe/browser PDF tab.
(() => {
  if (window.__jobpilotQuotePdfViewerInstalled) return;
  window.__jobpilotQuotePdfViewerInstalled = true;

  const originalOpen = window.open.bind(window);
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  const originalCreateElement = document.createElement.bind(document);
  const PDF_JS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
  let pdfJsPromise;

  function isPdfUrl(url) {
    if (!url || typeof url !== "string") return false;
    const value = url.toLowerCase();
    return value.startsWith("blob:") || value.includes(".pdf") || value.startsWith("data:application/pdf");
  }

  function loadPdfJs() {
    if (!pdfJsPromise) {
      pdfJsPromise = import(PDF_JS).then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        return pdfjs;
      });
    }
    return pdfJsPromise;
  }

  function showViewer(url, title = "Quote PDF") {
    const existing = document.getElementById("jobpilot-quote-pdf-viewer");
    if (existing) existing.remove();
    const modal = originalCreateElement("div");
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
    const close = () => modal.remove();
    modal.querySelector("#jpQuotePdfClose").onclick = close;
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    modal.querySelector("#jpQuotePdfOpen").onclick = () => originalOpen(url, "_blank", "noopener,noreferrer");

    const pages = modal.querySelector("#jpQuotePdfPages");
    pages.innerHTML = `<div style="padding:35px;color:#64748b">Loading quote PDF…</div>`;

    loadPdfJs()
      .then(pdfjs => pdfjs.getDocument({ url }).promise)
      .then(async pdf => {
        if (!document.body.contains(modal)) return;
        pages.innerHTML = "";
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
          if (!document.body.contains(modal)) return;
          const page = await pdf.getPage(pageNo);
          const base = page.getViewport({ scale: 1 });
          const maxWidth = Math.max(300, Math.min(900, pages.clientWidth - 36));
          const scale = Math.min(1.6, maxWidth / base.width);
          const viewport = page.getViewport({ scale });
          const wrap = originalCreateElement("div");
          wrap.style.cssText = "display:inline-block;margin:0 auto 18px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.12);max-width:100%;";
          const canvas = originalCreateElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.style.cssText = "display:block;max-width:100%;height:auto;";
          wrap.appendChild(canvas);
          pages.appendChild(wrap);
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        }
      })
      .catch(error => {
        console.error("JobPilot quote PDF preview failed", error);
        pages.innerHTML = `<div style="padding:35px;color:#b91c1c">Could not preview this PDF inside JobPilot. Use Open PDF to view it in the browser.</div>`;
      });
  }

  window.__jobpilotShowQuotePdf = showViewer;

  window.open = function(url, target, features) {
    if (isPdfUrl(url) && window.__jobpilotQuotePdfViewerMode !== "download") {
      showViewer(url);
      return { closed: false, close() {} };
    }
    return originalOpen(url, target, features);
  };

  HTMLAnchorElement.prototype.click = function() {
    if (isPdfUrl(this.href) && window.__jobpilotQuotePdfViewerMode !== "download") {
      showViewer(this.href);
      return;
    }
    return originalAnchorClick.call(this);
  };

  document.createElement = function(tagName, options) {
    const el = originalCreateElement(tagName, options);
    if (String(tagName).toLowerCase() === "a") {
      const originalInstanceClick = el.click.bind(el);
      el.click = function() {
        if (isPdfUrl(el.href) && window.__jobpilotQuotePdfViewerMode !== "download") {
          showViewer(el.href);
          return;
        }
        return originalInstanceClick();
      };
    }
    return el;
  };

  document.addEventListener("click", e => {
    const a = e.target.closest?.("a");
    if (!a || !isPdfUrl(a.href) || window.__jobpilotQuotePdfViewerMode === "download") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showViewer(a.href);
  }, true);

  const style = originalCreateElement("style");
  style.textContent = "#jobpilot-quote-pdf-viewer{z-index:99999}#jobpilot-quote-pdf-viewer .modal-content{box-shadow:0 20px 60px rgba(0,0,0,.25)}";
  document.head.appendChild(style);
})();
