import { supabase } from "../supabase.js";

const ROLES = ["owner", "admin"];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");

async function context() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership, error } = await supabase.from("company_members").select("company_id,role").eq("user_id", user.id).eq("status","active").limit(1).maybeSingle();
  if (error) throw error;
  return { user, membership };
}

async function assignedToday() {
  const ctx = await context();
  if (!ctx?.membership?.company_id) throw new Error("Your company could not be found.");
  const [{ data: jobs, error: je }, { data: customers, error: ce }] = await Promise.all([
    supabase.from("jobs").select("id,customer_id,title,scheduled_date,scheduled_time,status,notes,assigned_user_id").eq("company_id",ctx.membership.company_id).eq("assigned_user_id",ctx.user.id).eq("scheduled_date",today()),
    supabase.from("customers").select("id,name,address_line1,address_line2,city,postcode,phone,email").eq("company_id",ctx.membership.company_id)
  ]);
  if (je) throw je; if (ce) throw ce;
  const map = new Map((customers||[]).map(c=>[String(c.id),c]));
  return (jobs||[]).filter(j=>String(j.status||"").toLowerCase()!=="cancelled").map(j=>({...j,customer:map.get(String(j.customer_id))||null}));
}

function renderJob(job) {
  const c=job.customer; const address=[c?.address_line1,c?.address_line2,c?.city,c?.postcode].filter(Boolean).join(", ");
  return `<div class="job-row" data-mgmt-today-job="${esc(job.id)}" tabindex="0" role="button" style="align-items:flex-start;cursor:pointer"><div style="display:flex;gap:12px;min-width:0"><div style="width:34px;height:34px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">${esc(job._index+1)}</div><div><strong>${esc(c?.name||job.title||"Job")}</strong><div class="muted" style="margin-top:4px">${esc(job.title||"Job")}${job.scheduled_time?` · ${esc(String(job.scheduled_time).slice(0,5))}`:""}</div><div class="muted" style="margin-top:4px">📍 ${esc(address||"No address")}</div>${job.notes?`<div class="muted" style="margin-top:4px">📝 ${esc(job.notes)}`:""}</div></div><div><span class="button secondary" style="pointer-events:none">View job</span></div></div>`;
}

