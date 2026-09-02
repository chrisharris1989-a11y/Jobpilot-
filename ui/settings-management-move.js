import { supabase } from "../supabase.js";
import { uploadBusinessLogo, deleteBusinessLogo } from "../integrations/supabase/storage.js";

const GO_CARDLESS_CONNECT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-connect";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}

function isSettings() {
  return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
}

function isManagement() {
  return document.getElementById("pageTitle")?.textContent.trim() === "Management";
}

function setHeader(title, subtitle) {
  const titleEl = document.getElementById("pageTitle");
  const subtitleEl = document.getElementById("pageSubtitle");
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
}

function managementButton() {
  return document.getElementById("jobpilot-management-button");
}

function setManagementActive() {
  document.querySelectorAll(".nav-item").forEach(button => button.classList.remove("active"));
  managementButton()?.classList.add("active");
}

function backButton() {
  return `<button id="jobpilot-management-back-moved" class="secondary-button" type="button" style="margin-top:16px">← Back to Management</button>`;
}

function removeCompanyAndConnectionsFromSettings() {
  if (!isSettings()) return;

  document.querySelectorAll('.nav-item[data-page="connections"]').forEach(button => button.remove());

  document.querySelectorAll(".settings-section").forEach(section => {
    const heading = section.querySelector(":scope > h2")?.textContent.trim();
    if (heading === "Business Details" || heading === "Connections" || heading === "📚 Accounting" || heading === "💳 Payments") {
      section.remove();
    }
  });

  ["stripeConnectionStatus", "connectStripeButton", "freeagentConnectionStatus", "connectFreeAgentButton", "gocardlessConnectionContainer"].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      const card = element.closest(".connection-card");
      if (card) card.remove();
    }
  });
}

