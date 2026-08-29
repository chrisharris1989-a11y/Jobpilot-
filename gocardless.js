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
      window.location.origin +
      window.location.pathname +
      window.location.hash;

    window.history.replaceState({}, document.title, cleanUrl);
  } catch (error) {
    console.error("GoCardless OAuth return handling failed:", error);
  }
}

function showGoCardlessResult() {
  const status = document.getElementById("gocardlessConnectionStatus");
  const button = document.getElementById("connectGoCardlessButton");
  if (!status) return;

  try {
    if (localStorage.getItem(GO_CARDLESS_STORAGE_KEY) === "true") {
      status.innerHTML =
        `<strong style="color:green;">✅ GoCardless connected</strong><br><small>Your GoCardless account is connected to JobPilot.</small>`;

      if (button) {
        button.textContent = "🏦 GoCardless Connected";
        button.disabled = true;
      }
    }
  } catch (error) {
    console.error("GoCardless status rendering failed:", error);
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

// JobPilot renders Settings dynamically. Only react to the Settings navigation
// button, and only after JobPilot has finished rendering the new page.
document.addEventListener("click", event => {
  const settingsButton = event.target.closest?.('[data-page="connections"]');
  if (!settingsButton) return;

  setTimeout(() => waitForPaymentsUI(), 100);
});
