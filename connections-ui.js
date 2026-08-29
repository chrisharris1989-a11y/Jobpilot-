// =====================================================
// JOBPILOT CONNECTIONS UI
// Make Stripe, GoCardless and FreeAgent look like
// three independent connection cards.
// =====================================================

(function () {
  const STYLE_ID = "jobpilot-connections-ui-style";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .connections-page-panel {
        display: block !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .connections-page-panel > hr {
        display: none !important;
      }

      .connections-page-panel .connection-card,
      .connections-page-panel #gocardlessConnectionContainer {
        box-sizing: border-box !important;
        display: block !important;
        width: 100% !important;
        margin: 0 0 16px !important;
        padding: 20px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 12px !important;
        background: #fafafa !important;
        box-shadow: none !important;
      }

      .connections-page-panel .connection-card h2,
      .connections-page-panel #gocardlessConnectionContainer h2 {
        margin: 0 0 7px !important;
        font-size: 18px !important;
        line-height: 1.3 !important;
      }

      .connections-page-panel .connection-card p,
      .connections-page-panel #gocardlessConnectionContainer p {
        margin: 0 0 14px !important;
        color: var(--muted) !important;
      }

      .connections-page-panel .connection-status,
      .connections-page-panel #gocardlessConnectionStatus {
        min-height: 20px !important;
        margin: 0 0 14px !important;
      }

      .connections-page-panel .connection-status strong,
      .connections-page-panel #gocardlessConnectionStatus strong {
        color: #15803d !important;
      }

      .connections-page-panel .connection-status small,
      .connections-page-panel #gocardlessConnectionStatus small {
        display: inline-block !important;
        margin-top: 4px !important;
        font-size: 13px !important;
        color: #374151 !important;
      }

      .connections-page-panel .connection-card .button,
      .connections-page-panel #gocardlessConnectionContainer .button {
        min-height: 40px !important;
      }

      .connections-page-panel #gocardlessConnectionPanel {
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }

  function makeCard(statusId, buttonId) {
    const status = document.getElementById(statusId);
    const button = document.getElementById(buttonId);
    if (!status || !button) return;
    if (status.closest(".connection-card")) return;

    const paragraph = status.previousElementSibling;
    const heading = paragraph?.previousElementSibling;

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

    const stripe = document.getElementById("stripeConnectionStatus");
    const freeagent = document.getElementById("freeagentConnectionStatus");
    const go = document.getElementById("gocardlessConnectionContainer");

    if (!stripe && !freeagent && !go) return;

    panel.classList.add("connections-page-panel");

    makeCard("stripeConnectionStatus", "connectStripeButton");
    makeCard("freeagentConnectionStatus", "connectFreeAgentButton");

    const goStatus = document.getElementById("gocardlessConnectionStatus");
    if (goStatus) goStatus.classList.add("connection-status");
  }

  addStyles();

  const observer = new MutationObserver(formatConnections);
  observer.observe(document.body, { childList: true, subtree: true });
  formatConnections();
})();