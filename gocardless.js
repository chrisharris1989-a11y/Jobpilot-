import { supabase } from "./supabase.js";

const GO_CARDLESS_CONNECT_URL =
  "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-connect";

function addGoCardlessUI() {
  if (document.getElementById("gocardlessConnectionPanel")) return true;

  const stripeButton = document.getElementById("connectStripeButton");
  const anchor = stripeButton?.closest("section, .card, .settings-card, .payment-section") || stripeButton?.parentElement;
  if (!anchor) return false;

  const panel = document.createElement("div");
  panel.id = "gocardlessConnectionPanel";
  panel.style.marginTop = "18px";
  panel.innerHTML = `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;background:#fafafa;">
      <h3 style="margin:0 0 6px;">GoCardless</h3>
      <p class="muted" style="margin:0 0 12px;">Connect GoCardless to let your customers pay invoices by bank.</p>
      <div id="gocardlessConnectionStatus" class="muted" style="margin-bottom:12px;">Not connected</div>
      <button class="button primary" id="connectGoCardlessButton" type="button">🏦 Connect GoCardless</button>
    </div>
  `;

  anchor.insertAdjacentElement("afterend", panel);
  document.getElementById("connectGoCardlessButton")?.addEventListener("click", connectGoCardless);
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
    if (!response.ok || !result.url) throw new Error(result.error || "Could not start GoCardless connection.");
    window.location.href = result.url;
  } catch (error) {
    console.error("GoCardless connection error:", error);
    alert("Could not connect GoCardless:\n\n" + error.message);
    button.disabled = false;
    button.textContent = "🏦 Connect GoCardless";
  }
}

function showGoCardlessResult() {
  const result = new URLSearchParams(window.location.search).get("gocardless");
  if (!result) return;
  const status = document.getElementById("gocardlessConnectionStatus");
  if (!status) return;
  if (result === "connected") {
    status.innerHTML = `<strong style="color:green;">✅ GoCardless connected</strong><br><small>Your GoCardless account is connected to JobPilot.</small>`;
    const button = document.getElementById("connectGoCardlessButton");
    if (button) { button.textContent = "🏦 GoCardless Connected"; button.disabled = true; }
  } else if (result === "error") {
    status.innerHTML = `<strong style="color:#dc2626;">⚠️ GoCardless connection failed</strong>`;
  }
}

const observer = new MutationObserver(() => {
  if (addGoCardlessUI()) showGoCardlessResult();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
addGoCardlessUI();
showGoCardlessResult();
