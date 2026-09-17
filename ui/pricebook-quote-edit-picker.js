import { supabase } from "../supabase.js";

const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[c]));

async function loadItems() {
  const { data: company } = await supabase.from("companies").select("id").maybeSingle();
  if (!company?.id) return [];
  const { data, error } = await supabase.from("pricebook_items").select("id,name,unit,sale_price").eq("company_id", company.id).eq("active", true).order("item_type").order("name");
  if (error) throw error;
  return data || [];
}

function install(modal, items) {
  const lines = modal.querySelector("#jpeLines");
  if (!lines || modal.querySelector("[data-jp-pricebook-edit-picker]")) return;
  const wrap = document.createElement("div");
  wrap.setAttribute("data-jp-pricebook-edit-picker", "true");
  wrap.style.cssText = "display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:12px 0 8px;padding:12px;border:1px solid rgba(0,0,0,.1);border-radius:10px;background:rgba(0,0,0,.025)";
  wrap.innerHTML = `<div style="flex:1;min-width:220px"><label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px">Add from Pricebook</label><select data-jp-pb-select style="width:100%;box-sizing:border-box;padding:9px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:var(--card-bg,#fff);color:inherit"><option value="">Select an item…</option>${items.map(i => `<option value="${esc(i.id)}">${esc(i.name)} — £${Number(i.sale_price || 0).toFixed(2)} / ${esc(i.unit || "item")}</option>`).join("")}</select></div><div><label style="display:block;font-size:12px;font-weight:700;margin-bottom:5px">Qty</label><input data-jp-pb-qty type="number" min="0.01" step="0.01" value="1" style="width:80px;box-sizing:border-box;padding:9px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:var(--card-bg,#fff);color:inherit"></div><button type="button" class="button secondary" data-jp-pb-add ${items.length ? "" : "disabled"}>Add to quote</button>`;
  lines.before(wrap);
  wrap.querySelector("[data-jp-pb-add]").addEventListener("click", () => {
    const item = items.find(i => String(i.id) === String(wrap.querySelector("[data-jp-pb-select").value));
    if (!item) return;
    const qty = Math.max(0.01, Number(wrap.querySelector("[data-jp-pb-qty").value || 1));
    const row = document.createElement("div");
    row.className = "jpe-line";
    row.innerHTML = `<input data-k="d" value="${esc(item.name)}"><input data-k="q" type="number" min="0" step="0.01" value="${qty}"><input data-k="u" value="${esc(item.unit || "item")}"><input data-k="p" type="number" min="0" step="0.01" value="${Number(item.sale_price || 0).toFixed(2)}"><button type="button" class="button danger" data-remove>×</button>`;
    lines.appendChild(row);
    wrap.querySelector("[data-jp-pb-select]").value = "";
    lines.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

let loading = false;
async function scan() {
  const lines = document.querySelector(".modal.show #jpeLines");
  if (!lines || lines.closest(".modal-content")?.querySelector("[data-jp-pricebook-edit-picker]")) return;
  if (loading) return;
  loading = true;
  try {
    const items = await loadItems();
    install(lines.closest(".modal-content"), items);
  } catch (error) {
    console.error("JobPilot Pricebook editor picker:", error);
  } finally {
    loading = false;
  }
}

new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
scan();
