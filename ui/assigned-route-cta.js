import { supabase } from "../supabase.js";

const POSTCODES = "https://api.postcodes.io/postcodes";
const OSRM = "https://router.project-osrm.org/table/v1/driving";
const MANAGEMENT_ROLES = ["owner", "admin"];
const pc = value => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

let normalUserPromise;
async function isNormalUser() {
  if (!normalUserPromise) {
    normalUserPromise = (async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return false;
      const { data: member, error } = await supabase.from("company_members").select("company_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
      if (error) throw error;
      return !!member && !MANAGEMENT_ROLES.includes(String(member.role || "").toLowerCase());
    })().catch(error => { console.error("JobPilot Stops role check:", error); return false; });
  }
  return normalUserPromise;
}

async function assignedJobs() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) throw new Error("You are not signed in.");
  const { data: member, error: memberError } = await supabase.from("company_members").select("company_id,role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (memberError) throw memberError;
  if (!member?.company_id) throw new Error("Your company could not be found.");
  const [{ data: jobs, error: je }, { data: customers, error: ce }] = await Promise.all([
    supabase.from("jobs").select("id,customer_id,title,scheduled_date,scheduled_time,status,notes,assigned_user_id").eq("company_id", member.company_id).eq("assigned_user_id", user.id).eq("scheduled_date", today()),
    supabase.from("customers").select("id,name,address_line1,address_line2,city,postcode").eq("company_id", member.company_id)
  ]);
  if (je) throw je;
  if (ce) throw ce;
  const map = new Map((customers || []).map(c => [String(c.id), c]));
  return (jobs || []).filter(j => String(j.status || "").toLowerCase() !== "cancelled").map(j => ({ ...j, customer: map.get(String(j.customer_id)) || null }));
}

async function orderJobs(jobs) {
  const candidates = jobs.map(j => ({ job:j, postcode:pc(j.customer?.postcode) })).filter(x => x.postcode);
  if (candidates.length < 2) return jobs;
  const geoResponse = await fetch(POSTCODES, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ postcodes:candidates.map(x=>x.postcode) }) });
  if (!geoResponse.ok) return jobs;
  const geoPayload = await geoResponse.json();
  const geo = new Map((geoPayload.result || []).filter(x => x?.result && x.query).map(x => [pc(x.query), {lat:Number(x.result.latitude),lon:Number(x.result.longitude)}]));
  const points = candidates.filter(x => geo.has(x.postcode));
  if (points.length < 2) return jobs;
  const coords = points.map(x => geo.get(x.postcode)).map(p => `${p.lon},${p.lat}`).join(";");
  const tableResponse = await fetch(`${OSRM}/${coords}?annotations=distance`);
  if (!tableResponse.ok) return jobs;
  const table = await tableResponse.json();
  if (!Array.isArray(table.distances)) return jobs;
  const remaining = new Set(points.map((_,i)=>i));
  const ordered = [];
  let current = [...remaining].sort((a,b)=>String(points[a].job.scheduled_time||"").localeCompare(String(points[b].job.scheduled_time||"")))[0];
  ordered.push(points[current].job);
  remaining.delete(current);
  while (remaining.size) {
    const next = [...remaining].sort((a,b)=>Number(table.distances[current]?.[a]??Infinity)-Number(table.distances[current]?.[b]??Infinity))[0];
    ordered.push(points[next].job);
    remaining.delete(next);
    current=next;
  }
  const seen = new Set(ordered.map(j=>j.id));
  return [...ordered, ...jobs.filter(j=>!seen.has(j.id))];
}

