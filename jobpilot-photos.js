import { supabase } from "./supabase.js";

const BUCKET = "jobpilot-photos";
const MAX_FILES = 20;
const MAX_SIZE = 10 * 1024 * 1024;

let activeQuoteCapture = null;
let observerStarted = false;

async function getMembership() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_members")
    .select("company_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("JobPilot photos membership:", error);
    return null;
  }

  return data || null;
}

function safeName(name, fallback = "photo.jpg") {
  return String(name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

function addQuotePhotoControls(form) {
  if (!form || form.dataset.jpPhotosReady === "true") return;
  form.dataset.jpPhotosReady = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "jp-photo-field";
  wrapper.style.cssText = "margin:14px 0;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;";
  wrapper.innerHTML = `
    <label style="display:block;font-weight:600;margin-bottom:7px;">📷 Quote Photos</label>
    <input id="jpQuotePhotos" type="file" accept="image/*" capture="environment" multiple>
    <div id="jpQuotePhotoStatus" class="muted" style="margin-top:7px;">Take photos or choose images to help with the quote.</div>
    <div id="jpQuotePhotoPreview" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:7px;margin-top:9px;"></div>
  `;

  const actions = form.querySelector(".modal-actions");
  if (actions) actions.parentNode.insertBefore(wrapper, actions);
  else form.appendChild(wrapper);

  const input = wrapper.querySelector("#jpQuotePhotos");
  const status = wrapper.querySelector("#jpQuotePhotoStatus");
  const preview = wrapper.querySelector("#jpQuotePhotoPreview");
  const files = [];

  const render = () => {
    preview.innerHTML = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      return `<div style="position:relative;"><img src="${url}" alt="Quote photo ${index + 1}" style="width:100%;height:70px;object-fit:cover;border-radius:8px;"><button type="button" data-remove-photo="${index}" style="position:absolute;top:2px;right:2px;border:0;border-radius:50%;width:22px;height:22px;background:#fff;cursor:pointer;">×</button></div>`;
    }).join("");
    status.textContent = files.length
      ? `${files.length} photo${files.length === 1 ? "" : "s"} selected. You can take more photos before saving the quote.`
      : "Take photos or choose images to help with the quote.";
  };

  input.addEventListener("change", () => {
    for (const file of Array.from(input.files || [])) {
      if (files.length >= MAX_FILES) break;
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_SIZE) {
        alert(`${file.name} is larger than 10MB and was not added.`);
        continue;
      }
      const duplicate = files.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified);
      if (!duplicate) files.push(file);
    }
    input.value = "";
    render();
  });

  preview.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-photo]");
    if (!button) return;
    files.splice(Number(button.dataset.removePhoto), 1);
    render();
  });

  activeQuoteCapture = { form, files, startedAt: Date.now() };
}

