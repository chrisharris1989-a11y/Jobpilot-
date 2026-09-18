import { supabase, getCachedUserResponse } from "../supabase.js";

// Job assignment is intentionally event-driven. A global MutationObserver here
// can race with the Add Job modal being created and interfere with the main UI.
if (!window.__jobPilotAssignmentInitialized) {
  window.__jobPilotAssignmentInitialized = true;

  const FIELD_ID = "jobpilot-assignment-field";
  const SELECT_ID = "jobAssignedUser";
  const STYLE_ID = "jobpilot-assignment-styles";
  const WIRED_ATTR = "data-jobpilot-assignment-wired";

  let assignableUsers = [];
  let usersLoaded = false;
  let usersLoading = null;
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
    try {
      const existing = window.JobPilotCompany?.company;
      if (existing?.plan) return String(existing.plan).toLowerCase();

      const { data, error } = await getCachedUserResponse();
      if (error || !data?.user) return "solo";

      const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership?.company_id) return "solo";

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("plan")
        .eq("id", membership.company_id)
        .maybeSingle();

      if (companyError) return "solo";
      return String(company?.plan || "solo").toLowerCase();
    } catch (error) {
      console.warn("JobPilot assignment plan lookup failed:", error);
      return "solo";
    }
  }

  async function loadAssignableUsers() {
    if (usersLoaded) return assignableUsers;
    if (usersLoading) return usersLoading;

    usersLoading = (async () => {
      try {
        const plan = await resolveCompanyPlan();
        assignmentEnabled = ["team", "business", "pro"].includes(plan);

        if (!assignmentEnabled) {
          assignableUsers = [];
          usersLoaded = true;
          return assignableUsers;
        }

        const { data, error } = await supabase.rpc("list_my_assignable_users");
        if (error) throw error;

        assignableUsers = Array.isArray(data) ? data : [];
        usersLoaded = true;
        return assignableUsers;
      } catch (error) {
        console.warn("JobPilot job assignment users could not be loaded:", error);
        assignableUsers = [];
        usersLoaded = true;
        return assignableUsers;
      } finally {
        usersLoading = null;
      }
    })();

    return usersLoading;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${FIELD_ID}{margin:12px 0}
      #${FIELD_ID} label{display:block;margin-bottom:6px;font-weight:600}
      #${FIELD_ID} select{width:100%;box-sizing:border-box}
      #${FIELD_ID} small{display:block;margin-top:5px}
    `;
    document.head.appendChild(style);
  }

  function addAssignmentField(form, currentValue = "") {
    if (!form || !assignmentEnabled || !assignableUsers.length) return;
    if (form.querySelector(`#${SELECT_ID}`) || form.querySelector(`#${FIELD_ID}`)) return;

    const customerField = form.querySelector("#jobCustomer, #editJobCustomer");
    const wrapper = document.createElement("div");
    wrapper.id = FIELD_ID;
    wrapper.innerHTML = `
      <label for="${SELECT_ID}">Assign to</label>
      <select id="${SELECT_ID}">
        <option value="">Unassigned</option>
        ${assignableUsers.map(user => {
          const id = user.user_id || "";
          const name = user.full_name || user.name || user.email || "Team member";
          const role = user.role ? ` · ${String(user.role).replace(/^./, c => c.toUpperCase())}` : "";
          return `<option value="${escapeHtml(id)}" ${String(id) === String(currentValue || "") ? "selected" : ""}>${escapeHtml(name)}${escapeHtml(role)}</option>`;
        }).join("")}
      </select>
      <small class="muted">Assign or reassign this job to a team member.</small>
    `;

    if (customerField?.parentElement) {
      customerField.parentElement.insertAdjacentElement("afterend", wrapper);
    } else {
      form.prepend(wrapper);
    }
  }

  async function getEditJobAssignment(form) {
    try {
      const customerId = form.querySelector("#editJobCustomer")?.value;
      const title = form.querySelector("#editJobTitle")?.value?.trim();
      const scheduledDate = form.querySelector("#editJobDate")?.value || null;
      const scheduledTime = form.querySelector("#editJobTime")?.value || null;

      if (!customerId || !title) return "";

      let query = supabase
        .from("jobs")
        .select("assigned_user_id,created_at")
        .eq("customer_id", customerId)
        .eq("title", title)
        .limit(20);

      if (scheduledDate) query = query.eq("scheduled_date", scheduledDate);
      if (scheduledTime) query = query.eq("scheduled_time", scheduledTime);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return "";
      return data?.[0]?.assigned_user_id || "";
    } catch {
      return "";
    }
  }

  async function enhanceJobForm(form) {
    if (!form || !form.isConnected) return;
    if (form.querySelector(`#${SELECT_ID}`) || form.querySelector(`#${FIELD_ID}`)) return;

    try {
      await loadAssignableUsers();
      if (!form.isConnected || !assignmentEnabled || !assignableUsers.length) return;

      addStyles();

      let currentValue = "";
      if (form.id === "editJobForm") {
        currentValue = await getEditJobAssignment(form);
        if (!form.isConnected) return;
      }

      addAssignmentField(form, currentValue);
    } catch (error) {
      // Assignment must never prevent the core job form from opening or working.
      console.warn("JobPilot assignment enhancement skipped:", error);
    }
  }

  function wireCreateForm(form) {
    if (!form || form.getAttribute(WIRED_ATTR)) return;
    form.setAttribute(WIRED_ATTR, "true");

    form.addEventListener("submit", () => {
      const selectedUserId = form.querySelector(`#${SELECT_ID}`)?.value || null;
      if (!selectedUserId) return;

      const snapshot = {
        selectedUserId,
        customerId: form.querySelector("#jobCustomer")?.value || "",
        title: form.querySelector("#jobTitle")?.value?.trim() || "",
        scheduledDate: form.querySelector("#jobDate")?.value || null,
        scheduledTime: form.querySelector("#jobTime")?.value || null
      };

      setTimeout(() => saveCreatedJobAssignment(snapshot), 500);
    }, true);
  }

  async function saveCreatedJobAssignment(snapshot, attempt = 0) {
    if (!snapshot?.selectedUserId) return;

    try {
      const { data, error: userError } = await getCachedUserResponse();
      if (userError || !data?.user) return;

      let query = supabase
        .from("jobs")
        .select("id,customer_id,title,scheduled_date,scheduled_time,created_at")
        .eq("user_id", data.user.id)
        .eq("customer_id", snapshot.customerId)
        .eq("title", snapshot.title)
        .order("created_at", { ascending: false })
        .limit(10);

      if (snapshot.scheduledDate) query = query.eq("scheduled_date", snapshot.scheduledDate);
      if (snapshot.scheduledTime) query = query.eq("scheduled_time", snapshot.scheduledTime);

      const { data: candidates, error } = await query;

      if (!error && candidates?.length) {
        const job = candidates[0];
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ assigned_user_id: snapshot.selectedUserId })
          .eq("id", job.id);

        if (!updateError) return;
      }
    } catch (error) {
      console.warn("JobPilot assignment save skipped:", error);
    }

    if (attempt < 8) {
      setTimeout(() => saveCreatedJobAssignment(snapshot, attempt + 1), 500);
    }
  }

  function wireEditForm(form) {
    if (!form || form.getAttribute(WIRED_ATTR)) return;
    form.setAttribute(WIRED_ATTR, "true");

    form.querySelector(`#${SELECT_ID}`)?.addEventListener("change", async event => {
      try {
        const value = event.target.value || null;
        const customerId = form.querySelector("#editJobCustomer")?.value || "";
        const title = form.querySelector("#editJobTitle")?.value?.trim() || "";
        const scheduledDate = form.querySelector("#editJobDate")?.value || null;
        const scheduledTime = form.querySelector("#editJobTime")?.value || null;

        if (!customerId || !title) return;

        let query = supabase
          .from("jobs")
          .select("id,created_at")
          .eq("customer_id", customerId)
          .eq("title", title)
          .limit(20);

        if (scheduledDate) query = query.eq("scheduled_date", scheduledDate);
        if (scheduledTime) query = query.eq("scheduled_time", scheduledTime);

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error || !data?.[0]) return;

        const { error: updateError } = await supabase
          .from("jobs")
          .update({ assigned_user_id: value })
          .eq("id", data[0].id);

        if (updateError) {
          console.error("Job assignment could not be updated:", updateError);
          alert("The job assignment could not be saved. Please try again.");
        }
      } catch (error) {
        console.warn("JobPilot assignment update skipped:", error);
      }
    });
  }

  function processForms() {
    const createForm = document.getElementById("jobForm");
    const editForm = document.getElementById("editJobForm");

    if (createForm) {
      void enhanceJobForm(createForm).then(() => wireCreateForm(createForm)).catch(() => {});
    }

    if (editForm) {
      void enhanceJobForm(editForm).then(() => wireEditForm(editForm)).catch(() => {});
    }
  }

  // Only inspect forms after the user opens an Add/Edit Job form. This keeps
  // the assignment feature isolated from normal application rendering.
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const button = target.closest("button");
    if (!button) return;

    const label = String(button.textContent || "").trim().toLowerCase();
    const opensJobForm =
      button.id === "addJobButton" ||
      label === "+ add job" ||
      label === "add job" ||
      label === "edit job";

    if (!opensJobForm) return;

    setTimeout(processForms, 0);
  });
}
