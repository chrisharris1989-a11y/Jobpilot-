import { supabase } from "../supabase.js";

const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[c]));
const money = v => `£${Number(v || 0).toFixed(2)}`;

function styles() {
  if (document.getElementById("jobpilot-quote-edit-styles")) return;
  const s = document.createElement("style");
  s.id = "jobpilot-quote-edit-styles";
  s.textContent = `.jpe-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.jpe-full{grid-column:1/-1}.jpe-line{display:grid;grid-template-columns:2fr .55fr .75fr .85fr 36px;gap:7px;margin:7px 0}.jpe-totals{max-width:320px;margin:12px 0 0 auto}.jpe-totals div{display:flex;justify-content:space-between;padding:4px 0}.jpe-totals .grand{border-top:2px solid var(--border,#111827);font-weight:700;font-size:18px}.jpe-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}@media(max-width:700px){.jpe-grid{grid-template-columns:1fr}.jpe-full{grid-column:auto}.jpe-line{grid-template-columns:1fr 60px 75px 85px 36px}}`;
  document.head.appendChild(s);
}

const row = item => `<div class="jpe-line"><input data-k="d" value="${esc(item?.description || "")}" placeholder="Description"><input data-k="q" type="number" min="0" step="0.01" value="${Number(item?.quantity ?? 1)}"><input data-k="u" value="${esc(item?.unit || "item")}" placeholder="Unit"><input data-k="p" type="number" min="0" step="0.01" value="${Number(item?.unit_price || 0).toFixed(2)}"><button type="button" class="button danger" data-remove>×</button></div>`;
const getLines = root => [...root.querySelectorAll(".jpe-line")].map(r => ({ description:r.querySelector('[data-k="d"]')?.value.trim() || "", quantity:Number(r.querySelector('[data-k="q"]')?.value || 0), unit:r.querySelector('[data-k="u"]')?.value.trim() || "item", unit_price:Number(r.querySelector('[data-k="p"]')?.value || 0) })).filter(x => x.description || x.quantity || x.unit_price);

