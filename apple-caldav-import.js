import { supabase } from "./supabase.js";

const FUNCTION_NAME = "apple-caldav-import";

const esc = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#039;");

const normaliseName = value => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

function toast(message, error = false) {
  let el = document.getElementById("jp-calendar-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "jp-calendar-toast";
    el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100001;padding:12px 16px;border-radius:10px;background:#0f172a;color:#fff;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);max-width:min(90vw,520px);text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.background = error ? "#991b1b" : "#166534";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.remove(), 4500);
}

function styles() {
  if (document.getElementById("jp-apple-caldav-style")) return;
  const style = document.createElement("style");
  style.id = "jp-apple-caldav-style";
  style.textContent = `
    .jp-caldav-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px}
    .jp-caldav-modal{background:#fff;border-radius:16px;width:min(760px,100%);max-height:90vh;overflow:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.22)}
    .jp-caldav-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
    .jp-caldav-header h2{margin:0 0 7px}
    .jp-caldav-muted{color:#64748b;line-height:1.5}
    .jp-caldav-form{display:grid;gap:14px;margin-top:18px}
    .jp-caldav-form label{display:grid;gap:6px;font-size:13px;font-weight:600;color:#334155}
    .jp-caldav-form input{width:100%;box-sizing:border-box}
    .jp-caldav-help{padding:13px 14px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:13px;line-height:1.5}
    .jp-caldav-help a{color:#2563eb}
    .jp-caldav-list{display:grid;gap:10px;margin-top:18px}
    .jp-caldav-calendar{display:flex;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#fff;cursor:pointer}
    .jp-caldav-calendar:hover{background:#f8fafc}
    .jp-caldav-calendar input{width:18px;height:18px;margin:0}
    .jp-caldav-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;position:sticky;bottom:-24px;background:#fff;padding-top:14px}
    .jp-caldav-loading{padding:22px 0;text-align:center;color:#64748b}
    @media(max-width:600px){.jp-caldav-modal{padding:18px}.jp-caldav-header{display:block}.jp-caldav-header>button{margin-top:12px}}
  `;
  document.head.appendChild(style);
}

function openModal(inner) {
  styles();
  const overlay = document.createElement("div");
  overlay.className = "jp-caldav-overlay";
  overlay.innerHTML = `<div class="jp-caldav-modal">${inner}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}

async function invoke(payload) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

function parseEventRows(events) {
  return events.map(event => {
    const summary = event.title || "Imported calendar job";
    let customer = event.customer || "";
    let title = summary;
    if (!customer) {
      for (const separator of [" - ", " – ", " — ", " | "]) {
        if (!summary.includes(separator)) continue;
        const parts = summary.split(separator).map(x => x.trim()).filter(Boolean);
        if (parts.length >= 2) { customer = parts[0]; title = parts.slice(1).join(separator); break; }
      }
    }
    return { ...event, customer, title };
  }).filter(event => event.date && event.title);
}

async function getExistingData() {
  const [{ data: customers, error: customerError }, { data: jobs, error: jobError }] = await Promise.all([
    supabase.from("customers").select("id,name,address,address_line1,address_line2,city,postcode"),
    supabase.from("jobs").select("id,customer_id,title,scheduled_date,scheduled_time")
  ]);
  if (customerError) throw customerError;
  if (jobError) throw jobError;
  return { customers: customers || [], jobs: jobs || [] };
}

function duplicate(event, customerId, jobs) {
  return jobs.some(job => String(job.customer_id) === String(customerId) &&
    normaliseName(job.title) === normaliseName(event.title) &&
    job.scheduled_date === event.date &&
    String(job.scheduled_time || "").slice(0, 5) === String(event.time || ""));
}

async function importRows(rows, modal) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("You must be signed in to import calendar events.");

  const existing = await getExistingData();
  const customersByName = new Map(existing.customers.map(c => [normaliseName(c.name), c]));
  let imported = 0;
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const customerName = row.customer.trim() || "Calendar customer";
    let customer = customersByName.get(normaliseName(customerName));

    if (!customer) {
      const address = String(row.location || "").trim();
      const { data, error } = await supabase.from("customers").insert({
        user_id: user.id,
        name: customerName,
        address,
        address_line1: address,
        phone: "",
        email: "",
        postcode: "",
        notes: "Imported from Apple Calendar"
      }).select().single();
      if (error) throw error;
      customer = data;
      customersByName.set(normaliseName(customerName), customer);
      created++;
    }

    if (duplicate(row, customer.id, existing.jobs)) { skipped++; continue; }

    const { data: job, error } = await supabase.from("jobs").insert({
      user_id: user.id,
      customer_id: customer.id,
      title: row.title || "Imported calendar job",
      description: row.description || "",
      scheduled_date: row.date,
      scheduled_time: row.time || null,
      status: "pending",
      price: 0,
      notes: row.location ? `Imported from Apple Calendar. Location: ${row.location}` : "Imported from Apple Calendar."
    }).select().single();
    if (error) throw error;
    existing.jobs.push(job);
    imported++;
  }

  modal.remove();
  toast(`${imported} job${imported === 1 ? "" : "s"} imported${created ? ` and ${created} customer${created === 1 ? "" : "s"} created` : ""}.${skipped ? ` ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.` : ""}`);
}

function preview(events) {
  const rows = parseEventRows(events);
  const modal = openModal(`
    <div class="jp-caldav-header"><div><h2>Import from Apple Calendar</h2><div class="jp-caldav-muted">Review the events JobPilot found before importing them. Customer names can be corrected here.</div></div><button type="button" class="button secondary" data-close>Close</button></div>
    <p><strong>${rows.length}</strong> calendar event${rows.length === 1 ? "" : "s"} found.</p>
    <div class="jp-caldav-list">${rows.map((row, index) => `
      <div class="jp-caldav-calendar" style="display:block;cursor:default">
        <div class="jp-caldav-muted" style="margin-bottom:10px">${esc(row.date)}${row.time ? ` at ${esc(row.time)}` : ""}${row.location ? ` · ${esc(row.location)}` : ""}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label>Customer<input data-customer="${index}" value="${esc(row.customer)}" placeholder="Customer name"></label>
          <label>Job title<input data-title="${index}" value="${esc(row.title)}" placeholder="Job title"></label>
        </div>
      </div>`).join("")}</div>
    <div class="jp-caldav-actions"><button type="button" class="button secondary" data-cancel>Cancel</button><button type="button" class="button primary" data-import>Import ${rows.length} job${rows.length === 1 ? "" : "s"}</button></div>
  `);
  const close = () => modal.remove();
  modal.querySelector("[data-close]").onclick = close;
  modal.querySelector("[data-cancel]").onclick = close;
  modal.querySelector("[data-import]").onclick = async () => {
    const button = modal.querySelector("[data-import]");
    button.disabled = true; button.textContent = "Importing...";
    try {
      const edited = rows.map((row, index) => ({
        ...row,
        customer: modal.querySelector(`[data-customer="${index}"]`).value,
        title: modal.querySelector(`[data-title="${index}"]`).value
      })).filter(row => row.customer.trim() || row.title.trim());
      await importRows(edited, modal);
    } catch (error) {
      button.disabled = false; button.textContent = `Import ${rows.length} jobs`;
      toast(`Calendar import failed: ${error.message}`, true);
    }
  };
}

function todayOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function openCredentials() {
  const modal = openModal(`
    <div class="jp-caldav-header"><div><h2>Import Apple Calendar</h2><div class="jp-caldav-muted">JobPilot connects to iCloud using CalDAV to read your calendar. This is a one-time import; JobPilot will not change your Apple Calendar.</div></div><button type="button" class="button secondary" data-close>Close</button></div>
    <div class="jp-caldav-form">
      <label>Apple Account email<input type="email" data-apple-id autocomplete="email" placeholder="you@icloud.com"></label>
      <label>App-specific password<input type="password" data-apple-password autocomplete="current-password" placeholder="xxxx-xxxx-xxxx-xxxx"></label>
      <div class="jp-caldav-help">For CalDAV access, Apple requires an app-specific password for this type of connection. Your normal Apple Account password should not be entered here. <a href="https://account.apple.com/" target="_blank" rel="noopener noreferrer">Create one at Apple Account</a>.</div>
    </div>
    <div class="jp-caldav-actions"><button type="button" class="button secondary" data-cancel>Cancel</button><button type="button" class="button primary" data-connect>Find my calendars</button></div>
  `);
  const close = () => modal.remove();
  modal.querySelector("[data-close]").onclick = close;
  modal.querySelector("[data-cancel]").onclick = close;
  modal.querySelector("[data-connect]").onclick = async () => {
    const button = modal.querySelector("[data-connect]");
    const appleId = modal.querySelector("[data-apple-id").value.trim();
    const password = modal.querySelector("[data-apple-password]").value.trim();
    if (!appleId || !password) { toast("Enter your Apple Account email and app-specific password.", true); return; }
    button.disabled = true; button.textContent = "Connecting...";
    try {
      const result = await invoke({ action: "list_calendars", appleId, appSpecificPassword: password });
      showCalendarChoice(modal, appleId, password, result.calendars || []);
    } catch (error) {
      button.disabled = false; button.textContent = "Find my calendars";
      toast(error.message || "Could not connect to Apple Calendar.", true);
    }
  };
}

function showCalendarChoice(modal, appleId, password, calendars) {
  modal.querySelector(".jp-caldav-modal").innerHTML = `
    <div class="jp-caldav-header"><div><h2>Choose your work calendar</h2><div class="jp-caldav-muted">Select the calendar that contains the jobs you want to move into JobPilot.</div></div><button type="button" class="button secondary" data-close>Close</button></div>
    <div class="jp-caldav-list">${calendars.length ? calendars.map((calendar, index) => `<label class="jp-caldav-calendar"><input type="radio" name="jp-apple-calendar" value="${esc(calendar.id)}" ${index === 0 ? "checked" : ""}><span>${esc(calendar.name)}</span></label>`).join("") : `<div class="jp-caldav-muted">No calendars were found.</div>`}</div>
    <div class="jp-caldav-actions"><button type="button" class="button secondary" data-cancel>Cancel</button><button type="button" class="button primary" data-load ${calendars.length ? "" : "disabled"}>Load calendar events</button></div>
  `;
  const close = () => modal.remove();
  modal.querySelector("[data-close]").onclick = close;
  modal.querySelector("[data-cancel]").onclick = close;
  modal.querySelector("[data-load]").onclick = async () => {
    const calendarUrl = modal.querySelector("input[name=\"jp-apple-calendar\"]:checked")?.value;
    if (!calendarUrl) return;
    const button = modal.querySelector("[data-load]");
    button.disabled = true; button.textContent = "Loading events...";
    try {
      const result = await invoke({
        action: "fetch_events",
        appleId,
        appSpecificPassword: password,
        calendarUrl,
        from: `${todayOffset(-365)}T000000Z`,
        to: `${todayOffset(730)}T235959Z`
      });
      modal.remove();
      if (!result.events?.length) { toast("No calendar events were found in the selected date range.", true); return; }
      preview(result.events);
    } catch (error) {
      button.disabled = false; button.textContent = "Load calendar events";
      toast(error.message || "Could not read Apple Calendar.", true);
    }
  };
}

export function openAppleCalendarImport() {
  openCredentials();
}
