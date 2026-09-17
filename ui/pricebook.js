import { supabase } from "../supabase.js";

const TYPES = [["service", "Services"], ["material", "Materials"], ["labour", "Labour"]];
let activeType = "service";

async function companyId() {
  const { data, error } = await supabase.from("companies").select("id").maybeSingle();
  if (error) throw error;
  return data?.id || null;
}
function esc(v) { return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function money(v) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP" }).format(Number(v || 0)); }

export async function renderPricebook(content = document.getElementById("pageContent")) {
  if (!content) return;
  activeType = "service";
  content.innerHTML = `<section class="settings-page jp-settings-page jp-pricebook-page"><header class="page-header"><h2>Pricebook</h2><p>Save services, materials and labour for quick reuse when creating quotes.</p></header><button class="jp-settings-back" type="button" data-pricebook-back>← Settings</button><div class="jp-pricebook-toolbar"><div class="jp-pricebook-tabs">${TYPES.map(([t,l]) => `<button type="button" class="jp-pricebook-tab${t === activeType ? " active" : ""}" data-pricebook-type="${t}">${l}</button>`).join("")}</div><button type="button" class="button primary" data-pricebook-add>+ Add item</button></div><div class="jp-pricebook-list" data-pricebook-list><div class="panel"><p class="muted">Loading Pricebook…</p></div></div></section>`;
  ensureStyles();
  content.querySelector("[data-pricebook-back]")?.addEventListener("click", () => window.renderSettings?.(content));
  content.querySelectorAll("[data-pricebook-type]").forEach(b => b.addEventListener("click", () => { activeType = b.dataset.pricebookType; content.querySelectorAll("[data-pricebook-type]").forEach(x => x.classList.toggle("active", x === b)); loadItems(content); }));
  content.querySelector("[data-pricebook-add]")?.addEventListener("click", () => showForm(content));
  await loadItems(content);
}

async function loadItems(content) {
  const list = content.querySelector("[data-pricebook-list]"); if (!list) return;
  try {
    const cid = await companyId();
    if (!cid) { list.innerHTML = `<div class="panel"><p>Set up your company details before using Pricebook.</p></div>`; return; }
    const { data, error } = await supabase.from("pricebook_items").select("*").eq("company_id", cid).eq("item_type", activeType).order("sort_order").order("name");
    if (error) throw error;
    if (!data?.length) { list.innerHTML = `<div class="panel jp-pricebook-empty"><h3>No ${TYPES.find(x => x[0] === activeType)?.[1].toLowerCase()} yet</h3><p class="muted">Add your first reusable item.</p><button type="button" class="button primary" data-empty-add>+ Add item</button></div>`; list.querySelector("[data-empty-add]")?.addEventListener("click", () => showForm(content)); return; }
    list.innerHTML = data.map(i => `<div class="panel jp-pricebook-item"><div class="jp-pricebook-item-main"><div><h3>${esc(i.name)}</h3><p class="muted">${esc(i.description || "")}</p></div><div class="jp-pricebook-item-meta"><strong>${money(i.sale_price)}</strong><span>${esc(i.unit)}${i.category ? ` · ${esc(i.category)}` : ""}</span></div></div><div class="jp-pricebook-item-actions"><button type="button" class="button" data-edit="${i.id}">Edit</button><button type="button" class="button" data-delete="${i.id}">Delete</button></div></div>`).join("");
    list.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => showForm(content, data.find(i => i.id === b.dataset.edit))));
    list.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteItem(content, b.dataset.delete)));
  } catch (e) { console.error("JobPilot Pricebook", e); list.innerHTML = `<div class="panel"><p class="error">${esc(e?.message || "Unable to load Pricebook.")}</p></div>`; }
}

