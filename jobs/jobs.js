import { supabase } from "../supabase.js";

export function createJobsModule({
  getCurrentUser,
  getCustomers,
  showPage,
  escapeHtml,
  convertJobToInvoice
}) {
  let jobs = [];

  async function loadJobs() {
    const { data, error } = await supabase.from("jobs").select("*").order("scheduled_date", { ascending: true, nullsFirst: false });
    if (error) { console.error("Jobs:", error); return; }
    jobs = data || [];
  }

  function getJobs() { return jobs; }

  function getCustomerName(customerId) {
    const customer = getCustomers().find(c => String(c.id) === String(customerId));
    return customer ? escapeHtml(customer.name) : "Unknown customer";
  }

  function renderJobsPage(content) {
    content.innerHTML = `
      <div class="page-actions">
        <div><h2>Jobs</h2><p>Schedule and manage your work.</p></div>
        <button id="addJobButton" class="button primary">+ Add Job</button>
      </div>
      <div class="panel">
        ${jobs.length ? jobs.map(job => `
          <div class="job-row" data-job-id="${job.id}" style="cursor:pointer;">
            <div><strong>${escapeHtml(job.title)}</strong><div class="muted">${getCustomerName(job.customer_id)}${job.scheduled_date ? " • " + job.scheduled_date : ""}</div></div>
            <div><span>${escapeHtml(job.status || "pending")}</span><strong>£${Number(job.price || 0).toFixed(2)}</strong></div>
          </div>
        `).join("") : `<div class="empty-state"><div class="empty-icon">📋</div><h3>No jobs yet</h3><p>Add your first job.</p></div>`}
      </div>`;
    document.getElementById("addJobButton").addEventListener("click", showAddJobForm);
    content.querySelectorAll("[data-job-id]").forEach(row => row.addEventListener("click", () => showJobProfile(row.dataset.jobId)));
  }

  function showJobProfile(jobId) {
    const job = jobs.find(item => String(item.id) === String(jobId));
    if (!job) return;
    const customer = getCustomers().find(c => String(c.id) === String(job.customer_id));
    const content = document.getElementById("pageContent");
    const isRecurring = job.recurring === true || job.recurring === "true";
    let recurringJobs = [];
    if (isRecurring) {
      const seriesId = job.recurring_parent_id || job.id;
      recurringJobs = jobs.filter(item => String(item.recurring_parent_id || item.id) === String(seriesId)).sort((a, b) => (a.scheduled_date || "9999-12-31").localeCompare(b.scheduled_date || "9999-12-31"));
    }
    const recurringInterval = Number(job.recurring_interval_weeks) || 4;
    const nextRecurringJob = recurringJobs.find(item => !["completed", "cancelled"].includes(String(item.status).toLowerCase()) && String(item.id) !== String(job.id));
    const recurringSection = isRecurring ? `
      <div class="panel"><h2>🔄 Recurring Job</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin:15px 0;">
          <button id="skipRecurringJob" class="button secondary">⏭ Skip Next Appointment</button>
          <button id="stopRecurringJob" class="button danger">⏹ Stop Recurring</button>
        </div>
        <div class="detail-list"><div><span>Frequency</span><strong>Every ${recurringInterval} weeks</strong></div><div><span>Next Appointment</span><strong>${nextRecurringJob ? (nextRecurringJob.scheduled_date || "Not scheduled") : "No future appointment"}</strong></div></div>
        <h3 style="margin-top:25px;">Recurring Series</h3>
        <div>${recurringJobs.length ? recurringJobs.map(seriesJob => `
          <div class="job-row" style="cursor:pointer;margin-bottom:8px;" data-recurring-job-id="${seriesJob.id}">
            <div><strong>${seriesJob.scheduled_date || "No date"}</strong><div class="muted">${escapeHtml(seriesJob.title || "Job")}</div></div>
            <div><span class="muted">${escapeHtml(seriesJob.status || "pending")}</span><strong>£${Number(seriesJob.price || 0).toFixed(2)}</strong></div>
          </div>`).join("") : `<div class="empty-state"><p>No recurring appointments found.</p></div>`}</div>
      </div>` : "";

    document.getElementById("pageTitle").textContent = job.title;
    document.getElementById("pageSubtitle").textContent = "Job details";
    content.innerHTML = `
      <div class="page-actions">
        <button id="backJobs" class="button secondary">← Jobs</button>
        <div><button id="editJob" class="button primary">Edit Job</button>
          ${String(job.status).toLowerCase() === "invoiced" ? `<button class="button secondary" disabled>✓ Invoiced</button>` : `<button id="convertJobInvoice" class="button primary">🧾 Convert to Invoice</button>`}
          <button id="deleteJob" class="button danger">Delete</button>
        </div>
      </div>
      <div class="content-grid">
        <div class="panel"><h2>Job Details</h2><div class="detail-list">
          <div><span>Customer</span><strong>${customer ? escapeHtml(customer.name) : "Unknown customer"}</strong></div>
          <div><span>Title</span><strong>${escapeHtml(job.title)}</strong></div>
          <div><span>Description</span><strong>${escapeHtml(job.description || "—")}</strong></div>
          <div><span>Date</span><strong>${job.scheduled_date || "—"}</strong></div>
          <div><span>Time</span><strong>${job.scheduled_time || "—"}</strong></div>
          <div><span>Status</span><strong>${escapeHtml(job.status || "pending")}</strong></div>
          <div><span>Notes</span><strong>${escapeHtml(job.notes || "—")}</strong></div>
        </div></div>
        <div class="panel"><h2>Job Value</h2><div class="detail-list"><div><span>Price</span><strong>£${Number(job.price || 0).toFixed(2)}</strong></div></div></div>
      </div>${recurringSection}`;

    document.getElementById("backJobs").addEventListener("click", () => showPage("jobs"));
    document.getElementById("editJob").addEventListener("click", () => showEditJobForm(job.id));
    document.getElementById("deleteJob").addEventListener("click", () => deleteJob(job.id));
    const invoiceButton = document.getElementById("convertJobInvoice");
    if (invoiceButton && convertJobToInvoice) invoiceButton.addEventListener("click", () => convertJobToInvoice(job.id));
    const skipRecurringButton = document.getElementById("skipRecurringJob");
    if (skipRecurringButton) skipRecurringButton.addEventListener("click", () => skipNextRecurringJob(job.id));
    const stopRecurringButton = document.getElementById("stopRecurringJob");
    if (stopRecurringButton) stopRecurringButton.addEventListener("click", () => stopRecurringJob(job.id));
    content.querySelectorAll("[data-recurring-job-id]").forEach(row => row.addEventListener("click", () => showJobProfile(row.dataset.recurringJobId)));
  }

  function showAddJobForm() {
    const customers = getCustomers();
    const modal = document.createElement("div");
    modal.className = "modal show";
    modal.innerHTML = `
      <div class="modal-content"><div class="modal-header"><div><h2>Add Job</h2><p>Schedule work for a customer.</p></div><button class="close">×</button></div>
      <form id="jobForm"><label>Customer *</label><select id="jobCustomer" required><option value="">Select customer</option>${customers.map(customer => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`).join("")}</select>
      <label>Job Title *</label><input id="jobTitle" required placeholder="e.g. Window cleaning"><label>Description</label><textarea id="jobDescription"></textarea>
      <label>Date</label><input id="jobDate" type="date"><label>Time</label><input id="jobTime" type="time"><label>Status</label>
      <select id="jobStatus"><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
      <label>Recurring Job</label><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="jobRecurring">Repeat this job</label>
      <div id="jobRecurringOptions" style="display:none;"><label>Repeat Every</label><select id="jobRecurringInterval"><option value="4">Every 4 weeks</option><option value="6">Every 6 weeks</option><option value="8">Every 8 weeks</option></select></div>
      <label>Price</label><input id="jobPrice" type="number" step="0.01" min="0" placeholder="0.00"><label>Notes</label><textarea id="jobNotes"></textarea>
      <div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Save Job</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => modal.remove()));
    const recurringCheckbox = modal.querySelector("#jobRecurring");
    const recurringOptions = modal.querySelector("#jobRecurringOptions");
    recurringCheckbox.addEventListener("change", () => { recurringOptions.style.display = recurringCheckbox.checked ? "block" : "none"; });
    modal.querySelector("#jobForm").addEventListener("submit", async event => {
      event.preventDefault();
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      const recurring = recurringCheckbox.checked;
      const recurringInterval = recurring ? Number(modal.querySelector("#jobRecurringInterval").value) : null;
      const job = { user_id: currentUser.id, customer_id: modal.querySelector("#jobCustomer").value, title: modal.querySelector("#jobTitle").value.trim(), description: modal.querySelector("#jobDescription").value.trim(), scheduled_date: modal.querySelector("#jobDate").value || null, scheduled_time: modal.querySelector("#jobTime").value || null, status: modal.querySelector("#jobStatus").value, price: Number(modal.querySelector("#jobPrice").value) || 0, notes: modal.querySelector("#jobNotes").value.trim(), recurring, recurring_interval_weeks: recurringInterval, recurring_active: recurring };
      const { data: savedJob, error } = await supabase.from("jobs").insert(job).select().single();
      if (error) { alert("The job could not be saved:\n\n" + error.message); return; }
      if (recurring && recurringInterval && savedJob && savedJob.scheduled_date) {
        const nextDate = new Date(`${savedJob.scheduled_date}T12:00:00`);
        nextDate.setDate(nextDate.getDate() + recurringInterval * 7);
        const nextJob = { user_id: currentUser.id, customer_id: savedJob.customer_id, title: savedJob.title, description: savedJob.description, scheduled_date: nextDate.toISOString().split("T")[0], scheduled_time: savedJob.scheduled_time, status: "scheduled", price: savedJob.price, notes: savedJob.notes, recurring: true, recurring_interval_weeks: recurringInterval, recurring_parent_id: savedJob.id, recurring_active: true };
        const { error: nextJobError } = await supabase.from("jobs").insert(nextJob);
        if (nextJobError) { alert("The first appointment was saved, but the next recurring appointment could not be created:\n\n" + nextJobError.message); modal.remove(); await loadJobs(); showPage("jobs"); return; }
      }
      modal.remove(); await loadJobs(); showPage("jobs");
    });
  }

  function showEditJobForm(jobId) {
    const job = jobs.find(item => String(item.id) === String(jobId));
    if (!job) return;
    const modal = document.createElement("div");
    modal.className = "modal show";
    const isRecurring = job.recurring === true || job.recurring === "true";
    const recurringInterval = Number(job.recurring_interval_weeks) || 4;
    const customers = getCustomers();
    modal.innerHTML = `
      <div class="modal-content"><div class="modal-header"><div><h2>Edit Job</h2><p>Update job details.</p></div><button class="close">×</button></div>
      <form id="editJobForm"><label>Customer *</label><select id="editJobCustomer" required>${customers.map(customer => `<option value="${customer.id}" ${String(customer.id) === String(job.customer_id) ? "selected" : ""}>${escapeHtml(customer.name)}</option>`).join("")}</select>
      <label>Job Title *</label><input id="editJobTitle" value="${escapeHtml(job.title || "")}" required><label>Description</label><textarea id="editJobDescription">${escapeHtml(job.description || "")}</textarea>
      <label>Date</label><input id="editJobDate" type="date" value="${job.scheduled_date || ""}"><label>Time</label><input id="editJobTime" type="time" value="${job.scheduled_time || ""}"><label>Status</label>
      <select id="editJobStatus"><option value="pending" ${job.status === "pending" ? "selected" : ""}>Pending</option><option value="scheduled" ${job.status === "scheduled" ? "selected" : ""}>Scheduled</option><option value="completed" ${job.status === "completed" ? "selected" : ""}>Completed</option><option value="cancelled" ${job.status === "cancelled" ? "selected" : ""}>Cancelled</option><option value="invoiced" ${job.status === "invoiced" ? "selected" : ""}>Invoiced</option></select>
      <label>Recurring Job</label><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="editJobRecurring" ${isRecurring ? "checked" : ""}>Repeat this job</label>
      <div id="editJobRecurringOptions" style="display:${isRecurring ? "block" : "none"};"><label>Repeat Every</label><select id="editJobRecurringInterval"><option value="4" ${recurringInterval === 4 ? "selected" : ""}>Every 4 weeks</option><option value="6" ${recurringInterval === 6 ? "selected" : ""}>Every 6 weeks</option><option value="8" ${recurringInterval === 8 ? "selected" : ""}>Every 8 weeks</option></select></div>
      <label>Price</label><input id="editJobPrice" type="number" step="0.01" min="0" value="${Number(job.price || 0).toFixed(2)}"><label>Notes</label><textarea id="editJobNotes">${escapeHtml(job.notes || "")}</textarea>
      <div class="modal-actions"><button type="button" class="button secondary close">Cancel</button><button type="submit" class="button primary">Save Changes</button></div></form></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll(".close").forEach(button => button.addEventListener("click", () => modal.remove()));
    const recurringCheckbox = modal.querySelector("#editJobRecurring");
    const recurringOptions = modal.querySelector("#editJobRecurringOptions");
    recurringCheckbox.addEventListener("change", () => { recurringOptions.style.display = recurringCheckbox.checked ? "block" : "none"; });
    modal.querySelector("#editJobForm").addEventListener("submit", async event => {
      event.preventDefault();
      const recurring = recurringCheckbox.checked;
      const recurringInterval = recurring ? Number(modal.querySelector("#editJobRecurringInterval").value) : null;
      const updates = { customer_id: modal.querySelector("#editJobCustomer").value, title: modal.querySelector("#editJobTitle").value.trim(), description: modal.querySelector("#editJobDescription").value.trim(), scheduled_date: modal.querySelector("#editJobDate").value || null, scheduled_time: modal.querySelector("#editJobTime").value || null, status: modal.querySelector("#editJobStatus").value, price: Number(modal.querySelector("#editJobPrice").value) || 0, notes: modal.querySelector("#editJobNotes").value.trim(), recurring, recurring_interval_weeks: recurringInterval };
      const { error } = await supabase.from("jobs").update(updates).eq("id", job.id);
      if (error) { alert("The job could not be updated:\n\n" + error.message); return; }
      if (updates.status === "completed" && job.recurring && job.recurring_active) await createNextRecurringAppointment({ ...job, ...updates });
      modal.remove(); await loadJobs(); showJobProfile(job.id);
    });
  }

  async function createNextRecurringAppointment(sourceJob) {
    if (!sourceJob || !sourceJob.recurring || !sourceJob.recurring_active || !sourceJob.scheduled_date) return null;
    const interval = Number(sourceJob.recurring_interval_weeks) || 4;
    const seriesId = sourceJob.recurring_parent_id || sourceJob.id;
    let candidateDate = new Date(`${sourceJob.scheduled_date}T12:00:00`);
    let existingJob = true;
    while (existingJob) {
      candidateDate.setDate(candidateDate.getDate() + interval * 7);
      const candidateDateString = candidateDate.toISOString().split("T")[0];
      existingJob = jobs.find(item => String(item.recurring_parent_id || item.id) === String(seriesId) && String(item.scheduled_date) === String(candidateDateString));
    }
    const nextJob = { user_id: sourceJob.user_id, customer_id: sourceJob.customer_id, title: sourceJob.title, description: sourceJob.description, scheduled_date: candidateDate.toISOString().split("T")[0], scheduled_time: sourceJob.scheduled_time, status: "scheduled", price: sourceJob.price, notes: sourceJob.notes, recurring: true, recurring_interval_weeks: interval, recurring_parent_id: seriesId, recurring_active: true };
    const { data, error } = await supabase.from("jobs").insert(nextJob).select().single();
    if (error) { console.error("Could not create next recurring appointment:", error); alert("Could not create the next recurring appointment:\n\n" + error.message); return null; }
    jobs.push(data);
    return data;
  }

  async function skipNextRecurringJob(jobId) {
    const job = jobs.find(item => String(item.id) === String(jobId));
    if (!job) return;
    if (!job.recurring || !job.recurring_active) { alert("This job is not currently recurring."); return; }
    if (!confirm("Skip the next recurring appointment?")) return;
    const currentSeriesId = job.recurring_parent_id || job.id;
    const nextJob = jobs.filter(item => String(item.recurring_parent_id || item.id) === String(currentSeriesId) && String(item.id) !== String(job.id) && String(item.status).toLowerCase() !== "completed" && String(item.status).toLowerCase() !== "cancelled").sort((a,b) => (a.scheduled_date || "9999-12-31").localeCompare(b.scheduled_date || "9999-12-31"))[0];
    if (!nextJob) { alert("There is no upcoming recurring appointment to skip."); return; }
    const { error } = await supabase.from("jobs").update({ status: "cancelled" }).eq("id", nextJob.id);
    if (error) { alert("Could not skip the appointment:\n\n" + error.message); return; }
    await createNextRecurringAppointment(nextJob); await loadJobs(); showJobProfile(job.id); alert("The next recurring appointment has been skipped.");
  }

  async function stopRecurringJob(jobId) {
    const job = jobs.find(item => String(item.id) === String(jobId));
    if (!job) return;
    if (!job.recurring) { alert("This job is not a recurring job."); return; }
    if (!confirm("Stop this recurring job?\n\nExisting appointments will remain, but no new recurring appointments will be created.")) return;
    const seriesId = job.recurring_parent_id || job.id;
    const { error } = await supabase.from("jobs").update({ recurring_active: false }).or(`id.eq.${seriesId},recurring_parent_id.eq.${seriesId}`);
    if (error) { alert("Could not stop recurring:\n\n" + error.message); return; }
    await loadJobs(); showJobProfile(job.id); alert("Recurring appointments have been stopped.");
  }

  async function deleteJob(jobId) {
    const job = jobs.find(item => String(item.id) === String(jobId));
    if (!job) return;
    if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
    if (error) { alert(error.message); return; }
    await loadJobs(); showPage("jobs");
  }

  return { loadJobs, getJobs, renderJobsPage, showJobProfile, showAddJobForm, showEditJobForm, createNextRecurringAppointment, skipNextRecurringJob, stopRecurringJob, deleteJob };
}