async function openEditQuote(quoteId) {
  styles();
  const { data: quote, error } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (error) throw error;
  if (!quote) throw new Error("Quote not found.");
  const { data: customers, error: ce } = await supabase.from("customers").select("id,name").order("name");
  if (ce) throw ce;
  const d = quote.details || {};
  const items = Array.isArray(d.lineItems) ? d.lineItems : [];
  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `<div class="modal-content" style="max-width:1100px;width:96vw"><div class="modal-header"><div><h2>Edit Quote ${esc(quote.quote_number)}</h2><p>Update the quote and save your changes.</p></div><button type="button" class="close">×</button></div><form id="jpeForm"><div class="jpe-grid"><div><label>Customer *</label><select id="jpeCustomer" required>${(customers||[]).map(c=>`<option value="${c.id}" ${String(c.id)===String(quote.customer_id)?"selected":""}>${esc(c.name)}</option>`).join("")}</select></div><div><label>Status</label><select id="jpeStatus"><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="expired">Expired</option><option value="converted">Converted</option></select></div><div><label>Quote title *</label><input id="jpeTitle" required value="${esc(quote.title || "")}"></div><div><label>Quote date</label><input id="jpeDate" type="date" value="${esc(d.quoteDate || String(quote.created_at||"").slice(0,10))}"></div><div class="jpe-full"><label>Job / site address</label><input id="jpeAddress" value="${esc(d.jobAddress || "")}"></div><div><label>Valid until</label><input id="jpeValid" type="date" value="${esc(quote.valid_until || "")}"></div><div><label>Payment / deposit</label><input id="jpePayment" value="${esc(d.paymentTerms || "")}"></div><div><label>Estimated start</label><input id="jpeStart" type="date" value="${esc(d.startDate || "")}"></div><div><label>Estimated completion</label><input id="jpeCompletion" value="${esc(d.completion || "")}"></div><div class="jpe-full"><label>Detailed scope of work</label><textarea id="jpeDescription" rows="5">${esc(quote.description || "")}</textarea></div><div><label>Discount</label><input id="jpeDiscount" type="number" min="0" step="0.01" value="${Number(d.discount || 0)}"></div><div><label>VAT (%)</label><input id="jpeVat" type="number" min="0" step="0.01" value="${Number(quote.vat_percent || 0)}"></div><div class="jpe-full"><label>Terms, exclusions and additional information</label><textarea id="jpeNotes" rows="6">${esc(quote.notes || "")}</textarea></div></div><h3>Line items</h3><div id="jpeLines">${items.length ? items.map(row).join("") : row()}</div><button id="jpeAdd" type="button" class="button secondary">+ Add line</button><div class="jpe-totals"><div><span>Subtotal</span><strong id="jpeSubtotal">${money(quote.subtotal)}</strong></div><div><span>Discount</span><strong id="jpeDiscountTotal">${money(d.discount)}</strong></div><div><span>VAT</span><strong id="jpeVatTotal">${money(quote.vat)}</strong></div><div class="grand"><span>Total</span><strong id="jpeGrand">${money(quote.total)}</strong></div></div><div id="jpeMessage" class="muted"></div><div class="jpe-actions"><button type="button" class="button secondary close">Cancel</button><button id="jpeSave" type="submit" class="button primary">Save Changes</button></div></form></div>`;
  document.body.appendChild(modal);
  modal.querySelector("#jpeStatus").value = quote.status || "draft";
  modal.querySelectorAll(".close").forEach(b => b.addEventListener("click", () => modal.remove()));
  const linesRoot = modal.querySelector("#jpeLines");
  modal.querySelector("#jpeAdd").onclick = () => linesRoot.insertAdjacentHTML("beforeend", row());
  linesRoot.onclick = e => e.target.closest("[data-remove]")?.closest(".jpe-line")?.remove();
  const updateTotals = () => {
    const li = getLines(linesRoot), subtotal = li.reduce((a,x)=>a+x.quantity*x.unit_price,0), discount = Math.max(0, Number(modal.querySelector("#jpeDiscount").value||0)), taxable = Math.max(0, subtotal-discount), vat = taxable * Number(modal.querySelector("#jpeVat").value||0) / 100;
    modal.querySelector("#jpeSubtotal").textContent = money(subtotal); modal.querySelector("#jpeDiscountTotal").textContent = money(discount); modal.querySelector("#jpeVatTotal").textContent = money(vat); modal.querySelector("#jpeGrand").textContent = money(taxable+vat);
  };
  modal.addEventListener("input", updateTotals); updateTotals();
  modal.querySelector("#jpeForm").onsubmit = async e => {
    e.preventDefault();
    const save = modal.querySelector("#jpeSave"), msg = modal.querySelector("#jpeMessage"); save.disabled = true; save.textContent = "Saving…";
    try {
      const li=getLines(linesRoot), subtotal=li.reduce((a,x)=>a+x.quantity*x.unit_price,0), discount=Math.max(0,Number(modal.querySelector("#jpeDiscount").value||0)), vatPercent=Number(modal.querySelector("#jpeVat").value||0), vat=Math.max(0,subtotal-discount)*vatPercent/100, total=Math.max(0,subtotal-discount)+vat;
      const details={...d,quoteDate:modal.querySelector("#jpeDate").value,jobAddress:modal.querySelector("#jpeAddress").value.trim(),paymentTerms:modal.querySelector("#jpePayment").value.trim(),startDate:modal.querySelector("#jpeStart").value,completion:modal.querySelector("#jpeCompletion").value.trim(),discount,lineItems:li,acceptance:d.acceptance||"I/We accept this quotation and agree to the stated terms and conditions."};
      const { error: ue }=await supabase.from("quotes").update({customer_id:modal.querySelector("#jpeCustomer").value,title:modal.querySelector("#jpeTitle").value.trim(),description:modal.querySelector("#jpeDescription").value.trim(),status:modal.querySelector("#jpeStatus").value,subtotal,vat,total,vat_percent:vatPercent,valid_until:modal.querySelector("#jpeValid").value||null,notes:modal.querySelector("#jpeNotes").value.trim(),details}).eq("id",quoteId);
      if(ue) throw ue;
      modal.remove(); location.reload();
    } catch(err) { msg.textContent=err.message||"Could not save quote."; save.disabled=false; save.textContent="Save Changes"; }
  };
}

async function deleteQuote(quoteId, quoteNumber) {
  const confirmed = window.confirm(`Delete quote ${quoteNumber || ""}?\n\nThis cannot be undone.`);
  if (!confirmed) return;
  const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
  if (error) {
    console.error("JobPilot quote delete failed:", error);
    alert(error.message || "Could not delete quote.");
    return;
  }
  const view = document.querySelector(`.quote-view[data-quote-id="${CSS.escape(String(quoteId))}"]`);
  const rowEl = view?.closest("tr") || view?.parentElement;
  rowEl?.remove();
  if (!rowEl) location.reload();
}

function install() {
  const add = () => {
    if (document.getElementById("pageTitle")?.textContent.trim() !== "Quotes") return;
    document.querySelectorAll(".quote-view[data-quote-id]").forEach(view => {
      const id=view.dataset.quoteId;
      if(!id || view.parentElement?.querySelector(`.quote-edit[data-quote-id="${id}"]`)) return;
      const b=document.createElement("button"); b.type="button"; b.className="button secondary quote-edit"; b.dataset.quoteId=id; b.textContent="Edit";
      b.addEventListener("click",()=>openEditQuote(id).catch(e=>alert(e.message||"Could not open quote.")));
      view.parentElement?.appendChild(b);
      const d=document.createElement("button"); d.type="button"; d.className="button danger quote-delete"; d.dataset.quoteId=id; d.textContent="Delete";
      d.addEventListener("click",()=>deleteQuote(id, view.closest("tr")?.querySelector("td")?.textContent?.trim() || "quote"));
      view.parentElement?.appendChild(d);
    });
  };
  new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
  add();
}
install();
