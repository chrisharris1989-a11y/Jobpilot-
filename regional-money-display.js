// JobPilot regional money display normalizer.
// Converts legacy hard-coded £ displays into the currency selected in
// Settings → App Preferences without changing stored numeric values.

import { formatJobPilotMoney, getJobPilotCurrencySymbol, getJobPilotCurrency } from "./regional-currency.js";

const MONEY_PATTERN = /£\s*(-?\d[\d,]*(?:\.\d{1,2})?)/g;
let updating = false;

function normalizeText(text) {
  if (!text || updating) return text;
  let result = text;

  result = result.replace(MONEY_PATTERN, (_match, value) => {
    const numeric = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(numeric) ? formatJobPilotMoney(numeric) : _match;
  });

  const symbol = getJobPilotCurrencySymbol();
  if (symbol !== "£") result = result.replace(/£/g, symbol);

  return result;
}

function normalizeNode(node) {
  if (updating || !node) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const next = normalizeText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches("script,style,noscript,option")) return;

  node.childNodes.forEach(normalizeNode);

  ["placeholder", "title", "aria-label"].forEach(attribute => {
    if (!node.hasAttribute(attribute)) return;
    const current = node.getAttribute(attribute);
    const next = normalizeText(current);
    if (next !== current) node.setAttribute(attribute, next);
  });
}

function refreshMoneyDisplay() {
  if (updating) return;
  updating = true;
  try {
    document.body?.childNodes.forEach(node => normalizeNode(node));
  } finally {
    updating = false;
  }
}

function start() {
  if (!document.body) return;

  refreshMoneyDisplay();

  const observer = new MutationObserver(mutations => {
    if (updating) return;
    updating = true;
    try {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => normalizeNode(node));
        if (mutation.type === "characterData") normalizeNode(mutation.target);
      });
    } finally {
      updating = false;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.addEventListener("jobpilot:currency-changed", () => {
    window.setTimeout(refreshMoneyDisplay, 0);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}

window.JobPilotRegionalMoneyDisplay = Object.freeze({
  refresh: refreshMoneyDisplay,
  getCurrency: getJobPilotCurrency
});
