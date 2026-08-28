import { supabase } from "./supabase.js";

const aliases = {
  name: ["name","customer name","customer","full name","client name","client"],
  first: ["first name","firstname","given name","given_name"],
  last: ["last name","lastname","surname","family name","family_name"],
  email: ["email","email address","e-mail"],
  phone: ["phone","phone number","mobile","mobile number","telephone","tel"],
  address: ["address","address line 1","address1","street","street address","line 1"],
  address2: ["address line 2","address2","line 2"],
  city: ["city","town","city/town"],
  postcode: ["postcode","post code","postal code","zip","zip code"]
};

const norm = v => String(v ?? "").trim().toLowerCase().replace(/[\uFEFF]/g, "").replace(/[_-]+/g," ").replace(/\s+/g," ");
const esc = v => String(v ?? "").replace(/[&<>\'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\'":"&#39;",'"':"&quot;"}[c]));

function csv(text) {
  const out=[]; let row=[], cell="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"'){ if(q && n==='"'){cell+='"';i++;} else q=!q; }
    else if(c===','&&!q){row.push(cell);cell="";}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()))out.push(row);row=[];cell="";}
    else cell+=c;
  }
  row.push(cell); if(row.some(x=>String(x).trim()))out.push(row); return out;
}

function parse(text){
  const rows=csv(text); if(rows.length<2) throw Error("The CSV does not contain any customer rows.");
  const headers=rows[0].map(norm), map={};
  for(const [field,list] of Object.entries(aliases)){const i=headers.findIndex(h=>list.includes(h));if(i>=0)map[field]=i;}
  if(map.name==null && map.first==null) throw Error("I couldn't find a customer name column in this CSV.");
  const get=(r,f)=>map[f]==null?"":String(r[map[f]]??"").trim();
  return rows.slice(1).map((r,i)=>({
    row:i+2,name:map.name!=null?get(r,"name"):[get(r,"first"),get(r,"last")].filter(Boolean).join(" "),
    email:get(r,"email"),phone:get(r,"phone"),address_line1:get(r,"address"),address_line2:get(r,"address2"),city:get(r,"city"),postcode:get(r,"postcode")
  })).filter(x=>x.name);
}

function duplicate(c, list){
  const n=norm(c.name), e=norm(c.email), p=norm(c.postcode), a=norm(c.address_line1);
  return list.some(x => (e&&norm(x.email)===e) || (n&&norm(x.name)===n&&p&&norm(x.postcode)===p) || (n&&norm(x.name)===n&&a&&norm(x.address_line1)===a));
}

function styles(){
  if(document.getElementById("jp-import-style"))return;
  const s=document.createElement("style");s.id="jp-import-style";s.textContent=`
  .jp-import-modal{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px}
  .jp-import-card{background:#fff;border-radius:16px;padding:24px;width:min(900px,100%);max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
  .jp-import-card h2{margin:0 0 6px}.jp-import-muted{color:#64748b;margin:0 0 16px}.jp-import-drop{border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center}
  .jp-import-summary{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.jp-import-stat{border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px}.jp-import-stat strong{display:block;font-size:20px}
  .jp-import-table{width:100%;border-collapse:collapse;font-size:13px}.jp-import-table th,.jp-import-table td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}.jp-import-table th{background:#f8fafc;position:sticky;top:0}.jp-import-warning{color:#b45309}.jp-import-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}.jp-import-error{color:#b91c1c;margin-top:10px}
  `;document.head.appendChild(s);
}

async function openImporter(){
  styles();
  const modal=document.createElement("div");modal.className="jp-import-modal";
  const card=document.createElement("div");card.className="jp-import-card";modal.appendChild(card);document.body.appendChild(modal);
  card.innerHTML=`<h2>Import Data</h2><p class="jp-import-muted">Upload a customer CSV. JobPilot will detect the columns, flag possible duplicates and let you review the import first.</p><div class="jp-import-drop"><input id="jp-csv" type="file" accept=".csv,text/csv"></div><div id="jp-preview"></div>`;
  modal.addEventListener("click",e=>{if(e.target===modal)modal.remove()});
  card.querySelector("#jp-csv").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;const preview=card.querySelector("#jp-preview");
    try{
      const parsed=parse(await file.text());
      const {data:existing,error}=await supabase.from("customers").select("name,email,phone,address_line1,postcode");if(error)throw error;
      const rows=parsed.map(c=>({...c,duplicate:duplicate(c,existing||[])}));const dup=rows.filter(x=>x.duplicate).length;
      preview.innerHTML=`<div class="jp-import-summary"><div class="jp-import-stat"><strong>${rows.length}</strong>Customers found</div><div class="jp-import-stat"><strong>${rows.length-dup}</strong>Likely new</div><div class="jp-import-stat"><strong>${dup}</strong>Possible duplicates</div></div><div style="overflow:auto;max-height:45vh"><table class="jp-import-table"><thead><tr><th><input id="jp-all" type="checkbox" checked></th><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><input class="jp-check" data-i="${i}" type="checkbox" checked></td><td>${esc(r.name)}</td><td>${esc(r.email||"—")}</td><td>${esc(r.phone||"—")}</td><td>${esc([r.address_line1,r.address_line2,r.city,r.postcode].filter(Boolean).join(", ")||"—")}</td><td class="${r.duplicate?"jp-import-warning":""}">${r.duplicate?"Possible duplicate":"New"}</td></tr>`).join("")}</tbody></table></div><div id="jp-error" class="jp-import-error"></div><div class="jp-import-actions"><button id="jp-cancel" class="button">Cancel</button><button id="jp-submit" class="button primary">Import selected customers</button></div>`;
      preview.querySelector("#jp-all").addEventListener("change",e=>preview.querySelectorAll(".jp-check").forEach(x=>x.checked=e.target.checked));
      preview.querySelector("#jp-cancel").addEventListener("click",()=>modal.remove());
      preview.querySelector("#jp-submit").addEventListener("click",async()=>{
        const selected=[...preview.querySelectorAll(".jp-check:checked")].map(x=>rows[Number(x.dataset.i)]);if(!selected.length)return;
        const submit=preview.querySelector("#jp-submit"), errorBox=preview.querySelector("#jp-error");submit.disabled=true;submit.textContent="Importing...";
        try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error("You must be signed in.");const payload=selected.map(c=>({user_id:user.id,name:c.name,email:c.email||null,phone:c.phone||null,address_line1:c.address_line1||null,address_line2:c.address_line2||null,city:c.city||null,postcode:c.postcode||null}));const {error}=await supabase.from("customers").insert(payload);if(error)throw error;alert(`${payload.length} customer${payload.length===1?"":"s"} imported successfully.`);window.location.reload();}
        catch(err){errorBox.textContent=err?.message||"Unable to import customers.";submit.disabled=false;submit.textContent="Import selected customers";}
      });
    }catch(err){preview.innerHTML=`<div class="jp-import-error">${esc(err?.message||"Unable to read this CSV.")}</div>`;}
  });
}

function addButton(){
  const add=document.getElementById("addCustomerButton");if(!add||document.getElementById("jp-import-customers"))return;
  const b=document.createElement("button");b.id="jp-import-customers";b.type="button";b.className="button";b.textContent="Import Data";b.style.marginLeft="8px";b.addEventListener("click",openImporter);add.parentElement?.appendChild(b);
}
new MutationObserver(addButton).observe(document.body,{childList:true,subtree:true});window.addEventListener("load",addButton);setTimeout(addButton,500);
