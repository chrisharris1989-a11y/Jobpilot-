// =====================================================
// JOBPILOT CONNECTIONS UI
// Groups accounting and payment connections into tidy
// parent cards with multi-select service selectors.
// =====================================================

import { supabase } from "./supabase.js";

(function () {
  const STYLE_ID = "jobpilot-connections-ui-style";
  const ACCOUNTING_SELECTOR_ID = "jobpilot-accounting-selector";
  const PAYMENT_SELECTOR_ID = "jobpilot-payment-selector";
  const ACCOUNTING_SELECTION_KEY = "accounting_software";
  const PAYMENT_SELECTION_KEY = "payment_services";

  const ACCOUNTING_PROVIDERS = [
    { id: "freeagent", name: "FreeAgent", icon: "📊" },
    { id: "xero", name: "Xero", icon: "🟢", placeholder: true },
    { id: "sage", name: "Sage", icon: "🟠", placeholder: true }
  ];

  const PAYMENT_PROVIDERS = [
    { id: "stripe", name: "Stripe", icon: "💳" },
    { id: "gocardless", name: "GoCardless", icon: "💷" }
  ];

  let currentUser = null;
  let savingAccounting = false;
  let savingPayments = false;

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

      .connections-group-card {
        box-sizing: border-box !important;
        width: 100% !important;
        margin: 0 0 20px !important;
        padding: 20px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 12px !important;
        background: #fafafa !important;
        box-shadow: none !important;
      }

      .connections-group-card > h2 {
        margin: 0 0 7px !important;
        font-size: 20px !important;
        line-height: 1.3 !important;
      }

      .connections-group-description {
        margin: 0 0 16px !important;
        color: var(--muted) !important;
      }

      .connections-group-selector {
        margin: 0 0 18px !important;
      }

      .connections-group-selector:last-child {
        margin-bottom: 0 !important;
      }

      .connections-group-selector h3 {
        margin: 0 0 10px !important;
        font-size: 15px !important;
        line-height: 1.3 !important;
      }

      .connections-selector-options {
        display: grid !important;
        gap: 10px !important;
      }

      .connections-selector-option {
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

      .connections-selector-option:hover {
        background: #f8fafc !important;
      }

      .connections-selector-option input {
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        cursor: pointer !important;
      }

      .connections-selector-option span {
        font-weight: 600 !important;
      }

      .connections-selector-help {
        display: block !important;
        margin-top: 10px !important;
        font-size: 13px !important;
        color: var(--muted) !important;
      }

      .connections-group-cards {
        display: grid !important;
        gap: 16px !important;
      }

      .connections-page-panel .connection-card,
      .connections-page-panel #gocardlessConnectionContainer,
      .connections-page-panel .accounting-placeholder-card {
        box-sizing: border-box !important;
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 20px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 10px !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      /* Visibility is controlled with a class so the provider cards can
         override the !important display rules above. */
      .connections-page-panel .connections-card-hidden {
        display: none !important;
      }

      .connections-page-panel .connection-card h2,
      .connections-page-panel #gocardlessConnectionContainer h2,
      .connections-page-panel .accounting-placeholder-card h2 {
        margin: 0 0 7px !important;
        font-size: 18px !important;
        line-height: 1.3 !important;
      }

      .connections-page-panel .connection-card p,
      .connections-page-panel #gocardlessConnectionContainer p,
      .connections-page-panel .accounting-placeholder-card p {
        margin: 0 0 14px !important;
        color: var(--muted) !important;
      }

      .connections-page-panel .connection-status,
      .connections-page-panel #gocardlessConnectionStatus {
        min-height: 20px !important;
        margin: 0 0 14px !important;
      }

      .connections-page-panel .connection-status strong {
        color: #15803d !important;
      }

      .connections-page-panel .connection-status small {
        display: inline-block !important;
        margin-top: 4px !important;
        font-size: 13px !important;
        color: #374151 !important;
      }

      .connections-page-panel .connection-card .button,
      .connections-page-panel #gocardlessConnectionContainer .button,
      .connections-page-panel .accounting-placeholder-card .button {
        min-height: 40px !important;
      }

      .connections-page-panel #gocardlessConnectionPanel {
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      .accounting-placeholder-card .connection-status strong {
        color: #6b7280 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function makeCard(statusId, buttonId, providerId = null) {
    const status = document.getElementById(statusId);
    const button = document.getElementById(buttonId);
    if (!status || !button) return null;
    if (status.closest(".connection-card")) return status.closest(".connection-card");

    const paragraph = status.previousElementSibling;
    const heading = paragraph?.previousElementSibling;

    if (!heading || heading.tagName !== "H2") return null;
    if (!paragraph || paragraph.tagName !== "P") return null;

    const card = document.createElement("div");
    card.className = "connection-card";

    if (providerId) card.dataset.connectionProvider = providerId;

    heading.parentNode.insertBefore(card, heading);
    card.appendChild(heading);
    card.appendChild(paragraph);
    card.appendChild(status);
    card.appendChild(button);

    status.classList.add("connection-status");
    return card;
  }

  function makePlaceholderCard(panel, provider) {
    if (!provider.placeholder) return null;

    const existing = document.querySelector(
      `[data-accounting-provider="${provider.id}"]`
    );
    if (existing) return existing;

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

    return card;
  }

  function ensureGroup(panel, id, title, description) {
    let group = document.getElementById(id);
    if (group) return group;

    group = document.createElement("section");
    group.id = id;
    group.className = "connections-group-card";
    group.innerHTML = `
      <h2>${title}</h2>
      <p class="connections-group-description">${description}</p>
    `;
    panel.appendChild(group);
    return group;
  }

  function ensureSelector(group, selectorId, heading, providers, key, savingType) {
    let selector = document.getElementById(selectorId);
    if (selector) return selector;

    selector = document.createElement("div");
    selector.id = selectorId;
    selector.className = "connections-group-selector";

    selector.innerHTML = `
      <h3>${heading}</h3>
      <div class="connections-selector-options">
        ${providers.map(provider => `
          <label class="connections-selector-option">
            <input type="checkbox" data-connection-selector="${provider.id}">
            <span>${provider.icon} ${provider.name}</span>
          </label>
        `).join("")}
      </div>
      <small class="connections-selector-help">
        You can select more than one. Only the services you select will appear below.
      </small>
    `;

    group.appendChild(selector);

    selector.querySelectorAll("[data-connection-selector]").forEach(input => {
      input.addEventListener("change", async () => {
        const selected = [...selector.querySelectorAll("[data-connection-selector]:checked")]
          .map(element => element.dataset.connectionSelector);

        if (savingType === "accounting") {
          applyAccountingVisibility(selected);
          await saveSelection(key, selected, "accounting");
        } else {
          applyPaymentVisibility(selected);
          await saveSelection(key, selected, "payments");
        }
      });
    });

    return selector;
  }

  async function getUser() {
    if (currentUser) return currentUser;

    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user || null;
    return currentUser;
  }

  function normalise(value, providers) {
    if (!Array.isArray(value)) return [];
    const valid = new Set(providers.map(provider => provider.id));
    return [...new Set(value.filter(id => valid.has(id)))];
  }

  async function getSelection(key, providers, defaults = []) {
    const user = await getUser();
    if (!user) return defaults;

    const stored = user.user_metadata?.[key];
    if (Array.isArray(stored)) return normalise(stored, providers);

    return defaults;
  }

  async function getAccountingSelection() {
    const user = await getUser();
    if (!user) return [];

    const stored = user.user_metadata?.[ACCOUNTING_SELECTION_KEY];
    if (Array.isArray(stored)) return normalise(stored, ACCOUNTING_PROVIDERS);

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

  async function saveSelection(key, selected, type) {
    const user = await getUser();
    if (!user) return;

    if (type === "accounting") {
      if (savingAccounting) return;
      savingAccounting = true;
    } else {
      if (savingPayments) return;
      savingPayments = true;
    }

    try {
      const providers = type === "accounting" ? ACCOUNTING_PROVIDERS : PAYMENT_PROVIDERS;
      const cleaned = normalise(selected, providers);

      const { error } = await supabase.auth.updateUser({
        data: { [key]: cleaned }
      });
      if (error) throw error;

      currentUser = {
        ...user,
        user_metadata: {
          ...(user.user_metadata || {}),
          [key]: cleaned
        }
      };
    } catch (error) {
      console.error(`Could not save ${type} selection:`, error);
      alert(`Could not save your ${type} selection. Please try again.`);
    } finally {
      if (type === "accounting") savingAccounting = false;
      else savingPayments = false;
    }
  }

  function applyAccountingVisibility(selected) {
    const selectedSet = new Set(selected);
    document.querySelectorAll("[data-accounting-provider]").forEach(card => {
      const providerId = card.dataset.accountingProvider;
      const connected = card.dataset.connected === "true";
      card.classList.toggle("connections-card-hidden", !selectedSet.has(providerId) && !connected);
    });
  }

  function applyPaymentVisibility(selected) {
    const selectedSet = new Set(selected);
    document.querySelectorAll("[data-connection-provider]").forEach(card => {
      const providerId = card.dataset.connectionProvider;
      const connected = card.dataset.connected === "true";
      card.classList.toggle("connections-card-hidden", !selectedSet.has(providerId) && !connected);
    });
  }

  function setConnectedState(card, connected) {
    if (card) card.dataset.connected = connected ? "true" : "false";
  }

  async function renderAccounting(panel) {
    const group = ensureGroup(
      panel,
      "jobpilot-accounting-group",
      "📚 Accounting",
      "Choose the accounting software you use with JobPilot."
    );

    const selector = ensureSelector(
      group,
      ACCOUNTING_SELECTOR_ID,
      "Select accounting software",
      ACCOUNTING_PROVIDERS,
      ACCOUNTING_SELECTION_KEY,
      "accounting"
    );

    let cards = group.querySelector(".connections-group-cards");
    if (!cards) {
      cards = document.createElement("div");
      cards.className = "connections-group-cards";
      group.appendChild(cards);
    }

    const freeagentCard = document.querySelector('[data-accounting-provider="freeagent"]');
    if (freeagentCard && freeagentCard.parentElement !== cards) cards.appendChild(freeagentCard);

    ACCOUNTING_PROVIDERS.filter(provider => provider.placeholder).forEach(provider => {
      const card = makePlaceholderCard(panel, provider);
      if (card && card.parentElement !== cards) cards.appendChild(card);
    });

    const selected = await getAccountingSelection();
    selector.querySelectorAll("[data-connection-selector]").forEach(input => {
      input.checked = selected.includes(input.dataset.connectionSelector);
    });
    applyAccountingVisibility(selected);
  }

  async function renderPayments(panel) {
    const group = ensureGroup(
      panel,
      "jobpilot-payments-group",
      "💳 Payments",
      "Choose the payment services you use with JobPilot."
    );

    const selector = ensureSelector(
      group,
      PAYMENT_SELECTOR_ID,
      "Select payment services",
      PAYMENT_PROVIDERS,
      PAYMENT_SELECTION_KEY,
      "payments"
    );

    let cards = group.querySelector(".connections-group-cards");
    if (!cards) {
      cards = document.createElement("div");
      cards.className = "connections-group-cards";
      group.appendChild(cards);
    }

    const stripeCard = document.querySelector('[data-connection-provider="stripe"]');
    const goCard = document.getElementById("gocardlessConnectionContainer");

    if (stripeCard && stripeCard.parentElement !== cards) cards.appendChild(stripeCard);
    if (goCard && goCard.parentElement !== cards) {
      goCard.dataset.connectionProvider = "gocardless";
      cards.appendChild(goCard);
    }

    // No metadata means no payment service has been selected yet.
    // Existing connected services are still kept visible by the visibility rule.
    const selected = await getSelection(PAYMENT_SELECTION_KEY, PAYMENT_PROVIDERS, []);
    selector.querySelectorAll("[data-connection-selector]").forEach(input => {
      input.checked = selected.includes(input.dataset.connectionSelector);
    });

    applyPaymentVisibility(selected);
  }

  async function formatConnections() {
    const panel = document.querySelector(".settings-panel");
    if (!panel) return;

    const stripe = document.getElementById("stripeConnectionStatus");
    const freeagent = document.getElementById("freeagentConnectionStatus");
    const go = document.getElementById("gocardlessConnectionContainer");

    if (!stripe && !freeagent && !go) return;

    panel.classList.add("connections-page-panel");

    const stripeCard = makeCard("stripeConnectionStatus", "connectStripeButton", "stripe");
    const freeagentCard = makeCard("freeagentConnectionStatus", "connectFreeAgentButton", "freeagent");

    setConnectedState(stripeCard, !!document.getElementById("stripeConnectionStatus")?.textContent?.toLowerCase().includes("connected"));
    setConnectedState(freeagentCard, !!document.getElementById("freeagentConnectionStatus")?.textContent?.toLowerCase().includes("connected"));

    const goStatus = document.getElementById("gocardlessConnectionStatus");
    if (goStatus) goStatus.classList.add("connection-status");
    if (go) {
      go.dataset.connectionProvider = "gocardless";
      setConnectedState(go, !!goStatus?.textContent?.toLowerCase().includes("connected"));
    }

    await renderAccounting(panel);
    await renderPayments(panel);
  }

  addStyles();

  const observer = new MutationObserver(() => {
    if (document.querySelector(".settings-panel")) formatConnections();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", formatConnections);
  setTimeout(formatConnections, 500);
})();
