import { supabase } from "./supabase.js";

async function getContext() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error("You are not logged in.");
  const { data, error } = await supabase.from("company_members")
    .select("company_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No active company membership was found.");
  if (!["owner", "admin"].includes(String(data.role || "").toLowerCase())) {
    throw new Error("Only company owners and admins can upload quote templates.");
  }
  return { user, companyId: data.company_id };
}

function addStyles() {
  if (document.getElementById("jpq-template-upload-ui-style")) return;
  const s = document.createElement("style");
  s.id = "jpq-template-upload-ui-style";
  s.textContent = `.jpq-template-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}.jpq-template-actions .button{margin:0}`;
  document.head.appendChild(s);
}

async function uploadTemplate(file, select, status) {
  if (!file) return;
  const c = await getContext();
  if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) throw new Error("Template must be a PDF, PNG or JPG file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Template must be 15 MB or smaller.");
  status.textContent = "Uploading template…";
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${c.companyId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from("quote-templates").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const name = file.name.replace(/\.[^.]+$/, "");
  const ins = await supabase.from("quote_templates").insert({
    company_id: c.companyId, user_id: c.user.id, name, file_path: path,
    file_type: file.type, field_layout: {}, is_default: false
  }).select("id,name,is_default").single();
  if (ins.error) {
    await supabase.storage.from("quote-templates").remove([path]);
    throw ins.error;
  }
  const o = document.createElement("option");
  o.value = ins.data.id;
  o.textContent = ins.data.name;
  select.appendChild(o);
  select.value = ins.data.id;
  status.textContent = `Template uploaded: ${name}. Use Manage templates to map the quote fields onto it.`;
}

function enhanceQuoteForm() {
  const select = document.getElementById("q2tpl");
  if (!select || document.getElementById("jpqTemplateUploadInput")) return;
  addStyles();
  const wrap = document.createElement("div");
  wrap.className = "jpq-template-actions";
  wrap.innerHTML = `<input id="jpqTemplateUploadInput" type="file" accept="application/pdf,image/png,image/jpeg" hidden><button type="button" id="jpqTemplateUploadButton" class="button secondary">+ Upload template</button><button type="button" id="jpqTemplateManageButton" class="button secondary">Manage templates</button><span id="jpqTemplateUploadStatus" class="jpq2-help"></span>`;
  select.parentElement.appendChild(wrap);
  const input = wrap.querySelector("#jpqTemplateUploadInput");
  const button = wrap.querySelector("#jpqTemplateUploadButton");
  const manage = wrap.querySelector("#jpqTemplateManageButton");
  const status = wrap.querySelector("#jpqTemplateUploadStatus");
  button.onclick = () => input.click();
  input.onchange = async () => {
    try { await uploadTemplate(input.files?.[0], select, status); }
    catch (e) { status.textContent = e.message || "Could not upload template."; }
    input.value = "";
  };
  manage.onclick = () => {
    const existing = document.getElementById("jpqTemplatesButton");
    if (existing) existing.click();
    else alert("Open Settings → Quote Settings to manage and map uploaded templates.");
  };
}

const observer = new MutationObserver(enhanceQuoteForm);
observer.observe(document.body, { childList: true, subtree: true });
enhanceQuoteForm();
