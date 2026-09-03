import { supabase } from "../supabase.js";

const POSTCODE_API = "https://api.postcodes.io/postcodes";
const OSRM_TABLE_API = "https://router.project-osrm.org/table/v1/driving";

const normalisePostcode = value => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");

async function getAssignedJobs() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error("You are not signed in.");
  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.company_id) throw new Error("Your company could not be found.");

  const [{ data: jobs, error: jobsError }, { data: customers, error: customersError }] = await Promise.all([
    supabase.from("jobs").select("id,customer_id,title,scheduled_date,scheduled_time,status,notes,assigned_user_id")
      .eq("company_id", membership.company_id).eq("assigned_user_id", user.id).eq("scheduled_date", today()),
    supabase.from("customers").select("id,name,address_line1,address_line2,city,postcode")
      .eq("company_id", membership.company_id)
  ]);
  if (jobsError) throw jobsError;
  if (customersError) throw customersError;
  const customerMap = new Map((customers || []).map(c => [String(c.id), c]));
  return (jobs || []).filter(j => String(j.status || "").toLowerCase() !== "cancelled")
    .map(j => ({ ...j, customer: customerMap.get(String(j.customer_id)) || null }));
}

async function optimise(jobs) {
  if (jobs.length < 2) return jobs;
  const routable = jobs.map((job, index) => ({ job, index, pc: normalisePostcode(job.customer?.postcode) })).filter(x => x.pc);
  if (routable.length < 2) return jobs;
  const response = await fetch(POSTCODE_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postcodes: routable.map(x => x.pc) }) });
  if (!response.ok) return jobs;
  const payload = await response.json();
  const geo = new Map((payload.result || []).filter(x => x?.result && x.query).map(x => [normalisePostcode(x.query), { lat: Number(x.result.latitude), lon: Number(x.result.longitude) }]));
  const points = routable.filter(x => geo.has(x.pc));
  if (points.length < 2) return jobs;
  const coords = points.map(x => geo.get(x.pc)).map(p => `${p.lon},${p.lat}`).join(";");
  const matrixResponse = await fetch(`${OSRM_TABLE_API}/${coords}?annotations=distance`);
  if (!matrixResponse.ok) return jobs;
  const matrix = await matrixResponse.json();
  if (!Array.isArray(matrix.distances)) return jobs;
  const remaining = new Set(points.map((_, i) => i));
  const ordered = [];
  let current = [...remaining].sort((a, b) => String(points[a].job.scheduled_time || "").localeCompare(String(points[b].job.scheduled_time || "")))[0];
  ordered.push(points[current].job);
  remaining.delete(current);
  while (remaining.size) {
    const next = [...remaining].sort((a, b) => Number(matrix.distances[current]?.[a] ?? Infinity) - Number(matrix.distances[current]?.[b] ?? Infinity))[0];
    ordered.push(points[next].job);
    remaining.delete(next);
    current = next;
  }
  const seen = new Set(ordered.map(j => j.id));
  return [...ordered, ...jobs.filter(j => !seen.has(j.id))];
}

async function openAssignedRoute() {
  const page = document.getElementById("pageContent");
  if (!page) return;
  page.innerHTML = `<div class="page-actions"><div><h2>🧭 Today's Route</h2><p>Calculating the best route for your assigned jobs…</p></div><button class="button secondary" data-stops-back>← Back</button></div><div class="panel"><p>Calculating route…</p></div>`;
  try {
    const jobs = await getAssignedJobs();
    if (!jobs.length) throw new Error("No active assigned jobs today.");
    const ordered = await optimise(jobs);
    const postcodes = ordered.map(j => normalisePostcode(j.customer?.postcode)).filter(Boolean);
    const mapUrl = postcodes.length ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(postcodes[0])}&destination=${encodeURIComponent(postcodes[postcodes.length - 1])}&travelmode=driving${postcodes.length > 2 ? `&waypoints=${encodeURIComponent(postcodes.slice(1, -1).join("|"))}` : ""}` : "";
    page.innerHTML = `<div class="page-actions"><div><h2>🧭 Today's Route</h2><p>${esc(today())} · ${ordered.length} assigned job${ordered.length === 1 ? "" : "s"}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button secondary" data-stops-back>← Back</button>${mapUrl ? `<a class="button primary" href="${mapUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">🧭 Open in Maps</a>` : ""}</div></div><div class="panel"><div class="panel-header"><div><h2>Recommended order</h2><p>Only jobs assigned to you are shown.</p></div></div>${ordered.map((job, i) => `<div class="job-row" style="align-items:flex-start"><div style="display:flex;gap:12px"><div style="width:34px;height:34px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800">${i + 1}</div><div><strong>${esc(job.customer?.name || job.title || "Job")}</strong><div class="muted" style="margin-top:4px">${esc(job.title || "Job")}${job.scheduled_time ? ` · ${esc(String(job.scheduled_time).slice(0,5))}` : ""}</div><div class="muted" style="margin-top:4px">📍 ${esc([job.customer?.address_line1, job.customer?.address_line2, job.customer?.city, job.customer?.postcode].filter(Boolean).join(", ") || "No address")}</div></div></div></div>`).join("")}</div>`;
    page.querySelector("[data-stops-back]")?.addEventListener("click", () => location.reload());
  } catch (error) {
    page.innerHTML = `<div class="page-actions"><div><h2>🧭 Today's Route</h2><p>We couldn't calculate the route.</p></div><button class="button secondary" data-stops-back>← Back</button></div><div class="panel"><p class="muted">${esc(error.message || "Please try again.")}</p></div>`;
    page.querySelector("[data-stops-back]")?.addEventListener("click", () => location.reload());
  }
}

// The dashboard's Today’s Jobs card normally opens route-planner.js. Intercept
// it synchronously and use the assigned-job route instead. That route filters
// jobs by assigned_user_id, which is the actual assignment field in JobPilot.
document.addEventListener("click", event => {
  const card = event.target?.closest?.(".stats .stat-card");
  if (!card) return;
  const cards = [...document.querySelectorAll(".stats .stat-card")];
  if (cards.indexOf(card) !== 4) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  void openAssignedRoute();
}, true);

function ensureAssignedStopsCard() {
  if (!window.__jobPilotNormalUser) return;
  const page = document.getElementById("pageContent");
  if (!page) return;
  const heading = String(page.querySelector("h2")?.textContent || "").toLowerCase();
  if (!heading.includes("today's jobs")) return;
  if (page.querySelector("[data-open-assigned-route], [data-forced-assigned-route]")) return;
  const rows = [...page.querySelectorAll("[data-assigned-job-id]")];
  if (!rows.length) return;
  const card = document.createElement("div");
  card.className = "stats";
  card.style.marginBottom = "20px";
  card.innerHTML = `<div class="stat-card" data-forced-assigned-route style="cursor:pointer" role="button" tabindex="0" aria-label="Open route planner for your assigned jobs"><div class="stat-icon">📍</div><div><span>Stops</span><strong>${rows.length}</strong></div></div>`;
  const jobsPanel = rows[0].closest(".panel");
  if (jobsPanel) page.insertBefore(card, jobsPanel); else page.appendChild(card);
  const target = card.querySelector("[data-forced-assigned-route]");
  const open = () => void openAssignedRoute();
  target.addEventListener("click", open);
  target.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
}

const observer = new MutationObserver(() => ensureAssignedStopsCard());
function start() {
  const page = document.getElementById("pageContent");
  if (!page) return;
  observer.observe(page, { childList: true, subtree: true });
  ensureAssignedStopsCard();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
