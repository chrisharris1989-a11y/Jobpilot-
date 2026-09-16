import { supabase } from "../supabase.js";

const DAYS = [
  [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"],
  [5, "Friday"], [6, "Saturday"], [0, "Sunday"]
];

let companyId = null;
let settings = null;
let services = [];
let hours = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
  }[c]));
}

function getContent() { return document.getElementById("pageContent"); }

async function getCompanyId() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("You are not signed in.");
  const { data, error } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("We could not find your company.");
  return data.id;
}

export async function renderBookingsSettings(content = getContent()) {
  if (!content) return;
  content.innerHTML = `<section class="settings-page jp-settings-page"><header class="page-header"><h2>Bookings</h2><p>Let customers book appointments online and control when and how they can book.</p></header><button class="jp-settings-back" type="button" data-booking-back>← Settings</button><div class="jp-booking-loading">Loading booking settings…</div></section>`;
  ensureStyles();
  content.querySelector("[data-booking-back]")?.addEventListener("click", () => document.querySelector('[data-settings-section="bookings"]')?.dispatchEvent(new Event("click")));
  try {
    companyId = await getCompanyId();
    await loadBookingData();
    renderBookingEditor(content);
  } catch (error) {
    console.error("JobPilot bookings settings:", error);
    content.querySelector(".jp-booking-loading").innerHTML = `<div class="jp-booking-error">${esc(error?.message || "Unable to load booking settings.")}</div>`;
  }
}

