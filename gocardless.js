import { supabase } from "./supabase.js";

const GO_CARDLESS_CONNECT_URL =
  "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-connect";

const GO_CARDLESS_STORAGE_KEY = "jobpilot_gocardless_connected";

function handleOAuthReturn() {
  try {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("gocardless");
    if (!result) return;

    if (result === "connected") {
      localStorage.setItem(GO_CARDLESS_STORAGE_KEY, "true");
    } else if (result === "error") {
      localStorage.removeItem(GO_CARDLESS_STORAGE_KEY);
    }

    const cleanUrl =
      window.location.origin + window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (error) {
    console.error("GoCardless OAuth return handling failed:", error);
  }
}

async function showGoCardlessResult() {
  const status = document.getElementById("gocardlessConnectionStatus");
  const button = document.getElementById("connectGoCardlessButton");
  if (!status) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      status.textContent = "Not connected";
      return;
    }

    const response = await fetch(GO_CARDLESS_CONNECT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: session.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "status" })
    });

    const result = await response.json();

    if (!response.ok || !result.connected) {
      status.textContent = "Not connected";
      if (button) {
        button.textContent = "🏦 Connect GoCardless";
        button.disabled = false;
      }
      return;
    }

    status.innerHTML =
      `<strong style="color:green;">✅ GoCardless connected</strong><br><small>${result.organisation_name || "GoCardless account connected to JobPilot."}</small>`;

    if (button) {
      button.textContent = "🏦 GoCardless Connected";
      button.disabled = true;
    }
  } catch (error) {
    console.error("GoCardless status check failed:", error);
    status.textContent = "Unable to check GoCardless connection.";
  }
}

async function connectGoCardless() {
  const button = document.getElementById("connectGoCardlessButton");
  if (!button) return;

  button.disabled = true;
  button.textContent = "Connecting to GoCardless...";

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("You are not logged in.");

    const response = await fetch(GO_CARDLESS_CONNECT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: session.access_token,
        "Content-Type": "application/json"
      },
      body: "{}"
    });

    const result = await response.json();
    if (!response.ok || !result.url) {
      throw new Error(result.error || "Could not start GoCardless connection.");
    }

    window.location.href = result.url;
  } catch (error) {
    console.error("GoCardless connection error:", error);
    alert("Could not connect GoCardless:\n\n" + (error?.message || error));
    button.disabled = false;
    button.textContent = "🏦 Connect GoCardless";
  }
}

function addGoCardlessUI() {
  try {
    if (document.getElementById("gocardlessConnectionPanel")) {
      showGoCardlessResult();
      return true;
    }

    const container = document.getElementById("gocardlessConnectionContainer");
    if (!container) return false;

    const panel = document.createElement("div");
    panel.id = "gocardlessConnectionPanel";
    panel.innerHTML = `
      <h2>🏦 GoCardless</h2>
      <p class="muted">
        Connect GoCardless to let your customers pay invoices by bank.
      </p>
      <div id="gocardlessConnectionStatus" class="muted">
        Not connected
      </div>
      <button class="button primary" id="connectGoCardlessButton" type="button">
        🏦 Connect GoCardless
      </button>
    `;

    container.appendChild(panel);

    const button = document.getElementById("connectGoCardlessButton");
    if (button) button.addEventListener("click", connectGoCardless);

    showGoCardlessResult();
    return true;
  } catch (error) {
    console.error("GoCardless UI initialization failed:", error);
    return false;
  }
}

function waitForPaymentsUI(attempts = 20) {
  if (addGoCardlessUI()) return;
  if (attempts <= 0) return;
  setTimeout(() => waitForPaymentsUI(attempts - 1), 100);
}

handleOAuthReturn();

document.addEventListener("click", event => {
  const connectionsButton = event.target.closest?.('[data-page="connections"]');
  if (!connectionsButton) return;
  setTimeout(() => waitForPaymentsUI(), 100);
});