async function loadBusinessSettings() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_settings")
    .select("business_name,contact_name,phone,email,website,address_line1,city,postcode,default_vat_rate,business_logo_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}

async function renderManagementCompanyMoved() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setHeader("Company", "Manage your business details.");
  setManagementActive();

  let settings;
  try {
    settings = await loadBusinessSettings();
  } catch (error) {
    content.innerHTML = `<div class="panel"><h2>Company</h2><p class="muted">${escapeHtml(error.message || "Could not load company details.")}</p></div>${backButton()}`;
    document.getElementById("jobpilot-management-back-moved")?.addEventListener("click", renderManagementLanding);
    return;
  }

  content.innerHTML = `
    <div class="page-actions">
      <div><h2>Business details</h2><p>These details are used throughout your JobPilot account and on documents.</p></div>
    </div>
    <div class="panel">
      <form id="jobpilot-business-form" style="max-width:760px">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 20px">
          <div style="grid-column:1/-1"><label>Business name</label><input id="mgmtBusinessName" type="text" value="${escapeHtml(settings.business_name)}" required style="width:100%;box-sizing:border-box"></div>
          <div><label>Phone</label><input id="mgmtPhone" type="tel" value="${escapeHtml(settings.phone)}" style="width:100%;box-sizing:border-box"></div>
          <div><label>Email</label><input id="mgmtEmail" type="email" value="${escapeHtml(settings.email)}" style="width:100%;box-sizing:border-box"></div>
          <div style="grid-column:1/-1"><label>Business address</label><input id="mgmtAddress" type="text" value="${escapeHtml(settings.address_line1)}" style="width:100%;box-sizing:border-box"></div>
          <div><label>Town / City</label><input id="mgmtCity" type="text" value="${escapeHtml(settings.city)}" style="width:100%;box-sizing:border-box"></div>
          <div><label>Postcode</label><input id="mgmtPostcode" type="text" value="${escapeHtml(settings.postcode)}" style="width:100%;box-sizing:border-box"></div>
          <div style="grid-column:1/-1"><label>Website</label><input id="mgmtWebsite" type="url" value="${escapeHtml(settings.website)}" placeholder="https://" style="width:100%;box-sizing:border-box"></div>
          <div><label>VAT rate (%)</label><input id="mgmtVatRate" type="number" min="0" step="0.01" value="${escapeHtml(settings.default_vat_rate ?? 20)}" style="width:100%;box-sizing:border-box"></div>
        </div>
        <div class="settings-logo-block" style="margin-top:22px;padding:16px;border:1px solid var(--border,#e5e7eb);border-radius:10px;background:var(--surface-soft,#f8fafc)">
          <p style="margin:0 0 10px;font-weight:600">Business logo</p>
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div id="mgmtLogoPlaceholder" style="width:88px;height:88px;border:1px solid var(--border,#e5e7eb);border-radius:10px;background:#fff;display:grid;place-items:center;text-align:center;font-size:12px;color:#64748b">No logo<br>uploaded</div>
            <img id="mgmtLogoPreview" alt="Business logo preview" style="display:none;width:88px;height:88px;border:1px solid var(--border,#e5e7eb);border-radius:10px;background:#fff;object-fit:contain;padding:6px;box-sizing:border-box">
            <div><input id="mgmtLogoFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" hidden><button type="button" class="secondary-button" id="mgmtUploadLogo">Upload Logo</button><button type="button" class="secondary-button" id="mgmtRemoveLogo" ${settings.business_logo_url ? "" : "hidden"}>Remove Logo</button><p class="muted" style="font-size:12px;margin:6px 0 0">JPG, PNG, WebP, GIF or SVG · maximum 5 MB</p><p id="mgmtLogoStatus" class="muted" style="font-size:12px;margin:4px 0 0"></p></div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:20px"><button id="mgmtBusinessSave" class="primary-button" type="submit">Save business details</button></div>
        <div id="mgmtBusinessMessage" class="muted" style="margin-top:10px"></div>
      </form>
    </div>
    ${backButton()}
  `;

  const preview = document.getElementById("mgmtLogoPreview");
  const placeholder = document.getElementById("mgmtLogoPlaceholder");
  const removeLogo = document.getElementById("mgmtRemoveLogo");
  const logoStatus = document.getElementById("mgmtLogoStatus");
  const showLogo = url => { preview.src = url; preview.style.display = "block"; placeholder.style.display = "none"; removeLogo.hidden = false; };
  if (settings.business_logo_url) showLogo(settings.business_logo_url);

  document.getElementById("mgmtUploadLogo")?.addEventListener("click", () => document.getElementById("mgmtLogoFile")?.click());
  document.getElementById("mgmtLogoFile")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!file || !user) return;
    const upload = document.getElementById("mgmtUploadLogo");
    upload.disabled = removeLogo.disabled = true;
    logoStatus.textContent = "Uploading logo…";
    let newLogo = null;
    try {
      newLogo = await uploadBusinessLogo(file, user.id);
      const { error } = await supabase.from("user_settings").update({ business_logo_url: newLogo.url }).eq("user_id", user.id);
      if (error) throw error;
      if (settings.business_logo_url) await deleteBusinessLogo(user.id, settings.business_logo_url);
      settings.business_logo_url = newLogo.url;
      showLogo(newLogo.url);
      logoStatus.textContent = "Logo uploaded.";
    } catch (error) {
      if (newLogo?.url && newLogo.url !== settings.business_logo_url) await deleteBusinessLogo(user.id, newLogo.url).catch(() => {});
      logoStatus.textContent = error.message || "Could not upload the logo.";
    } finally { upload.disabled = removeLogo.disabled = false; event.target.value = ""; }
  });

  removeLogo?.addEventListener("click", async () => {
    if (!confirm("Remove your business logo?")) return;
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return;
    const upload = document.getElementById("mgmtUploadLogo");
    upload.disabled = removeLogo.disabled = true;
    logoStatus.textContent = "Removing logo…";
    try {
      await deleteBusinessLogo(user.id, settings.business_logo_url);
      const { error } = await supabase.from("user_settings").update({ business_logo_url: null }).eq("user_id", user.id);
      if (error) throw error;
      settings.business_logo_url = null; preview.style.display = "none"; placeholder.style.display = "grid"; removeLogo.hidden = true; logoStatus.textContent = "Logo removed.";
    } catch (error) { logoStatus.textContent = error.message || "Could not remove the logo."; }
    finally { upload.disabled = removeLogo.disabled = false; }
  });

  document.getElementById("jobpilot-business-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.getElementById("mgmtBusinessSave");
    const message = document.getElementById("mgmtBusinessMessage");
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return;
    button.disabled = true; message.textContent = "Saving…";
    const values = {
      user_id: user.id,
      business_name: document.getElementById("mgmtBusinessName").value.trim(),
      phone: document.getElementById("mgmtPhone").value.trim(),
      email: document.getElementById("mgmtEmail").value.trim(),
      address_line1: document.getElementById("mgmtAddress").value.trim(),
      city: document.getElementById("mgmtCity").value.trim(),
      postcode: document.getElementById("mgmtPostcode").value.trim(),
      website: document.getElementById("mgmtWebsite").value.trim(),
      default_vat_rate: Number(document.getElementById("mgmtVatRate").value || 0)
    };
    const { error } = await supabase.from("user_settings").upsert(values, { onConflict: "user_id" });
    button.disabled = false;
    if (error) { message.textContent = error.message; message.style.color = "#b91c1c"; return; }
    const local = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
    local.businessName = values.business_name; local.phone = values.phone; local.businessEmail = values.email; local.address = values.address_line1; local.city = values.city; local.postcode = values.postcode; local.website = values.website; local.vatRate = values.default_vat_rate;
    localStorage.setItem("jobpilot_settings", JSON.stringify(local));
    message.textContent = "Business details saved."; message.style.color = "#166534";
    window.dispatchEvent(new CustomEvent("jobpilot:company-ready"));
  });
  document.getElementById("jobpilot-management-back-moved")?.addEventListener("click", renderManagementLanding);
}

