import { supabase } from "../../supabase.js";

const REFUND_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-refund";

function invoiceNumberFromElement(element) {
  const text = element?.textContent || "";
  const match = text.match(/Invoice\s+#\s*([A-Za-z0-9-]+)/i);
  return match?.[1] || null;
}

async function refundInvoice(invoiceNumber) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) { alert("Please sign in again before processing a refund."); return; }

  const { data: invoice, error } = await supabase.from("invoices").select("id,invoice_number,total,status,gocardless_payment_id,gocardless_payment_status").eq("invoice_number", invoiceNumber).maybeSingle();
  if (error || !invoice) { alert("Could not find that invoice."); return; }
  if (invoice.status !== "paid") { alert("Only paid invoices can be refunded."); return; }
  if (!String(invoice.gocardless_payment_status || "").includes("confirmed") && !invoice.gocardless_payment_id) { alert("This invoice does not have a confirmed GoCardless payment."); return; }

  const max = Number(invoice.total || 0);
  const amountText = window.prompt(`Refund amount (maximum £${max.toFixed(2)})`, max.toFixed(2));
  if (amountText === null) return;
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0 || amount > max) { alert(`Enter an amount between £0.01 and £${max.toFixed(2)}.`); return; }

  const reason = window.prompt("Reason for refund (optional)", "Customer refund") || "Customer refund";
  if (!window.confirm(`Refund £${amount.toFixed(2)} for invoice ${invoiceNumber}?\n\nThis will send the refund request to GoCardless.`)) return;

  try {
    const response = await fetch(REFUND_URL, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id: invoice.id, amount, reason }) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Refund could not be created");
    alert(`Refund created successfully.\n\nRefund: £${Number(result.refund.amount).toFixed(2)}\nStatus: ${result.refund.status}\nRefund ID: ${result.refund.id}`);
    window.location.reload();
  } catch (error) {
    console.error("GoCardless refund", error);
    alert(`Refund failed: ${error.message}`);
  }
}

function addRefundButtons() {
  const title = document.getElementById("pageTitle");
  if (!title || title.textContent.trim() !== "Invoices") return;

  document.querySelectorAll("strong").forEach(strong => {
    if (strong.dataset.gcRefundButton === "1") return;
    const number = invoiceNumberFromElement(strong);
    if (!number) return;
    const container = strong.closest(".panel, .card, .invoice-card, .table-row, .list-row, div");
    if (!container || container.querySelector?.(`[data-gc-refund-for="${CSS.escape(number)}"]`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary";
    button.textContent = "↩ Refund";
    button.dataset.gcRefundFor = number;
    button.style.marginTop = "8px";
    button.addEventListener("click", () => refundInvoice(number));
    const host = strong.parentElement || container;
    host.appendChild(button);
    strong.dataset.gcRefundButton = "1";
  });
}

const observer = new MutationObserver(() => {
  clearTimeout(window.__jobpilotGcRefundRefresh);
  window.__jobpilotGcRefundRefresh = setTimeout(addRefundButtons, 100);
});
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener("load", addRefundButtons);
setTimeout(addRefundButtons, 500);
