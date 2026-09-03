import { supabase } from "../supabase.js";

const WIRED = "data-jobpilot-assigned-route-wired";
const POSTCODE_API = "https://api.postcodes.io/postcodes";
const OSRM_TABLE_API = "https://router.project-osrm.org/table/v1/driving";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function esc(v) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
function postcode(v) { return String(v || "").trim().replace(/\s+/g," ").toUpperCase(); }
async function geo(postcodes) {
  const unique = [...new Set(postcodes.map(postcode).filter(Boolean))];
  if (!unique.length) return new Map();
  const r = await fetch(POSTCODE_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({postcodes:unique})});
  if (!r.ok) throw new Error("The postcode service could not be reached.");
  const p = await r.json(); const out = new Map();
  for (const x of p.result || []) if (x?.result && x.query) out.set(postcode(x.query),{lat:Number(x.result.latitude),lon:Number(x.result.longitude)});
  return out;
}
async function routeOrder(jobs) {
  if (jobs.length < 2) return jobs;
  const routable = jobs.map((job,i)=>({job,i,pc:postcode(job.customer?.postcode)})).filter(x=>x.pc);
  if (routable.length < 2) return jobs;
  const map = await geo(routable.map(x=>x.pc));
  const points = routable.filter(x=>map.has(x.pc));
  if (points.length < 2) return jobs;
  const coords = points.map(x=>map.get(x.pc)).map(p=>`${p.lon},${p.lat}`).join(";");
  const r = await fetch(`${OSRM_TABLE_API}/${coords}?annotations=distance`);
  if (!r.ok) return jobs;
  const data = await r.json();
  const remaining = new Set(points.map((_,i)=>i));
  const ordered=[];
  let current = [...remaining].sort((a,b)=>String(points[a].job.scheduled_time||"").localeCompare(String(points[b].job.scheduled_time||"")))[0];
  ordered.push(points[current].job); remaining.delete(current);
  while (remaining.size) {
    const next=[...remaining].sort((a,b)=>Number(data.distances?.[current]?.[a]??Infinity)-Number(data.distances?.[current]?.[b]??Infinity))[0];
    ordered.push(points[next].job); remaining.delete(next); current=next;
  }
  const seen=new Set(ordered.map(j=>j.id));
  return [...ordered,...jobs.filter(j=>!seen.has(j.id))];
}

async function openAssignedRoute(event) {
  const card = event.target.closest(".stats .stat-card");
  if (!card) return;
  const cards = document.querySelectorAll(".stats .stat-card");
  if (cards[4] !== card) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const content=document.getElementById("pageContent"); if (!content) return;
  content.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Route</h2><p>Loading your assigned jobs…</p></div></div><div class="panel"><p>Loading today's work…</p></div>`;
  try {
    const {data:{user}={}}=await supabase.auth.getUser(); if(!user) throw new Error("You are not signed in.");
    const {data:membership,error:memberError}=await supabase.from("company_members").select("company_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();
    if(memberError||!membership?.company_id) throw memberError||new Error("Your company could not be found.");
    const date=today();
    const [{data:jobs,error:jobsError},{data:customers,error:customersError}]=await Promise.all([
      supabase.from("jobs").select("id,customer_id,title,scheduled_date,scheduled_time,status,price,notes,assigned_user_id").eq("company_id",membership.company_id).eq("scheduled_date",date).or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`),
      supabase.from("customers").select("id,name,address_line1,address_line2,city,postcode").eq("company_id",membership.company_id)
    ]);
    if(jobsError) throw jobsError; if(customersError) throw customersError;
    const customerMap=new Map((customers||[]).map(c=>[String(c.id),c]));
    let active=(jobs||[]).filter(j=>String(j.status||"").toLowerCase()!=="cancelled").map(j=>({...j,customer:customerMap.get(String(j.customer_id))||null}));
    if(!active.length){content.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Route</h2><p>No active jobs are assigned to you today.</p></div></div><div class="panel"><button class="button secondary" data-route-back>← Dashboard</button></div>`; bindBack(content); return;}
    active=await routeOrder(active);
    const total=active.reduce((s,j)=>s+Number(j.price||0),0);
    content.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Route</h2><p>${esc(date)} · ${active.length} job${active.length===1?"":"s"}</p></div><button class="button secondary" data-route-back>← Dashboard</button></div><div class="stats" style="margin-bottom:20px"><div class="stat-card"><div class="stat-icon">📍</div><div><span>Stops</span><strong>${active.length}</strong></div></div><div class="stat-card"><div class="stat-icon">💷</div><div><span>Job value</span><strong>£${total.toFixed(2)}</strong></div></div></div><div class="panel"><div class="panel-header"><div><h2>Your jobs today</h2><p>Jobs created by you or assigned to you.</p></div></div>${active.map((j,i)=>{const c=j.customer;const address=[c?.address_line1,c?.address_line2,c?.city,c?.postcode].filter(Boolean).join(", ");return `<div class="job-row" style="align-items:flex-start"><div style="display:flex;gap:12px;min-width:0"><div style="width:34px;height:34px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">${i+1}</div><div><strong>${esc(c?.name||j.title||"Job")}</strong><div class="muted" style="margin-top:4px">${esc(j.title||"Job")}${j.scheduled_time?` · ${esc(String(j.scheduled_time).slice(0,5))}`:""}</div><div class="muted" style="margin-top:4px">📍 ${esc(address||"No address")}</div></div></div><div style="display:flex;gap:8px;align-items:center;flex-shrink:0"><strong>£${Number(j.price||0).toFixed(2)}</strong>${c?.postcode?`<a class="button secondary" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.postcode)}&travelmode=driving" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Navigate</a>`:""}</div></div>`}).join("")}</div>`;
    bindBack(content);
  } catch(error) {
    console.error("Assigned route:",error);
    content.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Route</h2><p>We couldn't load your assigned jobs.</p></div></div><div class="panel"><p class="muted">${esc(error.message||"Please try again.")}</p><button class="button secondary" data-route-back>← Back to Dashboard</button></div>`; bindBack(content);
  }
}
function bindBack(content){content.querySelector("[data-route-back]")?.addEventListener("click",()=>document.querySelector('.nav-item[data-page="dashboard"]')?.click());}
function wire(){const card=[...document.querySelectorAll(".stats .stat-card")][4];if(!card||card.getAttribute(WIRED))return;card.setAttribute(WIRED,"true");document.addEventListener("click",openAssignedRoute,true);}
const observer=new MutationObserver(wire); observer.observe(document.body,{childList:true,subtree:true}); wire();