async function saveQuotePhotos(quoteId, files, companyId) {
  if (!quoteId || !files?.length || !companyId) return;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const path = `${companyId}/quotes/${quoteId}/${Date.now()}-${index}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });

    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase.from("quote_photos").insert({
      company_id: companyId,
      quote_id: quoteId,
      storage_path: path,
      file_name: file.name
    });

    if (rowError) throw rowError;
  }
}

async function finishPendingQuotePhotos() {
  const pending = activeQuoteCapture;
  if (!pending?.files?.length) {
    activeQuoteCapture = null;
    return;
  }

  activeQuoteCapture = null;

  try {
    const membership = await getMembership();
    if (!membership?.company_id) return;

    const customerId = pending.form.querySelector("#quoteCustomer")?.value || null;
    const title = pending.form.querySelector("#quoteTitle")?.value?.trim() || null;
    const startedIso = new Date(pending.startedAt - 5000).toISOString();

    let query = supabase
      .from("quotes")
      .select("id, customer_id, title, created_at")
      .eq("company_id", membership.company_id)
      .gte("created_at", startedIso)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: candidates, error } = await query;
    if (error) throw error;

    const quote = (candidates || []).find(item =>
      (!customerId || String(item.customer_id) === String(customerId)) &&
      (!title || String(item.title || "").trim() === title)
    ) || candidates?.[0];

    if (!quote) return;
    await saveQuotePhotos(quote.id, pending.files, membership.company_id);
  } catch (error) {
    console.error("JobPilot quote photo upload:", error);
    alert("The quote was saved, but the photos could not be uploaded. Please add them from the quote again.");
  }
}

function photoModal({ title, entityType, entityId, companyId }) {
  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:760px;">
      <div class="modal-header">
        <div><h2>${title}</h2><p>Capture and store job photos securely.</p></div>
        <button class="close" type="button">×</button>
      </div>
      ${entityType === "job" ? `
        <label>Photo stage</label>
        <select id="jpPhase">
          <option value="before">Before</option>
          <option value="during">During</option>
          <option value="after">After</option>
        </select>
      ` : ""}
      <label style="display:block;margin-top:12px;">Photos</label>
      <input id="jpPhotoInput" type="file" accept="image/*" capture="environment" multiple>
      <div id="jpUploadStatus" class="muted" style="margin-top:7px;">Take a photo or choose existing images.</div>
      <div id="jpGallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:15px;"></div>
      <div class="modal-actions" style="margin-top:16px;">
        <button type="button" class="button secondary close">Close</button>
        <button type="button" class="button primary" id="jpUpload">Upload Photos</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", close));

  const input = modal.querySelector("#jpPhotoInput");
  const status = modal.querySelector("#jpUploadStatus");
  const gallery = modal.querySelector("#jpGallery");
  let files = [];

  const renderGallery = async () => {
    gallery.innerHTML = "<div class='muted'>Loading photos…</div>";
    const table = entityType === "job" ? "job_photos" : "quote_photos";
    const column = entityType === "job" ? "job_id" : "quote_id";
    let query = supabase.from(table).select("id, storage_path, file_name, created_at" ).eq(column, entityId).order("created_at", { ascending: false });
    if (entityType === "job") query = query.eq("phase", modal.querySelector("#jpPhase").value);
    const { data, error } = await query;
    if (error) {
      gallery.innerHTML = `<div class='muted'>Could not load photos.</div>`;
      return;
    }

    if (!data?.length) {
      gallery.innerHTML = "<div class='muted'>No photos yet.</div>";
      return;
    }

    const cards = [];
    for (const item of data) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(item.storage_path, 3600);
      if (!signed?.signedUrl) continue;
      cards.push(`<a href="${signed.signedUrl}" target="_blank" rel="noopener"><img src="${signed.signedUrl}" alt="${safeName(item.file_name, "Job photo")}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;"></a>`);
    }
    gallery.innerHTML = cards.join("") || "<div class='muted'>No photos available.</div>";
  };

  input.addEventListener("change", () => {
    files = Array.from(input.files || []).filter(file => file.type.startsWith("image/") && file.size <= MAX_SIZE).slice(0, MAX_FILES);
    status.textContent = files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} ready to upload.` : "No valid photos selected.";
    input.value = "";
  });

  modal.querySelector("#jpPhase")?.addEventListener("change", renderGallery);

  modal.querySelector("#jpUpload").addEventListener("click", async () => {
    if (!files.length) {
      status.textContent = "Choose at least one photo first.";
      return;
    }

    const phase = entityType === "job" ? modal.querySelector("#jpPhase").value : null;
    const uploadButton = modal.querySelector("#jpUpload");
    uploadButton.disabled = true;
    status.textContent = "Uploading photos…";

    try {
      const table = entityType === "job" ? "job_photos" : "quote_photos";
      const rows = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const prefix = entityType === "job" ? "jobs" : "quotes";
        const path = `${companyId}/${prefix}/${entityId}/${Date.now()}-${index}-${safeName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;
        rows.push({ company_id: companyId, [`${entityType}_id`]: entityId, ...(phase ? { phase } : {}), storage_path: path, file_name: file.name });
      }
      const { error: rowError } = await supabase.from(table).insert(rows);
      if (rowError) throw rowError;
      files = [];
      status.textContent = "Photos uploaded.";
      await renderGallery();
    } catch (error) {
      console.error("JobPilot photo upload:", error);
      status.textContent = error.message || "Photo upload failed.";
    } finally {
      uploadButton.disabled = false;
    }
  });

  renderGallery();
  return modal;
}

async function openJobPhotos(jobId) {
  const membership = await getMembership();
  if (!membership?.company_id) {
    alert("We could not identify your company. Please sign in again.");
    return;
  }
  photoModal({ title: "Job Photos", entityType: "job", entityId: jobId, companyId: membership.company_id });
}

async function openQuotePhotos(quoteId) {
  const membership = await getMembership();
  if (!membership?.company_id) return;
  photoModal({ title: "Quote Photos", entityType: "quote", entityId: quoteId, companyId: membership.company_id });
}

function decorateJobRows() {
  document.querySelectorAll(".job-row[data-job-id]").forEach(row => {
    if (row.querySelector("[data-jp-job-photos]")) return;
    const jobId = row.dataset.jobId;
    if (!jobId) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary";
    button.dataset.jpJobPhotos = jobId;
    button.textContent = "📷 Photos";
    button.style.cssText = "margin-left:10px;white-space:nowrap;";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openJobPhotos(jobId);
    });

    const right = row.lastElementChild;
    if (right) right.appendChild(button);
    else row.appendChild(button);
  });
}

function decorateQuoteForm() {
  const form = document.querySelector("#quoteForm");
  if (form) addQuotePhotoControls(form);
}

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;

  const observer = new MutationObserver(() => {
    decorateJobRows();
    decorateQuoteForm();

    if (activeQuoteCapture && !document.body.contains(activeQuoteCapture.form)) {
      setTimeout(finishPendingQuotePhotos, 600);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  decorateJobRows();
  decorateQuoteForm();
}

window.JobPilotPhotos = { openJobPhotos, openQuotePhotos, saveQuotePhotos };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startObserver);
else startObserver();
