import { supabase } from "./supabase.js";

const MANAGEMENT_ROLES = ["owner", "admin"];

async function getManagementContext() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error || !data || !MANAGEMENT_ROLES.includes(String(data.role || "").toLowerCase())) {
    return null;
  }

  return { user, ...data };
}

function setPageHeader() {
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Quote Requests";
  if (subtitle) subtitle.textContent = "Review jobs submitted by your team and generate quotes.";
}

async function getImageUrls(paths) {
  const validPaths = Array.isArray(paths) ? paths.filter(Boolean) : [];
  if (!validPaths.length) return [];

  const results = await Promise.all(validPaths.map(async path => {
    const { data, error } = await supabase.storage
      .from("quote-request-images")
      .createSignedUrl(path, 60 * 60);
    if (error) {
      console.error("JobPilot quote request image URL:", error);
      return null;
    }
    return data?.signedUrl || null;
  }));

  return results.filter(Boolean);
}

function openQuoteRequestPhotoViewer(imageUrls, startIndex = 0) {
  const existing = document.getElementById("jobpilotQuotePhotoViewer");
  if (existing) existing.remove();
  if (!imageUrls.length) return;

  let currentIndex = Math.max(0, Math.min(startIndex, imageUrls.length - 1));

  const viewer = document.createElement("div");
  viewer.id = "jobpilotQuotePhotoViewer";
  viewer.className = "modal show";
  viewer.style.zIndex = "10000";
  viewer.innerHTML = `
    <div class="modal-content" style="max-width:1000px;width:95vw;padding:16px">
      <div class="modal-header">
        <div>
          <h2>Job Pictures</h2>
          <p id="qrPhotoCounter" class="muted"></p>
        </div>
        <button class="close" type="button" aria-label="Close">×</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;min-height:60vh">
        <button id="qrPhotoPrev" class="button secondary" type="button" aria-label="Previous picture">‹</button>
        <img id="qrPhotoMain" alt="Job photo" style="display:block;max-width:calc(95vw - 150px);max-height:65vh;width:auto;height:auto;object-fit:contain;border-radius:10px">
        <button id="qrPhotoNext" class="button secondary" type="button" aria-label="Next picture">›</button>
      </div>
      <div id="qrPhotoThumbs" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px"></div>
    </div>
  `;

  document.body.appendChild(viewer);

  const main = viewer.querySelector("#qrPhotoMain");
  const counter = viewer.querySelector("#qrPhotoCounter");
  const prev = viewer.querySelector("#qrPhotoPrev");
  const next = viewer.querySelector("#qrPhotoNext");
  const thumbs = viewer.querySelector("#qrPhotoThumbs");

  function render() {
    main.src = imageUrls[currentIndex];
    counter.textContent = `Picture ${currentIndex + 1} of ${imageUrls.length}`;
    prev.disabled = imageUrls.length < 2;
    next.disabled = imageUrls.length < 2;
    thumbs.querySelectorAll("button").forEach((button, index) => {
      button.style.opacity = index === currentIndex ? "1" : "0.6";
    });
  }

  imageUrls.forEach((url, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = "padding:0;border:2px solid transparent;background:none;border-radius:8px;cursor:pointer";
    button.innerHTML = `<img src="${escapeHtml(url)}" alt="Picture ${index + 1}" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:6px">`;
    button.addEventListener("click", () => {
      currentIndex = index;
      render();
    });
    thumbs.appendChild(button);
  });

  prev.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
    render();
  });

  next.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % imageUrls.length;
    render();
  });

  viewer.querySelector(".close").addEventListener("click", () => viewer.remove());
  viewer.addEventListener("click", event => {
    if (event.target === viewer) viewer.remove();
  });
  viewer.addEventListener("keydown", event => {
    if (event.key === "Escape") viewer.remove();
    if (event.key === "ArrowLeft") prev.click();
    if (event.key === "ArrowRight") next.click();
  });

  viewer.tabIndex = -1;
  viewer.focus();
  render();
}

