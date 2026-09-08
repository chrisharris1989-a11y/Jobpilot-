import { supabase } from "./supabase.js";

(() => {
  const state = { plan: "solo", company: null, jobs: [], customers: [], members: [], plans: [], planner: null, tasks: [] };
  const PLAN_ORDER = ["solo", "team", "business", "pro"];
  const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const planRank = p => Math.max(0, PLAN_ORDER.indexOf(String(p || "solo").toLowerCase()));
  const hasPlan = p => planRank(state.plan) >= planRank(p);
  const today = () => new Date().toISOString().slice(0,10);
  const addDays = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+Number(days||0)); return d.toISOString().slice(0,10); };

  function styles() {
    if (document.getElementById("jobpilot-job-planner-styles")) return;
    const s = document.createElement("style"); s.id = "jobpilot-job-planner-styles";
    s.textContent = `
      .jp-planner{display:flex;flex-direction:column;gap:18px}.jp-planner-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.75fr);gap:18px}.jp-planner-card{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:20px;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04))}.jp-planner-card h3{margin:0 0 6px}.jp-planner-card p{margin:0 0 14px}.jp-task-list{display:flex;flex-direction:column;gap:8px}.jp-task{display:grid;grid-template-columns:32px minmax(0,1fr) 130px 120px 92px;gap:10px;align-items:center;padding:11px;border:1px solid #edf0f3;border-radius:9px;background:#fff}.jp-task input,.jp-task select{width:100%;box-sizing:border-box}.jp-task-title{font-weight:650}.jp-task-meta{font-size:11px;color:#64748b;margin-top:3px}.jp-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569}.jp-locked{opacity:.7}.jp-feature-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}.jp-feature{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border:1px solid #edf0f3;border-radius:9px}.jp-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.jp-form .full{grid-column:1/-1}.jp-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#475569}.jp-form input,.jp-form select,.jp-form textarea{width:100%;box-sizing:border-box}.jp-form textarea{min-height:90px;resize:vertical}.jp-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:18px}.jp-timeline{margin-top:16px;overflow:auto}.jp-timeline-row{display:grid;grid-template-columns:220px 1fr;min-width:700px;border-bottom:1px solid #eef2f7;min-height:48px}.jp-timeline-name{padding:10px;font-weight:650}.jp-timeline-track{position:relative;background:repeating-linear-gradient(to right,#fff 0, #fff calc(100% / 10 - 1px),#eef2f7 calc(100% / 10 - 1px),#eef2f7 calc(100% / 10));}.jp-timeline-bar{position:absolute;top:10px;height:28px;border-radius:6px;background:#111827;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;padding:0 8px;box-sizing:border-box;white-space:nowrap;overflow:hidden}.jp-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.jp-stat{padding:12px;border:1px solid #edf0f3;border-radius:9px}.jp-stat strong{display:block;font-size:20px}.jp-muted{color:#64748b;font-size:13px}.jp-complete-panel{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:14px 16px;border:1px solid #dbeafe;border-radius:10px;background:#f8fafc}.jp-complete-panel strong{display:block;margin-bottom:3px}@media(max-width:850px){.jp-planner-grid{grid-template-columns:1fr}.jp-task{grid-template-columns:28px minmax(0,1fr)}.jp-task>*:not(:nth-child(1)):not(:nth-child(2)){grid-column:2}.jp-form{grid-template-columns:1fr}.jp-form .full{grid-column:auto}.jp-summary{grid-template-columns:1fr 1fr}.jp-complete-panel{flex-direction:column;align-items:flex-start}}
    `; document.head.appendChild(s);
  }

  async function resolveCompany() {
    if (window.JobPilotCompany?.company) return window.JobPilotCompany.company;
    const { data:{user}={} } = await supabase.auth.getUser(); if (!user) return null;
    const { data } = await supabase.from("companies").select("id,name,plan,test_mode").eq("owner_id",user.id).maybeSingle();
    return data || null;
  }

  async function loadContext() {
    state.company = await resolveCompany();
    state.plan = String(state.company?.plan || "solo").toLowerCase();
    const [{data:jobs,error:je},{data:customers,error:ce},{data:plans,error:pe}] = await Promise.all([
      supabase.from("jobs").select("id,title,description,scheduled_date,customer_id,assigned_user_id,status,notes").order("scheduled_date",{ascending:true,nullsFirst:false}),
      supabase.from("customers").select("id,name").order("created_at",{ascending:false}),
      state.company?.id ? supabase.from("job_plans").select("*").eq("company_id",state.company.id).order("created_at",{ascending:false}) : Promise.resolve({data:[],error:null})
    ]);
    if (je) throw je; if (ce) throw ce; if (pe) throw pe;
    state.jobs=jobs||[]; state.customers=customers||[]; state.plans=plans||[];
    if (hasPlan("team")) {
      try { const { data:{session}={} }=await supabase.auth.getSession(); if(session){ const r=await fetch("https://qxoynttvipducubmczwl.supabase.co/functions/v1/management-users-v1",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:"list"})}); const json=await r.json(); state.members=(json.users||[]).filter(u=>u.status==="active"); } } catch(e){ console.warn("JobPilot planner team lookup:",e); }
    }
  }

  function customerName(id){ const c=state.customers.find(x=>String(x.id)===String(id)); if(!c)return ""; return c.name || "Customer"; }
  function memberName(id){ const m=state.members.find(x=>String(x.user_id)===String(id)); return m?.name || m?.email || "Team member"; }
  function planForJob(jobId){ return state.plans.find(p=>String(p.job_id)===String(jobId)) || null; }

  async function loadPlanner(id) {
    const {data:planner,error}=await supabase.from("job_plans").select("*").eq("id",id).maybeSingle(); if(error)throw error;
    const {data:tasks,error:te}=await supabase.from("job_plan_tasks").select("*").eq("plan_id",id).order("order_index",{ascending:true}); if(te)throw te;
    state.planner=planner; state.tasks=tasks||[];
  }

  function render() {
    const content=document.getElementById("pageContent"); if(!content)return; styles();
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active")); document.getElementById("jobpilot-tools-button")?.classList.add("active");
    document.getElementById("pageTitle").textContent="Job Planner"; document.getElementById("pageSubtitle").textContent="Turn a job into a clear plan of work.";
    if(!state.planner){ renderList(content); return; }
    renderPlanner(content);
  }

  function renderList(content) {
    const cards=state.jobs.map(j=>{const savedPlan=planForJob(j.id);return `<div class="jp-planner-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><strong>${esc(j.title||"Untitled job")}</strong><div class="jp-muted">${esc(customerName(j.customer_id))}${j.scheduled_date?` · ${esc(j.scheduled_date)}`:""}${savedPlan?` · <span class="jp-badge">${esc(savedPlan.status||"draft")}</span>`:""}</div></div><button class="button secondary" data-plan-job="${j.id}" data-plan-id="${savedPlan?.id||""}" type="button">${savedPlan?"Open plan":"Plan this job"}</button></div>`}).join("");
    content.innerHTML=`<div class="jp-planner"><div class="page-actions"><div><h2>Job Planner</h2><p>Create a practical plan for an existing JobPilot job.</p></div><span class="jp-badge">${esc(state.plan.charAt(0).toUpperCase()+state.plan.slice(1))}</span></div><div class="jp-planner-grid"><div class="jp-planner-card"><h3>Your jobs</h3><p class="jp-muted">Choose a job to start planning. You only enter the job information once.</p><div style="display:flex;flex-direction:column;gap:10px">${cards||'<div class="jp-muted">No jobs found.</div>'}</div></div><div class="jp-planner-card"><h3>What your plan includes</h3><div class="jp-feature-list"><div class="jp-feature"><span>Basic task planning</span><span class="jp-badge">${hasPlan("solo")?"Included":"Locked"}</span></div><div class="jp-feature ${hasPlan("team")?"":"jp-locked"}"><span>👥 Team assignment</span><span class="jp-badge">Team</span></div><div class="jp-feature ${hasPlan("business")?"":"jp-locked"}"><span>🔗 Dependencies & resources</span><span class="jp-badge">Business</span></div><div class="jp-feature ${hasPlan("business")?"":"jp-locked"}"><span>📊 GANTT programme</span><span class="jp-badge">Business</span></div><div class="jp-feature ${hasPlan("pro")?"":"jp-locked"}"><span>✨ Forecasting & optimisation</span><span class="jp-badge">Pro</span></div></div></div></div></div>`;
    content.querySelectorAll("[data-plan-job]").forEach(b=>b.addEventListener("click",async()=>{try{if(b.dataset.planId){await loadPlanner(b.dataset.planId);render();}else{openCreate(b.dataset.planJob);}}catch(e){alert(e.message||e);}}));
  }

  function openCreate(jobId){
    const job=state.jobs.find(j=>String(j.id)===String(jobId)); if(!job)return;
    const content=document.getElementById("pageContent");
    content.innerHTML=`<div class="jp-planner"><div class="page-actions"><div><h2>Plan: ${esc(job.title||"Job")}</h2><p>${esc(customerName(job.customer_id))}</p></div><button id="jp-back" class="button secondary" type="button">← Jobs</button></div><div class="jp-planner-card"><form id="jp-create-form" class="jp-form"><div><label>Plan name<input id="jp-name" value="${esc(job.title||"Job plan")}" required></label></div><div><label>Start date<input id="jp-start" type="date" value="${esc(job.scheduled_date||today())}" required></label></div><div><label>Target end date<input id="jp-end" type="date"></label></div><div><label>Status<select id="jp-status"><option value="draft">Draft</option><option value="active">Active</option></select></label></div><div class="full"><label>Planning notes<textarea id="jp-description" placeholder="Optional notes for the project plan"></textarea></label></div><div class="full"><p class="jp-muted">JobPilot will create a sensible first draft of tasks. You can edit, reorder and assign them after creation.</p></div><div class="jp-actions full"><button class="button secondary" id="jp-cancel" type="button">Cancel</button><button class="button primary" type="submit">Create plan</button></div></form></div></div>`;
    document.getElementById("jp-back")?.addEventListener("click",render); document.getElementById("jp-cancel")?.addEventListener("click",render);
    document.getElementById("jp-create-form")?.addEventListener("submit",async e=>{e.preventDefault(); const start=document.getElementById("jp-start").value; const end=document.getElementById("jp-end").value||start; const {data:{user}={}}=await supabase.auth.getUser(); if(!user)return; const {data:p,error}=await supabase.from("job_plans").insert({company_id:state.company.id,job_id:job.id,title:document.getElementById("jp-name").value.trim(),description:document.getElementById("jp-description").value.trim()||null,start_date:start,target_end_date:end,status:document.getElementById("jp-status").value,created_by:user.id}).select().single(); if(error){alert(error.message);return;} state.plans=[p,...state.plans.filter(x=>String(x.id)!==String(p.id))]; const suggestions=suggestedTasks(job); const rows=suggestions.map((t,i)=>({plan_id:p.id,title:t.title,duration_days:t.days,start_date:start,end_date:addDays(start,Math.max(0,t.days-1)),order_index:i,status:"pending"})); const {error:te}=await supabase.from("job_plan_tasks").insert(rows); if(te){state.plans=state.plans.filter(x=>String(x.id)!==String(p.id));await supabase.from("job_plans").delete().eq("id",p.id);alert(te.message);return;} await loadPlanner(p.id); render(); });
  }

  function suggestedTasks(job){ const text=`${job.title||""} ${job.description||""}`.toLowerCase(); if(/garage|conversion/.test(text))return [{title:"Preparation",days:1},{title:"Strip out",days:2},{title:"Groundworks",days:2},{title:"Structural work",days:4},{title:"First-fix services",days:2},{title:"Insulation & boarding",days:2},{title:"Plastering",days:2},{title:"Second-fix services",days:2},{title:"Flooring",days:1},{title:"Decoration",days:2},{title:"Snagging & handover",days:1}]; if(/bathroom|ensuite|toilet/.test(text))return [{title:"Preparation",days:1},{title:"Strip out",days:1},{title:"Plumbing first fix",days:2},{title:"Electrical first fix",days:1},{title:"Boarding & waterproofing",days:2},{title:"Tiling",days:3},{title:"Second fix",days:2},{title:"Decoration",days:1},{title:"Snagging & handover",days:1}]; if(/kitchen/.test(text))return [{title:"Preparation",days:1},{title:"Strip out",days:1},{title:"First-fix services",days:2},{title:"Plastering & making good",days:2},{title:"Floor preparation",days:1},{title:"Kitchen installation",days:3},{title:"Worktops",days:1},{title:"Second-fix services",days:1},{title:"Decoration",days:2},{title:"Final clean & handover",days:1}]; return [{title:"Site preparation",days:1},{title:"Main works",days:3},{title:"First-fix services",days:2},{title:"Finishing works",days:2},{title:"Snagging",days:1},{title:"Final clean & handover",days:1}]; }

  function renderPlanner(content){
    const p=state.planner; const done=state.tasks.filter(t=>t.status==="completed").length; const total=state.tasks.length; const allComplete=total>0&&done===total; const linkedJob=state.jobs.find(j=>String(j.id)===String(p.job_id));
    content.innerHTML=`<div class="jp-planner"><div class="page-actions"><div><h2>${esc(p.title)}</h2><p>${esc(customerName(linkedJob?.customer_id))} · ${esc(p.start_date||"No start date")} → ${esc(p.target_end_date||"No target")}</p></div><div class="jp-actions" style="margin:0"><button id="jp-back-list" class="button secondary" type="button">← Job Planner</button><button id="jp-add-task" class="button primary" type="button">+ Add task</button></div></div><div class="jp-summary"><div class="jp-stat"><strong>${total}</strong><span class="jp-muted">Tasks</span></div><div class="jp-stat"><strong>${done}</strong><span class="jp-muted">Completed</span></div><div class="jp-stat"><strong>${total?Math.round(done/total*100):0}%</strong><span class="jp-muted">Progress</span></div></div>${allComplete||p.status==="completed"?`<div class="jp-complete-panel"><div><strong>Plan complete</strong><span class="jp-muted">All planned tasks are complete. You can finish the plan and keep a copy of it on the linked job.</span></div><div class="jp-actions" style="margin:0"><button id="jp-add-to-job" class="button secondary" type="button">Add plan to job</button>${p.status!=="completed"?`<button id="jp-mark-complete" class="button primary" type="button">Mark plan complete</button>`:`<span class="jp-badge">Completed</span>`}</div></div>`:`<div class="jp-complete-panel"><div><strong>Plan in progress</strong><span class="jp-muted">Complete all tasks to finish this plan and add the final plan to the job.</span></div></div>`}<div class="jp-planner-grid"><div class="jp-planner-card"><h3>Plan of work</h3><p class="jp-muted">Edit tasks as the job develops.</p><div class="jp-task-list">${state.tasks.map((t,i)=>taskHtml(t,i)).join("")}</div><div class="jp-actions"><button id="jp-save" class="button primary" type="button">Save changes</button></div></div><div class="jp-planner-card"><h3>Plan features</h3><div class="jp-feature-list"><div class="jp-feature"><span>Basic planning</span><span class="jp-badge">Included</span></div><div class="jp-feature ${hasPlan("team")?"":"jp-locked"}"><span>👥 Assign team members</span><span class="jp-badge">Team</span></div><div class="jp-feature ${hasPlan("business")?"":"jp-locked"}"><span>🔗 Task dependencies</span><span class="jp-badge">Business</span></div><div class="jp-feature ${hasPlan("business")?"":"jp-locked"}"><span>📊 GANTT view</span><span class="jp-badge">Business</span></div><div class="jp-feature ${hasPlan("pro")?"":"jp-locked"}"><span>✨ Forecasting & optimisation</span><span class="jp-badge">Pro</span></div></div><div class="jp-timeline"><h3 style="margin-top:20px">Simple timeline</h3>${timelineHtml()}</div></div></div></div>`;
    content.querySelectorAll("[data-remove-task]").forEach(b=>b.addEventListener("click",()=>{state.tasks=state.tasks.filter(t=>String(t.id)!==String(b.dataset.removeTask));renderPlanner(content);}));
    content.querySelectorAll("[data-task-status]").forEach(b=>b.addEventListener("change",()=>{b.checked?b.closest(".jp-task")?.classList.add("jp-task-done"):b.closest(".jp-task")?.classList.remove("jp-task-done");}));
    document.getElementById("jp-back-list")?.addEventListener("click",()=>{state.planner=null;state.tasks=[];render();});
    document.getElementById("jp-add-task")?.addEventListener("click",()=>addTask());
    document.getElementById("jp-save")?.addEventListener("click",saveChanges);
    document.getElementById("jp-mark-complete")?.addEventListener("click",markPlanComplete);
    document.getElementById("jp-add-to-job")?.addEventListener("click",addPlanToJob);
  }

  function taskHtml(t,i){ return `<div class="jp-task"><input type="checkbox" data-task-status="${t.id}" ${t.status==="completed"?"checked":""} aria-label="Complete task"><div><div class="jp-task-title">${esc(t.title)}</div><div class="jp-task-meta">${t.start_date||"No date"} → ${t.end_date||"No date"}${t.predecessor_task_id?" · dependency":""}</div></div><input type="date" data-task-start="${t.id}" value="${esc(t.start_date||"")}"><input type="date" data-task-end="${t.id}" value="${esc(t.end_date||"")}">${hasPlan("team")?`<select data-task-member="${t.id}"><option value="">Unassigned</option>${state.members.map(m=>`<option value="${esc(m.user_id)}" ${String(m.user_id)===String(t.assigned_user_id)?"selected":""}>${esc(memberName(m.user_id))}</option>`).join("")}</select>`:`<span class="jp-badge">Solo</span>`}<button class="button secondary" data-remove-task="${t.id}" type="button">Remove</button></div>`; }

  function timelineHtml(){ const start=new Date(`${firstDate()}T12:00:00`); const range=Math.max(1,Math.min(30,daysSpan())); return state.tasks.map(t=>{ const s=new Date(`${t.start_date||firstDate()}T12:00:00`); const e=new Date(`${t.end_date||t.start_date||firstDate()}T12:00:00`); const left=Math.max(0,Math.round((s-start)/86400000)); const width=Math.max(1,Math.round((e-s)/86400000)+1); return `<div class="jp-timeline-row"><div class="jp-timeline-name">${esc(t.title)}</div><div class="jp-timeline-track"><div class="jp-timeline-bar" style="left:${Math.min(99,left/range*100)}%;width:${Math.min(100,width/range*100)}%">${esc(t.title)}</div></div></div>`; }).join(""); }
  function firstDate(){return state.planner?.start_date||state.tasks[0]?.start_date||today();} function daysSpan(){const dates=state.tasks.flatMap(t=>[t.start_date,t.end_date]).filter(Boolean).map(x=>new Date(`${x}T12:00:00`)); if(!dates.length)return 1; const min=Math.min(...dates),max=Math.max(...dates); return Math.max(1,Math.round((max-min)/86400000)+1);}

  function addTask(){ const id=`local-${Date.now()}`; state.tasks.push({id,title:"New task",description:null,duration_days:1,start_date:state.planner.start_date||today(),end_date:state.planner.start_date||today(),status:"pending",order_index:state.tasks.length,assigned_user_id:null,predecessor_task_id:null,_new:true}); render(); }

  async function saveChanges(){
    const updates=[];
    state.tasks.forEach(t=>{ const status=document.querySelector(`[data-task-status="${t.id}"]`); const start=document.querySelector(`[data-task-start="${t.id}"]`); const end=document.querySelector(`[data-task-end="${t.id}"]`); const member=document.querySelector(`[data-task-member="${t.id}"]`); t.status=status?.checked?"completed":"pending"; t.start_date=start?.value||t.start_date; t.end_date=end?.value||t.end_date; t.assigned_user_id=member?.value||null; if(!String(t.id).startsWith("local-"))updates.push(supabase.from("job_plan_tasks").update({status:t.status,start_date:t.start_date,end_date:t.end_date,assigned_user_id:hasPlan("team")?t.assigned_user_id:null,order_index:state.tasks.indexOf(t)}).eq("id",t.id)); });
    const newTasks=state.tasks.filter(t=>String(t.id).startsWith("local-")); if(newTasks.length)updates.push(supabase.from("job_plan_tasks").insert(newTasks.map((t,i)=>({plan_id:state.planner.id,title:t.title,duration_days:t.duration_days||1,start_date:t.start_date,end_date:t.end_date,status:t.status,order_index:i,assigned_user_id:hasPlan("team")?t.assigned_user_id:null}))));
    const results=await Promise.all(updates); const bad=results.find(r=>r.error); if(bad){alert(bad.error.message);return;} await loadPlanner(state.planner.id); render();
  }

  async function markPlanComplete(){
    const incomplete=state.tasks.filter(t=>t.status!=="completed");
    if(incomplete.length){alert("Complete all tasks before marking the plan complete.");return;}
    const {error}=await supabase.from("job_plans").update({status:"completed"}).eq("id",state.planner.id);
    if(error){alert(error.message);return;}
    state.planner={...state.planner,status:"completed"};
    state.plans=state.plans.map(p=>String(p.id)===String(state.planner.id)?state.planner:p);
    render();
  }

  async function addPlanToJob(){
    const job=state.jobs.find(j=>String(j.id)===String(state.planner?.job_id));
    if(!job){alert("This plan is not linked to a job.");return;}
    const marker=`[JobPilot Plan: ${state.planner.title}]`;
    if(String(job.notes||"").includes(marker)){alert("This plan is already on the job.");return;}
    const lines=state.tasks.map((t,i)=>`${i+1}. ${t.title}${t.start_date?` (${t.start_date}${t.end_date&&t.end_date!==t.start_date?` → ${t.end_date}`:""})`:""}${t.assigned_user_id?` — ${memberName(t.assigned_user_id)}`:""}`).join("\n");
    const block=`${marker}\n${lines}`;
    const notes=job.notes?`${job.notes.trim()}\n\n${block}`:block;
    const {error}=await supabase.from("jobs").update({notes}).eq("id",job.id);
    if(error){alert(error.message);return;}
    state.jobs=state.jobs.map(j=>String(j.id)===String(job.id)?{...j,notes}:j);
    alert("The plan has been added to the job.");
  }

  async function open(){ try{await loadContext();state.planner=null;state.tasks=[];render();}catch(e){const c=document.getElementById("pageContent");if(c)c.innerHTML=`<div class="jp-planner-card"><h2>Job Planner</h2><p class="jp-muted">Could not load the planner: ${esc(e.message||e)}</p></div>`; } }
  window.JobPilotJobPlanner={open};
})();