import { supabase } from "../supabase.js";

// User isolation rules:
// - Owner/Admin keep the normal dashboard.
// - A normal User can only enter their assigned jobs view.
// - User dashboard must not expose financial/company-wide cards or navigation.
const MANAGEMENT_ROLES = ["owner", "admin"];
const BLOCKED_PAGES = new Set([
  "customers", "jobs", "quotes", "invoices", "management", "accounting",
  "connections", "settings", "company"
]);
const WIRED = "data-jobpilot-user-isolation-wired";
const POSTCODE_API = "https://api.postcodes.io/postcodes";
const OSRM_TABLE_API = "https://router.project-osrm.org/table/v1/driving";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function postcode(v) {
  return String(v || "").trim().replace(/\s+/g, " ").toUpperCase();
}

async function getCurrentMembership() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return { user: null, membership: null };

  const { data: membership, error } = await supabase
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return { user, membership };
}

async function isNormalUser() {
  try {
    const { membership } = await getCurrentMembership();
    return !!membership && !MANAGEMENT_ROLES.includes(String(membership.role || "").toLowerCase());
  } catch (error) {
    console.error("JobPilot user isolation role check:", error);
    return false;
  }
}

function findTodayJobsCard() {
  const cards = [...document.querySelectorAll(".stats .stat-card")];
  return cards.find(card => {
    const text = String(card.textContent || "").trim().toLowerCase();
    return text.includes("today's jobs") && !text.includes("today's job value");
  }) || cards.find(card => String(card.textContent || "").trim().toLowerCase().includes("your jobs today"));
}

function hidePanelContainingText(texts) {
  const wanted = texts.map(value => value.toLowerCase());
  document.querySelectorAll("#app *").forEach(element => {
    if (element.children.length > 0) return;
    const text = String(element.textContent || "").trim().toLowerCase();
    if (!wanted.includes(text)) return;
    const panel = element.closest(".stat-card,.card,.dashboard-card,.panel,section,article");
    if (panel) panel.style.display = "none";
    else element.style.display = "none";
  });
}

function hideUserNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(button => {
    const page = String(button.getAttribute("data-page") || "").toLowerCase();
    if (BLOCKED_PAGES.has(page)) button.style.display = "none";
  });
}

function blockNonUserNavigation(event) {
  const button = event.target.closest?.('.nav-item[data-page]');
  if (!button) return;
  const page = String(button.getAttribute("data-page") || "").toLowerCase();
  if (!BLOCKED_PAGES.has(page)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function bindBack(content) {
  content.querySelector("[data-route-back]")?.addEventListener("click", () => {
    document.querySelector('.nav-item[data-page="dashboard"]')?.click();
  });
}

async function geocode(postcodes) {
  const unique = [...new Set(postcodes.map(postcode).filter(Boolean))];
  if (!unique.length) return new Map();
  const response = await fetch(POSTCODE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcodes: unique })
  });
  if (!response.ok) throw new Error("The postcode service could not be reached.");
  const payload = await response.json();
  const result = new Map();
  for (const item of payload.result || []) {
    if (item?.result && item.query) {
      result.set(postcode(item.query), {
        lat: Number(item.result.latitude),
        lon: Number(item.result.longitude)
      });
    }
  }
  return result;
}

async function routeOrder(jobs) {
  if (jobs.length < 2) return jobs;
  const routable = jobs.map((job, index) => ({ job, index, pc: postcode(job.customer?.postcode) })).filter(item => item.pc);
  if (routable.length < 2) return jobs;
  const map = await geocode(routable.map(item => item.pc));
  const points = routable.filter(item => map.has(item.pc));
  if (points.length < 2) return jobs;

  const coordinates = points.map(item => map.get(item.pc)).map(point => `${point.lon},${point.lat}`).join(";");
  const response = await fetch(`${OSRM_TABLE_API}/${coordinates}?annotations=distance`);
  if (!response.ok) return jobs;
  const matrix = await response.json();

  const remaining = new Set(points.map((_, index) => index));
  const ordered = [];
  let current = [...remaining].sort((a, b) => String(points[a].job.scheduled_time || "").localeCompare(String(points[b].job.scheduled_time || "")))[0];
  ordered.push(points[current].job);
  remaining.delete(current);

  while (remaining.size) {
    const next = [...remaining].sort((a, b) =>
      Number(matrix.distances?.[current]?.[a] ?? Infinity) - Number(matrix.distances?.[current]?.[b] ?? Infinity)
    )[0];
    ordered.push(points[next].job);
    remaining.delete(next);
    current = next;
  }

  const seen = new Set(ordered.map(job => job.id));
  return [...ordered, ...jobs.filter(job => !seen.has(job.id))];
}