async function openRoutePlanner() {
  const page = document.getElementById("pageContent");
  if (!page) return;
  page.innerHTML = `<div class="page-actions"><div><h2>🧭 Today's Route</h2><p>Calculating the best route for your assigned jobs…</p></div><button class="button secondary" data-route-back-user>← Back</button></div><div class="panel"><p>Calculating route…</p></div>`;
  try {
    const jobs = await assignedJobs();
    if (!jobs.length) throw new Error("No active assigned jobs today.");
    const ordered = await orderJobs(jobs);
    const stops = ordered.map(j=>pc(j.customer?.postcode)).filter(Boolean);
    const mapUrl = stops.length ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(stops[0])}&destination=${encodeURIComponent(stops[stops.length-1])}&travelmode=driving${stops.length>2?`&waypoints=${encodeURIComponent(stops.slice(1,-1).join("|"))}`:""}` : "";
    page.innerHTML = `<div class="page-actions"><div><h2>🧭 Today's Route</h2><p>${esc(today())} · ${ordered.length} assigned job${ordered.length===1?"":"s"}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button secondary" data-route-back-user>← Back</button>${mapUrl?`<a class="button primary" href="${mapUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">🧭 Open in Maps</a>`:""}</div></div><div class="panel"><div class="panel-header"><div><h2>Recommended order</h2><p>Only jobs assigned to you are shown.</p></div></div>${ordered.map((j,i)=>`<div class="job-row" style="align-items:flex-start"><div style="display:flex;gap:12px"><div style="width:34px;height:34px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800">${i+1}</div><div><strong>${esc(j.customer?.name||j.title||"Job")}</strong><div class="muted" style="margin-top:4px">${esc(j.title||"Job")}${j.scheduled_time?` · ${esc(String(j.scheduled_time).slice(0,5))}`:""}</div><div class="muted" style="margin-top:4px">📍 ${esc([j.customer?.address_line1,j.customer?.address_line2,j.customer?.city,j.customer?.postcode].filter(Boolean).join(", ")||"No address")}</div></div></div></div>`).join("")}</div>`;
    page.querySelector("[data-route-back-user]")?.addEventListener("click", () => location.reload());
  } catch (error) {
    page.innerHTML = `<div class="page-actions"><div><h2>🧭 Today's Route</h2><p>We couldn't calculate the route.</p></div><button class="button secondary" data-route-back-user>← Back</button></div><div class="panel"><p class="muted">${esc(error.message||"Please try again.")}</p></div>`;
    page.querySelector("[data-route-back-user]")?.addEventListener("click", () => location.reload());
  }
}

async function addAssignedRouteCta() {
  if (!(await isNormalUser())) return;
  const page = document.getElementById("pageContent");
  if (!page || page.querySelector("[data-assigned-route-cta]")) return;
  const heading = [...page.querySelectorAll("h1,h2,h3")].find(el => String(el.textContent||"").toLowerCase().includes("today's jobs"));
  if (!heading) return;

  const stats = document.createElement("div");
  stats.className = "stats";
  stats.style.marginBottom = "20px";
  stats.innerHTML = `<div class="stat-card" data-assigned-route-cta style="cursor:pointer" role="button" tabindex="0" aria-label="Open route planner for your assigned jobs"><div class="stat-icon">📍</div><div><span>Stops</span><strong data-assigned-stop-count>…</strong></div></div>`;
  const panel = page.querySelector(".panel");
  if (panel) page.insertBefore(stats,panel); else page.appendChild(stats);

  const card = stats.querySelector("[data-assigned-route-cta]");
  const count = stats.querySelector("[data-assigned-stop-count]");
  card.addEventListener("click", () => void openRoutePlanner());
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openRoutePlanner(); } });
  try {
    const jobs = await assignedJobs();
    if (count && document.body.contains(count)) count.textContent = String(jobs.length);
  } catch (error) {
    console.error("JobPilot assigned Stops count:", error);
    if (count && document.body.contains(count)) count.textContent = "0";
  }
}

function start() {
  void addAssignedRouteCta();
  const page = document.getElementById("pageContent");
  if (!page || page.dataset.routeCtaObserver === "true") return;
  page.dataset.routeCtaObserver = "true";
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; void addAssignedRouteCta(); });
  }).observe(page,{childList:true,subtree:true});
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start); else start();