async function loadBookingData() {
  const [settingsResult, servicesResult, hoursResult] = await Promise.all([
    supabase.from("booking_settings").select("*").eq("company_id", companyId).maybeSingle(),
    supabase.from("booking_services").select("*").eq("company_id", companyId).order("display_order", { ascending: true }),
    supabase.from("booking_hours").select("*").eq("company_id", companyId).order("day_of_week", { ascending: true })
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (hoursResult.error) throw hoursResult.error;
  settings = settingsResult.data || { company_id: companyId, enabled: false, slug: "", slot_interval_minutes: 30, min_notice_hours: 2, max_days_ahead: 60, require_address: true };
  services = servicesResult.data || [];
  hours = hoursResult.data || [];
}

function renderBookingEditor(content) {
  const publicUrl = settings.slug ? `${window.location.origin}/book/?slug=${encodeURIComponent(settings.slug)}` : "";
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header"><h2>Bookings</h2><p>Let customers book appointments online and control when and how they can book.</p></header>
      <button class="jp-settings-back" type="button" data-booking-back>← Settings</button>
      <div class="jp-booking-section">
        <div class="jp-booking-card jp-booking-toggle-card">
          <div><h3>Online bookings</h3><p>Allow customers to request appointments through your public booking page.</p></div>
          <label class="jp-switch"><input id="jpBookingEnabled" type="checkbox" ${settings.enabled ? "checked" : ""}><span></span></label>
        </div>
        <div class="jp-booking-card">
          <div class="jp-booking-card-heading"><div><h3>Public booking link</h3><p>Share this link with customers, on your website or on social media.</p></div></div>
          <div class="jp-booking-link-row"><input id="jpBookingSlug" type="text" maxlength="80" value="${esc(settings.slug || "")}" placeholder="your-business-name"><button id="jpBookingSaveLink" class="jp-booking-button" type="button">Save link</button></div>
          <div id="jpBookingPublicUrl" class="jp-booking-public-url">${publicUrl ? esc(publicUrl) : "Save a booking link to generate your public URL."}</div>
          <button id="jpBookingCopy" class="jp-booking-secondary" type="button" ${publicUrl ? "" : "disabled"}>Copy booking link</button>
          <div id="jpBookingLinkStatus" class="jp-booking-status" role="status" aria-live="polite"></div>
        </div>
      </div>
      <div class="jp-booking-section">
        <div class="jp-booking-section-title"><div><h3>Booking services</h3><p>Choose what customers can book, including duration and price.</p></div><button id="jpBookingAddService" class="jp-booking-button" type="button">+ Add service</button></div>
        <div id="jpBookingServices" class="jp-booking-services"></div>
      </div>
      <div class="jp-booking-section">
        <div class="jp-booking-card"><div class="jp-booking-card-heading"><div><h3>Availability</h3><p>Set the days and hours customers can book.</p></div><button id="jpBookingSaveHours" class="jp-booking-button" type="button">Save hours</button></div><div class="jp-booking-hours">${renderHours()}</div><div id="jpBookingHoursStatus" class="jp-booking-status" role="status" aria-live="polite"></div></div>
      </div>
      <div class="jp-booking-section">
        <div class="jp-booking-card"><div class="jp-booking-card-heading"><div><h3>Booking rules</h3><p>Control how far ahead and how quickly customers can book.</p></div><button id="jpBookingSaveRules" class="jp-booking-button" type="button">Save rules</button></div>
          <div class="jp-booking-rules-grid">
            <label>Time slots<select id="jpBookingInterval"><option value="15" ${settings.slot_interval_minutes === 15 ? "selected" : ""}>Every 15 minutes</option><option value="20" ${settings.slot_interval_minutes === 20 ? "selected" : ""}>Every 20 minutes</option><option value="30" ${settings.slot_interval_minutes === 30 ? "selected" : ""}>Every 30 minutes</option><option value="60" ${settings.slot_interval_minutes === 60 ? "selected" : ""}>Every hour</option></select></label>
            <label>Minimum notice<select id="jpBookingNotice"><option value="0" ${settings.min_notice_hours === 0 ? "selected" : ""}>No minimum</option><option value="2" ${settings.min_notice_hours === 2 ? "selected" : ""}>2 hours</option><option value="4" ${settings.min_notice_hours === 4 ? "selected" : ""}>4 hours</option><option value="12" ${settings.min_notice_hours === 12 ? "selected" : ""}>12 hours</option><option value="24" ${settings.min_notice_hours === 24 ? "selected" : ""}>24 hours</option><option value="48" ${settings.min_notice_hours === 48 ? "selected" : ""}>48 hours</option><option value="72" ${settings.min_notice_hours === 72 ? "selected" : ""}>72 hours</option></select></label>
            <label>Book up to<select id="jpBookingAhead"><option value="7" ${settings.max_days_ahead === 7 ? "selected" : ""}>7 days ahead</option><option value="14" ${settings.max_days_ahead === 14 ? "selected" : ""}>14 days ahead</option><option value="30" ${settings.max_days_ahead === 30 ? "selected" : ""}>30 days ahead</option><option value="60" ${settings.max_days_ahead === 60 ? "selected" : ""}>60 days ahead</option><option value="90" ${settings.max_days_ahead === 90 ? "selected" : ""}>90 days ahead</option><option value="180" ${settings.max_days_ahead === 180 ? "selected" : ""}>180 days ahead</option><option value="365" ${settings.max_days_ahead === 365 ? "selected" : ""}>365 days ahead</option></select></label>
          </div>
          <label class="jp-booking-checkbox"><input id="jpBookingAddress" type="checkbox" ${settings.require_address ? "checked" : ""}> Require a customer address when booking</label>
          <div id="jpBookingRulesStatus" class="jp-booking-status" role="status" aria-live="polite"></div>
        </div>
      </div>
    </section>`;
  ensureStyles();
  content.querySelector("[data-booking-back]")?.addEventListener("click", () => renderSettingsOverviewFromBooking(content));
  document.getElementById("jpBookingEnabled")?.addEventListener("change", saveEnabled);
  document.getElementById("jpBookingSaveLink")?.addEventListener("click", saveLink);
  document.getElementById("jpBookingCopy")?.addEventListener("click", copyLink);
  document.getElementById("jpBookingAddService")?.addEventListener("click", () => showServiceModal(content));
  document.getElementById("jpBookingSaveHours")?.addEventListener("click", saveHours);
  document.getElementById("jpBookingSaveRules")?.addEventListener("click", saveRules);
  renderServices();
}

function renderSettingsOverviewFromBooking(content) {
  const settingsButton = document.querySelector('[data-settings-section="bookings"]');
  if (settingsButton) settingsButton.dispatchEvent(new Event("click"));
  else content.innerHTML = "";
}

function renderHours() {
  const byDay = new Map(hours.map(row => [Number(row.day_of_week), row]));
  return DAYS.map(([day, label]) => {
    const row = byDay.get(day) || { enabled: false, open_time: "09:00", close_time: "17:00" };
    return `<div class="jp-booking-day"><label class="jp-day-toggle"><input type="checkbox" data-booking-day="${day}" ${row.enabled ? "checked" : ""}><span>${label}</span></label><input type="time" data-booking-open="${day}" value="${esc(String(row.open_time || "09:00").slice(0,5))}"><span>to</span><input type="time" data-booking-close="${day}" value="${esc(String(row.close_time || "17:00").slice(0,5))}"></div>`;
  }).join("");
}

function renderServices() {
  const container = document.getElementById("jpBookingServices");
  if (!container) return;
  if (!services.length) {
    container.innerHTML = `<div class="jp-booking-empty">No services added yet. Add a service before sharing your booking link.</div>`;
    return;
  }
  container.innerHTML = services.map(service => `<div class="jp-booking-service-row"><div class="jp-service-main"><strong>${esc(service.name)}</strong><small>${esc(service.description || "") || "No description"}</small></div><div class="jp-service-meta"><span>${Number(service.duration_minutes)} min</span><span>${service.price == null ? "Price on request" : Number(service.price).toFixed(2)}</span><span class="jp-service-active ${service.active ? "active" : "inactive"}">${service.active ? "Active" : "Hidden"}</span></div><div class="jp-service-actions"><button type="button" data-edit-service="${service.id}">Edit</button><button type="button" data-delete-service="${service.id}">Delete</button></div></div>`).join("");
  container.querySelectorAll("[data-edit-service]").forEach(button => button.addEventListener("click", () => showServiceModal(getContent(), services.find(s => s.id === button.dataset.editService))));
  container.querySelectorAll("[data-delete-service]").forEach(button => button.addEventListener("click", () => deleteService(button.dataset.deleteService)));
}

function showServiceModal(content, service = null) {
  const modal = document.createElement("div");
  modal.className = "jp-booking-modal-backdrop";
  modal.innerHTML = `<div class="jp-booking-modal" role="dialog" aria-modal="true"><div class="jp-booking-modal-header"><div><h3>${service ? "Edit service" : "Add service"}</h3><p>Set what customers will see when booking.</p></div><button type="button" data-close>×</button></div><form id="jpBookingServiceForm"><label>Service name<input name="name" maxlength="120" required value="${esc(service?.name || "")}" placeholder="e.g. Window cleaning"></label><label>Description<textarea name="description" maxlength="500" placeholder="Optional description">${esc(service?.description || "")}</textarea></label><div class="jp-service-form-grid"><label>Duration<select name="duration"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option><option value="480">8 hours</option></select></label><label>Price<input name="price" type="number" min="0" step="0.01" value="${service?.price == null ? "" : esc(service.price)}" placeholder="Optional"></label></div><label class="jp-booking-checkbox"><input name="active" type="checkbox" ${service?.active !== false ? "checked" : ""}> Available for online booking</label><div class="jp-booking-modal-actions"><button type="button" class="jp-booking-secondary" data-close>Cancel</button><button type="submit" class="jp-booking-button">Save service</button></div><div class="jp-booking-status" data-service-status role="status"></div></form></div>`;
  document.body.appendChild(modal);
  const duration = modal.querySelector('[name="duration"]');
  if (service?.duration_minutes) duration.value = String(service.duration_minutes);
  modal.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => modal.remove()));
  modal.addEventListener("click", event => { if (event.target === modal) modal.remove(); });
  modal.querySelector("form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget; const button = form.querySelector("button[type=submit]"); const status = form.querySelector("[data-service-status]");
    const name = form.name.value.trim(); if (!name) return;
    button.disabled = true; status.textContent = "Saving…";
    const payload = { company_id: companyId, name, description: form.description.value.trim() || null, duration_minutes: Number(form.duration.value), price: form.price.value === "" ? null : Number(form.price.value), active: form.active.checked, display_order: service?.display_order ?? services.length };
    const result = service ? await supabase.from("booking_services").update(payload).eq("id", service.id).eq("company_id", companyId) : await supabase.from("booking_services").insert(payload);
    if (result.error) { status.textContent = result.error.message; button.disabled = false; return; }
    await loadBookingData(); modal.remove(); renderBookingEditor(getContent());
  });
}

async function deleteService(id) {
  if (!confirm("Delete this booking service? Customers will no longer be able to book it.")) return;
  const { error } = await supabase.from("booking_services").delete().eq("id", id).eq("company_id", companyId);
  if (error) return alert(error.message);
  await loadBookingData(); renderBookingEditor(getContent());
}

async function saveEnabled(event) {
  await updateSettings({ enabled: event.target.checked }, "Online booking settings saved.");
}

async function saveLink() {
  const input = document.getElementById("jpBookingSlug"); const status = document.getElementById("jpBookingLinkStatus");
  let slug = input.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
  if (!slug) { status.textContent = "Enter a booking link name."; status.className = "jp-booking-status error"; return; }
  status.textContent = "Saving…";
  const { data: existing, error: checkError } = await supabase.from("booking_settings").select("company_id").eq("slug", slug).neq("company_id", companyId).maybeSingle();
  if (checkError) { status.textContent = checkError.message; status.className = "jp-booking-status error"; return; }
  if (existing) { status.textContent = "That booking link is already in use. Choose another."; status.className = "jp-booking-status error"; return; }
  await updateSettings({ slug }, "Booking link saved.");
  const url = `${window.location.origin}/book/?slug=${encodeURIComponent(slug)}`;
  document.getElementById("jpBookingPublicUrl").textContent = url;
  document.getElementById("jpBookingCopy").disabled = false;
}

async function copyLink() {
  const url = document.getElementById("jpBookingPublicUrl")?.textContent?.trim();
  if (!url || !url.startsWith("http")) return;
  try { await navigator.clipboard.writeText(url); document.getElementById("jpBookingLinkStatus").textContent = "Booking link copied."; } catch { document.getElementById("jpBookingLinkStatus").textContent = "Copy failed. Select the link and copy it manually."; }
}

async function saveHours() {
  const status = document.getElementById("jpBookingHoursStatus"); const button = document.getElementById("jpBookingSaveHours");
  button.disabled = true; status.textContent = "Saving…";
  try {
    const rows = DAYS.map(([day]) => ({ company_id: companyId, day_of_week: day, enabled: document.querySelector(`[data-booking-day="${day}"]`).checked, open_time: document.querySelector(`[data-booking-open="${day}"]`).value, close_time: document.querySelector(`[data-booking-close="${day}"]`).value }));
    for (const row of rows) {
      if (row.enabled && row.close_time <= row.open_time) throw new Error(`${DAYS.find(d => d[0] === row.day_of_week)[1]} closing time must be after opening time.`);
      const { error } = await supabase.from("booking_hours").upsert(row, { onConflict: "company_id,day_of_week" });
      if (error) throw error;
    }
    status.textContent = "Availability saved."; status.className = "jp-booking-status success";
    await loadBookingData();
  } catch (error) { status.textContent = error.message || "Unable to save availability."; status.className = "jp-booking-status error"; }
  button.disabled = false;
}

async function saveRules() {
  const status = document.getElementById("jpBookingRulesStatus");
  await updateSettings({ slot_interval_minutes: Number(document.getElementById("jpBookingInterval").value), min_notice_hours: Number(document.getElementById("jpBookingNotice").value), max_days_ahead: Number(document.getElementById("jpBookingAhead").value), require_address: document.getElementById("jpBookingAddress").checked }, "Booking rules saved.");
}

async function updateSettings(changes, successMessage) {
  const status = document.querySelector("#jpBookingLinkStatus, #jpBookingRulesStatus");
  const { error } = await supabase.from("booking_settings").upsert({ company_id: companyId, ...(settings || {}), ...changes, updated_at: new Date().toISOString() }, { onConflict: "company_id" });
  if (error) { if (status) { status.textContent = error.message; status.className = "jp-booking-status error"; } return false; }
  settings = { ...(settings || {}), ...changes };
  if (status) { status.textContent = successMessage; status.className = "jp-booking-status success"; }
  return true;
}

function ensureStyles() {
  if (document.getElementById("jp-booking-settings-styles")) return;
  const style = document.createElement("style"); style.id = "jp-booking-settings-styles";
  style.textContent = `.jp-booking-section{max-width:960px;margin-top:22px}.jp-booking-card{padding:22px;border:1px solid rgba(0,0,0,.1);border-radius:14px;background:var(--card-bg,#fff);box-shadow:0 2px 8px rgba(0,0,0,.04);margin-bottom:14px}.jp-booking-toggle-card{display:flex;align-items:center;justify-content:space-between;gap:20px}.jp-booking-card h3,.jp-booking-section-title h3{margin:0;font-size:17px}.jp-booking-card p,.jp-booking-section-title p{margin:5px 0 0;font-size:13px;opacity:.68}.jp-booking-card-heading,.jp-booking-section-title{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.jp-booking-link-row{display:flex;gap:10px;margin-top:16px}.jp-booking-link-row input,.jp-booking-rules-grid select,.jp-service-form-grid input,.jp-service-form-grid select{width:100%;box-sizing:border-box;border:1px solid rgba(0,0,0,.14);border-radius:9px;padding:10px 12px;background:transparent;color:inherit;font:inherit}.jp-booking-link-row input{flex:1}.jp-booking-public-url{margin-top:9px;font-size:12px;word-break:break-all;opacity:.68}.jp-booking-button{border:0;border-radius:9px;padding:10px 15px;background:#111827;color:#fff;font-weight:700;cursor:pointer;white-space:nowrap}.jp-booking-button:disabled{opacity:.55;cursor:wait}.jp-booking-secondary{border:1px solid rgba(0,0,0,.14);border-radius:9px;padding:9px 13px;background:transparent;color:inherit;font-weight:600;cursor:pointer;margin-top:10px}.jp-booking-secondary:disabled{opacity:.45;cursor:not-allowed}.jp-booking-status{min-height:18px;margin-top:9px;font-size:13px;opacity:.8}.jp-booking-status.success{color:#15803d;opacity:1}.jp-booking-status.error,.jp-booking-error{color:#b91c1c;opacity:1}.jp-booking-services{margin-top:12px;display:grid;gap:10px}.jp-booking-service-row{display:flex;align-items:center;gap:18px;padding:16px;border:1px solid rgba(0,0,0,.1);border-radius:12px;background:var(--card-bg,#fff)}.jp-service-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}.jp-service-main small{opacity:.65}.jp-service-meta{display:flex;gap:12px;align-items:center;font-size:13px;white-space:nowrap}.jp-service-active.active{color:#15803d}.jp-service-active.inactive{opacity:.55}.jp-service-actions{display:flex;gap:8px}.jp-service-actions button{border:0;background:none;color:inherit;cursor:pointer;font-weight:600}.jp-service-actions button:last-child{color:#b91c1c}.jp-booking-empty,.jp-booking-loading{padding:22px;border:1px dashed rgba(0,0,0,.16);border-radius:12px;opacity:.68;margin-top:12px}.jp-booking-hours{display:grid;gap:8px;margin-top:18px}.jp-booking-day{display:grid;grid-template-columns:minmax(150px,1fr) 140px auto 140px;align-items:center;gap:10px}.jp-day-toggle{display:flex;align-items:center;gap:9px;font-weight:600}.jp-booking-day input[type=time],.jp-booking-rules-grid select{border:1px solid rgba(0,0,0,.14);border-radius:9px;padding:9px 10px;background:transparent;color:inherit;font:inherit}.jp-booking-rules-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.jp-booking-rules-grid label,.jp-booking-modal label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:600}.jp-booking-checkbox{display:flex;align-items:center;gap:9px;margin-top:18px;font-size:13px}.jp-booking-checkbox input{width:auto}.jp-switch{position:relative;width:48px;height:28px;display:block;flex:0 0 48px}.jp-switch input{opacity:0;width:0;height:0}.jp-switch span{position:absolute;inset:0;border-radius:999px;background:#cbd5e1;cursor:pointer;transition:.2s}.jp-switch span:before{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}.jp-switch input:checked+span{background:#111827}.jp-switch input:checked+span:before{transform:translateX(20px)}.jp-booking-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:grid;place-items:center;padding:20px;z-index:10000}.jp-booking-modal{width:min(560px,100%);max-height:90vh;overflow:auto;background:var(--card-bg,#fff);color:inherit;border-radius:16px;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.25)}.jp-booking-modal-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.jp-booking-modal-header h3{margin:0}.jp-booking-modal-header p{margin:5px 0 0;font-size:13px;opacity:.68}.jp-booking-modal-header button{border:0;background:none;font-size:25px;cursor:pointer}.jp-booking-modal form{margin-top:18px}.jp-booking-modal input,.jp-booking-modal textarea{width:100%;box-sizing:border-box;border:1px solid rgba(0,0,0,.14);border-radius:9px;padding:10px 12px;background:transparent;color:inherit;font:inherit}.jp-booking-modal textarea{min-height:90px;resize:vertical}.jp-service-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.jp-booking-modal .jp-booking-checkbox{margin-bottom:4px}.jp-booking-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.jp-booking-modal-actions .jp-booking-secondary{margin-top:0}@media(max-width:760px){.jp-booking-service-row{align-items:flex-start;flex-wrap:wrap}.jp-service-meta{flex-wrap:wrap}.jp-booking-day{grid-template-columns:1fr 110px auto 110px}.jp-booking-rules-grid{grid-template-columns:1fr}.jp-booking-link-row{flex-direction:column}.jp-booking-button{width:100%}}@media(max-width:520px){.jp-booking-day{grid-template-columns:1fr 1fr}.jp-booking-day>span{display:none}.jp-booking-day input[type=time]{width:100%}.jp-service-form-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}

// Intercept the Settings overview card without changing the existing settings module.
document.addEventListener("click", event => {
  const card = event.target.closest?.('[data-settings-section="bookings"]');
  if (!card) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderBookingsSettings(getContent());
}, true);