async function connectionStatus(urlBody) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session) throw new Error("You are not logged in.");
  const response = await fetch(GO_CARDLESS_CONNECT_URL, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, apikey: session.access_token, "Content-Type": "application/json" }, body: JSON.stringify(urlBody) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not check GoCardless connection.");
  return result;
}

async function renderManagementConnections() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setHeader("Connections", "Manage the services connected to your JobPilot company.");
  setManagementActive();
  content.innerHTML = `
    <div class="page-actions"><div><h2>Connections</h2><p>Connect the services your business uses with JobPilot.</p></div></div>
    <div class="content-grid">
      <div class="panel"><div class="panel-header"><div><h2>💳 Stripe</h2><p>Accept online card payments from customers.</p></div></div><div id="mgmtStripeStatus" class="muted" style="margin-top:10px">Checking connection…</div><button id="mgmtStripeButton" class="primary-button" type="button" style="margin-top:12px">Connect Stripe</button></div>
      <div class="panel"><div class="panel-header"><div><h2>🏦 GoCardless</h2><p>Let customers pay invoices by bank.</p></div></div><div id="mgmtGoStatus" class="muted" style="margin-top:10px">Checking connection…</div><button id="mgmtGoButton" class="primary-button" type="button" style="margin-top:12px">Connect GoCardless</button></div>
      <div class="panel"><div class="panel-header"><div><h2>📊 FreeAgent</h2><p>Link your accounting data with JobPilot.</p></div></div><div id="mgmtFreeAgentStatus" class="muted" style="margin-top:10px">Checking connection…</div><button id="mgmtFreeAgentButton" class="primary-button" type="button" style="margin-top:12px">Connect FreeAgent</button></div>
    </div>${backButton()}`;

  const stripeStatus = document.getElementById("mgmtStripeStatus");
  const stripeButton = document.getElementById("mgmtStripeButton");
  const freeStatus = document.getElementById("mgmtFreeAgentStatus");
  const freeButton = document.getElementById("mgmtFreeAgentButton");
  const goStatus = document.getElementById("mgmtGoStatus");
  const goButton = document.getElementById("mgmtGoButton");

  if (window.JobPilotStripe?.loadStripeStatus) {
    const originalStatus = document.createElement("div"); originalStatus.id = "stripeConnectionStatus"; originalStatus.style.display = "none"; document.body.appendChild(originalStatus);
    const originalButton = document.createElement("button"); originalButton.id = "connectStripeButton"; originalButton.style.display = "none"; document.body.appendChild(originalButton);
    await window.JobPilotStripe.loadStripeStatus();
    stripeStatus.innerHTML = originalStatus.innerHTML || "Not connected";
    stripeButton.textContent = originalButton.textContent || "💳 Connect Stripe";
    stripeButton.disabled = originalButton.disabled;
    stripeButton.onclick = () => window.JobPilotStripe.connectStripe();
    originalStatus.remove(); originalButton.remove();
  } else stripeStatus.textContent = "Stripe integration unavailable.";

  if (window.JobPilotFreeAgent?.loadFreeAgentStatus) {
    const originalStatus = document.createElement("div"); originalStatus.id = "freeagentConnectionStatus"; originalStatus.style.display = "none"; document.body.appendChild(originalStatus);
    const originalButton = document.createElement("button"); originalButton.id = "connectFreeAgentButton"; originalButton.style.display = "none"; document.body.appendChild(originalButton);
    await window.JobPilotFreeAgent.loadFreeAgentStatus();
    freeStatus.innerHTML = originalStatus.innerHTML || "Not connected";
    freeButton.textContent = originalButton.textContent || "📊 Connect FreeAgent";
    freeButton.disabled = originalButton.disabled;
    freeButton.onclick = () => window.JobPilotFreeAgent.connectFreeAgent();
    originalStatus.remove(); originalButton.remove();
  } else freeStatus.textContent = "FreeAgent integration unavailable.";

  try {
    const result = await connectionStatus({ action: "status" });
    if (result.connected) { goStatus.innerHTML = `<strong style="color:green">✅ GoCardless connected</strong><br><small>${escapeHtml(result.organisation_name || "GoCardless account connected to JobPilot.")}</small>`; goButton.textContent = "🏦 GoCardless Connected"; goButton.disabled = true; }
    else goStatus.innerHTML = `<strong>Not connected</strong><br><small>Connect GoCardless to let customers pay by bank.</small>`;
  } catch (error) { goStatus.textContent = error.message; }

  goButton.onclick = async () => {
    goButton.disabled = true; goButton.textContent = "Connecting to GoCardless…";
    try { const result = await connectionStatus({}); if (!result.url) throw new Error("GoCardless did not return an authorisation URL."); window.location.href = result.url; }
    catch (error) { goStatus.textContent = error.message; goButton.disabled = false; goButton.textContent = "🏦 Connect GoCardless"; }
  };
  document.getElementById("jobpilot-management-back-moved")?.addEventListener("click", renderManagementLanding);
}

