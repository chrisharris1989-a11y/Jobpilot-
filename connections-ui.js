// =====================================================
// JOBPILOT CONNECTIONS UI
// Makes Stripe, GoCardless and FreeAgent use the same
// card-based connection layout.
// =====================================================

(function () {
  const STYLE_ID = "jobpilot-connections-ui-style";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .settings-panel.connections-panel {
        background: transparent;
        border: 0;
        box-shadow: none;
        padding: 0;
      }

      .connections-panel .connection-card {
        box-sizing: border-box;
        width: 100%;
        margin: 0 0 16px;
        padding: 18px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #fafafa;
      }

      .connections-panel .connection-card h2,
      .connections-panel .connection-card h3 {
        margin: 0 0 6px;
      }

      .connections-panel .connection-card > p {
        margin: 0 0 12px;
      }

      .connections-panel .connection-status {
        margin: 12px 0 !important;
        min-height: 20px;
      }

      .connections-panel .connection-status strong {
        color: #15803d !important;
      }

      .connections-panel .connection-status small {
        display: inline-block;
        margin-top: 4px;
        font-size: 13px;
        color: #374151;
      }

      .connections-panel .connection-card .button {
        min-height: 40px;
      }

      .connections-panel #gocardlessConnectionPanel {
        box-sizing: border-box;
        width: 100%;
        margin: 0 !important;
        padding: 18px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
      }

      .connections-panel #gocardlessConnectionPanel h3 {
        margin: 0 0 6px !important;
      }

      .connections-panel #gocardlessConnectionPanel p {
        margin: 0 0 12px !important;
      }

      .connections-panel #gocardlessConnectionStatus {
        margin: 12px 0 !important;
      }

      .connections-panel > hr {
        display: none;
      }
    `;

    document.head.appendChild(style);
  }

  function makeCard(panel, statusId, buttonId) {
    const status = document.getElementById(statusId);
    const button = document.getElementById(buttonId);

    if (!status || !button) return;
    if (status.closest(".connection-card")) return;

    const paragraph = status.previousElementSibling;
    const heading = paragraph?.previousElementSibling;

    if (!paragraph || !heading || heading.tagName !== "H2") return;

    const card = document.createElement("div");
    card.className = "connection-card";

    heading.parentNode.insertBefore(card, heading);
    card.appendChild(heading);
    card.appendChild(paragraph);
    card.appendChild(status);
    card.appendChild(button);

    status.classList.add("connection-status");
  }

  function styleGoCardless(panel) {
    const goPanel = document.getElementById("gocardlessConnectionPanel");
    if (!goPanel) return;

    const container = document.getElementById("gocardlessConnectionContainer");
    const status = document.getElementById("gocardlessConnectionStatus");

    if (container && !container.classList.contains("connection-card")) {
      container.classList.add("connection-card");
      container.style.padding = "0";
    }

    if (status) status.classList.add("connection-status");
  }

  function formatConnections() {
    const panel = document.querySelector(".settings-panel");
    if (!panel) return;

    panel.classList.add("connections-panel");

    makeCard(panel, "stripeConnectionStatus", "connectStripeButton");
    makeCard(panel, "freeagentConnectionStatus", "connectFreeAgentButton");
    styleGoCardless(panel);
  }

  function waitForConnections(attempts = 15) {
    formatConnections();

    const panel = document.querySelector(".settings-panel");
    const ready =
      panel &&
      document.getElementById("stripeConnectionStatus") &&
      document.getElementById("freeagentConnectionStatus") &&
      document.getElementById("gocardlessConnectionPanel");

    if (ready || attempts <= 0) return;

    setTimeout(() => waitForConnections(attempts - 1), 100);
  }

  addStyles();

  document.addEventListener("click", event => {
    const connectionsButton = event.target.closest?.('[data-page="connections"]');
    if (!connectionsButton) return;

    setTimeout(() => waitForConnections(), 150);
  });
})();
