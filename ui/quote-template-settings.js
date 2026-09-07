import { supabase } from "../supabase.js";

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];
let renderInProgress = false;
let settingsObserverStarted = false;

async function context() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("company_members")
    .select("company_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || !["owner", "admin"].includes(String(data.role || "").toLowerCase())) return null;
  return { user, companyId: data.company_id };
}

const esc = v => String(v ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[c]));

function styles() {
  if (document.getElementById("jpq-template-settings-style")) return;
  const s = document.createElement("style");
  s.id = "jpq-template-settings-style";
  s.textContent = `.jpqts-list{display:grid;gap:10px;margin-top:14px}.jpqts-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:12px}.jpqts-info{min-width:0}.jpqts-name{font-weight:600}.jpqts-meta{font-size:12px;color:#64748b;margin-top:3px}.jpqts-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.jpqts-empty{padding:12px;border:1px dashed var(--border,#d1d5db);border-radius:10px;color:#64748b}`;
  document.head.appendChild(s);
}

async function loadTemplates(companyId) {
  const { data, error } = await supabase.from("quote_templates")
    .select("id,name,file_path,file_type,is_default,created_at")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function setDefault(companyId, id) {
  const { error: clearError } = await supabase.from("quote_templates")
    .update({ is_default: false }).eq("company_id", companyId);
  if (clearError) throw clearError;
  if (id) {
    const { error } = await supabase.from("quote_templates")
      .update({ is_default: true }).eq("id", id).eq("company_id", companyId);
    if (error) throw error;
  }
}

async function upload(file, c) {
  if (!file) return;
  if (!ALLOWED.includes(file.type)) throw Error("Template must be a PDF, PNG or JPG file.");
  if (file.size > 15 * 1024 * 1024) throw Error("Template must be 15 MB or smaller.");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${c.companyId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from("quote-templates").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const name = file.name.replace(/\.[^.]+$/, "");
  const { data, error } = await supabase.from("quote_templates").insert({
    company_id: c.companyId, user_id: c.user.id, name, file_path: path,
    file_type: file.type, field_layout: {}, is_default: false
  }).select("id").single();
  if (error) {
    await supabase.storage.from("quote-templates").remove([path]);
    throw error;
  }
  return data;
}

async function render() {
  if (renderInProgress) return;
  if (document.getElementById("jobpilot-quote-template-settings")) return;
  if (document.getElementById("pageTitle")?.textContent.trim() !== "Settings") return;
  const panel = document.querySelector(".settings-panel");
  if (!panel) return;

  renderInProgress = true;
  try {
    // Re-check after awaiting auth/context so another observer callback cannot
    // create a second section while this async render is in progress.
    if (document.getElementById("jobpilot-quote-template-settings")) return;
    const c = await context();
    if (!c || document.getElementById("jobpilot-quote-template-settings")) return;
    const currentPanel = document.querySelector(".settings-panel");
    if (!currentPanel) return;

    styles();
    const section = document.createElement("section");
    section.id = "jobpilot-quote-template-settings";
    section.className = "settings-section";
    section.innerHTML = `<h2>Quote Templates</h2><p class="muted">Upload your own quote design and choose which template JobPilot uses by default when creating a new quote.</p><div class="jpqts-actions"><input id="jpqts-file" type="file" accept="application/pdf,image/png,image/jpeg" hidden><button type="button" id="jpqts-upload" class="button primary">+ Upload template</button><span id="jpqts-status" class="muted"></span></div><div style="margin-top:16px"><label for="jpqts-default"><strong>Default quote template</strong></label><select id="jpqts-default" style="width:100%;margin-top:6px"><option value="">Standard JobPilot template</option></select><p class="muted" style="font-size:13px;margin-top:6px">This template will be pre-selected automatically when you create a new quote.</p></div><div id="jpqts-list" class="jpqts-list"></div>`;
    currentPanel.insertBefore(section, currentPanel.firstElementChild);

    const select = section.querySelector("#jpqts-default");
    const list = section.querySelector("#jpqts-list");
    const status = section.querySelector("#jpqts-status");
    const file = section.querySelector("#jpqts-file");

    const refresh = async () => {
      const ts = await loadTemplates(c.companyId);
      select.innerHTML = `<option value="">Standard JobPilot template</option>` + ts.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
      const current = ts.find(t => t.is_default);
      select.value = current?.id || "";
      list.innerHTML = ts.length ? ts.map(t => `<div class="jpqts-row"><div class="jpqts-info"><div class="jpqts-name">${esc(t.name)}${t.is_default ? " <span>✓ Default</span>" : ""}</div><div class="jpqts-meta">${esc(t.file_type || "Template file")}</div></div><div class="jpqts-actions"><button type="button" class="button secondary" data-default="${t.id}">${t.is_default ? "Default template" : "Set as default"}</button></div></div>`).join("") : `<div class="jpqts-empty">No custom templates uploaded yet. JobPilot will use the Standard JobPilot template.</div>`;
    };

    select.onchange = async () => {
      try { select.disabled = true; status.textContent = "Saving…"; await setDefault(c.companyId, select.value || null); await refresh(); status.textContent = "Default template saved."; } catch (e) { status.textContent = e.message || "Could not save default template."; } finally { select.disabled = false; }
    };

    list.onclick = async e => {
      const button = e.target.closest("[data-default]");
      if (!button) return;
      try { button.disabled = true; status.textContent = "Saving…"; await setDefault(c.companyId, button.dataset.default); await refresh(); status.textContent = "Default template saved."; } catch (err) { status.textContent = err.message || "Could not save default template."; } finally { button.disabled = false; }
    };

    section.querySelector("#jpqts-upload").onclick = () => file.click();
    file.onchange = async () => {
      try { status.textContent = "Uploading template…"; await upload(file.files?.[0], c); await refresh(); status.textContent = "Template uploaded."; } catch (e) { status.textContent = e.message || "Could not upload template."; } finally { file.value = ""; }
    };

    await refresh();
  } finally {
    renderInProgress = false;
  }
}

if (!settingsObserverStarted) {
  settingsObserverStarted = true;
  const observer = new MutationObserver(() => {
    render().catch(e => console.error("Quote template settings:", e));
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
render().catch(e => console.error("Quote template settings:", e));
