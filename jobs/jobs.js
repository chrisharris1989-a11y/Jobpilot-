// =====================================================
// JOBS
// JobPilotCLEAN
// =====================================================
//
// Handles:
// - Jobs page
// - New jobs
// - Job profiles
// - Editing jobs
// - Deleting jobs
// - Job status
// - Job scheduling
// - Job -> Invoice conversion
// =====================================================

import { supabase } from "../supabase.js";
import {
  currentUser,
  customers,
  jobs,
  loadJobs,
  showPage
} from "../core/app-core.js";


// =====================================================
// RENDER JOBS PAGE
// =====================================================

export function renderJobsPage(content) {

  content.innerHTML = `

    <div class="page-actions">

      <div>
        <h2>Jobs</h2>
        <p>Manage and track your jobs.</p>
      </div>

      <button
        id="addJobButton"
        class="button primary"
        type="button"
      >
        + New Job
      </button>

    </div>

    <div class="panel">

      ${
        jobs.length
          ? jobs.map(job => {

              const customer =
                customers.find(
                  customer =>
                    String(customer.id) ===
                    String(job.customer_id)
                );

              return `

                <div
                  class="job-row"
                  data-job-id="${escapeHtml(job.id)}"
                  style="cursor:pointer;"
                >

                  <div>

                    <strong>
                      ${escapeHtml(
                        job.title || "Untitled Job"
                      )}
                    </strong>

                    <div class="muted">

                      ${
                        customer
                          ? escapeHtml(customer.name)
                          : "Unknown customer"
                      }

                      ${
                        job.scheduled_date
                          ? " • " +
                            escapeHtml(
                              job.scheduled_date
                            )
                          : ""
                      }

                    </div>

                  </div>

                  <div>

                    <strong>
                      £${Number(
                        job.price || 0
                      ).toFixed(2)}
                    </strong>

                    <div class="muted">
                      ${escapeHtml(
                        job.status || "pending"
                      )}
                    </div>

                  </div>

                </div>

              `;

            }).join("")

          : `

            <div class="empty-state">

              <div class="empty-icon">🔧</div>

              <h3>No jobs yet</h3>

              <p>
                Create your first job.
              </p>

            </div>

          `
      }

    </div>
  `;


  const addJobButton =
    document.getElementById(
      "addJobButton"
    );

  if (addJobButton) {

    addJobButton.addEventListener(
      "click",
      showAddJobForm
    );

  }


  content
    .querySelectorAll("[data-job-id]")
    .forEach(row => {

      row.addEventListener(
        "click",
        () => {

          showJobProfile(
            row.dataset.jobId
          );

        }
      );

    });

}


// =====================================================
// ADD JOB FORM
// =====================================================