async function renderManagementQuoteRequests() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  const context = await getManagementContext();
  if (!context) return;

  setPageHeader();

  content.innerHTML = `
    <div class="page-actions">
      <div></div>
      <button id="qrRefresh" class="button secondary" type="button">Refresh</button>
    </div>
    <div id="managementQuoteRequestsList" class="panel">
      <div class="empty-state"><div class="empty-icon">💷</div><h3>Loading requests...</h3></div>
    </div>
  `;

  document.getElementById("qrRefresh")?.addEventListener("click", renderManagementQuoteRequests);

  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("company_id", context.company_id)
    .order("created_at", { ascending: false });

  const list = document.getElementById("managementQuoteRequestsList");
  if (!list) return;

  if (error) {
    list.innerHTML = `<div class="empty-state"><h3>Could not load quote requests</h3><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  const requests = data || [];
  if (!requests.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">💷</div><h3>No quote requests</h3><p>Team-submitted jobs will appear here.</p></div>`;
    return;
  }

  const rows = await Promise.all(requests.map(async request => ({
    request,
    imageUrls: await getImageUrls(request.image_paths)
  })));

  list.innerHTML = rows.map(({ request, imageUrls }, rowIndex) => `
    <div class="job-row" style="align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <strong>${escapeHtml(request.customer_name)}</strong>
        <div class="muted" style="margin-top:4px">${escapeHtml(request.description)}</div>
        <div class="muted" style="margin-top:6px">
          ${escapeHtml(request.phone || request.email || "No contact details")}
          ${request.address ? ` · ${escapeHtml(request.address)}` : ""}
        </div>
        ${request.preferred_date ? `<div class="muted" style="margin-top:4px">Preferred date: ${escapeHtml(request.preferred_date)}</div>` : ""}
        ${imageUrls.length ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            ${imageUrls.map((url, imageIndex) => `<button type="button" data-quote-photo-row="${rowIndex}" data-quote-photo-index="${imageIndex}" style="padding:0;border:0;background:none;cursor:pointer"><img src="${escapeHtml(url)}" alt="Job photo ${imageIndex + 1}" style="display:block;width:88px;height:88px;object-fit:cover;border-radius:8px;border:1px solid var(--border,#e5e7eb)"></button>`).join("")}
          </div>
          <div class="muted" style="margin-top:5px">${imageUrls.length} picture${imageUrls.length === 1 ? "" : "s"} · click a picture to view</div>
        ` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="muted">${escapeHtml(String(request.status || "pending").replace("_", " "))}</span>
        ${request.status !== "quoted" ? `<button class="button primary" type="button" data-quote-request-id="${request.id}">View Details</button>` : "<span>✓ Quoted</span>"}
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-quote-photo-row]").forEach(button => {
    button.addEventListener("click", () => {
      const rowIndex = Number(button.dataset.quotePhotoRow);
      const imageIndex = Number(button.dataset.quotePhotoIndex);
      const row = rows[rowIndex];
      if (row) openQuoteRequestPhotoViewer(row.imageUrls, imageIndex);
    });
  });

  list.querySelectorAll("[data-quote-request-id]").forEach(button => {
    button.addEventListener("click", () => {
      const request = requests.find(item => String(item.id) === String(button.dataset.quoteRequestId));
      if (request) showGenerateQuoteForm(request, context);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showGenerateQuoteForm(request, context) {
  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Generate Quote</h2>
          <p>${escapeHtml(request.customer_name)} · submitted job</p>
        </div>
        <button class="close" type="button">×</button>
      </div>

      <div class="panel" style="margin-bottom:16px">
        <strong>Job requested</strong>
        <p style="margin:8px 0 0">${escapeHtml(request.description)}</p>
        ${request.address ? `<p class="muted" style="margin:8px 0 0">${escapeHtml(request.address)}</p>` : ""}
      </div>

      <form id="generateQuoteForm">
        <label>Quote title *</label>
        <input id="generatedQuoteTitle" required value="${escapeHtml(request.description.slice(0, 100))}">

        <label>Description</label>
        <textarea id="generatedQuoteDescription" rows="4">${escapeHtml(request.description)}</textarea>

        <label>Quote amount (£) *</label>
        <input id="generatedQuoteAmount" type="number" min="0" step="0.01" required placeholder="0.00">

        <label>VAT %</label>
        <input id="generatedQuoteVat" type="number" min="0" step="0.01" value="0">

        <label>Valid until</label>
        <input id="generatedQuoteValidUntil" type="date" value="${getDefaultValidUntil()}">

        <div id="generatedQuoteMessage" class="muted" style="margin-top:12px"></div>

        <div class="modal-actions">
          <button type="button" class="button secondary close">Cancel</button>
          <button type="submit" class="button primary">Create Draft Quote</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => modal.remove()));

  modal.querySelector("#generateQuoteForm").addEventListener("submit", async event => {
    event.preventDefault();
    const submit = modal.querySelector("button[type=submit]");
    const message = modal.querySelector("#generatedQuoteMessage");
    submit.disabled = true;
    submit.textContent = "Creating...";

    const amount = Number(modal.querySelector("#generatedQuoteAmount").value || 0);
    const vatPercent = Number(modal.querySelector("#generatedQuoteVat").value || 0);
    const vat = amount * (vatPercent / 100);
    const total = amount + vat;

    let customer = null;

    if (request.email) {
      const result = await supabase.from("customers").select("id").eq("company_id", context.company_id).eq("email", request.email).limit(1).maybeSingle();
      customer = result.data || null;
    }

    if (!customer && request.phone) {
      const result = await supabase.from("customers").select("id").eq("company_id", context.company_id).eq("phone", request.phone).limit(1).maybeSingle();
      customer = result.data || null;
    }

    if (!customer) {
      const { data, error } = await supabase.from("customers").insert({
        company_id: context.company_id,
        user_id: context.user.id,
        name: request.customer_name,
        phone: request.phone,
        email: request.email,
        address_line1: request.address,
        notes: `Created from quote request ${request.id}`
      }).select("id").single();

      if (error) {
        message.textContent = error.message;
        submit.disabled = false;
        submit.textContent = "Create Draft Quote";
        return;
      }
      customer = data;
    }

    const quoteNumber = `Q-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const { error: quoteError } = await supabase.from("quotes").insert({
      company_id: context.company_id,
      user_id: context.user.id,
      customer_id: customer.id,
      quote_number: quoteNumber,
      status: "draft",
      title: modal.querySelector("#generatedQuoteTitle").value.trim(),
      description: modal.querySelector("#generatedQuoteDescription").value.trim(),
      subtotal: amount,
      vat,
      total,
      vat_percent: vatPercent,
      valid_until: modal.querySelector("#generatedQuoteValidUntil").value || null,
      notes: `Created from team quote request ${request.id}.`
    });

    if (quoteError) {
      message.textContent = quoteError.message;
      submit.disabled = false;
      submit.textContent = "Create Draft Quote";
      return;
    }

    const { error: updateError } = await supabase
      .from("quote_requests")
      .update({ status: "quoted", management_notes: `Draft quote ${quoteNumber} created.` })
      .eq("id", request.id)
      .eq("company_id", context.company_id);

    if (updateError) {
      console.error("JobPilot quote request update:", updateError);
    }

    modal.remove();
    await renderManagementQuoteRequests();
    alert(`Draft quote ${quoteNumber} created.`);
  });
}

function getDefaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

window.renderManagementQuoteRequests = renderManagementQuoteRequests;
