// =====================================================
// JOBPILOT CONNECTIONS LAYOUT FIX
// Keeps connected cards inside their parent group and
// hides unselected, unconnected service cards.
// =====================================================

(function () {
  function statusIsConnected(statusElement) {
    const text = statusElement?.textContent?.trim().toLowerCase() || "";
    if (!text) return false;
    // "Not connected" must never count as connected.
    if (/\bnot\s+connected\b/.test(text)) return false;
    return /\bconnected\b/.test(text);
  }

  function markConnection(card, statusElement) {
    if (!card) return;
    card.dataset.connected = statusIsConnected(statusElement) ? "true" : "false";
  }

  function moveAndMarkCards() {
    const accountingGroup = document.getElementById("jobpilot-accounting-group");
    const paymentsGroup = document.getElementById("jobpilot-payments-group");
    if (!accountingGroup || !paymentsGroup) return false;

    const accountingCards = accountingGroup.querySelector(".connections-group-cards");
    const paymentCards = paymentsGroup.querySelector(".connections-group-cards");
    if (!accountingCards || !paymentCards) return false;

    const freeagentStatus = document.getElementById("freeagentConnectionStatus");
    if (freeagentStatus) {
      const freeagentCard = freeagentStatus.closest(".connection-card");
      if (freeagentCard) {
        freeagentCard.dataset.accountingProvider = "freeagent";
        markConnection(freeagentCard, freeagentStatus);
        if (freeagentCard.parentElement !== accountingCards) {
          accountingCards.appendChild(freeagentCard);
        }
      }
    }

    accountingCards.querySelectorAll(".accounting-placeholder-card").forEach(card => {
      const heading = card.querySelector("h2")?.textContent?.toLowerCase() || "";
      if (heading.includes("xero")) card.dataset.accountingProvider = "xero";
      if (heading.includes("sage")) card.dataset.accountingProvider = "sage";
      card.dataset.connected = "false";
    });

    const stripeStatus = document.getElementById("stripeConnectionStatus");
    if (stripeStatus) {
      const stripeCard = stripeStatus.closest(".connection-card");
      if (stripeCard) {
        stripeCard.dataset.connectionProvider = "stripe";
        markConnection(stripeCard, stripeStatus);
        if (stripeCard.parentElement !== paymentCards) paymentCards.appendChild(stripeCard);
      }
    }

    const goCard = document.getElementById("gocardlessConnectionContainer");
    const goStatus = document.getElementById("gocardlessConnectionStatus");
    if (goCard) {
      goCard.dataset.connectionProvider = "gocardless";
      markConnection(goCard, goStatus);
      if (goCard.parentElement !== paymentCards) paymentCards.appendChild(goCard);
    }

    return true;
  }

  function selectedIds(selectorId) {
    const selector = document.getElementById(selectorId);
    if (!selector) return [];
    return [...selector.querySelectorAll("[data-connection-selector]:checked")]
      .map(input => input.dataset.connectionSelector);
  }

  function applyVisibility() {
    const accountingGroup = document.getElementById("jobpilot-accounting-group");
    const paymentsGroup = document.getElementById("jobpilot-payments-group");
    if (!accountingGroup || !paymentsGroup) return;

    const accountingSelected = new Set(selectedIds("jobpilot-accounting-selector"));
    const paymentSelected = new Set(selectedIds("jobpilot-payment-selector"));

    accountingGroup.querySelectorAll("[data-accounting-provider]").forEach(card => {
      const id = card.dataset.accountingProvider;
      const connected = card.dataset.connected === "true";
      card.style.setProperty(
        "display",
        accountingSelected.has(id) || connected ? "block" : "none",
        "important"
      );
    });

    paymentsGroup.querySelectorAll("[data-connection-provider]").forEach(card => {
      const id = card.dataset.connectionProvider;
      const connected = card.dataset.connected === "true";
      card.style.setProperty(
        "display",
        paymentSelected.has(id) || connected ? "block" : "none",
        "important"
      );
    });
  }

  function sync() {
    moveAndMarkCards();
    applyVisibility();
  }

  function start() {
    sync();

    const observer = new MutationObserver(() => sync());
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("change", event => {
      if (event.target?.matches?.("[data-connection-selector]")) {
        setTimeout(sync, 0);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
