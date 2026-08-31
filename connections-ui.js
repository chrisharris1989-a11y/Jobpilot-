// =====================================================
// JOBPILOT CONNECTIONS UI
// Keep Stripe and GoCardless visible while allowing users
// to choose which accounting software cards they want shown.
// =====================================================

import { supabase } from "./supabase.js";

(function () {
  const STYLE_ID = "jobpilot-connections-ui-style";
  const SELECTOR_ID = "jobpilot-accounting-selector";
  const SELECTION_KEY = "accounting_software";

  // Add new accounting providers here as their integrations
  // are introduced. The UI supports multiple selections.
  const ACCOUNTING_PROVIDERS = [
    {
      id: "freeagent",
      name: "FreeAgent",
      icon: "📊"
    },
    {
      id: "xero",
      name: "Xero",
      icon: "🟢",
      placeholder: true
    },
    {
      id: "sage",
      name: "Sage",
      icon: "🟠",
      placeholder: true
    }
  ];

  let currentUser = null;
  let savingSelection = false;

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

      .accounting-selector-card {
        box-sizing: border-box !important;
        width: 100% !important;
        margin: 0 0 20px !important;
        padding: 20px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 12px !important;
        background: #fafafa !important;
      }

      .accounting-selector-card h2 {
        margin: 0 0 7px !important;
        font-size: 18px !important;
        line-height: 1.3 !important;
      }

      .accounting-selector-card > p {
        margin: 0 0 16px !important;
        color: var(--muted) !important;
      }

      .accounting-selector-options {
        display: grid !important;
        gap: 10px !important;
      }

      .accounting-selector-option {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        min-height: 44px !important;
        padding: 10px 12px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        background: #fff !important;
        cursor: pointer !important;
      }

      .accounting-selector-option:hover {
        background: #f8fafc !important;
      }

      .accounting-selector-option input {
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        cursor: pointer !important;
      }

      .accounting-selector-option span {
        font-weight: 600 !important;
      }

      .accounting-selector-help {
        display: block !important;
        margin-top: 12px !important;
        font-size: 13px !important;
        color: var(--muted) !important;
      }

      .accounting-placeholder-card {
        box-sizing: border-box !important;
        width: 100% !important;
        margin: 0 0 16px !important;
        padding: 20px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 12px !important;
        background: #fafafa !important;
      }

      .accounting-placeholder-card h2 {
        margin: 0 0 7px !important;
        font-size: 18px !important;
        line-height: 1.3 !important;
      }

      .accounting-placeholder-card p {
        margin: 0 0 14px !important;
        color: var(--muted) !important;
      }

      .accounting-placeholder-card .connection-status {
        min-height: 20px !important;
        margin: 0 0 14px !important;
      }

      .accounting-placeholder-card .connection-status strong {
        color: #6b7280 !important;
      }

      .accounting-placeholder-card .button {
        min-height: 40px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function makeCard(statusId, buttonId, providerId = null) {
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

    if (providerId) {
      card.dataset.accountingProvider = providerId;
    }

    heading.parentNode.insertBefore(card, heading);
    card.appendChild(heading);
    card.appendChild(paragraph);
    card.appendChild(status);
    card.appendChild(button);

    status.classList.add("connection-status");
  }

  function makePlaceholderCard(panel, provider) {
    if (!provider.placeholder) return;
    if (document.querySelector(`[data-accounting-provider="${provider.id}"]`)) return;

    const card = document.createElement("div");
    card.className = "accounting-placeholder-card";
    card.dataset.accountingProvider = provider.id;

    card.innerHTML = `
      <h2>${provider.icon} ${provider.name}</h2>
      <p>Connect ${provider.name} to sync your accounting data with JobPilot.</p>
      <div class="connection-status">
        <strong>Not connected</strong>
      </div>
      <button class="button" type="button" disabled>
        Connect ${provider.name}
      </button>
    `;

    panel.appendChild(card);
  }

  function makePlaceholderCards(panel) {
    ACCOUNTING_PROVIDERS
      .filter(provider => provider.placeholder)
      .forEach(provider => makePlaceholderCard(panel, provider));
  }

  async function getUser() {
    if (currentUser) return currentUser;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    currentUser = user || null;
    return currentUser;
  }

  function normaliseSelection(value) {
    if (!Array.isArray(value)) return [];

    const validIds = new Set(
      ACCOUNTING_PROVIDERS.map(provider => provider.id)
    );

    return [...new Set(
      value.filter(id => validIds.has(id))
    )];
  }

  async function getSelectedProviders() {
    const user = await getUser();

    if (!user) return [];

    const metadataSelection =
      user.user_metadata?.[SELECTION_KEY];

    if (Array.isArray(metadataSelection)) {
      return normaliseSelection(metadataSelection);
    }

    // Existing FreeAgent users keep seeing FreeAgent
    // automatically when this feature is introduced.
    try {
      const { data } = await supabase
        .from("freeagent_connections")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) return ["freeagent"];
    } catch (error) {
      console.error("Could not detect existing accounting connection:", error);
    }

    return [];
  }

  async function saveSelectedProviders(selected) {
    const user = await getUser();
    if (!user || savingSelection) return;

    savingSelection = true;

    try {
      const cleaned = normaliseSelection(selected);

      const { error } = await supabase.auth.updateUser({
        data: {
          [SELECTION_KEY]: cleaned
        }
      });

      if (error) throw error;

      currentUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          [SELECTION_KEY]: cleaned
        }
      };

      applyVisibility(cleaned);
    } catch (error) {
      console.error("Could not save accounting software selection:", error);
      alert("Could not save your accounting software selection. Please try again.");
    } finally {
      savingSelection = false;
    }
  }

  function applyVisibility(selected) {
    const selectedSet = new Set(selected);

    document
      .querySelectorAll("[data-accounting-provider]")
      .forEach(card => {
        const providerId = card.dataset.accountingProvider;
        card.style.display = selectedSet.has(providerId)
          ? "block"
          : "none";
      });
  }

  async function renderSelector(panel) {
    let selector = document.getElementById(SELECTOR_ID);

    if (!selector) {
      selector = document.createElement("div");
      selector.id = SELECTOR_ID;
      selector.className = "accounting-selector-card";

      selector.innerHTML = `
        <h2>📚 Accounting software</h2>
        <p>Select the accounting software you use with JobPilot.</p>
        <div class="accounting-selector-options">
          ${ACCOUNTING_PROVIDERS.map(provider => `
            <label class="accounting-selector-option">
              <input
                type="checkbox"
                data-accounting-selector="${provider.id}"
              >
              <span>${provider.icon} ${provider.name}</span>
            </label>
          `).join("")}
        </div>
        <small class="accounting-selector-help">
          You can select more than one. Only the services you select will appear below.
        </small>
      `;

      const firstChild = panel.firstElementChild;
      panel.insertBefore(selector, firstChild);

      selector
        .querySelectorAll("[data-accounting-selector]")
        .forEach(input => {
          input.addEventListener("change", async () => {
            const selected = [...selector.querySelectorAll("[data-accounting-selector]:checked")]
              .map(element => element.dataset.accountingSelector);

            applyVisibility(selected);
            await saveSelectedProviders(selected);
          });
        });
    }

    const selected = await getSelectedProviders();

    selector
      .querySelectorAll("[data-accounting-selector]")
      .forEach(input => {
        input.checked = selected.includes(
          input.dataset.accountingSelector
        );
      });

    applyVisibility(selected);
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
    makeCard("freeagentConnectionStatus", "connectFreeAgentButton", "freeagent");
    makePlaceholderCards(panel);

    const goStatus = document.getElementById("gocardlessConnectionStatus");
    if (goStatus) goStatus.classList.add("connection-status");

    renderSelector(panel);
  }

  addStyles();

  const observer = new MutationObserver(formatConnections);
  observer.observe(document.body, { childList: true, subtree: true });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (session?.user) {
      const panel = document.querySelector(".settings-panel");
      if (panel) renderSelector(panel);
    }
  });

  formatConnections();
})();