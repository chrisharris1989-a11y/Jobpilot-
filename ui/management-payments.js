import { supabase } from "../supabase.js";

const FREEAGENT_CONNECT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/freeagent-connect";
let started = false;
let rendering = false;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[c]));
}

async function getContext() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error("You are not logged in.");
  const { data: membership, error } = await supabase.from("company_members").select("company_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (error) throw error;
  if (!membership?.company_id) throw new Error("No active company membership found.");
  return { user, companyId: membership.company_id };
}

async function freeAgentRequest(action) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("You are not logged in.");
  const response = await fetch(FREEAGENT_CONNECT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: session.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ action })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "FreeAgent request failed.");
  return result;
}

async function isFreeAgentConnected() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from("freeagent_connections").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function loadPayments() {
  const { companyId } = await getContext();
  const { data, error } = await supabase.from("invoices").select("id,customer_id,invoice_number,status,total,paid_date,paid_at,freeagent_invoice_id,freeagent_bank_transaction_id,freeagent_payment_explanation_id,freeagent_payment_sync_status,freeagent_payment_sync_error").eq("company_id", companyId).order("paid_date", { ascending: false });
  if (error) throw error;
  const invoices = (data || []).filter(i => String(i.status || "").toLowerCase() === "paid" || i.paid_date || i.paid_at);
  const ids = [...new Set(invoices.map(i => i.customer_id).filter(Boolean))];
  let customers = [];
  if (ids.length) {
    const result = await supabase.from("customers").select("id,name").in("id", ids);
    if (result.error) throw result.error;
    customers = result.data || [];
  }
  const names = new Map(customers.map(c => [String(c.id), c.name]));
  return invoices.map(i => ({ ...i, customer_name: names.get(String(i.customer_id)) || "Customer" }));
}

function statusText(invoice) {
  if (invoice.freeagent_payment_explanation_id || invoice.freeagent_payment_sync_status === "synced") return "✅ Reconciled";
  if (!invoice.freeagent_invoice_id) return "⚠️ FreeAgent invoice not linked";
  if (invoice.freeagent_payment_sync_status === "awaiting_match") return "🟠 Awaiting match";
  if (invoice.freeagent_payment_sync_status === "error") return "❌ Error";
  return "— Not reconciled";
}

async function renderPaymentsSection() {
  const content = document.getElementById("pageContent");
  if (!content || !document.getElementById("pageTitle")?.textContent?.trim().toLowerCase().includes("accounting")) return;
  if (rendering) return;
  rendering = true;
  try {
    document.getElementById("jobpilot-accounting-payments")?.remove();
    const [payments, connected] = await Promise.all([loadPayments(), isFreeAgentConnected()]);
    const section = document.createElement("div");
    section.id = "jobpilot-accounting-payments";
    section.style.marginTop = "18px";
    section.innerHTML = `<div class="panel"><div class="panel-header" style="align-items:flex-start;gap:16px;flex-wrap:wrap;"><div><h2>💷 Customer Payments</h2><p>Reconcile paid JobPilot invoices against transactions already imported by your FreeAgent bank feed.</p></div><button id="jobpilotSyncPayments" class="secondary-button" type="button" ${connected ? "" : "disabled"}>Sync Payments to FreeAgent</button></div><div id="jobpilotPaymentStatus" class="muted" style="margin:10px 0 14px;">${connected ? "FreeAgent is connected. JobPilot will never create a second bank transaction; it explains the existing bank-feed transaction." : "Connect FreeAgent above before reconciling payments."}</div><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:10px;">Invoice</th><th style="text-align:left;padding:10px;">Customer</th><th style="text-align:left;padding:10px;">Paid</th><th style="text-align:right;padding:10px;">Amount</th><th style="text-align:center;padding:10px;">FreeAgent</th><th style="text-align:left;padding:10px;">Details</th></tr></thead><tbody>${payments.length ? payments.map(i => `<tr><td style="padding:10px;">${escapeHtml(i.invoice_number || i.id)}</td><td style="padding:10px;">${escapeHtml(i.customer_name)}</td><td style="padding:10px;">${escapeHtml(i.paid_at ? new Date(i.paid_at).toLocaleDateString("en-GB") : i.paid_date || "—")}</td><td style="padding:10px;text-align:right;">£${Number(i.total || 0).toFixed(2)}</td><td style="padding:10px;text-align:center;">${statusText(i)}</td><td style="padding:10px;">${escapeHtml(i.freeagent_payment_sync_error || "")}</td></tr>`).join("") : `<tr><td colspan="6" style="padding:24px;text-align:center;">No paid invoices found.</td></tr>`}</tbody></table></div></div>`;
    content.appendChild(section);
    section.querySelector("#jobpilotSyncPayments")?.addEventListener("click", syncPayments);
  } catch (error) {
    console.error("JobPilot payment reconciliation error:", error);
  } finally {
    rendering = false;
  }
}

async function syncPayments() {
  const button = document.getElementById("jobpilotSyncPayments");
  const status = document.getElementById("jobpilotPaymentStatus");
  if (!button) return;
  button.disabled = true;
  button.textContent = "Reconciling…";
  if (status) status.textContent = "Checking FreeAgent bank-feed transactions for matching paid invoices…";
  try {
    const result = await freeAgentRequest("sync_payments");
    const errors = Array.isArray(result.errors) ? result.errors : [];
    if (status) {
      status.innerHTML = `✅ ${result.matched || 0} payment(s) reconciled. ${result.awaiting || 0} awaiting a unique bank transaction match. ${result.skipped || 0} already reconciled.${errors.length ? `<br><small>Errors: ${errors.map(e => escapeHtml(e.error)).join("<br>")}</small>` : ""}`;
    }
    await renderPaymentsSection();
  } catch (error) {
    if (status) status.textContent = `❌ ${error.message || "Payment reconciliation failed."}`;
    button.disabled = false;
    button.textContent = "Sync Payments to FreeAgent";
  }
}

function startObserver() {
  if (started) return;
  started = true;
  const observer = new MutationObserver(() => {
    const title = document.getElementById("pageTitle")?.textContent?.trim().toLowerCase();
    if (title?.includes("accounting") && document.getElementById("pageContent") && !document.getElementById("jobpilot-accounting-payments")) renderPaymentsSection();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(renderPaymentsSection, 350);
}

startObserver();
window.JobPilotManagementPayments = { renderPaymentsSection };
