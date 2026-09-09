import { supabase } from "./supabase.js";

const BASE = "https://qxoynttvipducubmczwl.supabase.co/functions/v1";

const PROVIDERS = {
  stripe: { endpoint: `${BASE}/stripe-disconnect`, label: "Stripe" },
  freeagent: { endpoint: `${BASE}/freeagent-disconnect`, label: "FreeAgent" }
};

const STRIPE_CONNECT_URL = `${BASE}/stripe-connect-v3`;

function addStyles() {
  if (document.getElementById("jobpilot-disconnect-style")) return;
  const style = document.createElement("style");
  style.id = "jobpilot-disconnect-style";
  style.textContent = `
    .jobpilot-disconnect-button {
      margin-top: 10px !important;
      min-height: 40px !important;
    }
    .jobpilot-disconnect-button:disabled { opacity: .65; cursor: wait; }
  `;
  document.head.appendChild(style);
}

async function disconnect(providerId, button) {
  const provider = PROVIDERS[providerId];
  if (!provider) return;
  if (!confirm(`Disconnect ${provider.label} from JobPilot?`)) return;

  button.disabled = true;
  button.textContent = `Disconnecting ${provider.label}…`;

  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session) throw new Error("You are not logged in.");

    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: session.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "disconnect" })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Could not disconnect ${provider.label}.`);
    window.location.reload();
  } catch (error) {
    console.error(`${provider.label} disconnect error:`, error);
    alert(`Could not disconnect ${provider.label}:\n\n${error.message || error}`);
    button.disabled = false;
    button.textContent = `Disconnect ${provider.label}`;
  }
}

function providerConnected(card, providerId) {
  if (!card) return false;
  const status = card.querySelector(".connection-status");
  const text = status?.textContent?.toLowerCase() || "";
  const mainButton = card.querySelector("#connectStripeButton, #connectFreeAgentButton");
  return card.dataset.connected === "true"
    || text.includes("connected")
    || (providerId === "stripe" && text.includes("setup incomplete"))
    || (providerId === "stripe" && mainButton?.disabled === true && !text.includes("not connected"));
}

function addButton(card, providerId) {
  if (!card || !PROVIDERS[providerId] || card.querySelector(`[data-disconnect-provider="${providerId}"]`)) return;
  if (!providerConnected(card, providerId)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary jobpilot-disconnect-button";
  button.dataset.disconnectProvider = providerId;
  button.textContent = `Disconnect ${PROVIDERS[providerId].label}`;
  button.addEventListener("click", () => disconnect(providerId, button));
  card.appendChild(button);
}

function scan() {
  const panel = document.querySelector(".connections-page-panel");
  if (!panel) return;
  addButton(document.querySelector('[data-connection-provider="stripe"]'), "stripe");
  addButton(document.querySelector('[data-accounting-provider="freeagent"]') || document.querySelector('[data-connection-provider="freeagent"]'), "freeagent");
}

async function connectManagementStripe(button) {
  if (!button || button.dataset.jobpilotStripeBound === "true" || button.disabled) return;
  button.dataset.jobpilotStripeBound = "true";
  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.jobpilotStripeBusy === "true") return;
    button.dataset.jobpilotStripeBusy = "true";
    button.disabled = true;
    button.textContent = "Connecting to Stripe…";

    try {
      const { data: { session } = {} } = await supabase.auth.getSession();
      if (!session) throw new Error("You are not logged in.");

      const response = await fetch(STRIPE_CONNECT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: session.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "connect", origin: window.location.origin })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Could not connect Stripe (${response.status}).`);
      if (!result.url) throw new Error("Stripe did not return an authorisation URL.");
      window.location.assign(result.url);
    } catch (error) {
      console.error("JobPilot Stripe connect error:", error);
      button.dataset.jobpilotStripeBusy = "false";
      button.disabled = false;
      button.textContent = "💳 Connect Stripe";
      alert(`Could not connect Stripe:\n\n${error.message || error}`);
    }
  });
}

function scanManagementStripe() {
  const button = document.getElementById("managementStripeButton");
  if (button) connectManagementStripe(button);
}

addStyles();
const observer = new MutationObserver(() => {
  scan();
  scanManagementStripe();
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
document.addEventListener("DOMContentLoaded", () => {
  scan();
  scanManagementStripe();
});
setTimeout(scan, 700);
setTimeout(scan, 1500);
setTimeout(scanManagementStripe, 700);
setTimeout(scanManagementStripe, 1500);
