// =====================================================
// JOBPILOT CONNECTIONS UI
// Stripe, GoCardless and FreeAgent use matching cards.
// =====================================================

(function () {
  const STYLE_ID = "jobpilot-connections-ui-style";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .connections-page-panel {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .connections-page-panel .connection-card {
        box-sizing: border-box;
        width: 100%;
        margin: 0 0 16px;
        padding: 18px 20px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #fafafa;
      }

      .connections-page-panel .connection-card h2,
      .connections-page-panel .connection-card h3 {
        margin: 0 0 7px !important;
      }

      .connections-page-panel .connection-card p {
        margin: 0 0 14px !important;
        color: var(--muted);
      }

      .connections-page-panel .connection-status {
        margin: 0 0 14px !important;
        min-height: 20px;
      }

      .connections-page-panel .connection-status strong {
        color: #15803d !important;
      }

      .connections-page-panel .connection-status small {
        display: inline-block;
        margin-top: 4px;
        font-size: 13px;
        color: #374151;
      }

      .connections-page-panel .connection-card .button {
        min-height: 40px;
      }

      .connections-page-panel > hr {
        display: none !important;
      }

      /* GoCardless is injected dynamically by gocardless.js. */
      .connections-page-panel #gocardlessConnectionContainer {
        box-sizing: border-box;
        width: 100%;
        margin: 0 0 16px !important;
        padding: 18px 20px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 12px !important;
        background: #fafafa !important;
      }

      .connections-page-panel #gocardlessConnectionPanel {
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
      }

      .connections-page-panel #gocardlessConnectionPanel h3 {
        margin: 0 0 7px !important;
      }

      .connections-page-panel #gocardlessConnectionPanel p {
        margin: 0 0 14px !important;
      }

      .connections-page-panel #gocardlessConnectionStatus {
        margin: 0 0 14px !important;
      }
    `;

    document.head.appendChild(style);
  }

  function wrapService(statusId, buttonId) {
    const status = document.getElementById(statusId);
    const button = document.getElementById(buttonId);

    if (!status || !button) return;
    if (status.closest(".connection-card")) return;

    const heading = status.previousElementSibling?.previousElementSibling;
    const paragraph = status.previousElementSibling;

    if (!heading || heading.tagName !== "H2") return;
    if (!paragraph || paragraph.tagName !== "P") return;

    const card = document.createElement("div");
    card.className = "connection-card";

    heading.parentNode.insertBefore(card, heading);
    card.appendChild(heading);
    card.appendChild(paragraph);
    card.appendChild(status);
    card.appendChild(button);

    status.classList.add("connection-status");
  }

  function formatConnections() {
    const panel = document.querySelector(".settings-panel");
    if (!panel) return;

    // Only treat the Connections settings panel as the card container.
    const stripeStatus = document.getElementById("stripeConnectionStatus");
    const freeagentStatus = document.getElementById("freeagentConnectionStatus");
    const goContainer = document.getElementById("gocardlessConnectionContainer");

    if (!stripeStatus && !freeagentStatus && !goContainer) return;

    panel.classList.add("connections-page-panel");

    wrapService("stripeConnectionStatus", "connectStripeButton");
    wrapService("freeagentConnectionStatus", "connectFreeAgentButton");

    if (goContainer) {
      const goStatus = document.getElementById("gocardlessConnectionStatus");
      if (goStatus) goStatus.classList.add("connection-status");
    }
  }

  addStyles();

  // The app renders Connections dynamically, and GoCardless is injected after it.
  // Observe the page so the layout is applied reliably instead of depending on timing.
  const observer = new MutationObserver(() => formatConnections());
  observer.observe(document.body, { childList: true, subtree: true });

  formatConnections();
})();
