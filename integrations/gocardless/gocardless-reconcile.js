import { supabase } from "../../supabase.js";

const RECONCILE_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-reconcile";

async function reconcileGoCardlessPayments() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const response = await fetch(RECONCILE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || "GoCardless payment sync failed.");
  }
  return result;
}

function isInvoicesPage() {
  return document.getElementById("pageTitle")?.textContent?.trim() === "Invoices";
}

function addSyncButton() {
  if (!isInvoicesPage() || document.getElementById("jobpilotGcSyncButton")) return;

  const title = document.getElementById("pageTitle");
  if (!title) return;

  const button = document.createElement("button");
  button.id = "jobpilotGcSyncButton";
  button.type = "button";
  button.className = "button secondary";
  button.textContent = "↻ Sync GoCardless payments";
  button.style.marginLeft = "10px";
  button.addEventListener("click", async () => {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Syncing GoCardless…";
    try {
      const result = await reconcileGoCardlessPayments();
      const count = Number(result?.reconciled || 0);
      if (count > 0) {
        window.location.reload();
        return;
      }
      alert("GoCardless is up to date. No matching payments were found.");
    } catch (error) {
      console.error("GoCardless payment sync", error);
      alert(error.message || "GoCardless payment sync failed.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

  title.parentElement?.appendChild(button);
}

async function autoReconcileOnce() {
  if (!isInvoicesPage()) return;
  if (sessionStorage.getItem("jobpilotGcAutoReconcileDone") === "1") return;
  sessionStorage.setItem("jobpilotGcAutoReconcileDone", "1");

  try {
    const result = await reconcileGoCardlessPayments();
    if (Number(result?.reconciled || 0) > 0) window.location.reload();
  } catch (error) {
    console.error("GoCardless automatic reconciliation", error);
    sessionStorage.removeItem("jobpilotGcAutoReconcileDone");
  }
}

const observer = new MutationObserver(() => {
  clearTimeout(window.__jobpilotGcReconcileRefresh);
  window.__jobpilotGcReconcileRefresh = setTimeout(() => {
    addSyncButton();
    autoReconcileOnce();
  }, 150);
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => {
  addSyncButton();
  autoReconcileOnce();
}, 500);
