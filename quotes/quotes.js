import { supabase } from "../supabase.js";

export function createQuotesModule({
  getCurrentUser,
  getCustomers,
  loadJobs,
  loadQuotes: _unusedLoadQuotes,
  showPage,
  showJobProfile,
  escapeHtml
}) {
  let quotes = [];

  async function loadQuotes() {
    const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Quotes:", error); return; }
    quotes = data || [];
  }

  function renderQuotesPage(content) {
    const customers = getCustomers();
    content.innerHTML = `
      <div class="page-actions">
        <div><h2>Quotes</h2><p>Create and track quotations.</p></div>
        <button id="addQuoteButton" class="button primary">+ New Quote</button>
      </div>
      <div class="panel">
        ${quotes.length ? quotes.map(quote => {
          const customer = customers.find(c => String(c.id) === String(quote.customer_id));
          return `<div class="job-row"><div><strong>Quote #${escapeHtml(quote.quote_number || "—")}</strong><div class="muted">${customer ? escapeHtml(customer.name) : "Unknown customer"}${quote.valid_until ? " • Valid until " + quote.valid_until : ""}</div></div><div><strong>£${Number(quote.total || 0).toFixed(2)}</strong><span class="muted">${escapeHtml(quote.status || "draft")}</span><button class="button secondary quote-view" data-quote-id="${quote.id}">View</button></div></div>`;
        }).join("") : `<div class="empty-state"><div class="empty-icon">💷</div><h3>No quotes yet</h3><p>Create your first quote.</p></div>`}
      </div>`;
    document.getElementById("addQuoteButton").addEventListener("click", showAddQuoteForm);
    content.querySelectorAll(".quote-view").forEach(button => button.addEventListener("click", () => showQuoteProfile(button.dataset.quoteId)));
  }

  function showAddQuoteForm() {
    const customers = getCustomers();
    const modal = document.createElement("div");
    modal.className = "modal show";
    const settings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
    const nextNumber = Number(settings.nextQuoteNumber) || 1;
    const prefix = settings.quotePrefix || "QUO-";
    const quoteNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;
    const defaultVatRate = Number(settings.vatRate ?? 20);
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><div><h2>New Quote</h2><p>Create a quotation for a customer.</p></div><button class="close">×</button></div><form id="quoteForm"><label>Customer *</label><select id="quoteCustomer" required><option value="">Select customer</option>${customers.map(customer => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`).join("")}</select><label>Quote Number *</label><input id="quoteNumber" value="${escapeHtml(quoteNumber)}" required><label>Job / Quote Details *</label><textarea id="quoteDescription" placeholder="Describe the work being quoted..." required></textarea><h3>Pricing</h3><label>Subtotal</label><input id="quoteSubtotal" type="number" step="0.01" min="0" value="0"><label>VAT %</label><input id="quoteVatPercent" type="number" step="0.01" min="0" value="${defaultVatRate}"><label>VAT</label><input id="quoteVat" type="number" step="0.01" value="0" readonly><label>Total</label><input id="quoteTotal" type="number" step="0.01" value="0" readonly><label>Valid Until</label><input id="quoteValidUntil" type="date"><label>Notes</label><textarea id="quoteNotes" placeholder="Additional notes or terms..."></textarea><h3>Recurring Job</h3><label><input type="checkbox" id="quoteRecurring"> Make this a recurring job</label><div id="recurringOptions" style="display:none;"><label>Repeat Every</label><select id="quoteRecurringInterval"><option value="4">Every 4 weeks</option><option value="6">Every 6 weeks</option><option value="8">Every 8 weeks</option></select></div><div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Save Quote</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => modal.remove()));
    const subtotalInput = modal.querySelector("#quoteSubtotal");
    const vatPercentInput = modal.querySelector("#quoteVatPercent");
    const vatInput = modal.querySelector("#quoteVat");
    const totalInput = modal.querySelector("#quoteTotal");
    function updateQuoteTotal() { const subtotal = Number(subtotalInput.value) || 0; const vatPercent = Number(vatPercentInput.value) || 0; const vat = subtotal * vatPercent / 100; vatInput.value = vat.toFixed(2); totalInput.value = (subtotal + vat).toFixed(2); }
    subtotalInput.addEventListener("input", updateQuoteTotal);
    vatPercentInput.addEventListener("input", updateQuoteTotal);
    updateQuoteTotal();
    const recurringCheckbox = modal.querySelector("#quoteRecurring");
    const recurringOptions = modal.querySelector("#recurringOptions");
    recurringCheckbox.addEventListener("change", () => { recurringOptions.style.display = recurringCheckbox.checked ? "block" : "none"; });
    modal.querySelector("#quoteForm").addEventListener("submit", async event => {
      event.preventDefault();
      const quote = {
        user_id: getCurrentUser()?.id,
        customer_id: modal.querySelector("#quoteCustomer").value,
        quote_number: modal.querySelector("#quoteNumber").value.trim(),
        status: "draft",
        description: modal.querySelector("#quoteDescription").value.trim(),
        subtotal: Number(modal.querySelector("#quoteSubtotal").value) || 0,
        vat: Number(modal.querySelector("#quoteVat").value) || 0,
        total: Number(modal.querySelector("#quoteTotal").value) || 0,
        notes: modal.querySelector("#quoteNotes").value.trim(),
        valid_until: modal.querySelector("#quoteValidUntil").value || null
      };
      const { error } = await supabase.from("quotes").insert(quote);
      if (error) { alert("The quote could not be saved:\n\n" + error.message); return; }
      settings.nextQuoteNumber = nextNumber + 1;
      localStorage.setItem("jobpilot_settings", JSON.stringify(settings));
      modal.remove();
      await loadQuotes();
      showPage("quotes");
    });
  }

  function showQuoteProfile(quoteId) {
    const quote = quotes.find(q => String(q.id) === String(quoteId));
    if (!quote) return;
    const customer = getCustomers().find(c => String(c.id) === String(quote.customer_id));
    const content = document.getElementById("pageContent");
    document.getElementById("pageTitle").textContent = `Quote #${quote.quote_number || "—"}`;
    document.getElementById("pageSubtitle").textContent = "Quote details";
    content.innerHTML = `<div class="page-actions"><button id="backQuotes" class="button secondary">← Quotes</button><div>${quote.status !== "converted" ? `<button id="convertQuote" class="button primary">📋 Convert to Job</button>` : `<button class="button secondary" disabled>✓ Converted to Job</button>`}<button id="deleteQuote" class="button danger">Delete</button></div></div><div class="content-grid"><div class="panel"><h2>Quote Details</h2><div class="detail-list"><div><span>Quote Number</span><strong>${escapeHtml(quote.quote_number || "—")}</strong></div><div><span>Customer</span><strong>${customer ? escapeHtml(customer.name) : "Unknown customer"}</strong></div><div><span>Status</span><strong>${escapeHtml(quote.status || "draft")}</strong></div><div><span>Valid Until</span><strong>${quote.valid_until || "—"}</strong></div><div><span>Notes</span><strong>${escapeHtml(quote.notes || "—")}</strong></div></div></div><div class="panel"><h2>Financial Summary</h2><div class="detail-list"><div><span>Subtotal</span><strong>£${Number(quote.subtotal || 0).toFixed(2)}</strong></div><div><span>VAT</span><strong>£${Number(quote.vat || 0).toFixed(2)}</strong></div><div><span>Total</span><strong>£${Number(quote.total || 0).toFixed(2)}</strong></div></div></div></div>`;
    document.getElementById("backQuotes").addEventListener("click", () => showPage("quotes"));
    const convertButton = document.getElementById("convertQuote");
    if (convertButton) convertButton.addEventListener("click", () => convertQuoteToJob(quote.id));
    document.getElementById("deleteQuote").addEventListener("click", () => deleteQuote(quote.id));
  }

  async function convertQuoteToJob(quoteId) {
    const quote = quotes.find(q => String(q.id) === String(quoteId));
    if (!quote) { alert("Quote could not be found."); return; }
    if (quote.status === "converted") { alert("This quote has already been converted to a job."); return; }
    const customer = getCustomers().find(c => String(c.id) === String(quote.customer_id));
    if (!customer) { alert("The customer attached to this quote could not be found."); return; }
    if (!confirm(`Convert Quote #${quote.quote_number || ""} into a job for ${customer.name}?`)) return;
    const job = { user_id: getCurrentUser()?.id, customer_id: quote.customer_id, title: `Quote #${quote.quote_number || "Job"}`, description: `Converted from Quote #${quote.quote_number || ""}`, scheduled_date: null, scheduled_time: null, status: "pending", price: Number(quote.total || 0), notes: quote.notes || "" };
    const { data: createdJob, error: jobError } = await supabase.from("jobs").insert(job).select().single();
    if (jobError) { alert("The job could not be created:\n\n" + jobError.message); return; }
    const { error: quoteError } = await supabase.from("quotes").update({ status: "converted" }).eq("id", quote.id);
    if (quoteError) { await loadJobs(); alert("The job was created, but the quote could not be marked as converted.\n\n" + quoteError.message); showPage("jobs"); return; }
    await loadJobs();
    await loadQuotes();
    showJobProfile(createdJob.id);
    alert(`Quote #${quote.quote_number || ""} has been converted to a job.`);
  }

  async function deleteQuote(quoteId) {
    const quote = quotes.find(q => String(q.id) === String(quoteId));
    if (!quote) return;
    if (!confirm(`Delete Quote #${quote.quote_number || ""}? This cannot be undone.`)) return;
    const { error } = await supabase.from("quotes").delete().eq("id", quote.id);
    if (error) { alert(error.message); return; }
    await loadQuotes();
    showPage("quotes");
  }

  function getQuotes() { return quotes; }

  return { loadQuotes, getQuotes, renderQuotesPage, showAddQuoteForm, showQuoteProfile, convertQuoteToJob, deleteQuote };
}
