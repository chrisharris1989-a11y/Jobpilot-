import { supabase } from "../../supabase.js";

const SAGE_CONNECT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/sage-oauth-callback";
const SAGE_CONTAINER_ID = "sageConnectionContainer";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sageRequest(action = "") {
  const { data, error } = await supabase.functions.invoke("sage-oauth-callback", {
    body: action ? { action } : {},
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function connectSage() {
  const button = document.getElementById("connectSageButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Connecting…";
  }

  try {
    const result = await sageRequest();
    if (!result?.url) throw new Error("JobPilot could not start the Sage connection.");
    window.location.href = result.url;
  } catch (error) {
    console.error("Sage connection:", error);
    alert(error?.message || "Could not connect Sage. Please try again.");
    if (button) {
      button.disabled = false;
      button.textContent = "Connect Sage";
    }
  }
}

async function disconnectSage() {
  if (!confirm("Disconnect Sage from JobPilot?")) return;

  const button = document.getElementById("disconnectSageButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Disconnecting…";
  }

  try {
    await sageRequest("disconnect");
    renderSageCard(false);
  } catch (error) {
    console.error("Sage disconnect:", error);
    alert(error?.message || "Could not disconnect Sage. Please try again.");
    if (button) {
      button.disabled = false;
      button.textContent = "Disconnect Sage";
    }
  }
}

function renderSageCard(connected, connection = null) {
  const container = document.getElementById(SAGE_CONTAINER_ID);
  if (!container) return;

  if (connected) {
    container.innerHTML = `
      <div class="panel-header">
        <div>
          <h2>🟢 Sage</h2>
          <p>Sage Business Cloud Accounting is connected.</p>
        </div>
      </div>
      <div class="detail-list">
        <div>
          <span>Business</span>
          <strong>${escapeHtml(connection?.company_name || "Connected Sage business")}</strong>
        </div>
      </div>
      <button id="disconnectSageButton" class="button secondary" type="button" style="margin-top:16px;">
        Disconnect Sage
      </button>
    `;
    document.getElementById("disconnectSageButton")?.addEventListener("click", disconnectSage);
    return;
  }

  container.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>🧾 Sage</h2>
        <p>Connect Sage Business Cloud Accounting to JobPilot.</p>
      </div>
    </div>
    <button id="connectSageButton" class="button primary" type="button">
      Connect Sage
    </button>
  `;
  document.getElementById("connectSageButton")?.addEventListener("click", connectSage);
}

async function loadSageStatus() {
  try {
    const result = await sageRequest("status");
    renderSageCard(Boolean(result?.connected), result?.connection);
  } catch (error) {
    console.error("Sage status:", error);
    renderSageCard(false);
  }
}

function mountSageCard() {
  if (document.getElementById(SAGE_CONTAINER_ID)) return;

  const title = document.getElementById("pageTitle");
  if (!title || title.textContent.trim() !== "Connections") return;

  const content = document.getElementById("pageContent");
  if (!content) return;

  const container = document.createElement("div");
  container.id = SAGE_CONTAINER_ID;
  container.className = "panel";
  container.style.marginTop = "16px";

  content.appendChild(container);
  loadSageStatus();
}

const observer = new MutationObserver(mountSageCard);
observer.observe(document.body, { childList: true, subtree: true });

mountSageCard();

window.JobPilotSage = {
  refresh: loadSageStatus,
};
