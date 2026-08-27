import { supabase } from "./supabase.js";

const GO_CARDLESS_CONNECT_URL =
  "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-connect";

let pollTimer = null;

function addGoCardlessUI() {
  if (document.getElementById("gocardlessConnectionPanel")) {
    showGoCardlessResult();
    return true;
  }

  const stripeButton = document.getElementById("connectStripeButton");
  if (!stripeButton) return false;

  const panel = document.createElement("div");
  panel.id = "gocardlessConnectionPanel";
  panel.style.marginTop = "18px";
  panel.innerHTML = `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;background:#fafafa;">
      <h3 style="margin:0 0 6px;">GoCardless</h3>
      <p class="muted" style="margin:0 0 12px;">
        Connect GoCardless to let your customers pay invoices by bank.
      </p>
      <div id="gocardlessConnectionStatus" class="muted" style="margin-bottom:12px;">
        Not connected
      </div>
      <button class="button primary" id="connectGoCardlessButton" type="button">
        🏦 Connect GoCardless
      </button>
    </div>
  `;

  stripeButton.insertAdjacentElement("afterend", panel);

  document
    .getElementById("connectGoCardlessButton")
    ?.addEventListener("click", connectGoCardless);

  showGoCardlessResult();
  return true;
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

function showGoCardlessResult() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get("gocardless");
  if (!result) return;

  const status = document.getElementById("gocardlessConnectionStatus");
  const button = document.getElementById("connectGoCardlessButton");
  if (!status) return;

  if (result === "connected") {
    status.innerHTML = `<strong style="color:green;">✅ GoCardless connected</strong><br><small>Your GoCardless account is connected to JobPilot.</small>`;
    if (button) {
      button.textContent = "🏦 GoCardless Connected";
      button.disabled = true;
    }

    // Remove the one-time OAuth result from the address bar so a refresh
    // doesn't repeatedly process it.
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (result === "error") {
    status.innerHTML = `<strong style="color:#dc2626;">⚠️ GoCardless connection failed</strong>`;
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function startPolling() {
  if (pollTimer) return;

  const attempt = () => {
    if (addGoCardlessUI()) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  attempt();
  if (!document.getElementById("gocardlessConnectionPanel")) {
    pollTimer = setInterval(attempt, 250);
  }
}

startPolling();
