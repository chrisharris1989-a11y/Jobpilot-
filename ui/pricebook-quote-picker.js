import { supabase } from "../supabase.js";

const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[c]));
const money = value => `£${Number(value || 0).toFixed(2)}`;

async function getCompanyId() {
  const { data, error } = await supabase.from("companies").select("id").maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function getItems() {
  const companyId = await getCompanyId();
  if (!companyId) return [];
  const { data, error } = await supabase.from("pricebook_items").select("id,item_type,name,description,unit,sale_price,active").eq("company_id", companyId).eq("active", true).order("item_type").order("name");
  if (error) throw error;
  return data || [];
}

function pickerHtml(items) {
  const options = items.length ? items.map(i => `<option value="${esc(i.id)}">${esc(i.name)} — ${money(i.sale_price)} / ${esc(i.unit || "item")}</option>`).join("") : `<option value="">No active Pricebook items</option>`;
  return `<div class="jp-quote-pricebook" data-pricebook-picker><div><label>Pricebook</label><select data-pricebook-select><option value="">Select a service, material or labour item…</option>${options}</select></div><div class="jp-quote-pricebook-actions"><input type="number" min="0.01" step="0.01" value="1" data-pricebook-qty aria-label="Quantity"><button type="button" class="button secondary" data-pricebook-add ${items.length ? "" : "disabled"}>Add item</button></div><div class="jp-quote-pricebook-added" data-pricebook-added></div></div>`;
}

function injectStyles() {
  if (document.getElementById("jp-quote-pricebook-styles")) return;
  const style = document.createElement("style");
  style.id = "jp-quote-pricebook-styles";
  style.textContent = `.jp-quote-pricebook{margin:14px 0;padding:14px;border:1px solid rgba(0,0,0,.1);border-radius:12px;background:rgba(0,0,0,.025);display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end}.jp-quote-pricebook label{display:block;font-size:12px;font-weight:700;margin-bottom:5px}.jp-quote-pricebook select{width:100%;box-sizing:border-box;padding:9px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:var(--card-bg,#fff);color:inherit}.jp-quote-pricebook-actions{display:flex;gap:8px;align-items:end}.jp-quote-pricebook-actions input{width:80px;box-sizing:border-box;padding:9px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:var(--card-bg,#fff);color:inherit}.jp-quote-pricebook-added{grid-column:1/-1;font-size:12px;line-height:1.5}.jp-quote-pricebook-added:empty{display:none}.jp-quote-pricebook-added div{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid rgba(0,0,0,.08)}@media(max-width:700px){.jp-quote-pricebook{grid-template-columns:1fr}.jp-quote-pricebook-actions{justify-content:flex-end}}`;
  document.head.appendChild(style);
}

function findCreateQuoteForm() {
  const subtotal = document.querySelector("#quoteSubtotal");
  if (!subtotal) return null;
  return subtotal.closest("form") || subtotal.closest(".modal-content") || subtotal.parentElement?.parentElement;
}

function findDescription(form) {
  return form?.querySelector("#quoteDescription") || form?.querySelector("textarea[name='description']") || form?.querySelector("textarea");
}

function findSubtotal(form) {
  return form?.querySelector("#quoteSubtotal") || form?.querySelector("input[name='subtotal']");
}

function addCreatePicker(form, items) {
  if (!form || form.querySelector("[data-pricebook-picker]")) return;
  const subtotal = findSubtotal(form);
  if (!subtotal) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = pickerHtml(items);
  const picker = wrapper.firstElementChild;
  subtotal.closest("label")?.before(picker) || subtotal.parentElement?.before(picker);
  const added = picker.querySelector("[data-pricebook-added]");
  picker.querySelector("[data-pricebook-add]")?.addEventListener("click", () => {
    const item = items.find(i => String(i.id) === String(picker.querySelector("[data-pricebook-select]").value));
    if (!item) return;
    const qty = Math.max(0.01, Number(picker.querySelector("[data-pricebook-qty]").value || 1));
    const amount = qty * Number(item.sale_price || 0);
    const description = findDescription(form);
    if (description) {
      const line = `${item.name}${qty !== 1 ? ` × ${qty}` : ""} — ${money(amount)}`;
      description.value = description.value.trim() ? `${description.value.trim()}\n${line}` : line;
      description.dispatchEvent(new Event("input", { bubbles: true }));
    }
    subtotal.value = (Number(subtotal.value || 0) + amount).toFixed(2);
    subtotal.dispatchEvent(new Event("input", { bubbles: true }));
    const entry = document.createElement("div");
    entry.innerHTML = `<span>${esc(item.name)}${qty !== 1 ? ` × ${qty}` : ""}</span><strong>${money(amount)}</strong>`;
    added.appendChild(entry);
    picker.querySelector("[data-pricebook-select]").value = "";
    picker.querySelector("[data-pricebook-qty]").value = "1";
  });
}

const installingForms = new WeakSet();
async function scan() {
  injectStyles();
  const form = findCreateQuoteForm();
  if (!form || form.querySelector("[data-pricebook-picker]") || installingForms.has(form)) return;
  installingForms.add(form);
  try {
    const items = await getItems();
    if (!form.isConnected || form.querySelector("[data-pricebook-picker]")) return;
    addCreatePicker(form, items);
  } catch (error) {
    console.error("JobPilot Pricebook quote picker:", error);
  }
}

new MutationObserver(() => scan()).observe(document.body, { childList: true, subtree: true });
scan();
