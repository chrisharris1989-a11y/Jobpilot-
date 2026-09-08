import { supabase } from "./supabase.js";

(() => {
  const STYLE_ID = "jobpilot-gantt-styles";
  const NAV_ID = "jobpilot-gantt-nav";
  const state = { programmes: [], jobs: [], current: null, tasks: [] };

  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  const iso = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const addDays = (date, days) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + Number(days || 0));
    return iso(d);
  };

  const workingDays = (start, count) => {
    const dates = [];
    let cursor = new Date(`${start}T12:00:00`);
    while (dates.length < count) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) dates.push(iso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  };

  const businessDaysBetween = (start, end) => {
    const a = new Date(`${start}T12:00:00`);
    const b = new Date(`${end}T12:00:00`);
    let count = 0;
    while (a <= b) {
      const day = a.getDay();
      if (day !== 0 && day !== 6) count++;
      a.setDate(a.getDate() + 1);
    }
    return Math.max(1, count);
  };

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .jp-gantt-page{display:flex;flex-direction:column;gap:18px}
      .jp-gantt-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .jp-gantt-actions{display:flex;gap:8px;flex-wrap:wrap}
      .jp-gantt-board{overflow:auto;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff}
      .jp-gantt-grid{min-width:980px}
      .jp-gantt-head,.jp-gantt-row{display:grid;grid-template-columns:280px 150px 150px 1fr;min-height:54px}
      .jp-gantt-head{background:#f8fafc;border-bottom:1px solid var(--border,#e5e7eb);font-size:12px;font-weight:700;color:#64748b}
      .jp-gantt-cell{padding:10px 12px;border-right:1px solid #eef2f7;display:flex;align-items:center;min-width:0}
      .jp-gantt-row{border-bottom:1px solid #eef2f7}
      .jp-gantt-row:last-child{border-bottom:0}
      .jp-gantt-task-name{font-weight:650;display:flex;flex-direction:column;gap:4px}
      .jp-gantt-task-name small{font-size:11px;color:#94a3b8;font-weight:500}
      .jp-gantt-input{width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid #dbe2ea;border-radius:7px;background:#fff;font:inherit;font-size:12px}
      .jp-gantt-timeline{position:relative;display:grid;grid-template-columns:repeat(var(--days),minmax(34px,1fr));align-items:center;width:100%;min-height:34px;background-image:linear-gradient(to right,#eef2f7 1px,transparent 1px);background-size:calc(100% / var(--days)) 100%}
      .jp-gantt-bar{height:26px;border-radius:6px;background:#111827;color:#fff;display:flex;align-items:center;padding:0 8px;overflow:hidden;white-space:nowrap;font-size:11px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.08)}
      .jp-gantt-bar span{overflow:hidden;text-overflow:ellipsis}
      .jp-gantt-progress{height:100%;background:rgba(255,255,255,.18);position:absolute;left:0;top:0}
      .jp-gantt-empty{padding:38px;text-align:center;color:#64748b}
      .jp-gantt-legend{display:flex;gap:16px;flex-wrap:wrap;color:#64748b;font-size:12px}
      .jp-gantt-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
      .jp-gantt-modal{width:min(680px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(15,23,42,.2);padding:24px}
      .jp-gantt-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .jp-gantt-form .full{grid-column:1/-1}
      .jp-gantt-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#475569}
      .jp-gantt-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
      .jp-gantt-lock{padding:24px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff}
      .jp-gantt-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:700}
      @media(max-width:760px){.jp-gantt-form{grid-template-columns:1fr}.jp-gantt-form .full{grid-column:auto}.jp-gantt-head,.jp-gantt-row{grid-template-columns:220px 130px 130px 1fr}}
    `;
    document.head.appendChild(style);
  }

  async function getPlan() {
    try {
      const { data, error } = await supabase.rpc("get_my_company_entitlements");
      if (!error && data?.length) return String(data[0].plan || "solo").toLowerCase();
    } catch (error) { console.error("JobPilot Gantt plan lookup:", error); }
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return "solo";
      const { data } = await supabase.from("companies").select("plan").eq("owner_id", user.id).maybeSingle();
      return String(data?.plan || "solo").toLowerCase();
    } catch { return "solo"; }
  }

  function addNav() {
    if (document.getElementById(NAV_ID)) return;
    const nav = document.querySelector(".sidebar nav");
    if (!nav) return;
    const button = document.createElement("button");
    button.id = NAV_ID;
    button.className = "nav-item";
    button.type = "button";
    button.textContent = "📊 Gantt Programmes";
    button.addEventListener("click", () => showPage());
    nav.appendChild(button);
  }

  function setActive() {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.getElementById(NAV_ID)?.classList.add("active");
  }

  async function loadBase() {
    const [{ data: jobs }, { data: programmes }] = await Promise.all([
      supabase.from("jobs").select("id,title,description,scheduled_date,customer_id").order("scheduled_date", { ascending: true, nullsFirst: false }),
      supabase.from("gantt_programmes").select("*").order("created_at", { ascending: false })
    ]);
    state.jobs = jobs || [];
    state.programmes = programmes || [];
  }

  function suggestedTasks(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    if (/garage|conversion/.test(text)) return [
      ["Site preparation", 1], ["Strip out", 2], ["Groundworks", 3], ["Drainage", 2],
      ["Concrete slab", 2], ["Blockwork", 4], ["Roofing", 3], ["Windows and doors", 2],
      ["First-fix electrical", 2], ["First-fix plumbing", 2], ["Insulation and boarding", 3],
      ["Plastering", 2], ["Second fix", 2], ["Flooring", 2], ["Decoration", 2], ["Final clean and handover", 1]
    ];
    if (/bathroom|ensuite|toilet/.test(text)) return [
      ["Site preparation", 1], ["Strip out", 1], ["Plumbing first fix", 2], ["Electrical first fix", 1],
      ["Boarding and prep", 2], ["Waterproofing", 1], ["Tiling", 3], ["Plumbing second fix", 1],
      ["Electrical second fix", 1], ["Decoration", 2], ["Final clean and handover", 1]
    ];
    if (/kitchen/.test(text)) return [
      ["Site preparation", 1], ["Strip out", 1], ["First-fix plumbing", 1], ["First-fix electrical", 1],
      ["Plastering and making good", 2], ["Floor preparation", 1], ["Kitchen installation", 3],
      ["Worktops", 1], ["Second-fix plumbing", 1], ["Second-fix electrical", 1], ["Decoration", 2], ["Final clean and handover", 1]
    ];
    if (/extension|new build|building/.test(text)) return [
      ["Site setup", 1], ["Groundworks", 4], ["Foundations", 3], ["Drainage", 3], ["Concrete slab", 2],
      ["Structural work", 5], ["Roof structure", 4], ["Roof covering", 2], ["Windows and doors", 2],
      ["First fix services", 3], ["Insulation and boarding", 3], ["Plastering", 3], ["Second fix services", 3],
      ["Flooring", 2], ["Decoration", 3], ["Final clean and handover", 1]
    ];
    return [
      ["Site preparation", 1], ["Strip out / preparation", 2], ["Main works", 5],
      ["First-fix services", 2], ["Second-fix services", 2], ["Finishing works", 3],
      ["Snagging", 1], ["Final clean and handover", 1]
    ];
  }

  async function createProgramme(job, startDate, weeks, name) {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("You are not logged in.");
    const tasks = suggestedTasks(job?.title || name, job?.description || "");
    const maxDays = Math.max(1, Number(weeks || 1)) * 5;
    let cursor = iso(startDate);
    const generated = [];
    let previous = null;
    for (let i = 0; i < tasks.length; i++) {
      const [title, duration] = tasks[i];
      const dates = workingDays(cursor, Math.min(duration, Math.max(1, maxDays)));
      const task = { title, start_date: dates[0], end_date: dates[dates.length - 1], progress: 0, predecessor_id: previous, sort_order: i };
      generated.push(task);
      previous = `pending-${i}`;
      cursor = addDays(dates[dates.length - 1], 1);
    }
    const endDate = generated[generated.length - 1]?.end_date || startDate;
    const { data: programme, error } = await supabase.from("gantt_programmes").insert({
      user_id: user.id, company_id: null, job_id: job?.id || null,
      name: name || job?.title || "New Programme", start_date: startDate, end_date: endDate
    }).select().single();
    if (error) throw error;
    const rows = generated.map((task, index) => ({ ...task, programme_id: programme.id, predecessor_id: index ? null : null }));
    const { data: savedTasks, error: taskError } = await supabase.from("gantt_tasks").insert(rows).select().order("sort_order");
    if (taskError) {
      await supabase.from("gantt_programmes").delete().eq("id", programme.id);
      throw taskError;
    }
    // Link predecessors after insert so the UUIDs are available.
    for (let i = 1; i < savedTasks.length; i++) {
      await supabase.from("gantt_tasks").update({ predecessor_id: savedTasks[i - 1].id }).eq("id", savedTasks[i].id);
    }
    state.programmes.unshift(programme);
    await openProgramme(programme.id);
  }

  function renderProgrammeList(content) {
    const cards = state.programmes.map(programme => `
      <div class="job-row" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><strong>${esc(programme.name)}</strong><div class="muted">${esc(programme.start_date)} → ${esc(programme.end_date)}</div></div>
        <button class="button secondary" type="button" data-open-programme="${programme.id}">Open</button>
      </div>`).join("");
    content.innerHTML = `
      <div class="jp-gantt-page">
        <div class="jp-gantt-toolbar"><div><h2>Gantt Programmes</h2><p>Create professional project programmes from your existing JobPilot jobs.</p></div><div class="jp-gantt-actions"><button class="button primary" id="jp-new-programme">+ New Programme</button></div></div>
        <div class="panel">${cards || '<div class="jp-gantt-empty">No programmes yet. Create one from an existing job and JobPilot will build the first draft for you.</div>'}</div>
        <div class="jp-gantt-legend"><span>Business + Pro</span><span>•</span><span>Automatic task suggestions</span><span>•</span><span>Dependencies</span><span>•</span><span>Progress tracking</span></div>
      </div>`;
    document.getElementById("jp-new-programme")?.addEventListener("click", openNewProgrammeModal);
    content.querySelectorAll("[data-open-programme]").forEach(button => button.addEventListener("click", () => openProgramme(button.dataset.openProgramme)));
  }

  async function openProgramme(id) {
    const content = document.getElementById("pageContent");
    const programme = state.programmes.find(item => String(item.id) === String(id));
    if (!programme || !content) return;
    const { data: tasks, error } = await supabase.from("gantt_tasks").select("*").eq("programme_id", programme.id).order("sort_order");
    if (error) { content.innerHTML = `<div class="panel"><p class="muted">Could not load programme: ${esc(error.message)}</p></div>`; return; }
    state.current = programme;
    state.tasks = tasks || [];
    renderBoard(content);
  }

  function renderBoard(content) {
    const p = state.current;
    const tasks = state.tasks;
    const start = p.start_date;
    const end = p.end_date;
    const dayCount = Math.max(1, Math.ceil((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1);
    const dayLabels = Array.from({ length: dayCount }, (_, i) => addDays(start, i));
    const gridDays = Math.min(dayCount, 120);
    const timelineStart = start;
    const timelineEnd = addDays(start, gridDays - 1);
    const visible = tasks.filter(t => t.start_date <= timelineEnd && t.end_date >= timelineStart);
    const rows = visible.map(task => {
      const s = Math.max(0, Math.ceil((new Date(`${task.start_date}T12:00:00`) - new Date(`${timelineStart}T12:00:00`)) / 86400000));
      const e = Math.min(gridDays - 1, Math.ceil((new Date(`${task.end_date}T12:00:00`) - new Date(`${timelineStart}T12:00:00`)) / 86400000));
      const span = Math.max(1, e - s + 1);
      const progress = Number(task.progress || 0);
      return `<div class="jp-gantt-row">
        <div class="jp-gantt-cell"><div class="jp-gantt-task-name"><span>${esc(task.title)}</span><small>${progress}% complete${task.predecessor_id ? " · linked" : ""}</small></div></div>
        <div class="jp-gantt-cell"><input class="jp-gantt-input" type="date" value="${esc(task.start_date)}" data-task-start="${task.id}"></div>
        <div class="jp-gantt-cell"><input class="jp-gantt-input" type="date" value="${esc(task.end_date)}" data-task-end="${task.id}"></div>
        <div class="jp-gantt-cell"><div class="jp-gantt-timeline" style="--days:${gridDays}"><div class="jp-gantt-bar" style="grid-column:${s + 1} / span ${span}"><div class="jp-gantt-progress" style="width:${progress}%"></div><span>${esc(task.title)}</span></div></div></div>
      </div>`;
    }).join("");
    const headers = dayLabels.slice(0, gridDays).map(d => `<span style="padding:8px 3px;text-align:center;font-size:9px;color:#94a3b8">${esc(d.slice(8,10))}</span>`).join("");
    content.innerHTML = `
      <div class="jp-gantt-page">
        <div class="jp-gantt-toolbar"><div><button class="button secondary" id="jp-back-programmes">← Programmes</button><h2 style="margin-top:12px">${esc(p.name)}</h2><p>${esc(p.start_date)} → ${esc(p.end_date)} · ${tasks.length} tasks</p></div><div class="jp-gantt-actions"><button class="button" id="jp-add-task">+ Add Task</button><button class="button primary" id="jp-save-gantt">Save Changes</button></div></div>
        <div class="panel" style="padding:0;overflow:hidden"><div class="jp-gantt-board"><div class="jp-gantt-grid"><div class="jp-gantt-head"><div class="jp-gantt-cell">Task</div><div class="jp-gantt-cell">Start</div><div class="jp-gantt-cell">End</div><div class="jp-gantt-cell"><div style="display:grid;grid-template-columns:repeat(${gridDays},minmax(34px,1fr));width:100%">${headers}</div></div></div>${rows || '<div class="jp-gantt-empty">No tasks in this programme.</div>'}</div></div></div>
        <div class="jp-gantt-legend"><span>Drag-and-drop timeline is next; dates can already be edited directly.</span><span>•</span><span>Dependencies are stored between tasks.</span></div>
      </div>`;
    document.getElementById("jp-back-programmes")?.addEventListener("click", () => { state.current = null; renderProgrammeList(content); });
    document.getElementById("jp-save-gantt")?.addEventListener("click", saveBoard);
    document.getElementById("jp-add-task")?.addEventListener("click", addTask);
  }

  async function saveBoard() {
    const content = document.getElementById("pageContent");
    const updates = state.tasks.map(task => {
      const startDate = content.querySelector(`[data-task-start="${task.id}"]`)?.value || task.start_date;
      const endDate = content.querySelector(`[data-task-end="${task.id}"]`)?.value || task.end_date;
      return supabase.from("gantt_tasks").update({ start_date: startDate, end_date: endDate, updated_at: new Date().toISOString() }).eq("id", task.id);
    });
    const results = await Promise.all(updates);
    const failed = results.find(result => result.error);
    if (failed) return alert(failed.error.message);
    state.tasks = state.tasks.map(task => ({ ...task, start_date: content.querySelector(`[data-task-start="${task.id}"]`)?.value || task.start_date, end_date: content.querySelector(`[data-task-end="${task.id}"]`)?.value || task.end_date }));
    const newEnd = state.tasks.reduce((max, task) => task.end_date > max ? task.end_date : max, state.current.start_date);
    await supabase.from("gantt_programmes").update({ end_date: newEnd, updated_at: new Date().toISOString() }).eq("id", state.current.id);
    state.current.end_date = newEnd;
    renderBoard(content);
  }

  async function addTask() {
    if (!state.current) return;
    const title = prompt("Task name");
    if (!title?.trim()) return;
    const last = state.tasks[state.tasks.length - 1];
    const start = last ? addDays(last.end_date, 1) : state.current.start_date;
    const end = workingDays(start, 1)[0];
    const { data, error } = await supabase.from("gantt_tasks").insert({ programme_id: state.current.id, title: title.trim(), start_date: end, end_date: end, progress: 0, predecessor_id: last?.id || null, sort_order: state.tasks.length }).select().single();
    if (error) return alert(error.message);
    state.tasks.push(data);
    state.current.end_date = data.end_date > state.current.end_date ? data.end_date : state.current.end_date;
    await supabase.from("gantt_programmes").update({ end_date: state.current.end_date, updated_at: new Date().toISOString() }).eq("id", state.current.id);
    renderBoard(document.getElementById("pageContent"));
  }

  function openNewProgrammeModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "jp-gantt-modal-backdrop";
    const options = state.jobs.map(job => `<option value="${esc(job.id)}">${esc(job.title)}${job.scheduled_date ? ` — ${esc(job.scheduled_date)}` : ""}</option>`).join("");
    const today = iso(new Date());
    backdrop.innerHTML = `<div class="jp-gantt-modal"><h2>Create Gantt Programme</h2><p class="muted">Choose an existing JobPilot job. JobPilot will use the job details to suggest the first draft of the programme.</p><div class="jp-gantt-form"><label class="full">Job<select id="jp-gantt-job"><option value="">Choose a job…</option>${options}</select></label><label>Programme name<input id="jp-gantt-name" placeholder="e.g. Garage Conversion"></label><label>Start date<input id="jp-gantt-start" type="date" value="${today}"></label><label>Programme length<input id="jp-gantt-weeks" type="number" min="1" max="52" value="4"></label></div><div id="jp-gantt-preview" class="panel" style="margin-top:16px;background:#f8fafc"><strong>Automatic planning</strong><p class="muted" style="margin:5px 0 0">Select a job to see the suggested task count.</p></div><div class="jp-gantt-modal-actions"><button class="button secondary" id="jp-gantt-cancel">Cancel</button><button class="button primary" id="jp-gantt-create">Create Programme</button></div></div>`;
    document.body.appendChild(backdrop);
    const jobSelect = backdrop.querySelector("#jp-gantt-job");
    const preview = backdrop.querySelector("#jp-gantt-preview");
    jobSelect.addEventListener("change", () => {
      const job = state.jobs.find(item => String(item.id) === String(jobSelect.value));
      const suggestions = job ? suggestedTasks(job.title, job.description) : [];
      if (job) { backdrop.querySelector("#jp-gantt-name").value = job.title || ""; backdrop.querySelector("#jp-gantt-start").value = job.scheduled_date || today; }
      preview.innerHTML = job ? `<strong>${suggestions.length} tasks suggested</strong><p class="muted" style="margin:5px 0 0">${suggestions.slice(0, 5).map(item => esc(item[0])).join(" · ")}${suggestions.length > 5 ? " · …" : ""}</p>` : `<strong>Automatic planning</strong><p class="muted" style="margin:5px 0 0">Select a job to see the suggested task count.</p>`;
    });
    backdrop.querySelector("#jp-gantt-cancel").addEventListener("click", () => backdrop.remove());
    backdrop.addEventListener("click", event => { if (event.target === backdrop) backdrop.remove(); });
    backdrop.querySelector("#jp-gantt-create").addEventListener("click", async () => {
      const job = state.jobs.find(item => String(item.id) === String(jobSelect.value));
      if (!job) return alert("Choose a job first.");
      const start = backdrop.querySelector("#jp-gantt-start").value || today;
      const name = backdrop.querySelector("#jp-gantt-name").value.trim() || job.title;
      const weeks = Number(backdrop.querySelector("#jp-gantt-weeks").value) || 4;
      const button = backdrop.querySelector("#jp-gantt-create");
      button.disabled = true; button.textContent = "Creating…";
      try { await createProgramme(job, start, weeks, name); backdrop.remove(); } catch (error) { button.disabled = false; button.textContent = "Create Programme"; alert(error.message || String(error)); }
    });
  }

  async function showPage() {
    const content = document.getElementById("pageContent");
    if (!content) return;
    addStyles(); setActive();
    document.getElementById("pageTitle").textContent = "Gantt Programmes";
    document.getElementById("pageSubtitle").textContent = "Plan projects, track progress and keep the whole programme visible.";
    const plan = await getPlan();
    if (!["business", "pro"].includes(plan)) {
      content.innerHTML = `<div class="jp-gantt-lock"><h2>Gantt Programmes</h2><p>Gantt Programmes are available on the Business and Pro plans.</p><button class="button primary" id="jp-gantt-upgrade">Upgrade plan</button></div>`;
      document.getElementById("jp-gantt-upgrade")?.addEventListener("click", () => document.querySelector('[data-page="settings"]')?.click());
      return;
    }
    content.innerHTML = '<div class="panel"><p class="muted">Loading Gantt Programmes…</p></div>';
    await loadBase();
    renderProgrammeList(content);
  }

  function start() {
    const observer = new MutationObserver(() => {
      const nav = document.querySelector(".sidebar nav");
      if (nav && !document.getElementById(NAV_ID)) addNav();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else addNav();
  }

  start();
})();
