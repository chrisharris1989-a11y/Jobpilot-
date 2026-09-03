import { supabase } from "../supabase.js";

const USERS_FUNCTION_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/management-users-v1";
const STYLE_ID = "jobpilot-job-assignment-styles";
const WIRED_ATTR = "data-jobpilot-assignment-wired";

let assignableUsers = [];
let usersLoaded = false;
let usersLoading = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadAssignableUsers() {
  if (usersLoaded) return assignableUsers;
  if (usersLoading) return usersLoading;

  usersLoading = (async () => {
    try {
      const { data: { session } = {}, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return [];

      const response = await fetch(USERS_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: "list" })
      });

      if (!response.ok) return [];

      const result = await response.json();
      assignableUsers = (result.users || []).filter(user => user.status === "active");
      usersLoaded = true;
      return assignableUsers;
    } catch (error) {
      console.warn("Job assignment users could not be loaded:", error);
      return [];
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
    .jobpilot-assignment-field{margin:14px 0}
    .jobpilot-assignment-field label{display:block;margin-bottom:6px;font-weight:600}
    .jobpilot-assignment-field select{width:100%;box-sizing:border-box}
    .jobpilot-assignment-help{display:block;margin-top:5px;font-size:12px;color:var(--muted,#64748b)}
  `;
  document.head.appendChild(style);
}

async function isManager() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("company_members")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  return ["owner", "admin"].includes(String(data.role || "").toLowerCase());
}

function buildAssignmentField(selectedUserId = "") {
  const field = document.createElement("div");
  field.className = "jobpilot-assignment-field";
  field.innerHTML = `
    <label for="jobpilotAssignedUser">Assign to</label>
    <select id="jobpilotAssignedUser">
      <option value="">Unassigned</option>
      ${assignableUsers.map(user => `
        <option value="${escapeHtml(user.user_id)}" ${String(user.user_id) === String(selectedUserId || "") ? "selected" : ""}>
          ${escapeHtml(user.name || user.email || "User")}${user.is_owner ? " (Owner)" : ""}
        </option>
      `).join("")}
    </select>
    <span class="jobpilot-assignment-help">Choose which company user is responsible for this job.</span>
  `;
  return field;
}

async function findEditingJob(form) {
  const customerId = form.querySelector("#editJobCustomer")?.value || "";
  const title = form.querySelector("#editJobTitle")?.value?.trim() || "";
  const scheduledDate = form.querySelector("#editJobDate")?.value || null;
  const scheduledTime = form.querySelector("#editJobTime")?.value || null;

  if (!customerId || !title) return null;

  let query = supabase
    .from("jobs")
    .select("id,assigned_user_id,created_at")
    .eq("customer_id", customerId)
    .eq("title", title)
    .limit(20);

  if (scheduledDate) query = query.eq("scheduled_date", scheduledDate);
  if (scheduledTime) query = query.eq("scheduled_time", scheduledTime);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data?.length) return null;

  return data[0];
}

async function wireAddJobForm(form) {
  if (!form || form.getAttribute(WIRED_ATTR)) return;
  form.setAttribute(WIRED_ATTR, "true");

  const manager = await isManager();
  if (!manager) return;

  const users = await loadAssignableUsers();
  if (!users.length) return;

  const customer = form.querySelector("#jobCustomer");
  if (!customer || form.querySelector("#jobpilotAssignedUser")) return;

  addStyles();
  customer.insertAdjacentElement("afterend", buildAssignmentField());

  form.addEventListener("submit", () => {
    const selectedUserId = form.querySelector("#jobpilotAssignedUser")?.value || null;
    if (!selectedUserId) return;

    const snapshot = {
      selectedUserId,
      customerId: form.querySelector("#jobCustomer")?.value || "",
      title: form.querySelector("#jobTitle")?.value.trim() || "",
      scheduledDate: form.querySelector("#jobDate")?.value || null
    };

    setTimeout(() => finishAddAssignment(snapshot), 600);
  }, true);
}

async function finishAddAssignment(snapshot, attempt = 0) {
  if (!snapshot?.selectedUserId) return;

  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return;

  const { data: candidates, error } = await supabase
    .from("jobs")
    .select("id,user_id,customer_id,title,scheduled_date,created_at")
    .eq("user_id", user.id)
    .eq("customer_id", snapshot.customerId)
    .eq("title", snapshot.title)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!error && candidates?.length) {
    const matching = candidates.find(job =>
      (job.scheduled_date || null) === snapshot.scheduledDate
    );

    if (matching) {
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ assigned_user_id: snapshot.selectedUserId })
        .eq("id", matching.id);

      if (!updateError) return;
      console.warn("Job assignment could not be saved:", updateError);
    }
  }

  if (attempt < 8) {
    setTimeout(() => finishAddAssignment(snapshot, attempt + 1), 500);
  }
}

async function wireEditJobForm(form) {
  if (!form || form.getAttribute(WIRED_ATTR)) return;
  form.setAttribute(WIRED_ATTR, "true");

  const manager = await isManager();
  if (!manager) return;

  const users = await loadAssignableUsers();
  if (!users.length) return;

  if (form.querySelector("#jobpilotAssignedUser")) return;

  const job = await findEditingJob(form);
  if (!form.isConnected || !job) return;

  addStyles();

  const customer = form.querySelector("#editJobCustomer");
  const field = buildAssignmentField(job.assigned_user_id || "");

  if (customer?.parentElement) {
    customer.parentElement.insertAdjacentElement("afterend", field);
  } else {
    form.prepend(field);
  }

  const select = field.querySelector("#jobpilotAssignedUser");
  select?.addEventListener("change", async () => {
    const value = select.value || null;
    select.disabled = true;

    const { error } = await supabase
      .from("jobs")
      .update({ assigned_user_id: value })
      .eq("id", job.id);

    select.disabled = false;

    if (error) {
      console.error("Job assignment could not be updated:", error);
      alert("The job assignment could not be saved. Please try again.");
      return;
    }

    job.assigned_user_id = value;
  });
}

function observeJobForms() {
  const process = () => {
    document.querySelectorAll("#jobForm").forEach(form => {
      void wireAddJobForm(form);
    });

    document.querySelectorAll("#editJobForm").forEach(form => {
      void wireEditJobForm(form);
    });
  };

  process();

  const observer = new MutationObserver(process);
  observer.observe(document.body, { childList: true, subtree: true });
}

observeJobForms();