export function showAddJobForm() {

  const modal =
    document.createElement("div");

  modal.className =
    "modal show";


  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <h2>New Job</h2>

          <p>
            Create a new job for a customer.
          </p>

        </div>

        <button
          class="close"
          type="button"
        >
          ×
        </button>

      </div>


      <form id="jobForm">

        <label>Customer *</label>

        <select
          id="jobCustomer"
          required
        >

          <option value="">
            Select customer
          </option>

          ${customers.map(customer => `

            <option
              value="${escapeHtml(customer.id)}"
            >
              ${escapeHtml(customer.name)}
            </option>

          `).join("")}

        </select>


        <label>Job Title *</label>

        <input
          id="jobTitle"
          type="text"
          placeholder="Job title"
          required
        >


        <label>Description</label>

        <textarea
          id="jobDescription"
          placeholder="Describe the work..."
        ></textarea>


        <label>Price</label>

        <input
          id="jobPrice"
          type="number"
          step="0.01"
          min="0"
          value="0"
        >


        <label>Scheduled Date</label>

        <input
          id="jobScheduledDate"
          type="date"
        >


        <label>Scheduled Time</label>

        <input
          id="jobScheduledTime"
          type="time"
        >


        <label>Status</label>

        <select id="jobStatus">

          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>

        </select>


        <label>Notes</label>

        <textarea
          id="jobNotes"
          placeholder="Additional notes..."
        ></textarea>


        <div class="modal-actions">

          <button
            type="button"
            class="button secondary close"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="button primary"
          >
            Save Job
          </button>

        </div>

      </form>

    </div>

  `;


  document.body.appendChild(modal);


  modal
    .querySelectorAll(".close")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => modal.remove()
      );

    });


  modal
    .querySelector("#jobForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const job = {

          user_id:
            currentUser.id,

          customer_id:
            modal.querySelector(
              "#jobCustomer"
            ).value,

          title:
            modal.querySelector(
              "#jobTitle"
            ).value.trim(),

          description:
            modal.querySelector(
              "#jobDescription"
            ).value.trim(),

          scheduled_date:
            modal.querySelector(
              "#jobScheduledDate"
            ).value || null,

          scheduled_time:
            modal.querySelector(
              "#jobScheduledTime"
            ).value || null,

          status:
            modal.querySelector(
              "#jobStatus"
            ).value,

          price:
            Number(
              modal.querySelector(
                "#jobPrice"
              ).value
            ) || 0,

          notes:
            modal.querySelector(
              "#jobNotes"
            ).value.trim()

        };


        try {

          const { error } =
            await supabase
              .from("jobs")
              .insert(job);


          if (error) {
            throw error;
          }


          modal.remove();

          await loadJobs();

          showPage("jobs");


        } catch (error) {

          console.error(
            "Save job error:",
            error
          );

          alert(
            "The job could not be saved:\n\n" +
            (error?.message || error)
          );

        }

      }
    );

}


// =====================================================
// JOB PROFILE
// =====================================================

export function showJobProfile(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) ===
        String(jobId)
    );

  if (!job) {
    return;
  }


  const customer =
    customers.find(
      item =>
        String(item.id) ===
        String(job.customer_id)
    );


  const content =
    document.getElementById(
      "pageContent"
    );

  if (!content) {
    return;
  }


  document.getElementById(
    "pageTitle"
  ).textContent =
    job.title || "Job";

  document.getElementById(
    "pageSubtitle"
  ).textContent =
    "Job details";


  content.innerHTML = `

    <div class="page-actions">

      <button
        id="backJobs"
        class="button secondary"
        type="button"
      >
        ← Jobs
      </button>

      <div>

        ${
          String(job.status).toLowerCase() !== "invoiced"
            ? `
              <button
                id="invoiceJob"
                class="button primary"
                type="button"
              >
                🧾 Create Invoice
              </button>
            `
            : `
              <button
                class="button secondary"
                type="button"
                disabled
              >
                ✓ Invoiced
              </button>
            `
        }

        <button
          id="editJob"
          class="button primary"
          type="button"
        >
          Edit Job
        </button>

        <button
          id="deleteJob"
          class="button danger"
          type="button"
        >
          Delete
        </button>

      </div>

    </div>


    <div class="content-grid">

      <div class="panel">

        <h2>Job Details</h2>

        <div class="detail-list">

          <div>
            <span>Job</span>
            <strong>${escapeHtml(job.title || "—")}</strong>
          </div>

          <div>
            <span>Customer</span>
            <strong>${
              customer
                ? escapeHtml(customer.name)
                : "Unknown customer"
            }</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>${escapeHtml(job.status || "pending")}</strong>
          </div>

          <div>
            <span>Description</span>
            <strong>${escapeHtml(job.description || "—")}</strong>
          </div>

          <div>
            <span>Scheduled Date</span>
            <strong>${escapeHtml(job.scheduled_date || "—")}</strong>
          </div>

          <div>
            <span>Scheduled Time</span>
            <strong>${escapeHtml(job.scheduled_time || "—")}</strong>
          </div>

          <div>
            <span>Notes</span>
            <strong>${escapeHtml(job.notes || "—")}</strong>
          </div>

        </div>

      </div>

      <div class="panel">

        <h2>Financial Summary</h2>

        <div class="detail-list">

          <div>
            <span>Job Price</span>
            <strong>£${Number(job.price || 0).toFixed(2)}</strong>
          </div>

        </div>

      </div>

    </div>

  `;


  const backButton =
    document.getElementById("backJobs");

  if (backButton) {
    backButton.addEventListener(
      "click",
      () => showPage("jobs")
    );
  }


  const editButton =
    document.getElementById("editJob");

  if (editButton) {
    editButton.addEventListener(
      "click",
      () => showEditJobForm(job.id)
    );
  }


  const deleteButton =
    document.getElementById("deleteJob");

  if (deleteButton) {
    deleteButton.addEventListener(
      "click",
      () => deleteJob(job.id)
    );
  }


  const invoiceButton =
    document.getElementById("invoiceJob");

  if (invoiceButton) {
    invoiceButton.addEventListener(
      "click",
      () => {
        if (typeof window.convertJobToInvoice === "function") {
          window.convertJobToInvoice(job.id);
        } else {
          alert("Invoice functionality is not available yet.");
        }
      }
    );
  }

}


// =====================================================
// EDIT JOB
// =====================================================

export function showEditJobForm(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) ===
        String(jobId)
    );

  if (!job) {
    return;
  }


  const modal =
    document.createElement("div");

  modal.className =
    "modal show";


  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Edit Job</h2>
          <p>Update job details.</p>
        </div>

        <button class="close" type="button">×</button>

      </div>

      <form id="editJobForm">

        <label>Customer *</label>

        <select id="editJobCustomer" required>

          ${customers.map(customer => `
            <option
              value="${escapeHtml(customer.id)}"
              ${
                String(customer.id) ===
                String(job.customer_id)
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(customer.name)}
            </option>
          `).join("")}

        </select>

        <label>Job Title *</label>

        <input
          id="editJobTitle"
          type="text"
          value="${escapeHtml(job.title || "")}"
          required
        >

        <label>Description</label>

        <textarea id="editJobDescription">${escapeHtml(
          job.description || ""
        )}</textarea>

        <label>Price</label>

        <input
          id="editJobPrice"
          type="number"
          step="0.01"
          min="0"
          value="${Number(job.price || 0).toFixed(2)}"
        >

        <label>Scheduled Date</label>

        <input
          id="editJobScheduledDate"
          type="date"
          value="${escapeHtml(job.scheduled_date || "")}"
        >

        <label>Scheduled Time</label>

        <input
          id="editJobScheduledTime"
          type="time"
          value="${escapeHtml(job.scheduled_time || "")}"
        >

        <label>Status</label>

        <select id="editJobStatus">

          <option value="pending" ${job.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="scheduled" ${job.status === "scheduled" ? "selected" : ""}>Scheduled</option>
          <option value="in_progress" ${job.status === "in_progress" ? "selected" : ""}>In Progress</option>
          <option value="completed" ${job.status === "completed" ? "selected" : ""}>Completed</option>
          <option value="cancelled" ${job.status === "cancelled" ? "selected" : ""}>Cancelled</option>
          <option value="invoiced" ${job.status === "invoiced" ? "selected" : ""}>Invoiced</option>

        </select>

        <label>Notes</label>

        <textarea id="editJobNotes">${escapeHtml(
          job.notes || ""
        )}</textarea>

        <div class="modal-actions">

          <button
            type="button"
            class="button secondary close"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="button primary"
          >
            Save Changes
          </button>

        </div>

      </form>

    </div>

  `;


  document.body.appendChild(modal);


  modal
    .querySelectorAll(".close")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => modal.remove()
      );
    });


  modal
    .querySelector("#editJobForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const updates = {

          customer_id:
            modal.querySelector(
              "#editJobCustomer"
            ).value,

          title:
            modal.querySelector(
              "#editJobTitle"
            ).value.trim(),

          description:
            modal.querySelector(
              "#editJobDescription"
            ).value.trim(),

          price:
            Number(
              modal.querySelector(
                "#editJobPrice"
              ).value
            ) || 0,

          scheduled_date:
            modal.querySelector(
              "#editJobScheduledDate"
            ).value || null,

          scheduled_time:
            modal.querySelector(
              "#editJobScheduledTime"
            ).value || null,

          status:
            modal.querySelector(
              "#editJobStatus"
            ).value,

          notes:
            modal.querySelector(
              "#editJobNotes"
            ).value.trim()

        };


        try {

          const { error } =
            await supabase
              .from("jobs")
              .update(updates)
              .eq("id", job.id);

          if (error) {
            throw error;
          }

          modal.remove();

          await loadJobs();

          showJobProfile(job.id);

        } catch (error) {

          console.error(
            "Update job error:",
            error
          );

          alert(
            "The job could not be updated:\n\n" +
            (error?.message || error)
          );

        }

      }
    );

}


