import { supabase } from "../supabase.js";

const SYNC_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/xero-sync-v1";

async function syncXero(action = "sync") {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("You are not logged in.");
  const response = await fetch(SYNC_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: session.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Xero sync failed.");
  return result;
}

function ensureSyncControls() {
  const status = document.getElementById("managementXeroStatus");
  const mount = document.getElementById("managementXeroDisconnectMount");
  if (!status || !mount || !/xero connected/i.test(status.textContent || "") || document.getElementById("managementXeroSync")) return;
  const button = document.createElement("button");
  button.id = "managementXeroSync";
  button.type = "button";
  button.className = "secondary-button";
  button.textContent = "Sync Xero now";
  button.style.marginTop = "8px";
  const result = document.createElement("div");
  result.id = "managementXeroSyncResult";
  result.className = "muted";
  result.style.marginTop = "8px";
  mount.append(button, result);
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Syncing Xero…";
    result.textContent = "Syncing customers, invoices and payment status…";
    try {
      const data = await syncXero();
      result.textContent = `${data.customersSynced || 0} customers, ${data.invoicesSynced || 0} invoices synced. ${data.paymentsUpdated || 0} payment updates applied.`;
      button.textContent = "Sync Xero now";
    } catch (error) {
      console.error("JobPilot Xero sync:", error);
      result.textContent = error.message || "Xero sync failed.";
      button.textContent = "Try sync again";
    } finally { button.disabled = false; }
  });
}

let autoSyncStarted = false;
async function autoSyncAfterConnection() {
  if (autoSyncStarted || new URLSearchParams(window.location.search).get("xero") !== "connected") return;
  autoSyncStarted = true;
  try {
    await syncXero();
    const url = new URL(window.location.href);
    url.searchParams.delete("xero");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch (error) { console.error("JobPilot automatic Xero sync:", error); }
}

const observer = new MutationObserver(() => { ensureSyncControls(); autoSyncAfterConnection(); });
observer.observe(document.body, { childList: true, subtree: true });
ensureSyncControls();
autoSyncAfterConnection();
