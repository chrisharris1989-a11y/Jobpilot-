import { supabase } from "./supabase.js";

const PROVIDERS = {
  "Apple Calendar": "Apple Calendar",
  "Google Calendar": "Google Calendar",
  "Outlook Calendar": "Outlook Calendar"
};

const esc = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

function unescapeIcs(value = "") {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function unfoldIcs(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function parseProperty(line) {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = unescapeIcs(line.slice(colon + 1));
  const parts = left.split(";");
  const name = parts.shift().toUpperCase();
  const params = {};
  for (const part of parts) {
    const equals = part.indexOf("=");
    if (equals < 0) continue;
    params[part.slice(0, equals).toUpperCase()] = part.slice(equals + 1);
  }
  return { name, value, params };
}

function parseIcs(text) {
  const events = [];
  let current = null;
  for (const line of unfoldIcs(text)) {
    if (line.toUpperCase() === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line.toUpperCase() === "END:VEVENT") {
      if (current?.DTSTART) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const property = parseProperty(line);
    if (!property) continue;
    if (!current[property.name]) current[property.name] = property;
  }
  return events.map(normaliseEvent).filter(Boolean);
}

function formatIcsDate(prop) {
  if (!prop?.value) return { date: "", time: "" };
  const raw = prop.value;
  const dateOnly = /^\d{8}$/.test(raw);
  if (dateOnly) return { date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, time: "" };

  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i);
  if (!match) return { date: "", time: "" };

  const [, y, mo, d, hh, mm, ss = "00", z] = match;
  if (z) {
    const utc = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
    return {
      date: utc.toISOString().slice(0, 10),
      time: utc.toISOString().slice(11, 16)
    };
  }
  return { date: `${y}-${mo}-${d}`, time: `${hh}:${mm}` };
}

function normaliseEvent(event) {
  const start = formatIcsDate(event.DTSTART);
  if (!start.date) return null;
  const summary = event.SUMMARY?.value || "Imported calendar job";
  const location = event.LOCATION?.value || "";
  const description = event.DESCRIPTION?.value || "";

  let customer = "";
  let title = summary;
  const separators = [" - ", " – ", " — ", " | "];
  for (const separator of separators) {
    if (!summary.includes(separator)) continue;
    const parts = summary.split(separator).map(x => x.trim()).filter(Boolean);
    if (parts.length >= 2) {
      customer = parts[0];
      title = parts.slice(1).join(separator);
      break;
    }
  }

  return {
    uid: event.UID?.value || "",
    customer,
    title,
    date: start.date,
    time: start.time,
    location,
    description
  };
}

function normaliseName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function showToast(message, error = false) {
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
  el._timer = setTimeout(() => el.remove(), 4000);
}

function injectCalendarStyles() {
  if (document.getElementById("jp-calendar-import-style")) return;
  const style = document.createElement("style");
  style.id = "jp-calendar-import-style";
  style.textContent = `
    .jp-cal-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px}
    .jp-cal-modal{background:#fff;border-radius:16px;width:min(900px,100%);max-height:90vh;overflow:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.22)}
    .jp-cal-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:8px}
    .jp-cal-header h2{margin:0 0 6px}
    .jp-cal-muted{color:#64748b;line-height:1.5}
    .jp-cal-file{border:1px dashed #94a3b8;border-radius:12px;padding:16px;margin:16px 0;background:#f8fafc}
    .jp-cal-list{display:grid;gap:10px;margin-top:16px}
    .jp-cal-row{border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#fff}
    .jp-cal-row-grid{display:grid;grid-template-columns:1.1fr 1.4fr 140px 100px;gap:10px;align-items:end}
    .jp-cal-row label{display:grid;gap:5px;font-size:12px;color:#64748b;font-weight:600}
    .jp-cal-row input{width:100%;box-sizing:border-box}
    .jp-cal-meta{font-size:13px;color:#64748b;margin-bottom:10px}
    .jp-cal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;position:sticky;bottom:-24px;background:#fff;padding-top:14px}
    .jp-cal-count{font-weight:600;margin-top:12px}
    @media(max-width:720px){.jp-cal-row-grid{grid-template-columns:1fr 1fr}.jp-cal-row-grid label:nth-child(3),.jp-cal-row-grid label:nth-child(4){grid-column:auto}.jp-cal-modal{padding:18px}}
  `;
  document.head.appendChild(style);
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

function isDuplicate(event, customerId, jobs) {
  return jobs.some(job =>
    String(job.customer_id) === String(customerId) &&
    normaliseName(job.title) === normaliseName(event.title) &&
    job.scheduled_date === event.date &&
    String(job.scheduled_time || "").slice(0, 5) === event.time
  );
}

async function importEvents(events, provider, modal) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("You must be signed in to import calendar events.");

  const existing = await getExistingData();
  const customersByName = new Map(existing.customers.map(c => [normaliseName(c.name), c]));
  let importedJobs = 0;
  let createdCustomers = 0;
  let skippedDuplicates = 0;

  for (const row of events) {
    const customerName = row.customer.trim() || "Calendar customer";
    const customerKey = normaliseName(customerName);
    let customer = customersByName.get(customerKey);

    if (!customer) {
      const address = row.location.trim();
      const { data, error } = await supabase.from("customers").insert({
        user_id: user.id,
        name: customerName,
        address: address,
        address_line1: address,
        phone: "",
        email: "",
        postcode: "",
        notes: `Imported from ${provider}`
      }).select().single();
      if (error) throw error;
      customer = data;
      customersByName.set(customerKey, customer);
      createdCustomers++;
    }

    if (isDuplicate(row, customer.id, existing.jobs)) {
      skippedDuplicates++;
      continue;
    }

    const { data: job, error: jobError } = await supabase.from("jobs").insert({
      user_id: user.id,
      customer_id: customer.id,
      title: row.title || "Imported calendar job",
      description: row.description || "",
      scheduled_date: row.date,
      scheduled_time: row.time || null,
      status: "pending",
      price: 0,
      notes: row.location ? `Imported from ${provider}. Location: ${row.location}` : `Imported from ${provider}.`
    }).select().single();
    if (jobError) throw jobError;
    existing.jobs.push(job);
    importedJobs++;
  }

  modal.remove();
  showToast(`${importedJobs} job${importedJobs === 1 ? "" : "s"} imported${createdCustomers ? ` and ${createdCustomers} customer${createdCustomers === 1 ? "" : "s"} created` : ""}.${skippedDuplicates ? ` ${skippedDuplicates} duplicate${skippedDuplicates === 1 ? "" : "s"} skipped.` : ""}`);
}

function openPreview(provider, events) {
  injectCalendarStyles();
  const modal = document.createElement("div");
  modal.className = "jp-cal-overlay";
  modal.innerHTML = `
    <div class="jp-cal-modal">
      <div class="jp-cal-header">
        <div>
          <h2>Import from ${esc(provider)}</h2>
          <div class="jp-cal-muted">Review the jobs JobPilot found before importing them. Customer names are inferred from event titles and can be edited.</div>
        </div>
        <button type="button" class="button secondary" data-cal-close>Close</button>
      </div>
      <div class="jp-cal-count">${events.length} calendar event${events.length === 1 ? "" : "s"} found</div>
      <div class="jp-cal-list">
        ${events.map((event, index) => `
          <div class="jp-cal-row" data-cal-row="${index}">
            <div class="jp-cal-meta">${esc(event.date)}${event.time ? ` at ${esc(event.time)}` : ""}${event.location ? ` · ${esc(event.location)}` : ""}</div>
            <div class="jp-cal-row-grid">
              <label>Customer<input data-cal-customer="${index}" value="${esc(event.customer)}" placeholder="Customer name"></label>
              <label>Job title<input data-cal-title="${index}" value="${esc(event.title)}" placeholder="Job title"></label>
              <label>Date<input data-cal-date="${index}" type="date" value="${esc(event.date)}"></label>
              <label>Time<input data-cal-time="${index}" type="time" value="${esc(event.time)}"></label>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="jp-cal-actions">
        <button type="button" class="button secondary" data-cal-cancel>Cancel</button>
        <button type="button" class="button primary" data-cal-import>Import ${events.length} job${events.length === 1 ? "" : "s"}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("[data-cal-close]").onclick = close;
  modal.querySelector("[data-cal-cancel]").onclick = close;
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  modal.querySelector("[data-cal-import]").onclick = async () => {
    const button = modal.querySelector("[data-cal-import]");
    button.disabled = true;
    button.textContent = "Importing...";
    try {
      const rows = events.map((event, index) => ({
        ...event,
        customer: modal.querySelector(`[data-cal-customer="${index}"]`).value,
        title: modal.querySelector(`[data-cal-title="${index}"]`).value,
        date: modal.querySelector(`[data-cal-date="${index}"]`).value,
        time: modal.querySelector(`[data-cal-time="${index}"]`).value
      })).filter(event => event.date && event.title);
      await importEvents(rows, provider, modal);
    } catch (error) {
      button.disabled = false;
      button.textContent = `Import ${events.length} jobs`;
      showToast(`Calendar import failed: ${error.message}`, true);
    }
  };
}

function openFilePicker(provider) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".ics,text/calendar,text/plain";
  input.style.display = "none";
  document.body.appendChild(input);
  input.onchange = async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    try {
      const text = await file.text();
      const events = parseIcs(text);
      if (!events.length) throw new Error("No calendar events could be found in this file.");
      openPreview(provider, events);
    } catch (error) {
      showToast(`Could not read calendar file: ${error.message}`, true);
    }
  };
  input.click();
}

export function openCalendarImport(provider) {
  if (!PROVIDERS[provider]) return;
  openFilePicker(provider);
}
