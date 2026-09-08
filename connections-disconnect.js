import { supabase } from "./supabase.js";

const BASE = "https://qxoynttvipducubmczwl.supabase.co/functions/v1";

const PROVIDERS = {
  stripe: { endpoint: `${BASE}/stripe-disconnect`, label: "Stripe" },
  gocardless: { endpoint: `${BASE}/gocardless-disconnect`, label: "GoCardless" },
  freeagent: { endpoint: `${BASE}/freeagent-disconnect`, label: "FreeAgent" }
};

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
  const status = card.querySelector(".connection-status") || card.querySelector("#gocardlessConnectionStatus");
  const text = status?.textContent?.toLowerCase() || "";
  return card.dataset.connected === "true" || text.includes("connected");
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
  addButton(document.querySelector('[data-connection-provider="gocardless"]'), "gocardless");
  addButton(document.querySelector('[data-accounting-provider="freeagent"]') || document.querySelector('[data-connection-provider="freeagent"]'), "freeagent");
}

addStyles();
const observer = new MutationObserver(scan);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
document.addEventListener("DOMContentLoaded", scan);
setTimeout(scan, 700);
setTimeout(scan, 1500);
