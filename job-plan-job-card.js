import { supabase } from "./supabase.js";

(() => {
  let opening = false;
  let currentJobId = null;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function loadPlanForJob(jobId) {
    if (!jobId) return null;
    const { data, error } = await supabase
      .from("job_plans")
      .select("id,job_id,status,title")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("JobPilot job plan lookup:", error);
      return null;
    }
    return data || null;
  }

  async function openPlanDirect(planId) {
    if (opening || !planId) return;
    opening = true;
    const content = document.getElementById("pageContent");
    const previousVisibility = content?.style.visibility || "";

    try {
      if (content) content.style.visibility = "hidden";

      const tools = document.getElementById("jobpilot-tools-button");
      if (!tools) throw new Error("Tools could not be opened.");
      tools.click();

      let plannerButton = null;
      for (let i = 0; i < 80; i++) {
        await sleep(100);
        plannerButton = document.getElementById("jp-open-job-planner");
        if (plannerButton) break;
      }
      if (!plannerButton) throw new Error("Job Planner could not be opened.");

      plannerButton.click();

      let planButton = null;
      for (let i = 0; i < 120; i++) {
        await sleep(100);
        planButton = document.querySelector(`[data-plan-id="${CSS.escape(String(planId))}"]`);
        if (planButton) break;
      }
      if (!planButton) throw new Error("The saved Job Planner plan could not be found.");

      planButton.click();

      for (let i = 0; i < 80; i++) {
        await sleep(100);
        if (document.querySelector(".jp-task-list, #jp-plan-form, .jp-complete-panel") &&
            !document.querySelector(`[data-plan-id="${CSS.escape(String(planId))}"]`)) {
          break;
        }
      }
    } catch (error) {
      console.warn("JobPilot direct plan open:", error);
      alert(error.message || "Could not open this Job Planner plan.");
    } finally {
      if (content) content.style.visibility = previousVisibility;
      opening = false;
    }
  }

  async function decorateJobRows() {
    const rows = [...document.querySelectorAll(".job-row[data-job-id]")];
    if (!rows.length) return;

    for (const row of rows) {
      if (row.dataset.jpPlanDecorated === "true") continue;
      row.dataset.jpPlanDecorated = "true";

      const plan = await loadPlanForJob(row.dataset.jobId);
      if (!plan) continue;

      const action = document.createElement("button");
      action.type = "button";
      action.className = "button secondary";
      action.dataset.openJobPlan = plan.id;
      action.textContent = "Open plan";
      action.title = plan.status === "completed" ? "Open finalised plan" : "Open Job Planner plan";
      action.style.marginLeft = "10px";
      action.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openPlanDirect(plan.id);
      });

      const right = row.lastElementChild;
      if (right) {
        right.style.display = "flex";
        right.style.alignItems = "center";
        right.style.gap = "8px";
        right.appendChild(action);
      } else {
        row.appendChild(action);
      }
    }
  }

  function rememberJobFromClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest("[data-job-id], [data-recurring-job-id], [data-history-job]");
    if (!row) return;
    currentJobId = row.dataset.jobId || row.dataset.recurringJobId || row.dataset.historyJob || null;
  }

  document.addEventListener("click", rememberJobFromClick, true);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getJobIdFromPage() {
    if (currentJobId) return currentJobId;
    const back = document.getElementById("backJobs");
    return back?.dataset?.jobId || null;
  }

  async function getCurrentJob() {
    const jobId = getJobIdFromPage();
    if (!jobId) return null;
    const { data, error } = await supabase
      .from("jobs")
      .select("id,status,completed_at,completion_notes,customer_signoff_name,customer_signoff_comments,customer_signature,customer_signed_at,recurring,recurring_active")
      .eq("id", jobId)
      .maybeSingle();
    if (error) {
      console.warn("JobPilot completion lookup:", error);
      return null;
    }
    return data || null;
  }

  async function saveCompletionNotes(jobId, notes) {
    const { error } = await supabase
      .from("jobs")
      .update({ completion_notes: notes || null })
      .eq("id", jobId);
    if (error) throw error;
  }

  function signatureModal(job) {
    const modal = document.createElement("div");
    modal.className = "modal show";
    modal.innerHTML = `
      <div class="modal-content" style="max-width:620px">
        <div class="modal-header">
          <div>
            <h2>Customer Sign-Off</h2>
            <p>Optional confirmation from the customer.</p>
          </div>
          <button type="button" class="close">×</button>
        </div>
        <form id="jpSignoffForm">
          <label>Customer Name</label>
          <input id="jpSignoffName" value="${escapeHtml(job.customer_signoff_name || "")}" placeholder="Customer name">
          <label>Customer Comments</label>
          <textarea id="jpSignoffComments" placeholder="Optional comments">${escapeHtml(job.customer_signoff_comments || "")}</textarea>
          <label>Signature</label>
          <div style="border:1px solid var(--border,#d1d5db);border-radius:8px;background:#fff;overflow:hidden">
            <canvas id="jpSignatureCanvas" width="560" height="190" style="display:block;width:100%;height:auto;touch-action:none;cursor:crosshair"></canvas>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px">
            <button type="button" id="jpClearSignature" class="button secondary">Clear signature</button>
          </div>
          <div class="modal-actions">
            <button type="button" class="button secondary close">Cancel</button>
            <button type="submit" class="button primary">Save Customer Sign-Off</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const canvas = modal.querySelector("#jpSignatureCanvas");
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    let drawing = false;
    let hasDrawn = false;

    function point(event) {
      const rect = canvas.getBoundingClientRect();
      const source = event.touches?.[0] || event;
      return {
        x: (source.clientX - rect.left) * (canvas.width / rect.width),
        y: (source.clientY - rect.top) * (canvas.height / rect.height)
      };
    }
    function start(event) {
      event.preventDefault();
      drawing = true;
      hasDrawn = true;
      const p = point(event);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function move(event) {
      if (!drawing) return;
      event.preventDefault();
      const p = point(event);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    function end() { drawing = false; }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    if (job.customer_signature) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = job.customer_signature;
      hasDrawn = true;
    }

    const close = () => modal.remove();
    modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", close));
    modal.querySelector("#jpClearSignature").addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
    });

    modal.querySelector("#jpSignoffForm").addEventListener("submit", async event => {
      event.preventDefault();
      const signature = hasDrawn ? canvas.toDataURL("image/png") : null;
      const { error } = await supabase
        .from("jobs")
        .update({
          customer_signoff_name: modal.querySelector("#jpSignoffName").value.trim() || null,
          customer_signoff_comments: modal.querySelector("#jpSignoffComments").value.trim() || null,
          customer_signature: signature,
          customer_signed_at: new Date().toISOString()
        })
        .eq("id", job.id);
      if (error) {
        alert("The customer sign-off could not be saved: " + error.message);
        return;
      }
      modal.remove();
      await renderCompletionSection();
    });
  }

  async function markJobComplete(job) {
    const notes = document.getElementById("jpCompletionNotes")?.value.trim() || "";
    try {
      await saveCompletionNotes(job.id, notes);

      // Use the existing Edit Job workflow so recurring jobs retain their
      // existing behaviour of creating the next appointment when completed.
      const editButton = document.getElementById("editJob");
      if (!editButton) throw new Error("The job editor could not be opened.");
      editButton.click();

      let status = null;
      for (let i = 0; i < 50; i++) {
        await sleep(50);
        status = document.getElementById("editJobStatus");
        if (status) break;
      }
      if (!status) throw new Error("The job editor could not be opened.");
      status.value = "completed";
      document.querySelector("#editJobForm")?.requestSubmit();
    } catch (error) {
      alert("The job could not be completed: " + (error.message || error));
    }
  }

  async function renderCompletionSection() {
    const page = document.getElementById("pageContent");
    if (!page || !page.querySelector("#backJobs")) return;
    const job = await getCurrentJob();
    if (!job) return;

    const existing = page.querySelector("#jpCompletionSection");
    if (existing) existing.remove();

    const section = document.createElement("div");
    section.id = "jpCompletionSection";
    section.className = "panel";
    section.style.marginTop = "20px";
    const completed = String(job.status || "").toLowerCase() === "completed" || !!job.completed_at;
    const signed = !!job.customer_signed_at || !!job.customer_signature || !!job.customer_signoff_name;

    section.innerHTML = `
      <div class="panel-header">
        <div>
          <h2>Completion</h2>
          <p>Record how the job was completed.</p>
        </div>
        ${completed ? '<span class="muted">✓ Job completed</span>' : ''}
      </div>
      <label>Completion Notes</label>
      <textarea id="jpCompletionNotes" placeholder="What was completed? Any issues, materials used or follow-up required?">${escapeHtml(job.completion_notes || "")}</textarea>
      ${job.completed_at ? `<p class="muted" style="margin-top:8px">Completed ${new Date(job.completed_at).toLocaleString("en-GB")}</p>` : ""}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px">
        ${completed ? '<button type="button" id="jpSaveCompletionNotes" class="button secondary">Save Completion Notes</button>' : '<button type="button" id="jpMarkComplete" class="button primary">✓ Mark Job Complete</button>'}
      </div>
      <hr style="margin:25px 0;border:0;border-top:1px solid var(--border,#e5e7eb)">
      <div class="panel-header" style="margin-bottom:10px">
        <div>
          <h2>Customer Sign-Off <span class="muted" style="font-size:.75em;font-weight:400">(Optional)</span></h2>
          <p>Use this when the customer needs to confirm the work.</p>
        </div>
        ${signed ? '<span class="muted">✓ Signed off</span>' : ''}
      </div>
      ${signed ? `
        <div class="detail-list">
          <div><span>Customer</span><strong>${escapeHtml(job.customer_signoff_name || "—")}</strong></div>
          <div><span>Signed</span><strong>${job.customer_signed_at ? new Date(job.customer_signed_at).toLocaleString("en-GB") : "—"}</strong></div>
          <div><span>Comments</span><strong>${escapeHtml(job.customer_signoff_comments || "—")}</strong></div>
        </div>
        ${job.customer_signature ? `<div style="margin-top:15px"><span class="muted">Signature</span><div style="margin-top:6px;border:1px solid var(--border,#e5e7eb);border-radius:8px;background:#fff;padding:8px"><img src="${job.customer_signature}" alt="Customer signature" style="max-width:100%;height:120px;object-fit:contain;display:block"></div></div>` : ""}
        <button type="button" id="jpEditSignoff" class="button secondary" style="margin-top:12px">Edit Sign-Off</button>
      ` : `
        <button type="button" id="jpGetSignoff" class="button secondary">Get Customer Sign-Off</button>
      `}
    `;

    page.appendChild(section);

    section.querySelector("#jpMarkComplete")?.addEventListener("click", () => markJobComplete(job));
    section.querySelector("#jpSaveCompletionNotes")?.addEventListener("click", async () => {
      try {
        await saveCompletionNotes(job.id, section.querySelector("#jpCompletionNotes")?.value.trim() || "");
        alert("Completion notes saved.");
      } catch (error) {
        alert("Could not save completion notes: " + error.message);
      }
    });
    section.querySelector("#jpGetSignoff")?.addEventListener("click", () => signatureModal(job));
    section.querySelector("#jpEditSignoff")?.addEventListener("click", () => signatureModal(job));
  }

  let completionRenderTimer = null;
  function scheduleCompletionRender() {
    clearTimeout(completionRenderTimer);
    completionRenderTimer = setTimeout(() => {
      renderCompletionSection().catch(error => console.warn("JobPilot completion section:", error));
    }, 50);
  }

  const observer = new MutationObserver(() => {
    decorateJobRows().catch(error => console.warn("JobPilot plan cards:", error));
    scheduleCompletionRender();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  decorateJobRows();
  scheduleCompletionRender();
})();
