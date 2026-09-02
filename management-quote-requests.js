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

async function renderManagementQuoteRequests() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  const context = await getManagementContext();
  if (!context) return;

  setPageHeader();

  content.innerHTML = `
    <div class="page-actions">
      <div>
        <h2>Quote Requests</h2>
        <p>Jobs submitted by team members for management to quote.</p>
      </div>
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

  list.innerHTML = rows.map(({ request, imageUrls }) => `
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
            ${imageUrls.map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(url)}" alt="Job photo" style="width:88px;height:88px;object-fit:cover;border-radius:8px;border:1px solid var(--border,#e5e7eb)"></a>`).join("")}
          </div>
          <div class="muted" style="margin-top:5px">${imageUrls.length} picture${imageUrls.length === 1 ? "" : "s"}</div>
        ` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="muted">${escapeHtml(String(request.status || "pending").replace("_", " "))}</span>
        ${request.status !== "quoted" ? `<button class="button primary" type="button" data-quote-request-id="${request.id}">Generate Quote</button>` : "<span>✓ Quoted</span>"}
      </div>
    </div>
  `).join("");

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
