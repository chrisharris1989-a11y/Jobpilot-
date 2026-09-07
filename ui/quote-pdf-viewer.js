// Keep generated quote PDFs inside JobPilot instead of opening a separate browser tab.
// This is intentionally limited to PDF/blob windows so normal JobPilot navigation is untouched.
(() => {
  if (window.__jobpilotQuotePdfViewerInstalled) return;
  window.__jobpilotQuotePdfViewerInstalled = true;

  const originalOpen = window.open.bind(window);

  function isPdfUrl(url) {
    if (!url || typeof url !== "string") return false;
    const value = url.toLowerCase();
    return value.startsWith("blob:") || value.includes(".pdf") || value.startsWith("data:application/pdf");
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
        <iframe title="Quote PDF preview" src="${url.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}" style="flex:1;width:100%;border:0;background:#f3f4f6"></iframe>
      </div>`;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector("#jpQuotePdfClose").onclick = close;
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    modal.querySelector("#jpQuotePdfOpen").onclick = () => originalOpen(url, "_blank", "noopener,noreferrer");
  }

  window.open = function(url, target, features) {
    if (isPdfUrl(url)) {
      showViewer(url);
      return { closed: false, close() {} };
    }
    return originalOpen(url, target, features);
  };

  const style = document.createElement("style");
  style.textContent = `#jobpilot-quote-pdf-viewer{z-index:99999}#jobpilot-quote-pdf-viewer .modal-content{box-shadow:0 20px 60px rgba(0,0,0,.25)}`;
  document.head.appendChild(style);
})();