function renderManagementLanding() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  setHeader("Management", "Manage your JobPilot company.");
  setManagementActive();
  content.innerHTML = `<div class="page-actions"><div><h2>Management</h2><p>Company and team management.</p></div></div><div class="content-grid"><button class="panel jobpilot-management-card" type="button" data-management-section="users" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)"><div class="panel-header"><div><h2>👥 Users & Team</h2><p>Manage company users, roles and access.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0">Add users, change roles, suspend or remove access.</p></button><button class="panel jobpilot-management-card" type="button" data-management-section="company" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)"><div class="panel-header"><div><h2>🏢 Company</h2><p>Manage your business details.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0">Business name, address, contact details, logo and VAT rate.</p></button><button class="panel jobpilot-management-card" type="button" data-management-section="connections" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)"><div class="panel-header"><div><h2>🔗 Connections</h2><p>Manage your connected business services.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0">Stripe, GoCardless and FreeAgent connections.</p></button><button class="panel jobpilot-management-card" type="button" data-management-section="billing" style="text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)"><div class="panel-header"><div><h2>💳 Billing</h2><p>Manage your JobPilot plan and billing.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0">Subscription, plan changes and billing.</p></button></div>`;
  content.querySelectorAll("[data-management-section]").forEach(card => card.addEventListener("click", () => {
    const section = card.dataset.managementSection;
    if (section === "company") renderManagementCompanyMoved();
    if (section === "connections") renderManagementConnections();
    if (section === "users") document.querySelector('[data-management-section="users"]')?.click();
    if (section === "billing") document.querySelector('[data-management-section="billing"]')?.click();
  }));
}

// Capture clicks before the existing Management module handles them.
document.addEventListener("click", event => {
  const card = event.target.closest?.('[data-management-section="company"], [data-management-section="connections"]');
  if (!card) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (card.dataset.managementSection === "company") renderManagementCompanyMoved();
  else renderManagementConnections();
}, true);

const observer = new MutationObserver(() => {
  removeCompanyAndConnectionsFromSettings();
  if (isManagement()) {
    const grid = document.querySelector("#pageContent .content-grid");
    if (grid && !grid.querySelector('[data-management-section="connections"]')) {
      const billing = grid.querySelector('[data-management-section="billing"]');
      const card = document.createElement("button");
      card.className = "panel jobpilot-management-card";
      card.type = "button";
      card.dataset.managementSection = "connections";
      card.style.cssText = "text-align:left;cursor:pointer;border:1px solid var(--border,#e5e7eb)";
      card.innerHTML = `<div class="panel-header"><div><h2>🔗 Connections</h2><p>Manage your connected business services.</p></div><span aria-hidden="true">→</span></div><p class="muted" style="margin:16px 0 0">Stripe, GoCardless and FreeAgent connections.</p>`;
      card.addEventListener("click", () => renderManagementConnections());
      grid.insertBefore(card, billing || null);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });
removeCompanyAndConnectionsFromSettings();
