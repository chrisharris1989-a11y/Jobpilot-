// =====================================================
// JOBPILOT CONNECTIONS LAYOUT FIX
// Keeps connected cards inside their parent group and
// hides unselected, unconnected service cards.
// =====================================================

(function () {
  const ACCOUNTING_IDS = ["freeagent", "xero", "sage"];
  const PAYMENT_IDS = ["stripe", "gocardless"];

  function moveAndMarkCards() {
    const accountingGroup = document.getElementById("jobpilot-accounting-group");
    const paymentsGroup = document.getElementById("jobpilot-payments-group");
    if (!accountingGroup || !paymentsGroup) return false;

    const accountingCards = accountingGroup.querySelector(".connections-group-cards");
    const paymentCards = paymentsGroup.querySelector(".connections-group-cards");
    if (!accountingCards || !paymentCards) return false;

    // FreeAgent's existing card is identified by its status element.
    const freeagentStatus = document.getElementById("freeagentConnectionStatus");
    if (freeagentStatus) {
      const freeagentCard = freeagentStatus.closest(".connection-card");
      if (freeagentCard) {
        freeagentCard.dataset.accountingProvider = "freeagent";
        // A connected FreeAgent card belongs inside Accounting.
        if (freeagentCard.parentElement !== accountingCards) {
          accountingCards.appendChild(freeagentCard);
        }
      }
    }

    // Ensure placeholder cards have accounting provider markers.
    accountingCards.querySelectorAll(".accounting-placeholder-card").forEach(card => {
      const heading = card.querySelector("h2")?.textContent?.toLowerCase() || "";
      if (heading.includes("xero")) card.dataset.accountingProvider = "xero";
      if (heading.includes("sage")) card.dataset.accountingProvider = "sage";
    });

    // Ensure payment cards have provider markers.
    const stripeStatus = document.getElementById("stripeConnectionStatus");
    if (stripeStatus) {
      const stripeCard = stripeStatus.closest(".connection-card");
      if (stripeCard) {
        stripeCard.dataset.connectionProvider = "stripe";
        if (stripeCard.parentElement !== paymentCards) paymentCards.appendChild(stripeCard);
      }
    }

    const goCard = document.getElementById("gocardlessConnectionContainer");
    if (goCard) {
      goCard.dataset.connectionProvider = "gocardless";
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
      card.style.display = accountingSelected.has(id) || connected ? "block" : "none";
    });

    paymentsGroup.querySelectorAll("[data-connection-provider]").forEach(card => {
      const id = card.dataset.connectionProvider;
      const connected = card.dataset.connected === "true";
      card.style.display = paymentSelected.has(id) || connected ? "block" : "none";
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
        // Allow the existing selector handler to save first, then re-apply layout.
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
