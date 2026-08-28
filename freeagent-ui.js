import { supabase } from "./supabase.js";

const FUNCTION_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/freeagent-connect";

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function callFreeAgent(action) {
  const session = await getSession();
  if (!session) throw new Error("Please sign in again.");
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "FreeAgent request failed");
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function injectExpensesNav() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || document.getElementById("freeagentExpensesNav")) return;
  const invoices = [...nav.querySelectorAll("button")].find(b => b.dataset.page === "invoices");
  const button = document.createElement("button");
  button.className = "nav-item";
  button.id = "freeagentExpensesNav";
  button.textContent = "💸 Expenses";
  button.addEventListener("click", renderExpensesPage);
  if (invoices) invoices.insertAdjacentElement("afterend", button); else nav.appendChild(button);
}

function injectFreeAgentSettings() {
  const panel = document.querySelector(".settings-panel");
  if (!panel || document.getElementById("freeagentPanel")) return;
  const stripeButton = document.getElementById("connectStripeButton");
  if (!stripeButton) return;
  const section = document.createElement("div");
  section.id = "freeagentPanel";
  section.innerHTML = `
    <hr>
    <h2>FreeAgent & MTD</h2>
    <p class="muted">Connect FreeAgent so JobPilot can keep invoices and expenses in sync with your accounting records. FreeAgent remains responsible for accounting and MTD submission.</p>
    <div id="freeagentStatus" class="muted" style="margin:12px 0;">Checking FreeAgent connection...</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="button primary" id="freeagentConnectButton" type="button">Connect FreeAgent</button>
      <button class="button secondary" id="freeagentSyncInvoices" type="button" style="display:none;">Sync Invoices</button>
      <button class="button secondary" id="freeagentSyncExpenses" type="button" style="display:none;">Sync Expenses</button>
    </div>
    <p class="muted" style="font-size:13px;margin-top:10px;">Payments should continue to be reconciled through your accounting/bank feed rather than duplicated by JobPilot.</p>
  `;
  stripeButton.closest("h2")?.parentElement?.insertAdjacentElement("afterend", section);

  section.querySelector("#freeagentConnectButton").addEventListener("click", async () => {
    try {
      const data = await callFreeAgent("start");
      window.location.href = data.url;
    } catch (error) { alert(error.message); }
  });

  section.querySelector("#freeagentSyncInvoices").addEventListener("click", async () => {
    try { const data = await callFreeAgent("sync_invoices"); alert(`${data.synced || 0} invoice(s) synced to FreeAgent.`); }
    catch (error) { alert(error.message); }
  });

  section.querySelector("#freeagentSyncExpenses").addEventListener("click", async () => {
    try { const data = await callFreeAgent("sync_expenses"); alert(`${data.synced || 0} expense(s) synced to FreeAgent.`); }
    catch (error) { alert(error.message); }
  });

  refreshFreeAgentStatus();
}

async function refreshFreeAgentStatus() {
  const status = document.getElementById("freeagentStatus");
  if (!status) return;
  try {
    const data = await callFreeAgent("status");
    const connect = document.getElementById("freeagentConnectButton");
    const syncInvoices = document.getElementById("freeagentSyncInvoices");
    const syncExpenses = document.getElementById("freeagentSyncExpenses");
    if (data.connected) {
      status.textContent = `Connected to ${data.connection?.company_name || "FreeAgent"}`;
      if (connect) connect.textContent = "✓ Reconnect FreeAgent";
      if (syncInvoices) syncInvoices.style.display = "inline-flex";
      if (syncExpenses) syncExpenses.style.display = "inline-flex";
    } else {
      status.textContent = "Not connected";
    }
  } catch (error) {
    status.textContent = error.message;
  }
}

async function renderExpensesPage() {
  const content = document.getElementById("pageContent");
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (!content) return;
  title.textContent = "Expenses";
  subtitle.textContent = "Record business expenses and keep them ready for FreeAgent.";
  const session = await getSession();
  if (!session) return;

  const { data: expenses, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
  if (error) {
    content.innerHTML = `<div class="panel"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  content.innerHTML = `
    <div class="page-actions">
      <div><h2>Business Expenses</h2><p>Record costs once, then sync them to FreeAgent.</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="button secondary" id="expenseSync">Sync to FreeAgent</button><button class="button primary" id="addExpense">+ Add Expense</button></div>
    </div>
    <div class="panel">
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:10px;">Date</th><th style="text-align:left;padding:10px;">Description</th><th style="text-align:left;padding:10px;">Category</th><th style="text-align:right;padding:10px;">Amount</th><th style="text-align:center;padding:10px;">FreeAgent</th></tr></thead><tbody>
      ${(expenses || []).map(expense => `<tr><td style="padding:10px;">${escapeHtml(expense.expense_date)}</td><td style="padding:10px;">${escapeHtml(expense.description)}</td><td style="padding:10px;">${escapeHtml(expense.category)}</td><td style="padding:10px;text-align:right;">£${Number(expense.amount || 0).toFixed(2)}</td><td style="padding:10px;text-align:center;">${expense.freeagent_expense_id ? "✓" : "—"}</td></tr>`).join("") || `<tr><td colspan="5" style="padding:20px;text-align:center;">No expenses recorded yet.</td></tr>`}
      </tbody></table></div>
    </div>`;

  document.getElementById("addExpense").onclick = showExpenseForm;
  document.getElementById("expenseSync").onclick = async () => {
    try { const data = await callFreeAgent("sync_expenses"); alert(`${data.synced || 0} expense(s) synced.`); renderExpensesPage(); }
    catch (error) { alert(error.message); }
  };
}

function showExpenseForm() {
  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `<div class="modal-content"><div class="modal-header"><div><h2>Add Expense</h2><p>Record a business cost.</p></div><button class="close">×</button></div><form id="expenseForm"><label>Description *</label><input id="expenseDescription" required placeholder="Cleaning chemicals"><label>Category *</label><input id="expenseCategory" required placeholder="Materials"><label>Amount *</label><input id="expenseAmount" type="number" min="0" step="0.01" required><label>VAT</label><input id="expenseVat" type="number" min="0" step="0.01" value="0"><label>Date *</label><input id="expenseDate" type="date" value="${new Date().toISOString().slice(0,10)}" required><div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Save Expense</button></div></form></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll(".close").forEach(button => button.onclick = () => modal.remove());
  modal.querySelector("#expenseForm").onsubmit = async event => {
    event.preventDefault();
    const session = await getSession();
    if (!session) return;
    const { error } = await supabase.from("expenses").insert({ user_id: session.user.id, description: modal.querySelector("#expenseDescription").value.trim(), category: modal.querySelector("#expenseCategory").value.trim(), amount: Number(modal.querySelector("#expenseAmount").value), vat: Number(modal.querySelector("#expenseVat").value) || 0, expense_date: modal.querySelector("#expenseDate").value });
    if (error) { alert(error.message); return; }
    modal.remove();
    renderExpensesPage();
  };
}

function boot() {
  const observer = new MutationObserver(() => { injectExpensesNav(); injectFreeAgentSettings(); });
  observer.observe(document.body, { childList: true, subtree: true });
  injectExpensesNav();
  injectFreeAgentSettings();
  if (new URLSearchParams(location.search).get("freeagent") === "connected") {
    history.replaceState({}, "", location.pathname);
    setTimeout(() => alert("FreeAgent connected successfully."), 500);
  }
}

boot();