async function openToday() {
  const page=document.getElementById("pageContent"); if(!page)return;
  page.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Jobs</h2><p>Loading your assigned jobs…</p></div></div><div class="panel"><p>Loading today's work…</p></div>`;
  try {
    const jobs=(await assignedToday()).map((j,i)=>({...j,_index:i}));
    if(!jobs.length){ page.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Jobs</h2><p>No active jobs are assigned to you today.</p></div><button class="button secondary" data-mgmt-back>← Dashboard</button></div>`; page.querySelector("[data-mgmt-back]")?.addEventListener("click",()=>document.querySelector('.nav-item[data-page="dashboard"]')?.click()); return; }
    page.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Jobs</h2><p>${today()} · ${jobs.length} assigned job${jobs.length===1?"":"s"}</p></div><button class="button secondary" data-mgmt-back>← Dashboard</button></div><div class="stats" style="margin-bottom:20px"><div class="stat-card" data-mgmt-stops style="cursor:pointer" role="button" tabindex="0"><div class="stat-icon">📍</div><div><span>Stops</span><strong>${jobs.length}</strong></div></div></div><div class="panel"><div class="panel-header"><div><h2>Your jobs today</h2><p>Click a job to open its job card.</p></div></div>${jobs.map(renderJob).join("")}</div>`;
    page.querySelector("[data-mgmt-back]")?.addEventListener("click",()=>document.querySelector('.nav-item[data-page="dashboard"]')?.click());
    page.querySelector("[data-mgmt-stops]")?.addEventListener("click",()=>openStops(jobs));
    page.querySelectorAll("[data-mgmt-today-job]").forEach(row=>row.addEventListener("click",()=>{ const job=jobs.find(j=>String(j.id)===String(row.dataset.mgmtTodayJob)); if(job) openJob(job); }));
  } catch(e) { console.error("Management Today's Jobs:",e); page.innerHTML=`<div class="page-actions"><div><h2>🚐 Today's Jobs</h2><p>We couldn't load your assigned jobs.</p></div></div><div class="panel"><p class="muted">${esc(e.message||"Please try again.")}</p></div>`; }
}

function openJob(job){ const page=document.getElementById("pageContent"); if(!page)return; const c=job.customer; const address=[c?.address_line1,c?.address_line2,c?.city,c?.postcode].filter(Boolean).join(", "); page.innerHTML=`<div class="page-actions"><div><h2>📋 Job</h2><p>Your assigned job</p></div><button class="button secondary" data-mgmt-back>← Back to today's jobs</button></div><div class="panel" style="max-width:760px"><div class="panel-header"><div><h2>${esc(c?.name||job.title||"Job")}</h2><p>${esc(job.title||"Job")}${job.scheduled_time?` · ${esc(String(job.scheduled_time).slice(0,5))}`:""}</p></div></div><div style="display:grid;gap:12px"><div><strong>Date</strong><div class="muted">${esc(job.scheduled_date||"")}</div></div><div><strong>Address</strong><div class="muted">${esc(address||"No address")}</div></div>${c?.phone?`<div><strong>Phone</strong><div class="muted">${esc(c.phone)}</div></div>`:""}${c?.email?`<div><strong>Email</strong><div class="muted">${esc(c.email)}</div></div>`:""}${job.notes?`<div><strong>Job notes</strong><div class="muted">${esc(job.notes)}</div></div>`:""}</div></div>`; page.querySelector("[data-mgmt-back]")?.addEventListener("click",()=>openToday()); }

function openStops(jobs){ const postcodes=jobs.map(j=>j.customer?.postcode).filter(Boolean); const url=postcodes.length?`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(postcodes[0])}&destination=${encodeURIComponent(postcodes[postcodes.length-1])}&travelmode=driving${postcodes.length>2?`&waypoints=${encodeURIComponent(postcodes.slice(1,-1).join("|"))}`:""}`:""; const page=document.getElementById("pageContent"); if(!page)return; page.innerHTML=`<div class="page-actions"><div><h2>🧭 Today's Route</h2><p>${today()} · ${jobs.length} assigned job${jobs.length===1?"":"s"}</p></div><div style="display:flex;gap:8px"><button class="button secondary" data-mgmt-route-back>← Back</button>${url?`<a class="button primary" href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">🧭 Open in Maps</a>`:""}</div></div><div class="panel"><div class="panel-header"><div><h2>Recommended order</h2><p>Only jobs assigned to you are shown.</p></div></div>${jobs.map((j,i)=>`<div class="job-row"><div><strong>${esc(j.customer?.name||j.title||"Job")}</strong><div class="muted">${esc(j.title||"Job")}${j.scheduled_time?` · ${esc(String(j.scheduled_time).slice(0,5))}`:""}</div><div class="muted">📍 ${esc([j.customer?.address_line1,j.customer?.address_line2,j.customer?.city,j.customer?.postcode].filter(Boolean).join(", ")||"No address")}</div></div><strong>${i+1}</strong></div>`).join("")}</div>`; page.querySelector("[data-mgmt-route-back]")?.addEventListener("click",()=>openToday()); }

async function init(){ try { const c=await context(); if(!c?.membership || !ROLES.includes(String(c.membership.role||"").toLowerCase())) return; if(window.__mgmtTodayJobsFixBound)return; window.__mgmtTodayJobsFixBound=true; document.addEventListener("click",e=>{ const card=e.target?.closest?.(".stats .stat-card"); if(!card)return; const text=String(card.textContent||"").toLowerCase(); if(!text.includes("today's jobs")||text.includes("job value"))return; e.preventDefault(); e.stopImmediatePropagation(); void openToday(); },true); } catch(e){ console.error("Management Today's Jobs fix:",e); } }
init();