async function openAssignedTodayJobs() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  content.innerHTML = `
    <div class="page-actions">
      <div><h2>🚐 Today's Jobs</h2><p>Loading your assigned jobs…</p></div>
    </div>
    <div class="panel"><p>Loading today's work…</p></div>`;

  try {
    const { user, membership } = await getCurrentMembership();
    if (!user) throw new Error("You are not signed in.");
    if (!membership?.company_id) throw new Error("Your company could not be found.");

    const date = today();
    const [{ data: jobs, error: jobsError }, { data: customers, error: customersError }] = await Promise.all([
      supabase
        .from("jobs")
        .select("id,customer_id,title,scheduled_date,scheduled_time,status,notes,assigned_user_id")
        .eq("company_id", membership.company_id)
        .eq("scheduled_date", date)
        .eq("assigned_user_id", user.id),
      supabase
        .from("customers")
        .select("id,name,address_line1,address_line2,city,postcode")
        .eq("company_id", membership.company_id)
    ]);

    if (jobsError) throw jobsError;
    if (customersError) throw customersError;

    const customerMap = new Map((customers || []).map(customer => [String(customer.id), customer]));
    let active = (jobs || [])
      .filter(job => String(job.status || "").toLowerCase() !== "cancelled")
      .map(job => ({ ...job, customer: customerMap.get(String(job.customer_id)) || null }));

    if (!active.length) {
      content.innerHTML = `
        <div class="page-actions"><div><h2>🚐 Today's Jobs</h2><p>No active jobs are assigned to you today.</p></div></div>
        <div class="panel"><button class="button secondary" data-route-back>← Dashboard</button></div>`;
      bindBack(content);
      return;
    }

    active = await routeOrder(active);

    content.innerHTML = `
      <div class="page-actions">
        <div><h2>🚐 Today's Jobs</h2><p>${esc(date)} · ${active.length} assigned job${active.length === 1 ? "" : "s"}</p></div>
        <button class="button secondary" data-route-back>← Dashboard</button>
      </div>
      <div class="stats" style="margin-bottom:20px">
        <div class="stat-card"><div class="stat-icon">📍</div><div><span>Stops</span><strong>${active.length}</strong></div></div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>Your jobs today</h2><p>Only jobs assigned to you are shown here.</p></div></div>
        ${active.map((job, index) => {
          const customer = job.customer;
          const address = [customer?.address_line1, customer?.address_line2, customer?.city, customer?.postcode].filter(Boolean).join(", ");
          const navigate = customer?.postcode
            ? `<a class="button secondary" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.postcode)}&travelmode=driving" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Navigate</a>`
            : "";
          return `<div class="job-row" style="align-items:flex-start">
            <div style="display:flex;gap:12px;min-width:0">
              <div style="width:34px;height:34px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">${index + 1}</div>
              <div>
                <strong>${esc(customer?.name || job.title || "Job")}</strong>
                <div class="muted" style="margin-top:4px">${esc(job.title || "Job")}${job.scheduled_time ? ` · ${esc(String(job.scheduled_time).slice(0, 5))}` : ""}</div>
                <div class="muted" style="margin-top:4px">📍 ${esc(address || "No address")}</div>
                ${job.notes ? `<div class="muted" style="margin-top:4px">📝 ${esc(job.notes)}</div>` : ""}
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">${navigate}</div>
          </div>`;
        }).join("")}
      </div>`;

    bindBack(content);
  } catch (error) {
    console.error("JobPilot assigned jobs:", error);
    content.innerHTML = `
      <div class="page-actions"><div><h2>🚐 Today's Jobs</h2><p>We couldn't load your assigned jobs.</p></div></div>
      <div class="panel"><p class="muted">${esc(error.message || "Please try again.")}</p><button class="button secondary" data-route-back>← Dashboard</button></div>`;
    bindBack(content);
  }
}

function interceptTodayJobs(event) {
  if (!event.target?.closest) return;
  const card = event.target.closest(".stats .stat-card");
  if (!card) return;
  const text = String(card.textContent || "").trim().toLowerCase();
  if (!(text.includes("today's jobs") || text.includes("your jobs today"))) return;
  if (text.includes("job value")) return;
  if (!window.__jobPilotNormalUser) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openAssignedTodayJobs();
}

function applyUserIsolation() {
  if (!window.__jobPilotNormalUser) return;
  hideUserNavigation();
  hidePanelContainingText(["Today's Job Value", "Job Value"]);

  const card = findTodayJobsCard();
  if (card) {
    card.style.cursor = "pointer";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Open your assigned jobs today");
    card.title = "Open your assigned jobs today";
  }
}

async function initialise() {
  try {
    window.__jobPilotNormalUser = await isNormalUser();
    if (!window.__jobPilotNormalUser) return;

    if (!window.__jobPilotUserIsolationBound) {
      window.__jobPilotUserIsolationBound = true;
      document.addEventListener("click", blockNonUserNavigation, true);
      document.addEventListener("click", interceptTodayJobs, true);
      document.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const card = event.target?.closest?.(".stats .stat-card");
        if (!card) return;
        const text = String(card.textContent || "").trim().toLowerCase();
        if (!(text.includes("today's jobs") || text.includes("your jobs today")) || text.includes("job value")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openAssignedTodayJobs();
      }, true);
    }

    applyUserIsolation();
  } catch (error) {
    console.error("JobPilot user isolation:", error);
  }
}

const observer = new MutationObserver(() => applyUserIsolation());
observer.observe(document.body, { childList: true, subtree: true });
initialise();
