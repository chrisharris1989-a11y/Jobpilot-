import { supabase } from "./supabase.js";

(() => {
  const BUSINESS_PLANS = new Set(["business", "pro"]);
  const TEAM_PLANS = new Set(["team", "business", "pro"]);
  const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const state = { company:null, plan:"solo", members:[], jobs:[], customers:[] };

  function hasAccess(){ return TEAM_PLANS.has(state.plan); }
  function styles(){
    if(document.getElementById("jp-workload-styles")) return;
    const s=document.createElement("style"); s.id="jp-workload-styles"; s.textContent=`
      .jp-workload{display:flex;flex-direction:column;gap:18px}.jp-workload-card{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:20px;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04))}.jp-workload-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.jp-workload-stat{padding:14px;border:1px solid #edf0f3;border-radius:10px}.jp-workload-stat strong{display:block;font-size:24px;margin-top:3px}.jp-workload-list{display:flex;flex-direction:column;gap:10px}.jp-workload-row{display:grid;grid-template-columns:minmax(150px,1fr) 80px 100px minmax(160px,2fr);gap:12px;align-items:center;padding:12px;border:1px solid #edf0f3;border-radius:10px}.jp-workload-bar{height:9px;background:#eef2f7;border-radius:999px;overflow:hidden}.jp-workload-bar span{display:block;height:100%;background:#111827;border-radius:999px}.jp-workload-muted{color:#64748b;font-size:13px}.jp-workload-actions{display:flex;gap:8px;flex-wrap:wrap}.jp-workload-locked{text-align:center;padding:34px 20px}.jp-workload-locked h3{margin:0 0 8px}@media(max-width:760px){.jp-workload-grid{grid-template-columns:1fr 1fr}.jp-workload-row{grid-template-columns:1fr 70px}.jp-workload-row .jp-workload-bar{grid-column:1/-1}}
    `; document.head.appendChild(s);
  }

  async function load(){
    const {data:{user}={}}=await supabase.auth.getUser(); if(!user) throw new Error("Please sign in.");
    let company=window.JobPilotCompany?.company||null;
    if(!company){ const r=await supabase.from("companies").select("id,name,plan").eq("owner_id",user.id).maybeSingle(); if(r.error)throw r.error; company=r.data; }
    state.company=company; state.plan=String(company?.plan||"solo").toLowerCase();
    if(!hasAccess()) return;
    const [{data:members,error:me},{data:jobs,error:je},{data:customers,error:ce}]=await Promise.all([
      supabase.rpc("list_my_assignable_users"),
      supabase.from("jobs").select("id,title,scheduled_date,scheduled_time,status,assigned_user_id,customer_id").eq("company_id",company.id).order("scheduled_date",{ascending:true,nullsFirst:false}),
      supabase.from("customers").select("id,name").eq("company_id",company.id)
    ]);
    if(me)throw me;if(je)throw je;if(ce)throw ce;
    state.members=Array.isArray(members)?members:[]; state.jobs=jobs||[]; state.customers=customers||[];
  }

  function memberName(id){const m=state.members.find(x=>String(x.user_id)===String(id));return m?.full_name||m?.name||m?.email||"Unassigned";}
  function customerName(id){return state.customers.find(x=>String(x.id)===String(id))?.name||"Customer";}
  function open(){ renderShell(); load().then(render).catch(e=>{const c=document.getElementById("pageContent");if(c)c.innerHTML=`<div class="jp-workload-card"><strong>Could not load Team Workload.</strong><p class="jp-workload-muted">${esc(e.message||e)}</p></div>`;}); }
  function renderShell(){const c=document.getElementById("pageContent");if(!c)return;styles();document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));document.getElementById("jobpilot-tools-button")?.classList.add("active");document.getElementById("pageTitle").textContent="Team Workload";document.getElementById("pageSubtitle").textContent="See how your team's jobs are distributed.";c.innerHTML="<div class=\"jp-workload\"><div class=\"jp-workload-card\"><p class=\"jp-workload-muted\">Loading Team Workload…</p></div></div>";}
  function render(){
    const c=document.getElementById("pageContent");if(!c)return;
    if(!hasAccess()){c.innerHTML=`<div class="jp-workload"><div class="jp-workload-card jp-workload-locked"><h3>Team Workload</h3><p class="jp-workload-muted">See how jobs are distributed across your team with Business and Pro.</p><button class="button primary" id="jp-workload-plans" type="button">View plans</button></div></div>`;document.getElementById("jp-workload-plans")?.addEventListener("click",()=>window.JobPilotBusinessOverview?.open?.());return;}
    const today=new Date().toISOString().slice(0,10); const active=state.jobs.filter(j=>String(j.status||"").toLowerCase()!=="cancelled");
    const counts=new Map(state.members.map(m=>[String(m.user_id),0])); counts.set("",0); active.forEach(j=>counts.set(String(j.assigned_user_id||""),(counts.get(String(j.assigned_user_id||""))||0)+1));
    const max=Math.max(1,...counts.values()); const unassigned=counts.get("")||0; const todayJobs=active.filter(j=>j.scheduled_date===today).length;
    const rows=[...state.members.map(m=>({id:String(m.user_id),name:memberName(m.user_id),count:counts.get(String(m.user_id))||0})),...(unassigned?[{id:"",name:"Unassigned",count:unassigned}]:[])].sort((a,b)=>b.count-a.count);
    c.innerHTML=`<div class="jp-workload"><div class="page-actions"><div><h2>Team Workload</h2><p>See assigned jobs and workload across your team.</p></div><div class="jp-workload-actions"><button class="button secondary" id="jp-workload-back" type="button">← Job Planner</button></div></div><div class="jp-workload-grid"><div class="jp-workload-stat"><span class="jp-workload-muted">Active jobs</span><strong>${active.length}</strong></div><div class="jp-workload-stat"><span class="jp-workload-muted">Today's jobs</span><strong>${todayJobs}</strong></div><div class="jp-workload-stat"><span class="jp-workload-muted">Unassigned</span><strong>${unassigned}</strong></div></div><div class="jp-workload-card"><h3>Team workload</h3><p class="jp-workload-muted">Based on current active jobs in JobPilot.</p><div class="jp-workload-list">${rows.length?rows.map(r=>`<div class="jp-workload-row"><div><strong>${esc(r.name)}</strong><div class="jp-workload-muted">${r.count} active job${r.count===1?"":"s"}</div></div><strong>${r.count}</strong><div class="jp-workload-muted">${Math.round((r.count/max)*100)}%</div><div class="jp-workload-bar"><span style="width:${Math.max(3,Math.round((r.count/max)*100))}%"></span></div></div>`).join(""):"<div class=\"jp-workload-muted\">No team members found.</div>"}</div></div></div>`;
    document.getElementById("jp-workload-back")?.addEventListener("click",()=>window.JobPilotJobPlanner?.open?.());
  }

  // Add a small tab to the existing Job Planner without changing its layout.
  const observer=new MutationObserver(()=>{
    const title=(document.getElementById("pageTitle")?.textContent||"").trim();
    if(title!=="Job Planner")return;
    const actions=document.querySelector(".jp-planner .page-actions");
    if(!actions||document.getElementById("jp-open-team-workload"))return;
    const b=document.createElement("button");b.id="jp-open-team-workload";b.className="button secondary";b.type="button";b.textContent="Team Workload";b.addEventListener("click",open);actions.appendChild(b);
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.JobPilotTeamWorkload={open};
})();
