import { supabase } from "../supabase.js";

// Prevent duplicate initialization if this module is loaded more than once.
if (window.__jobPilotAssignmentInitialized) {
  console.debug("JobPilot job assignment already initialized");
} else {
  window.__jobPilotAssignmentInitialized = true;

  let assignableUsers = [];
  let usersLoaded = false;
  let usersLoading = false;
  let assignmentEnabled = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function resolveCompanyPlan() {
    const existing = window.JobPilotCompany?.company;
    if (existing?.plan) return String(existing.plan).toLowerCase();
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return "solo";
    const { data: membership } = await supabase.from("company_members").select("company_id").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!membership?.company_id) return "solo";
    const { data: company } = await supabase.from("companies").select("plan").eq("id", membership.company_id).maybeSingle();
    return String(company?.plan || "solo").toLowerCase();
  }

  async function loadAssignableUsers() {
    if (usersLoaded) return assignableUsers;
    if (usersLoading) return assignableUsers;
    usersLoading = true;
    try {
      const plan = await resolveCompanyPlan();
      assignmentEnabled = plan === "business" || plan === "pro";
      if (!assignmentEnabled) {
        assignableUsers = [];
        usersLoaded = true;
        return assignableUsers;
      }
      const { data, error } = await supabase.rpc("list_my_assignable_users");
      if (error) throw error;
      assignableUsers = Array.isArray(data) ? data : [];
      usersLoaded = true;
    } catch (error) {
      console.error("JobPilot job assignment users:", error);
      assignableUsers = [];
      usersLoaded = true;
    } finally {
      usersLoading = false;
    }
    return assignableUsers;
  }

  function assignmentValue(form) {
    return form?.querySelector("#jobAssignedUser")?.value || null;
  }

  function patchJobPayload(payload) {
    const form = document.querySelector("#jobForm, #editJobForm");
    if (!assignmentEnabled || !form?.querySelector("#jobAssignedUser")) return payload;
    const selected = assignmentValue(form);
    if (Array.isArray(payload)) return payload.map(item => ({ ...item, assigned_user_id: selected }));
    return { ...payload, assigned_user_id: selected };
  }

  try {
    const originalFrom = supabase.from.bind(supabase);
    supabase.from = table => {
      const builder = originalFrom(table);
      if (table !== "jobs") return builder;
      const originalInsert = builder.insert.bind(builder);
      builder.insert = (values, options) => originalInsert(patchJobPayload(values), options);
      const originalUpdate = builder.update.bind(builder);
      builder.update = (values, options) => originalUpdate(patchJobPayload(values), options);
      return builder;
    };
  } catch (error) {
    console.error("JobPilot job assignment integration:", error);
  }

  async function getEditJobAssignment(form) {
    try {
      const customerId = form.querySelector("#editJobCustomer")?.value;
      const title = form.querySelector("#editJobTitle")?.value?.trim();
      const scheduledDate = form.querySelector("#editJobDate")?.value || null;
      const scheduledTime = form.querySelector("#editJobTime")?.value || null;
      if (!customerId || !title) return "";
      let query = supabase.from("jobs").select("assigned_user_id,created_at").eq("customer_id", customerId).eq("title", title).limit(20);
      if (scheduledDate) query = query.eq("scheduled_date", scheduledDate);
      if (scheduledTime) query = query.eq("scheduled_time", scheduledTime);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return "";
      return data?.[0]?.assigned_user_id || "";
    } catch {
      return "";
    }
  }

  function addAssignmentField(form, currentValue = "") {
    if (!form || form.querySelector("#jobAssignedUser") || form.querySelector("[data-jobpilot-assignment-field]") || !assignmentEnabled || !assignableUsers.length) return;
    const customerField = form.querySelector("#jobCustomer, #editJobCustomer");
    const wrapper = document.createElement("div");
    wrapper.id = "jobpilot-assignment-field";
    wrapper.dataset.jobpilotAssignmentField = "true";
    wrapper.innerHTML = `
      <label for="jobAssignedUser">Assign to</label>
      <select id="jobAssignedUser">
        <option value="">Unassigned</option>
        ${assignableUsers.map(user => {
          const id = user.user_id || "";
          const name = user.full_name || user.email || "Team member";
          const role = user.role ? ` · ${String(user.role).replace(/^./, c => c.toUpperCase())}` : "";
          return `<option value="${escapeHtml(id)}" ${String(id) === String(currentValue || "") ? "selected" : ""}>${escapeHtml(name)}${escapeHtml(role)}</option>`;
        }).join("")}
      </select>
      <small class="muted">Assign or reassign this job to a team member.</small>
    `;
    if (customerField?.parentElement) customerField.parentElement.insertAdjacentElement("afterend", wrapper);
    else form.prepend(wrapper);
  }

  function addStyles() {
    if (document.getElementById("jobpilot-assignment-styles")) return;
    const style = document.createElement("style");
    style.id = "jobpilot-assignment-styles";
    style.textContent = `#jobpilot-assignment-field{margin:12px 0}#jobpilot-assignment-field label{display:block;margin-bottom:6px;font-weight:600}#jobpilot-assignment-field select{width:100%;box-sizing:border-box}#jobpilot-assignment-field small{display:block;margin-top:5px}`;
    document.head.appendChild(style);
  }

  async function enhanceJobForm(form) {
    if (!form || form.querySelector("#jobAssignedUser") || form.querySelector("[data-jobpilot-assignment-field]")) return;
    addStyles();
    await loadAssignableUsers();
    if (!form.isConnected || form.querySelector("#jobAssignedUser") || form.querySelector("[data-jobpilot-assignment-field]") || !assignmentEnabled || !assignableUsers.length) return;
    let currentValue = "";
    if (form.id === "editJobForm") {
      currentValue = await getEditJobAssignment(form);
      if (!form.isConnected) return;
    }
    addAssignmentField(form, currentValue);
  }

  let observerScheduled = false;
  const observer = new MutationObserver(() => {
    if (observerScheduled) return;
    observerScheduled = true;
    queueMicrotask(() => {
      observerScheduled = false;
      const createForm = document.getElementById("jobForm");
      const editForm = document.getElementById("editJobForm");
      if (createForm) enhanceJobForm(createForm);
      if (editForm) enhanceJobForm(editForm);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