function showForm(content, item = null) {
  const x = item || {};
  document.querySelector(".jp-pricebook-modal")?.remove();
  const modal = document.createElement("div"); modal.className = "jp-pricebook-modal";
  modal.innerHTML = `<div class="jp-pricebook-modal-card" role="dialog" aria-modal="true"><div class="panel-header"><div><h3>${item ? "Edit item" : "Add item"}</h3><p class="muted">Create a reusable Pricebook item.</p></div><button type="button" class="jp-pricebook-close" data-close>×</button></div><form data-form><label>Name<input name="name" required value="${esc(x.name)}" placeholder="e.g. Driveway cleaning"></label><label>Description<textarea name="description" rows="3" placeholder="Optional description">${esc(x.description)}</textarea></label><div class="jp-pricebook-form-grid"><label>Category<input name="category" value="${esc(x.category)}" placeholder="e.g. Pressure washing"></label><label>Unit<select name="unit">${["each","hour","m²","metre","job","panel"].map(u => `<option value="${u}"${(x.unit || "each") === u ? " selected" : ""}>${u}</option>`).join("")}</select></label><label>Sale price<input name="sale_price" type="number" min="0" step="0.01" required value="${esc(x.sale_price ?? 0)}"></label><label>Cost price<input name="cost_price" type="number" min="0" step="0.01" value="${esc(x.cost_price ?? 0)}"></label></div><label class="jp-pricebook-active"><input name="active" type="checkbox"${x.active === false ? "" : " checked"}> Active</label><div class="jp-pricebook-form-actions"><button type="button" class="button" data-close>Cancel</button><button type="submit" class="button primary">${item ? "Save changes" : "Add item"}</button></div><div class="jp-pricebook-status" role="status"></div></form></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => modal.remove()));
  modal.querySelector("[data-form]").addEventListener("submit", async e => {
    e.preventDefault(); const form = e.currentTarget, status = modal.querySelector(".jp-pricebook-status"), submit = form.querySelector("button[type=submit]"); submit.disabled = true; status.textContent = "Saving…";
    try {
      const cid = await companyId(); if (!cid) throw new Error("Company details are required."); const fd = new FormData(form);
      const payload = { company_id: cid, item_type: activeType, name: String(fd.get("name") || "").trim(), description: String(fd.get("description") || "").trim() || null, category: String(fd.get("category") || "").trim() || null, unit: fd.get("unit"), sale_price: Number(fd.get("sale_price") || 0), cost_price: Number(fd.get("cost_price") || 0), active: fd.get("active") === "on", updated_at: new Date().toISOString() };
      const result = item ? await supabase.from("pricebook_items").update(payload).eq("id", item.id).eq("company_id", cid) : await supabase.from("pricebook_items").insert(payload); if (result.error) throw result.error;
      modal.remove(); await loadItems(content);
    } catch (err) { status.textContent = err?.message || "Could not save item."; submit.disabled = false; }
  });
}
async function deleteItem(content, id) { if (!confirm("Delete this Pricebook item?")) return; const cid = await companyId(); if (!cid) return; const { error } = await supabase.from("pricebook_items").delete().eq("id", id).eq("company_id", cid); if (error) return alert(error.message); await loadItems(content); }

function ensureStyles() { if (document.getElementById("jp-pricebook-styles")) return; const s = document.createElement("style"); s.id = "jp-pricebook-styles"; s.textContent = `.jp-pricebook-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:20px;max-width:900px}.jp-pricebook-tabs{display:flex;gap:6px;border-bottom:1px solid rgba(0,0,0,.1)}.jp-pricebook-tab{border:0;background:none;padding:10px 14px;cursor:pointer;font:inherit;opacity:.65;border-bottom:2px solid transparent}.jp-pricebook-tab.active{opacity:1;border-bottom-color:currentColor;font-weight:700}.jp-pricebook-list{max-width:900px;margin-top:16px;display:grid;gap:10px}.jp-pricebook-item{display:flex;justify-content:space-between;align-items:center;gap:20px}.jp-pricebook-item-main{display:flex;justify-content:space-between;gap:30px;flex:1;min-width:0}.jp-pricebook-item h3{margin:0 0 5px;font-size:15px}.jp-pricebook-item p{margin:0;font-size:13px}.jp-pricebook-item-meta{display:flex;flex-direction:column;align-items:flex-end;white-space:nowrap}.jp-pricebook-item-meta strong{font-size:15px}.jp-pricebook-item-meta span{font-size:12px;opacity:.65;margin-top:3px}.jp-pricebook-item-actions{display:flex;gap:8px}.jp-pricebook-empty{text-align:center;padding:35px}.jp-pricebook-modal{position:fixed;inset:0;background:rgba(0,0,0,.38);display:grid;place-items:center;padding:20px;z-index:1000}.jp-pricebook-modal-card{width:min(620px,100%);max-height:90vh;overflow:auto;background:var(--card-bg,#fff);color:inherit;border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.jp-pricebook-modal-card label{display:block;font-size:13px;font-weight:600;margin-top:14px}.jp-pricebook-modal-card input,.jp-pricebook-modal-card textarea,.jp-pricebook-modal-card select{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid rgba(0,0,0,.15);border-radius:9px;background:var(--card-bg,#fff);color:inherit;font:inherit}.jp-pricebook-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.jp-pricebook-active{display:flex!important;align-items:center;gap:8px}.jp-pricebook-active input{width:auto!important;margin:0!important}.jp-pricebook-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.jp-pricebook-close{border:0;background:none;font-size:24px;cursor:pointer}.jp-pricebook-status{margin-top:10px;font-size:13px}@media(max-width:700px){.jp-pricebook-toolbar,.jp-pricebook-item{align-items:stretch;flex-direction:column}.jp-pricebook-item-main{width:100%}.jp-pricebook-item-meta{align-items:flex-start}.jp-pricebook-item-actions{justify-content:flex-end}.jp-pricebook-form-grid{grid-template-columns:1fr}}`; document.head.appendChild(s); }
window.renderPricebook = renderPricebook;
