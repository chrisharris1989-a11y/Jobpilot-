import { supabase } from "../supabase.js";

const STRIPE_DISCONNECT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-disconnect";
const FREEAGENT_DISCONNECT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/freeagent-disconnect";

function setManagementActive() {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  document.getElementById("jobpilot-management-button")?.classList.add("active");
}

function backToManagement() {
  document.getElementById("jobpilot-management-button")?.click();
}

function addDisconnectButton(container, id, label, handler) {
  if (!container || document.getElementById(id)) return null;
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.className = "secondary-button";
  button.textContent = label;
  button.style.cssText = "margin-top:8px;border-color:#dc2626;color:#dc2626;background:#fff;";
  container.appendChild(button);
  button.addEventListener("click", handler);
  return button;
}

async function authenticatedRequest(url, body = {}) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("You are not logged in.");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: session.access_token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not update the connection.");
  return result;
}

async function disconnectProvider({ url, button, status, successText, reload }) {
  if (!confirm("Disconnect this service from JobPilot? Your account with the provider will not be deleted.")) return;
  button.disabled = true;
  button.textContent = "Disconnecting…";
  try {
    await authenticatedRequest(url, { action: "disconnect" });
    status.innerHTML = successText;
    button.remove();
    await reload?.();
  } catch (error) {
    console.error("JobPilot connection disconnect:", error);
    alert(error.message || "Could not disconnect the service.");
    button.disabled = false;
    button.textContent = "Disconnect";
  }
}

function keepBackButtonAtBottom(content) {
  const backButton = document.getElementById("managementAccountingBack");
  if (content && backButton && backButton.parentElement === content && content.lastElementChild !== backButton) {
    content.appendChild(backButton);
  }
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
        <div class="panel-header"><div><h2>📊 FreeAgent</h2><p>Sync your accounting data with JobPilot.</p></div></div>
        <div id="managementFreeAgentStatus" class="muted" style="margin-top:10px">Checking connection…</div>
        <button id="managementFreeAgentButton" class="primary-button" type="button" style="margin-top:12px">Connect FreeAgent</button>
        <div id="managementFreeAgentDisconnectMount"></div>
      </div>

      <div class="panel">
        <div class="panel-header"><div><h2>💳 Stripe</h2><p>Accept online card payments from your customers.</p></div></div>
        <div id="managementStripeStatus" class="muted" style="margin-top:10px">Checking connection…</div>
        <button id="managementStripeButton" class="primary-button" type="button" style="margin-top:12px">Connect Stripe</button>
        <div id="managementStripeDisconnectMount"></div>
      </div>
    </div>

    <button id="managementAccountingBack" class="secondary-button" type="button" style="margin-top:24px">← Back to Management</button>
  `;

  document.getElementById("managementAccountingBack")?.addEventListener("click", backToManagement);
  const observer = new MutationObserver(() => keepBackButtonAtBottom(content));
  observer.observe(content, { childList: true, subtree: true });
  content.__jobPilotAccountingObserver?.disconnect?.();
  content.__jobPilotAccountingObserver = observer;

  const stripeStatus = document.getElementById("managementStripeStatus");
  const stripeButton = document.getElementById("managementStripeButton");
  const freeAgentStatus = document.getElementById("managementFreeAgentStatus");
  const freeAgentButton = document.getElementById("managementFreeAgentButton");

  const refreshStripe = async () => {
    const originalStatus = document.createElement("div");
    originalStatus.id = "stripeConnectionStatus";
    originalStatus.style.display = "none";
    document.body.appendChild(originalStatus);
    const originalButton = document.createElement("button");
    originalButton.id = "connectStripeButton";
    originalButton.style.display = "none";
    document.body.appendChild(originalButton);
    try {
      await window.JobPilotStripe?.loadStripeStatus?.();
      stripeStatus.innerHTML = originalStatus.innerHTML || "Not connected";
      stripeButton.textContent = originalButton.textContent || "💳 Connect Stripe";
      stripeButton.disabled = originalButton.disabled;
      stripeButton.onclick = () => window.JobPilotStripe?.connectStripe?.();
      const connected = /connected/i.test(originalStatus.textContent || "") || /connected/i.test(stripeStatus.textContent || "");
      document.getElementById("managementStripeDisconnect")?.remove();
      if (connected) {
        addDisconnectButton(
          document.getElementById("managementStripeDisconnectMount"),
          "managementStripeDisconnect",
          "Disconnect Stripe",
          () => disconnectProvider({
            url: STRIPE_DISCONNECT_URL,
            button: document.getElementById("managementStripeDisconnect"),
            status: stripeStatus,
            successText: "<strong>Not connected</strong><br><small>Stripe has been disconnected from JobPilot.</small>",
            reload: refreshStripe
          })
        );
      }
    } catch (error) {
      stripeStatus.textContent = error.message || "Could not check Stripe connection.";
    } finally {
      originalStatus.remove();
      originalButton.remove();
    }
  };

  const refreshFreeAgent = async () => {
    const originalStatus = document.createElement("div");
    originalStatus.id = "freeagentConnectionStatus";
    originalStatus.style.display = "none";
    document.body.appendChild(originalStatus);
    const originalButton = document.createElement("button");
    originalButton.id = "connectFreeAgentButton";
    originalButton.style.display = "none";
    document.body.appendChild(originalButton);
    try {
      await window.JobPilotFreeAgent?.loadFreeAgentStatus?.();
      freeAgentStatus.innerHTML = originalStatus.innerHTML || "Not connected";
      freeAgentButton.textContent = originalButton.textContent || "📊 Connect FreeAgent";
      freeAgentButton.disabled = originalButton.disabled;
      freeAgentButton.onclick = () => window.JobPilotFreeAgent?.connectFreeAgent?.();
      const connected = /connected/i.test(originalStatus.textContent || "") || /connected/i.test(freeAgentStatus.textContent || "");
      document.getElementById("managementFreeAgentDisconnect")?.remove();
      if (connected) {
        addDisconnectButton(
          document.getElementById("managementFreeAgentDisconnectMount"),
          "managementFreeAgentDisconnect",
          "Disconnect FreeAgent",
          () => disconnectProvider({
            url: FREEAGENT_DISCONNECT_URL,
            button: document.getElementById("managementFreeAgentDisconnect"),
            status: freeAgentStatus,
            successText: "<strong>Not connected</strong><br><small>FreeAgent has been disconnected from JobPilot.</small>",
            reload: refreshFreeAgent
          })
        );
      }
    } catch (error) {
      freeAgentStatus.textContent = error.message || "Could not check FreeAgent connection.";
    } finally {
      originalStatus.remove();
      originalButton.remove();
    }
  };

  await refreshStripe();
  await refreshFreeAgent();
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
