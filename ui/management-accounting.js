import { supabase } from "../supabase.js";

const GO_CARDLESS_CONNECT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-connect";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}

function setManagementActive() {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.getElementById("jobpilot-management-button")?.classList.add("active");
}

function backToManagement() {
  document.getElementById("jobpilot-management-button")?.click();
}

async function goCardlessRequest(body = {}) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("You are not logged in.");

  const response = await fetch(GO_CARDLESS_CONNECT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: session.access_token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not connect to GoCardless.");
  return result;
}

async function renderManagementAccounting() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Accounting"));
  document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode("Manage your accounting and payment connections."));
  setManagementActive();

  content.innerHTML = `
    <div class="page-actions">
      <div>
        <h2>Accounting</h2>
        <p>Connect the accounting and payment services your business uses with JobPilot.</p>
      </div>
    </div>

    <div class="content-grid">
      <div class="panel">
        <div class="panel-header">
          <div><h2>📊 FreeAgent</h2><p>Sync your accounting data with JobPilot.</p></div>
        </div>
        <div id="managementFreeAgentStatus" class="muted" style="margin-top:10px">Checking connection…</div>
        <button id="managementFreeAgentButton" class="primary-button" type="button" style="margin-top:12px">Connect FreeAgent</button>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><h2>💳 Stripe</h2><p>Accept online card payments from your customers.</p></div>
        </div>
        <div id="managementStripeStatus" class="muted" style="margin-top:10px">Checking connection…</div>
        <button id="managementStripeButton" class="primary-button" type="button" style="margin-top:12px">Connect Stripe</button>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><h2>🏦 GoCardless</h2><p>Let customers pay invoices by bank.</p></div>
        </div>
        <div id="managementGoCardlessStatus" class="muted" style="margin-top:10px">Checking connection…</div>
        <button id="managementGoCardlessButton" class="primary-button" type="button" style="margin-top:12px">Connect GoCardless</button>
      </div>
    </div>

    <button id="managementAccountingBack" class="secondary-button" type="button" style="margin-top:16px">← Back to Management</button>
  `;

  const stripeStatus = document.getElementById("managementStripeStatus");
  const stripeButton = document.getElementById("managementStripeButton");
  const freeAgentStatus = document.getElementById("managementFreeAgentStatus");
  const freeAgentButton = document.getElementById("managementFreeAgentButton");
  const goStatus = document.getElementById("managementGoCardlessStatus");
  const goButton = document.getElementById("managementGoCardlessButton");

  document.getElementById("managementAccountingBack")?.addEventListener("click", backToManagement);

  if (window.JobPilotStripe?.loadStripeStatus) {
    const originalStatus = document.createElement("div");
    originalStatus.id = "stripeConnectionStatus";
    originalStatus.style.display = "none";
    document.body.appendChild(originalStatus);

    const originalButton = document.createElement("button");
    originalButton.id = "connectStripeButton";
    originalButton.style.display = "none";
    document.body.appendChild(originalButton);

    try {
      await window.JobPilotStripe.loadStripeStatus();
      stripeStatus.innerHTML = originalStatus.innerHTML || "Not connected";
      stripeButton.textContent = originalButton.textContent || "💳 Connect Stripe";
      stripeButton.disabled = originalButton.disabled;
      stripeButton.onclick = () => window.JobPilotStripe.connectStripe();
    } catch (error) {
      stripeStatus.textContent = error.message || "Could not check Stripe connection.";
    } finally {
      originalStatus.remove();
      originalButton.remove();
    }
  } else {
    stripeStatus.textContent = "Stripe integration unavailable.";
  }

  if (window.JobPilotFreeAgent?.loadFreeAgentStatus) {
    const originalStatus = document.createElement("div");
    originalStatus.id = "freeagentConnectionStatus";
    originalStatus.style.display = "none";
    document.body.appendChild(originalStatus);

    const originalButton = document.createElement("button");
    originalButton.id = "connectFreeAgentButton";
    originalButton.style.display = "none";
    document.body.appendChild(originalButton);

    try {
      await window.JobPilotFreeAgent.loadFreeAgentStatus();
      freeAgentStatus.innerHTML = originalStatus.innerHTML || "Not connected";
      freeAgentButton.textContent = originalButton.textContent || "📊 Connect FreeAgent";
      freeAgentButton.disabled = originalButton.disabled;
      freeAgentButton.onclick = () => window.JobPilotFreeAgent.connectFreeAgent();
    } catch (error) {
      freeAgentStatus.textContent = error.message || "Could not check FreeAgent connection.";
    } finally {
      originalStatus.remove();
      originalButton.remove();
    }
  } else {
    freeAgentStatus.textContent = "FreeAgent integration unavailable.";
  }

  try {
    const result = await goCardlessRequest({ action: "status" });
    if (result.connected) {
      goStatus.innerHTML = `<strong style="color:green">✅ GoCardless connected</strong><br><small>${escapeHtml(result.organisation_name || "GoCardless account connected to JobPilot.")}</small>`;
      goButton.textContent = "🏦 GoCardless Connected";
      goButton.disabled = true;
    } else {
      goStatus.innerHTML = "<strong>Not connected</strong><br><small>Connect GoCardless to let customers pay by bank.</small>";
    }
  } catch (error) {
    goStatus.textContent = error.message || "Could not check GoCardless connection.";
  }

  goButton.onclick = async () => {
    goButton.disabled = true;
    goButton.textContent = "Connecting to GoCardless…";
    try {
      const result = await goCardlessRequest();
      if (!result.url) throw new Error("GoCardless did not return an authorisation URL.");
      window.location.href = result.url;
    } catch (error) {
      goStatus.textContent = error.message || "Could not connect to GoCardless.";
      goButton.disabled = false;
      goButton.textContent = "🏦 Connect GoCardless";
    }
  };
}

function interceptAccountingClick(event) {
  const card = event.target.closest?.('[data-management-section="accounting"]');
  if (!card) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderManagementAccounting();
}

document.addEventListener("click", interceptAccountingClick, true);

window.renderManagementAccounting = renderManagementAccounting;