// =====================================================
// DELETE JOB
// =====================================================

export async function deleteJob(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) ===
        String(jobId)
    );

  if (!job) {
    return;
  }


  const confirmed =
    confirm(
      `Delete "${job.title || "this job"}"? This cannot be undone.`
    );

  if (!confirmed) {
    return;
  }


  try {

    const { error } =
      await supabase
        .from("jobs")
        .delete()
        .eq("id", job.id);

    if (error) {
      throw error;
    }

    await loadJobs();

    showPage("jobs");

  } catch (error) {

    console.error(
      "Delete job error:",
      error
    );

    alert(
      "The job could not be deleted:\n\n" +
      (error?.message || error)
    );

  }

}


// =====================================================
// JOB STATUS HELPERS
// =====================================================

export function getJobStatusLabel(status) {

  const labels = {
    pending: "Pending",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    invoiced: "Invoiced"
  };

  return labels[
    String(status || "").toLowerCase()
  ] || "Pending";

}


// =====================================================
// JOB PRICE
// =====================================================

export function getJobPrice(job) {

  if (!job) {
    return 0;
  }

  return Number(job.price || 0);

}


// =====================================================
// BACKWARDS COMPATIBILITY
// =====================================================

window.renderJobsPage = renderJobsPage;
window.showAddJobForm = showAddJobForm;
window.showJobProfile = showJobProfile;
window.showEditJobForm = showEditJobForm;
window.deleteJob = deleteJob;
window.getJobStatusLabel = getJobStatusLabel;
window.getJobPrice = getJobPrice;
