import { supabase } from "./supabase.js";

let currentUser = null;
let customers = [];
let jobs = [];
let quotes = [];
let invoices = [];

const app = document.getElementById("app");


// =====================================================
// INITIALISE
// =====================================================

async function init() {
  const { data } = await supabase.auth.getSession();

  currentUser = data.session?.user || null;

  if (currentUser) {
    await loadApp();
  } else {
    showLogin();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;

    if (currentUser) {
      await loadApp();
    } else {
      showLogin();
    }
  });
}


// =====================================================
// LOGIN
// =====================================================

function showLogin() {
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="logo-mark">J</div>
          <div>
            <strong>JobPilot</strong>
            <span>Trades CRM</span>
          </div>
        </div>

        <h1>Welcome to JobPilot</h1>

        <p class="auth-subtitle">
          Your simple CRM for running your trade business.
        </p>

        <form id="loginForm">

          <label>Email</label>

          <input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
          >

          <label>Password</label>

          <input
            id="password"
            type="password"
            required
            minlength="6"
            placeholder="••••••••"
          >

          <button class="button primary auth-button">
            Sign in
          </button>

        </form>

        <div id="authMessage"></div>

        <button id="signupButton" class="link-button">
          Create a new account
        </button>

      </div>
    </div>
  `;

  document
    .getElementById("loginForm")
    .addEventListener("submit", login);

  document
    .getElementById("signupButton")
    .addEventListener("click", signup);
}


async function login(event) {
  event.preventDefault();

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  showAuthMessage("Signing in...");

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    showAuthMessage(error.message, true);
  }
}


async function signup() {
  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  if (!email || password.length < 6) {
    showAuthMessage(
      "Enter an email and a password of at least 6 characters.",
      true
    );
    return;
  }

  showAuthMessage("Creating account...");

  const { error } =
    await supabase.auth.signUp({
      email,
      password
    });

  if (error) {
    showAuthMessage(error.message, true);
    return;
  }

  showAuthMessage(
    "Account created. Check your email if confirmation is required."
  );
}


function showAuthMessage(message, error = false) {
  const element =
    document.getElementById("authMessage");

  if (!element) return;

  element.textContent = message;
  element.style.color =
    error ? "#dc2626" : "#2563eb";
}


// =====================================================
// LOAD APP
// =====================================================

async function loadApp() {
  await loadCustomers();
  await loadJobs();
  await loadQuotes();
  await loadInvoices();

  renderApp();
}


// =====================================================
// CUSTOMERS
// =====================================================

async function loadCustomers() {
  const { data, error } =
    await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Customers:", error);
    return;
  }

  customers = data || [];
}


// =====================================================
// JOBS
// =====================================================

async function loadJobs() {
  const { data, error } =
    await supabase
      .from("jobs")
      .select("*")
      .order("scheduled_date", {
        ascending: true,
        nullsFirst: false
      });

  if (error) {
    console.error("Jobs:", error);
    return;
  }

  jobs = data || [];
}


// =====================================================
// QUOTES
// =====================================================

async function loadQuotes() {
  const { data, error } =
    await supabase
      .from("quotes")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Quotes:", error);
    return;
  }

  quotes = data || [];
}


// =====================================================
// INVOICES
// =====================================================

async function loadInvoices() {
  const { data, error } =
    await supabase
      .from("invoices")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Invoices:", error);
    return;
  }

  invoices = data || [];
}


// =====================================================
// MAIN APP
// =====================================================

function renderApp() {
  app.innerHTML = `
    <div class="app-layout">

      <aside class="sidebar">

        <div class="logo">

          <div class="logo-mark">J</div>

          <div>
            <strong>JobPilot</strong>
            <span>Trades CRM</span>
          </div>

        </div>

        <nav>

          <button class="nav-item active" data-page="dashboard">
            🏠 Dashboard
          </button>

          <button class="nav-item" data-page="customers">
            👥 Customers
          </button>

          <button class="nav-item" data-page="jobs">
            📋 Jobs
          </button>

          <button class="nav-item" data-page="quotes">
            💷 Quotes
          </button>

          <button class="nav-item" data-page="invoices">
            🧾 Invoices
          </button>

        </nav>

        <div class="sidebar-bottom">

          <button class="nav-item" data-page="settings">
            ⚙️ Settings
          </button>

          <button class="nav-item" id="logoutButton">
            🚪 Sign out
          </button>

        </div>

      </aside>

      <main class="main">

        <header class="topbar">

          <div>

            <h1 id="pageTitle">
              Dashboard
            </h1>

            <p id="pageSubtitle">
              Here's what's happening with your business.
            </p>

          </div>

          <div class="avatar">
            ${escapeHtml(
              currentUser.email
                .substring(0, 2)
                .toUpperCase()
            )}
          </div>

        </header>

        <section id="pageContent"></section>

      </main>

    </div>
  `;

  document
    .querySelectorAll(".nav-item[data-page]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => showPage(button.dataset.page)
      );
    });

  document
    .getElementById("logoutButton")
    .addEventListener("click", logout);

  showPage("dashboard");
}


// =====================================================
// PAGE SWITCHING
// =====================================================

function showPage(page) {
  document
    .querySelectorAll(".nav-item")
    .forEach(button => {
      button.classList.remove("active");
    });

  const activeButton =
    document.querySelector(
      `.nav-item[data-page="${page}"]`
    );

  if (activeButton) {
    activeButton.classList.add("active");
  }

  const titles = {
    dashboard: [
      "Dashboard",
      "Here's what's happening with your business."
    ],

    customers: [
      "Customers",
      "Manage your customers."
    ],

    jobs: [
      "Jobs",
      "Schedule and manage your work."
    ],

    quotes: [
      "Quotes",
      "Create and track quotations."
    ],

    invoices: [
      "Invoices",
      "Create and track invoices."
    ],

    settings: [
      "Settings",
      "Manage your JobPilot account."
    ]
  };

  document.getElementById("pageTitle").textContent =
    titles[page][0];

  document.getElementById("pageSubtitle").textContent =
    titles[page][1];

  const content =
    document.getElementById("pageContent");

  if (page === "dashboard") {
    renderDashboard(content);
  }

  if (page === "customers") {
    renderCustomersPage(content);
  }

  if (page === "jobs") {
    renderJobsPage(content);
  }

  if (page === "quotes") {
    renderQuotesPage(content);
  }

  if (page === "invoices") {
    renderInvoicesPage(content);
  }

  if (page === "settings") {
    renderSettings(content);
  }
}


// =====================================================
// DASHBOARD
// =====================================================

function renderDashboard(content) {
  content.innerHTML = `

    <div class="stats">

      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div>
          <span>Jobs</span>
          <strong>${jobs.length}</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div>
          <span>Customers</span>
          <strong>${customers.length}</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">💷</div>
        <div>
          <span>Quotes</span>
          <strong>${quotes.length}</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🧾</div>
        <div>
          <span>Invoices</span>
          <strong>${invoices.length}</strong>
        </div>
      </div>

    </div>

    <div class="content-grid">

      <div class="panel">

        <div class="panel-header">

          <div>
            <h2>Upcoming Jobs</h2>
            <p>Your scheduled work</p>
          </div>

        </div>

        ${
          jobs.length
            ? jobs.slice(0, 5).map(job => `
                <div class="job-row">

                  <div>
                    <strong>
                      ${escapeHtml(job.title)}
                    </strong>

                    <div class="muted">
                      ${job.scheduled_date || "No date"}
                    </div>
                  </div>

                  <span>
                    £${Number(job.price || 0).toFixed(2)}
                  </span>

                </div>
              `).join("")
            : `
              <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No jobs yet</h3>
                <p>Add your first job to get started.</p>
              </div>
            `
        }

      </div>

      <div class="panel">

        <div class="panel-header">

          <div>
            <h2>Quick Actions</h2>
            <p>Common tasks</p>
          </div>

        </div>

        <button class="quick-button" data-action="customers">
          👤 Add Customer
        </button>

        <button class="quick-button" data-action="jobs">
          📋 Add Job
        </button>

        <button class="quick-button" data-action="quotes">
          💷 Create Quote
        </button>

        <button class="quick-button" data-action="invoices">
          🧾 Create Invoice
        </button>

      </div>

    </div>
  `;

  document
    .querySelectorAll("[data-action]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => showPage(button.dataset.action)
      );
    });
}


// =====================================================
// CUSTOMERS PAGE
// =====================================================

function renderCustomersPage(content) {
  content.innerHTML = `

    <div class="page-actions">

      <div>
        <h2>Customers</h2>
        <p>Your customer database.</p>
      </div>

      <button id="addCustomerButton" class="button primary">
        + Add Customer
      </button>

    </div>

    <div class="panel">

      <input
        id="customerSearch"
        class="search-input"
        placeholder="Search customers..."
      >

      <div id="customerTable" class="table-container"></div>

    </div>
  `;

  document
    .getElementById("addCustomerButton")
    .addEventListener(
      "click",
      showAddCustomerForm
    );

  document
    .getElementById("customerSearch")
    .addEventListener(
      "input",
      event =>
        renderCustomerTable(event.target.value)
    );

  renderCustomerTable();
}


function renderCustomerTable(search = "") {
  const table =
    document.getElementById("customerTable");

  if (!table) return;

  const term =
    search.toLowerCase().trim();

  const filtered =
    customers.filter(customer => {

      const text = [
        customer.name,
        customer.phone,
        customer.email,
        customer.city,
        customer.postcode
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(term);
    });

  if (!filtered.length) {
    table.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">👥</div>

        <h3>No customers found</h3>

        <p>
          Add your first customer to get started.
        </p>

      </div>
    `;

    return;
  }

  table.innerHTML = `
    <div class="customer-list">

      ${filtered.map(customer => `

        <div
          class="job-row customer-row"
          data-customer-id="${customer.id}"
          style="cursor:pointer;"
        >

          <div>

            <strong>
              ${escapeHtml(customer.name)}
            </strong>

            <div class="muted">
              ${escapeHtml(
                customer.phone ||
                customer.email ||
                customer.city ||
                ""
              )}
            </div>

          </div>

          <span>
            View →
          </span>

        </div>

      `).join("")}

    </div>
  `;

  table
    .querySelectorAll("[data-customer-id]")
    .forEach(row => {
      row.addEventListener(
        "click",
        () =>
          showCustomerProfile(
            row.dataset.customerId
          )
      );
    });
}


// =====================================================
// ADD CUSTOMER
// =====================================================

function showAddCustomerForm() {
  const modal =
    document.createElement("div");

  modal.className = "modal show";

  modal.innerHTML = `
    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Add Customer</h2>
          <p>Create a customer record.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="customerForm">

        <label>Name *</label>
        <input id="customerName" required>

        <label>Phone</label>
        <input id="customerPhone">

        <label>Email</label>
        <input id="customerEmail" type="email">

        <label>Address</label>
        <input id="customerAddress">

        <label>Town / City</label>
        <input id="customerCity">

        <label>Postcode</label>
        <input id="customerPostcode">

        <label>Notes</label>
        <textarea id="customerNotes"></textarea>

        <div class="modal-actions">

          <button type="button" class="button secondary close">
            Cancel
          </button>

          <button type="submit" class="button primary">
            Save Customer
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );

  modal
    .querySelector("#customerForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const customer = {
          user_id: currentUser.id,

          name:
            document.getElementById("customerName").value.trim(),

          phone:
            document.getElementById("customerPhone").value.trim(),

          email:
            document.getElementById("customerEmail").value.trim(),

          address_line1:
            document.getElementById("customerAddress").value.trim(),

          city:
            document.getElementById("customerCity").value.trim(),

          postcode:
            document.getElementById("customerPostcode").value.trim(),

          notes:
            document.getElementById("customerNotes").value.trim()
        };

        const { error } =
          await supabase
            .from("customers")
            .insert(customer);

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        await loadCustomers();

        renderCustomersPage(
          document.getElementById("pageContent")
        );
      }
    );
}


// =====================================================
// CUSTOMER PROFILE
// =====================================================

function showCustomerProfile(customerId) {
  const customer =
    customers.find(
      item =>
        String(item.id) === String(customerId)
    );

  if (!customer) return;

  const customerJobs =
    jobs.filter(
      job =>
        String(job.customer_id) ===
        String(customer.id)
    );

  const totalValue =
    customerJobs.reduce(
      (total, job) =>
        total + Number(job.price || 0),
      0
    );

  const content =
    document.getElementById("pageContent");

  document.getElementById("pageTitle").textContent =
    customer.name;

  document.getElementById("pageSubtitle").textContent =
    "Customer profile";

  content.innerHTML = `

    <div class="page-actions">

      <button id="backCustomers" class="button secondary">
        ← Customers
      </button>

      <div>

        <button id="editCustomer" class="button primary">
          Edit Customer
        </button>

        <button id="deleteCustomer" class="button danger">
          Delete
        </button>

      </div>

    </div>

    <div class="content-grid">

      <div class="panel">

        <h2>Customer Details</h2>

        <div class="detail-list">

          <div>
            <span>Name</span>
            <strong>${escapeHtml(customer.name)}</strong>
          </div>

          <div>
            <span>Phone</span>
            <strong>${escapeHtml(customer.phone || "—")}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>${escapeHtml(customer.email || "—")}</strong>
          </div>

          <div>
            <span>Address</span>
            <strong>${escapeHtml(customer.address_line1 || "—")}</strong>
          </div>

          <div>
            <span>Town / City</span>
            <strong>${escapeHtml(customer.city || "—")}</strong>
          </div>

          <div>
            <span>Postcode</span>
            <strong>${escapeHtml(customer.postcode || "—")}</strong>
          </div>

          <div>
            <span>Notes</span>
            <strong>${escapeHtml(customer.notes || "—")}</strong>
          </div>

        </div>

      </div>

      <div class="panel">

        <h2>Customer Summary</h2>

        <div class="stats">

          <div class="stat-card">
            <div>
              <span>Jobs</span>
              <strong>${customerJobs.length}</strong>
            </div>
          </div>

          <div class="stat-card">
            <div>
              <span>Job Value</span>
              <strong>£${totalValue.toFixed(2)}</strong>
            </div>
          </div>

        </div>

      </div>

    </div>

    <div class="panel">

      <div class="panel-header">

        <div>
          <h2>Job History</h2>
          <p>Previous and upcoming work.</p>
        </div>

      </div>

      ${
        customerJobs.length
          ? customerJobs.map(job => `
              <div
                class="job-row"
                style="cursor:pointer;"
                data-history-job="${job.id}"
              >

                <div>

                  <strong>
                    ${escapeHtml(job.title)}
                  </strong>

                  <div class="muted">
                    ${job.scheduled_date || "No date"}
                  </div>

                </div>

                <strong>
                  £${Number(job.price || 0).toFixed(2)}
                </strong>

              </div>
            `).join("")
          : `
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <h3>No jobs yet</h3>
              <p>This customer doesn't have any jobs.</p>
            </div>
          `
      }

    </div>
  `;

  document
    .getElementById("backCustomers")
    .addEventListener(
      "click",
      () => showPage("customers")
    );

  document
    .getElementById("editCustomer")
    .addEventListener(
      "click",
      () => showEditCustomerForm(customer.id)
    );

  document
    .getElementById("deleteCustomer")
    .addEventListener(
      "click",
      () => deleteCustomer(customer.id)
    );

  content
    .querySelectorAll("[data-history-job]")
    .forEach(row => {
      row.addEventListener(
        "click",
        () =>
          showJobProfile(row.dataset.historyJob)
      );
    });
}


// =====================================================
// EDIT CUSTOMER
// =====================================================

function showEditCustomerForm(customerId) {
  const customer =
    customers.find(
      item =>
        String(item.id) === String(customerId)
    );

  if (!customer) return;

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  modal.innerHTML = `
    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Edit Customer</h2>
          <p>Update customer details.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="editCustomerForm">

        <label>Name *</label>

        <input
          id="editCustomerName"
          value="${escapeHtml(customer.name || "")}"
          required
        >

        <label>Phone</label>

        <input
          id="editCustomerPhone"
          value="${escapeHtml(customer.phone || "")}"
        >

        <label>Email</label>

        <input
          id="editCustomerEmail"
          type="email"
          value="${escapeHtml(customer.email || "")}"
        >

        <label>Address</label>

        <input
          id="editCustomerAddress"
          value="${escapeHtml(customer.address_line1 || "")}"
        >

        <label>Town / City</label>

        <input
          id="editCustomerCity"
          value="${escapeHtml(customer.city || "")}"
        >

        <label>Postcode</label>

        <input
          id="editCustomerPostcode"
          value="${escapeHtml(customer.postcode || "")}"
        >

        <label>Notes</label>

        <textarea id="editCustomerNotes">${escapeHtml(
          customer.notes || ""
        )}</textarea>

        <div class="modal-actions">

          <button type="button" class="button secondary close">
            Cancel
          </button>

          <button type="submit" class="button primary">
            Save Changes
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );

  modal
    .querySelector("#editCustomerForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const updates = {
          name:
            document.getElementById("editCustomerName").value.trim(),

          phone:
            document.getElementById("editCustomerPhone").value.trim(),

          email:
            document.getElementById("editCustomerEmail").value.trim(),

          address_line1:
            document.getElementById("editCustomerAddress").value.trim(),

          city:
            document.getElementById("editCustomerCity").value.trim(),

          postcode:
            document.getElementById("editCustomerPostcode").value.trim(),

          notes:
            document.getElementById("editCustomerNotes").value.trim()
        };

        const { error } =
          await supabase
            .from("customers")
            .update(updates)
            .eq("id", customer.id);

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        await loadCustomers();

        showCustomerProfile(customer.id);
      }
    );
}


// =====================================================
// DELETE CUSTOMER
// =====================================================

async function deleteCustomer(customerId) {
  const customer =
    customers.find(
      item =>
        String(item.id) === String(customerId)
    );

  if (!customer) return;

  const confirmed =
    confirm(
      `Delete ${customer.name}? This cannot be undone.`
    );

  if (!confirmed) return;

  const { error } =
    await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadCustomers();
  await loadJobs();

  showPage("customers");
}


// =====================================================
// JOBS PAGE
// =====================================================

function renderJobsPage(content) {
  content.innerHTML = `

    <div class="page-actions">

      <div>
        <h2>Jobs</h2>
        <p>Schedule and manage your work.</p>
      </div>

      <button id="addJobButton" class="button primary">
        + Add Job
      </button>

    </div>

    <div class="panel">

      ${
        jobs.length
          ? jobs.map(job => `
              <div
                class="job-row"
                data-job-id="${job.id}"
                style="cursor:pointer;"
              >

                <div>

                  <strong>
                    ${escapeHtml(job.title)}
                  </strong>

                  <div class="muted">

                    ${getCustomerName(job.customer_id)}

                    ${
                      job.scheduled_date
                        ? " • " + job.scheduled_date
                        : ""
                    }

                  </div>

                </div>

                <div>

                  <span>
                    ${escapeHtml(job.status || "pending")}
                  </span>

                  <strong>
                    £${Number(job.price || 0).toFixed(2)}
                  </strong>

                </div>

              </div>
            `).join("")
          : `
            <div class="empty-state">

              <div class="empty-icon">📋</div>

              <h3>No jobs yet</h3>

              <p>Add your first job.</p>

            </div>
          `
      }

    </div>
  `;

  document
    .getElementById("addJobButton")
    .addEventListener(
      "click",
      showAddJobForm
    );

  content
    .querySelectorAll("[data-job-id]")
    .forEach(row => {
      row.addEventListener(
        "click",
        () => showJobProfile(row.dataset.jobId)
      );
    });
}


// =====================================================
// JOB PROFILE
// =====================================================

function showJobProfile(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) === String(jobId)
    );

  if (!job) return;

  const customer =
    customers.find(
      c =>
        String(c.id) === String(job.customer_id)
    );

  const content =
    document.getElementById("pageContent");


  // =====================================================
  // RECURRING JOB INFORMATION
  // =====================================================

  const isRecurring =
    job.recurring === true ||
    job.recurring === "true";


  let recurringJobs = [];


  if (isRecurring) {

    const seriesId =
      job.recurring_parent_id || job.id;

    recurringJobs =
      jobs
        .filter(item => {

          const itemSeriesId =
            item.recurring_parent_id || item.id;

          return (
            String(itemSeriesId) ===
            String(seriesId)
          );

        })
        .sort((a, b) => {

          const dateA =
            a.scheduled_date || "9999-12-31";

          const dateB =
            b.scheduled_date || "9999-12-31";

          return dateA.localeCompare(dateB);

        });

  }


  const recurringInterval =
    Number(
      job.recurring_interval_weeks
    ) || 4;


  const nextRecurringJob =
    recurringJobs.find(
      item =>
        String(item.status).toLowerCase() !==
          "completed" &&
        String(item.status).toLowerCase() !==
          "cancelled" &&
        String(item.id) !== String(job.id)
    );


  let recurringSection = "";


  if (isRecurring) {

    recurringSection = `

      <div class="panel">

        <h2>🔄 Recurring Job</h2>

<div
  style="
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    margin:15px 0;
  "
>

  <button
    id="skipRecurringJob"
    class="button secondary"
  >
    ⏭ Skip Next Appointment
  </button>

  <button
    id="stopRecurringJob"
    class="button danger"
  >
    ⏹ Stop Recurring
  </button>

</div>
        <div class="detail-list">

          <div>

            <span>Frequency</span>

            <strong>
              Every ${recurringInterval} weeks
            </strong>

          </div>

          <div>

            <span>Next Appointment</span>

            <strong>
              ${
                nextRecurringJob
                  ? (
                      nextRecurringJob.scheduled_date ||
                      "Not scheduled"
                    )
                  : "No future appointment"
              }
            </strong>

          </div>

        </div>


        <h3 style="margin-top:25px;">
          Recurring Series
        </h3>


        <div>

          ${
            recurringJobs.length

              ? recurringJobs.map(seriesJob => `

                  <div
                    class="job-row"
                    style="
                      cursor:pointer;
                      margin-bottom:8px;
                    "
                    data-recurring-job-id="${seriesJob.id}"
                  >

                    <div>

                      <strong>
                        ${
                          seriesJob.scheduled_date ||
                          "No date"
                        }
                      </strong>

                      <div class="muted">

                        ${escapeHtml(
                          seriesJob.title || "Job"
                        )}

                      </div>

                    </div>


                    <div>

                      <span class="muted">

                        ${escapeHtml(
                          seriesJob.status ||
                          "pending"
                        )}

                      </span>

                      <strong>

                        £${Number(
                          seriesJob.price || 0
                        ).toFixed(2)}

                      </strong>

                    </div>

                  </div>

                `).join("")

              : `

                  <div class="empty-state">

                    <p>
                      No recurring appointments found.
                    </p>

                  </div>

                `
          }

        </div>

      </div>

    `;

  }

 
  // =====================================================
  // PAGE
  // =====================================================

  document.getElementById("pageTitle").textContent =
    job.title;

  document.getElementById("pageSubtitle").textContent =
    "Job details";


  content.innerHTML = `

    <div class="page-actions">

      <button
        id="backJobs"
        class="button secondary"
      >
        ← Jobs
      </button>


      <div>

        <button
          id="editJob"
          class="button primary"
        >
          Edit Job
        </button>


        ${
          String(job.status).toLowerCase() ===
          "invoiced"

            ? `

              <button
                class="button secondary"
                disabled
              >
                ✓ Invoiced
              </button>

            `

            : `

              <button
                id="convertJobInvoice"
                class="button primary"
              >
                🧾 Convert to Invoice
              </button>

            `
        }


        <button
          id="deleteJob"
          class="button danger"
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

            <span>Customer</span>

            <strong>

              ${
                customer
                  ? escapeHtml(customer.name)
                  : "Unknown customer"
              }

            </strong>

          </div>


          <div>

            <span>Title</span>

            <strong>
              ${escapeHtml(job.title)}
            </strong>

          </div>


          <div>

            <span>Description</span>

            <strong>
              ${escapeHtml(
                job.description || "—"
              )}
            </strong>

          </div>


          <div>

            <span>Date</span>

            <strong>
              ${job.scheduled_date || "—"}
            </strong>

          </div>


          <div>

            <span>Time</span>

            <strong>
              ${job.scheduled_time || "—"}
            </strong>

          </div>


          <div>

            <span>Status</span>

            <strong>
              ${escapeHtml(
                job.status || "pending"
              )}
            </strong>

          </div>


          <div>

            <span>Notes</span>

            <strong>
              ${escapeHtml(
                job.notes || "—"
              )}
            </strong>

          </div>

        </div>

      </div>


      <div class="panel">

        <h2>Job Value</h2>

        <div class="detail-list">

          <div>

            <span>Price</span>

            <strong>
              £${Number(
                job.price || 0
              ).toFixed(2)}
            </strong>

          </div>

        </div>

      </div>

    </div>


    ${recurringSection}

  `;


  // =====================================================
  // BUTTON EVENTS
  // =====================================================

  document
    .getElementById("backJobs")
    .addEventListener(
      "click",
      () => showPage("jobs")
    );


  document
    .getElementById("editJob")
    .addEventListener(
      "click",
      () => showEditJobForm(job.id)
    );


  document
    .getElementById("deleteJob")
    .addEventListener(
      "click",
      () => deleteJob(job.id)
    );


  const invoiceButton =
    document.getElementById(
      "convertJobInvoice"
    );


  if (invoiceButton) {

    invoiceButton.addEventListener(
      "click",
      () =>
        convertJobToInvoice(job.id)
    );

  }

  // =====================================================
  // RECURRING JOB BUTTONS
  // =====================================================

  const skipRecurringButton =
    document.getElementById("skipRecurringJob");

  if (skipRecurringButton) {

    skipRecurringButton.addEventListener(
      "click",
      () => skipNextRecurringJob(job.id)
    );

  }


  const stopRecurringButton =
    document.getElementById("stopRecurringJob");

  if (stopRecurringButton) {

    stopRecurringButton.addEventListener(
      "click",
      () => stopRecurringJob(job.id)
    );

  }

  
  // =====================================================
  // RECURRING SERIES CLICKS
  // =====================================================

  content
    .querySelectorAll(
      "[data-recurring-job-id]"
    )
    .forEach(row => {

      row.addEventListener(
        "click",
        () => {

          showJobProfile(
            row.dataset.recurringJobId
          );

        }
      );

    });

}

// =====================================================
// ADD JOB
// =====================================================

function showAddJobForm() {

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Add Job</h2>
          <p>Schedule work for a customer.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="jobForm">

        <label>Customer *</label>

        <select id="jobCustomer" required>

          <option value="">
            Select customer
          </option>

          ${customers.map(customer => `
            <option value="${customer.id}">
              ${escapeHtml(customer.name)}
            </option>
          `).join("")}

        </select>


        <label>Job Title *</label>

        <input
          id="jobTitle"
          required
          placeholder="e.g. Window cleaning"
        >


        <label>Description</label>

        <textarea
          id="jobDescription"
        ></textarea>


        <label>Date</label>

        <input
          id="jobDate"
          type="date"
        >


        <label>Time</label>

        <input
          id="jobTime"
          type="time"
        >


        <label>Status</label>

        <select id="jobStatus">

          <option value="pending">
            Pending
          </option>

          <option value="scheduled">
            Scheduled
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="cancelled">
            Cancelled
          </option>

        </select>


        <!-- RECURRING JOB -->

        <label>Recurring Job</label>

        <label
          style="
            display:flex;
            align-items:center;
            gap:8px;
          "
        >

          <input
            type="checkbox"
            id="jobRecurring"
          >

          Repeat this job

        </label>


        <div
          id="jobRecurringOptions"
          style="display:none;"
        >

          <label>Repeat Every</label>

          <select id="jobRecurringInterval">

            <option value="4">
              Every 4 weeks
            </option>

            <option value="6">
              Every 6 weeks
            </option>

            <option value="8">
              Every 8 weeks
            </option>

          </select>

        </div>


        <label>Price</label>

        <input
          id="jobPrice"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
        >


        <label>Notes</label>

        <textarea
          id="jobNotes"
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


  // CLOSE MODAL

  modal
    .querySelectorAll(".close")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => modal.remove()
      );

    });


  // RECURRING JOB TOGGLE

  const recurringCheckbox =
    modal.querySelector("#jobRecurring");

  const recurringOptions =
    modal.querySelector("#jobRecurringOptions");


  recurringCheckbox.addEventListener(
    "change",
    () => {

      recurringOptions.style.display =
        recurringCheckbox.checked
          ? "block"
          : "none";

    }
  );


  // SAVE JOB

  modal
    .querySelector("#jobForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const recurring =
          recurringCheckbox.checked;


        const recurringInterval =
          recurring
            ? Number(
                modal.querySelector(
                  "#jobRecurringInterval"
                ).value
              )
            : null;


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
              "#jobDate"
            ).value || null,

          scheduled_time:
            modal.querySelector(
              "#jobTime"
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
            ).value.trim(),

          recurring:
            recurring,

          recurring_interval_weeks:
            recurringInterval,

          recurring_active:
            recurring

        };

        // Save the first appointment
        const { data: savedJob, error } =
          await supabase
            .from("jobs")
            .insert(job)
            .select()
            .single();


        if (error) {

          alert(
            "The job could not be saved:\n\n" +
            error.message
          );

          return;

        }


        // =====================================================
        // CREATE NEXT RECURRING APPOINTMENT
        // =====================================================

        if (
          recurring &&
          recurringInterval &&
          savedJob
        ) {

          if (savedJob.scheduled_date) {

            const nextDate =
              new Date(
                `${savedJob.scheduled_date}T12:00:00`
              );

            nextDate.setDate(
              nextDate.getDate() +
              (recurringInterval * 7)
            );


            const nextScheduledDate =
              nextDate
                .toISOString()
                .split("T")[0];


            const nextJob = {

              user_id:
                currentUser.id,

              customer_id:
                savedJob.customer_id,

              title:
                savedJob.title,

              description:
                savedJob.description,

              scheduled_date:
                nextScheduledDate,

              scheduled_time:
                savedJob.scheduled_time,

              status:
                "scheduled",

              price:
                savedJob.price,

              notes:
                savedJob.notes,

              recurring:
                true,

              recurring_interval_weeks:
                recurringInterval,

              recurring_parent_id:
                savedJob.id,

              recurring_active:
                true

            };


            const {
              error: nextJobError
            } =
              await supabase
                .from("jobs")
                .insert(nextJob);


            if (nextJobError) {

              alert(
                "The first appointment was saved, " +
                "but the next recurring appointment " +
                "could not be created:\n\n" +
                nextJobError.message
              );

              modal.remove();

              await loadJobs();

              showPage("jobs");

              return;

            }

          }

        }


        modal.remove();

        await loadJobs();

        showPage("jobs");
        

      }
    );

}

// =====================================================
// EDIT JOB
// =====================================================

function showEditJobForm(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) === String(jobId)
    );

  if (!job) return;

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  const isRecurring =
    job.recurring === true ||
    job.recurring === "true";

  const recurringInterval =
    Number(job.recurring_interval_weeks) || 4;

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Edit Job</h2>
          <p>Update job details.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="editJobForm">

        <label>Customer *</label>

        <select id="editJobCustomer" required>

          ${customers.map(customer => `
            <option
              value="${customer.id}"
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
          value="${escapeHtml(job.title || "")}"
          required
        >


        <label>Description</label>

        <textarea
          id="editJobDescription"
        >${escapeHtml(job.description || "")}</textarea>


        <label>Date</label>

        <input
          id="editJobDate"
          type="date"
          value="${job.scheduled_date || ""}"
        >


        <label>Time</label>

        <input
          id="editJobTime"
          type="time"
          value="${job.scheduled_time || ""}"
        >


        <label>Status</label>

        <select id="editJobStatus">

          <option
            value="pending"
            ${job.status === "pending" ? "selected" : ""}
          >
            Pending
          </option>

          <option
            value="scheduled"
            ${job.status === "scheduled" ? "selected" : ""}
          >
            Scheduled
          </option>

          <option
            value="completed"
            ${job.status === "completed" ? "selected" : ""}
          >
            Completed
          </option>

          <option
            value="cancelled"
            ${job.status === "cancelled" ? "selected" : ""}
          >
            Cancelled
          </option>

          <option
            value="invoiced"
            ${job.status === "invoiced" ? "selected" : ""}
          >
            Invoiced
          </option>

        </select>


        <!-- RECURRING JOB -->

        <label>Recurring Job</label>

        <label
          style="
            display:flex;
            align-items:center;
            gap:8px;
          "
        >

          <input
            type="checkbox"
            id="editJobRecurring"
            ${isRecurring ? "checked" : ""}
          >

          Repeat this job

        </label>


        <div
          id="editJobRecurringOptions"
          style="
            display:${isRecurring ? "block" : "none"};
          "
        >

          <label>Repeat Every</label>

          <select id="editJobRecurringInterval">

            <option
              value="4"
              ${recurringInterval === 4 ? "selected" : ""}
            >
              Every 4 weeks
            </option>

            <option
              value="6"
              ${recurringInterval === 6 ? "selected" : ""}
            >
              Every 6 weeks
            </option>

            <option
              value="8"
              ${recurringInterval === 8 ? "selected" : ""}
            >
              Every 8 weeks
            </option>

          </select>

        </div>


        <label>Price</label>

        <input
          id="editJobPrice"
          type="number"
          step="0.01"
          min="0"
          value="${Number(job.price || 0).toFixed(2)}"
        >


        <label>Notes</label>

        <textarea
          id="editJobNotes"
        >${escapeHtml(job.notes || "")}</textarea>


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


  // CLOSE MODAL

  modal
    .querySelectorAll(".close")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => modal.remove()
      );

    });


  // RECURRING TOGGLE

  const recurringCheckbox =
    modal.querySelector("#editJobRecurring");

  const recurringOptions =
    modal.querySelector("#editJobRecurringOptions");


  recurringCheckbox.addEventListener(
    "change",
    () => {

      recurringOptions.style.display =
        recurringCheckbox.checked
          ? "block"
          : "none";

    }
  );


  // SAVE CHANGES

  modal
    .querySelector("#editJobForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const recurring =
          recurringCheckbox.checked;


        const recurringInterval =
          recurring
            ? Number(
                modal.querySelector(
                  "#editJobRecurringInterval"
                ).value
              )
            : null;


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

          scheduled_date:
            modal.querySelector(
              "#editJobDate"
            ).value || null,

          scheduled_time:
            modal.querySelector(
              "#editJobTime"
            ).value || null,

          status:
            modal.querySelector(
              "#editJobStatus"
            ).value,

          price:
            Number(
              modal.querySelector(
                "#editJobPrice"
              ).value
            ) || 0,

          notes:
            modal.querySelector(
              "#editJobNotes"
            ).value.trim(),

          recurring:
            recurring,

          recurring_interval_weeks:
            recurringInterval

        };


        const { error } =
          await supabase
            .from("jobs")
            .update(updates)
            .eq("id", job.id);

        if (error) {

          alert(
            "The job could not be updated:\n\n" +
            error.message
          );

          return;

        }


        // =====================================================
        // CREATE NEXT RECURRING APPOINTMENT
        // WHEN THIS ONE IS COMPLETED
        // =====================================================

        if (
          updates.status === "completed" &&
          job.recurring &&
          job.recurring_active
        ) {

          const completedJob = {
            ...job,
            ...updates
          };

          await createNextRecurringAppointment(
            completedJob
          );

        }

        
        modal.remove();

        await loadJobs();

        showJobProfile(job.id);
      }
    );

}

// =====================================================
// CREATE NEXT RECURRING APPOINTMENT
// =====================================================

async function createNextRecurringAppointment(sourceJob) {

    if (
    !sourceJob ||
    !sourceJob.recurring
  ) {
    return null;
  }

  if (!sourceJob.scheduled_date) {
    return null;
  }

  const interval =
    Number(
      sourceJob.recurring_interval_weeks
    ) || 4;

  const currentDate =
    new Date(
      `${sourceJob.scheduled_date}T12:00:00`
    );

  currentDate.setDate(
    currentDate.getDate() +
    (interval * 7)
  );

  const nextDate =
    currentDate
      .toISOString()
      .split("T")[0];

  const seriesId =
    sourceJob.recurring_parent_id ||
    sourceJob.id;

  const existingNextJob =
    jobs.find(item => {

      const itemSeriesId =
        item.recurring_parent_id ||
        item.id;

      return (
        String(itemSeriesId) ===
        String(seriesId) &&

        String(item.scheduled_date) ===
        String(nextDate) &&

        String(item.status).toLowerCase() !==
        "cancelled"
      );

    });

  if (existingNextJob) {
    return existingNextJob;
  }

  const nextJob = {

    user_id:
      sourceJob.user_id,

    customer_id:
      sourceJob.customer_id,

    title:
      sourceJob.title,

    description:
      sourceJob.description,

    scheduled_date:
      nextDate,

    scheduled_time:
      sourceJob.scheduled_time,

    status:
      "scheduled",

    price:
      sourceJob.price,

    notes:
      sourceJob.notes,

    recurring:
      true,

    recurring_interval_weeks:
      interval,

    recurring_parent_id:
      seriesId,

    recurring_active:
      true

  };

  const {
    data,
    error
  } =
    await supabase
      .from("jobs")
      .insert(nextJob)
      .select()
      .single();

  if (error) {

    console.error(
      "Could not create next recurring appointment:",
      error
    );

    return null;
  }

  return data;
}

// =====================================================
// SKIP NEXT RECURRING JOB
// =====================================================

async function skipNextRecurringJob(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) === String(jobId)
    );

  if (!job) return;

  if (
    !job.recurring ||
    !job.recurring_active
  ) {
    alert("This job is not currently recurring.");
    return;
  }

  const confirmed =
    confirm(
      "Skip the next recurring appointment?"
    );

  if (!confirmed) return;

  const nextJob =
    jobs.find(item => {

      const parentId =
        item.recurring_parent_id ||
        item.id;

      const currentSeriesId =
        job.recurring_parent_id ||
        job.id;

      return (
        String(parentId) ===
        String(currentSeriesId) &&

        String(item.id) !==
        String(job.id) &&

        String(item.status).toLowerCase() !==
        "completed" &&

        String(item.status).toLowerCase() !==
        "cancelled"
      );

    });

  if (!nextJob) {

    alert(
      "There is no upcoming recurring appointment to skip."
    );

    return;
  }

  const { error } =
    await supabase
      .from("jobs")
      .update({
        status: "cancelled"
      })
      .eq("id", nextJob.id);

  if (error) {

    alert(
      "Could not skip the appointment:\n\n" +
      error.message
    );

    return;
  }

  await loadJobs();

  showJobProfile(job.id);

  alert(
    "The next recurring appointment has been skipped."
  );
}


// =====================================================
// STOP RECURRING JOB
// =====================================================

async function stopRecurringJob(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) === String(jobId)
    );

  if (!job) return;

  if (!job.recurring) {

    alert(
      "This job is not a recurring job."
    );

    return;
  }

  const confirmed =
    confirm(
      "Stop this recurring job?\n\nExisting appointments will remain, but no new recurring appointments will be created."
    );

  if (!confirmed) return;

  const seriesId =
    job.recurring_parent_id ||
    job.id;


  const { error } =
    await supabase
      .from("jobs")
      .update({
        recurring_active: false
      })
      .or(
        `id.eq.${seriesId},recurring_parent_id.eq.${seriesId}`
      );


  if (error) {

    alert(
      "Could not stop recurring:\n\n" +
      error.message
    );

    return;
  }

  await loadJobs();

  showJobProfile(job.id);

  alert(
    "Recurring appointments have been stopped."
  );
}
// =====================================================
// DELETE JOB
// =====================================================

async function deleteJob(jobId) {
  const job =
    jobs.find(
      item =>
        String(item.id) === String(jobId)
    );

  if (!job) return;

  const confirmed =
    confirm(
      `Delete "${job.title}"? This cannot be undone.`
    );

  if (!confirmed) return;

  const { error } =
    await supabase
      .from("jobs")
      .delete()
      .eq("id", job.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadJobs();

  showPage("jobs");
}


// =====================================================
// QUOTES PAGE
// =====================================================

function renderQuotesPage(content) {
  content.innerHTML = `

    <div class="page-actions">

      <div>
        <h2>Quotes</h2>
        <p>Create and track quotations.</p>
      </div>

      <button id="addQuoteButton" class="button primary">
        + New Quote
      </button>

    </div>

    <div class="panel">

      ${
        quotes.length
          ? quotes.map(quote => {

              const customer =
                customers.find(
                  c =>
                    String(c.id) ===
                    String(quote.customer_id)
                );

              return `

                <div class="job-row">

                  <div>

                    <strong>
                      Quote #${escapeHtml(
                        quote.quote_number || "—"
                      )}
                    </strong>

                    <div class="muted">

                      ${
                        customer
                          ? escapeHtml(customer.name)
                          : "Unknown customer"
                      }

                      ${
                        quote.valid_until
                          ? " • Valid until " +
                            quote.valid_until
                          : ""
                      }

                    </div>

                  </div>

                  <div>

                    <strong>
                      £${Number(
                        quote.total || 0
                      ).toFixed(2)}
                    </strong>

                    <span class="muted">
                      ${escapeHtml(
                        quote.status || "draft"
                      )}
                    </span>

                    <button
                      class="button secondary quote-view"
                      data-quote-id="${quote.id}"
                    >
                      View
                    </button>

                  </div>

                </div>

              `;
            }).join("")
          : `

            <div class="empty-state">

              <div class="empty-icon">💷</div>

              <h3>No quotes yet</h3>

              <p>Create your first quote.</p>

            </div>

          `
      }

    </div>
  `;

  document
    .getElementById("addQuoteButton")
    .addEventListener(
      "click",
      showAddQuoteForm
    );

  content
    .querySelectorAll(".quote-view")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          showQuoteProfile(
            button.dataset.quoteId
          )
      );
    });
}


// =====================================================
// ADD QUOTE
// =====================================================

function showAddQuoteForm() {

  const modal = document.createElement("div");

  modal.className = "modal show";

  const settings = JSON.parse(
    localStorage.getItem("jobpilot_settings") || "{}"
  );

  let nextNumber =
    Number(settings.nextQuoteNumber) || 1;

  const prefix =
    settings.quotePrefix || "QUO-";

  const quoteNumber =
    `${prefix}${String(nextNumber).padStart(4, "0")}`;

  const defaultVatRate =
    Number(settings.vatRate ?? 20);

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>New Quote</h2>
          <p>Create a quotation for a customer.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="quoteForm">

        <label>Customer *</label>

        <select id="quoteCustomer" required>

          <option value="">
            Select customer
          </option>

          ${customers.map(customer => `
            <option value="${customer.id}">
              ${escapeHtml(customer.name)}
            </option>
          `).join("")}

        </select>


        <label>Quote Number *</label>

        <input
          id="quoteNumber"
          value="${escapeHtml(quoteNumber)}"
          required
        >


        <label>Job / Quote Details *</label>

        <textarea
          id="quoteDescription"
          placeholder="Describe the work being quoted..."
          required
        ></textarea>


        <h3>Pricing</h3>

        <label>Subtotal</label>

        <input
          id="quoteSubtotal"
          type="number"
          step="0.01"
          min="0"
          value="0"
        >


        <label>VAT %</label>

        <input
          id="quoteVatPercent"
          type="number"
          step="0.01"
          min="0"
          value="${defaultVatRate}"
        >


        <label>VAT</label>

        <input
          id="quoteVat"
          type="number"
          step="0.01"
          value="0"
          readonly
        >


        <label>Total</label>

        <input
          id="quoteTotal"
          type="number"
          step="0.01"
          value="0"
          readonly
        >


        <label>Valid Until</label>

        <input
          id="quoteValidUntil"
          type="date"
        >


        <label>Notes</label>

        <textarea
          id="quoteNotes"
          placeholder="Additional notes or terms..."
        ></textarea>


        <h3>Recurring Job</h3>

        <label>

          <input
            type="checkbox"
            id="quoteRecurring"
          >

          Make this a recurring job

        </label>


        <div
          id="recurringOptions"
          style="display:none;"
        >

          <label>Repeat Every</label>

          <select id="quoteRecurringInterval">

            <option value="4">
              Every 4 weeks
            </option>

            <option value="6">
              Every 6 weeks
            </option>

            <option value="8">
              Every 8 weeks
            </option>

          </select>

        </div>


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
            Save Quote
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);


  // CLOSE MODAL

  modal
    .querySelectorAll(".close")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => modal.remove()
      );

    });


  // PRICING

  const subtotalInput =
    modal.querySelector("#quoteSubtotal");

  const vatPercentInput =
    modal.querySelector("#quoteVatPercent");

  const vatInput =
    modal.querySelector("#quoteVat");

  const totalInput =
    modal.querySelector("#quoteTotal");


  function updateQuoteTotal() {

    const subtotal =
      Number(subtotalInput.value) || 0;

    const vatPercent =
      Number(vatPercentInput.value) || 0;

    const vat =
      subtotal * vatPercent / 100;

    vatInput.value =
      vat.toFixed(2);

    totalInput.value =
      (subtotal + vat).toFixed(2);

  }


  subtotalInput.addEventListener(
    "input",
    updateQuoteTotal
  );

  vatPercentInput.addEventListener(
    "input",
    updateQuoteTotal
  );

  updateQuoteTotal();


  // RECURRING OPTIONS

  const recurringCheckbox =
    modal.querySelector("#quoteRecurring");

  const recurringOptions =
    modal.querySelector("#recurringOptions");


  recurringCheckbox.addEventListener(
    "change",
    () => {

      recurringOptions.style.display =
        recurringCheckbox.checked
          ? "block"
          : "none";

    }
  );


  // SAVE QUOTE

  modal
    .querySelector("#quoteForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const recurring =
          recurringCheckbox.checked;


        const quote = {

          user_id:
            currentUser.id,

          customer_id:
            modal.querySelector(
              "#quoteCustomer"
            ).value,

          quote_number:
            modal.querySelector(
              "#quoteNumber"
            ).value.trim(),

          status:
            "draft",

          description:
            modal.querySelector(
              "#quoteDescription"
            ).value.trim(),

          subtotal:
            Number(
              modal.querySelector(
                "#quoteSubtotal"
              ).value
            ) || 0,

          vat:
            Number(
              modal.querySelector(
                "#quoteVat"
              ).value
            ) || 0,

          total:
            Number(
              modal.querySelector(
                "#quoteTotal"
              ).value
            ) || 0,

          notes:
            modal.querySelector(
              "#quoteNotes"
            ).value.trim(),

          valid_until:
            modal.querySelector(
              "#quoteValidUntil"
            ).value || null,

          recurring:
            recurring,

          recurring_interval_weeks:
            recurring
              ? Number(
                  modal.querySelector(
                    "#quoteRecurringInterval"
                  ).value
                )
              : null

        };


        const { error } =
          await supabase
            .from("quotes")
            .insert(quote);


        if (error) {

          alert(
            "The quote could not be saved:\n\n" +
            error.message
          );

          return;

        }


        // Increase next quote number

        settings.nextQuoteNumber =
          nextNumber + 1;

        localStorage.setItem(
          "jobpilot_settings",
          JSON.stringify(settings)
        );


        modal.remove();

        await loadQuotes();

        showPage("quotes");

      }
    );

}

// =====================================================
// QUOTE PROFILE
// =====================================================

function showQuoteProfile(quoteId) {
  const quote =
    quotes.find(
      q =>
        String(q.id) === String(quoteId)
    );

  if (!quote) return;

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(quote.customer_id)
    );

  const content =
    document.getElementById("pageContent");

  document.getElementById("pageTitle").textContent =
    `Quote #${quote.quote_number || "—"}`;

  document.getElementById("pageSubtitle").textContent =
    "Quote details";

  content.innerHTML = `

    <div class="page-actions">

      <button id="backQuotes" class="button secondary">
        ← Quotes
      </button>

      <div>

        ${
          quote.status !== "converted"
            ? `
              <button id="convertQuote" class="button primary">
                📋 Convert to Job
              </button>
            `
            : `
              <button class="button secondary" disabled>
                ✓ Converted to Job
              </button>
            `
        }

        <button id="deleteQuote" class="button danger">
          Delete
        </button>

      </div>

    </div>

    <div class="content-grid">

      <div class="panel">

        <h2>Quote Details</h2>

        <div class="detail-list">

          <div>
            <span>Quote Number</span>
            <strong>
              ${escapeHtml(quote.quote_number || "—")}
            </strong>
          </div>

          <div>
            <span>Customer</span>
            <strong>
              ${
                customer
                  ? escapeHtml(customer.name)
                  : "Unknown customer"
              }
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              ${escapeHtml(quote.status || "draft")}
            </strong>
          </div>

          <div>
            <span>Valid Until</span>
            <strong>
              ${quote.valid_until || "—"}
            </strong>
          </div>

          <div>
            <span>Notes</span>
            <strong>
              ${escapeHtml(quote.notes || "—")}
            </strong>
          </div>

        </div>

      </div>

      <div class="panel">

        <h2>Financial Summary</h2>

        <div class="detail-list">

          <div>
            <span>Subtotal</span>
            <strong>
              £${Number(quote.subtotal || 0).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>VAT</span>
            <strong>
              £${Number(quote.vat || 0).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Total</span>
            <strong>
              £${Number(quote.total || 0).toFixed(2)}
            </strong>
          </div>

        </div>

      </div>

    </div>
  `;

  document
    .getElementById("backQuotes")
    .addEventListener(
      "click",
      () => showPage("quotes")
    );

  const convertButton =
    document.getElementById("convertQuote");

  if (convertButton) {
    convertButton.addEventListener(
      "click",
      () => convertQuoteToJob(quote.id)
    );
  }

  document
    .getElementById("deleteQuote")
    .addEventListener(
      "click",
      () => deleteQuote(quote.id)
    );
}


// =====================================================
// CONVERT QUOTE TO JOB
// =====================================================

async function convertQuoteToJob(quoteId) {

  const quote =
    quotes.find(
      q =>
        String(q.id) === String(quoteId)
    );

  if (!quote) {
    alert("Quote could not be found.");
    return;
  }

  if (quote.status === "converted") {
    alert("This quote has already been converted to a job.");
    return;
  }

  const customer =
    customers.find(
      c =>
        String(c.id) === String(quote.customer_id)
    );

  if (!customer) {
    alert("The customer attached to this quote could not be found.");
    return;
  }

  const confirmed =
    confirm(
      `Convert Quote #${quote.quote_number || ""} into a job for ${customer.name}?`
    );

  if (!confirmed) return;

  const job = {

    user_id:
      currentUser.id,

    customer_id:
      quote.customer_id,

    title:
      `Quote #${quote.quote_number || "Job"}`,

    description:
      `Converted from Quote #${quote.quote_number || ""}`,

    scheduled_date:
      null,

    scheduled_time:
      null,

    status:
      "pending",

    price:
      Number(quote.total || 0),

    notes:
      quote.notes || ""
  };

  const {
    data: createdJob,
    error: jobError
  } =
    await supabase
      .from("jobs")
      .insert(job)
      .select()
      .single();

  if (jobError) {
    alert(
      "The job could not be created:\n\n" +
      jobError.message
    );
    return;
  }

  const {
    error: quoteError
  } =
    await supabase
      .from("quotes")
      .update({
        status: "converted"
      })
      .eq("id", quote.id);

  if (quoteError) {

    await loadJobs();

    alert(
      "The job was created, but the quote could not be marked as converted.\n\n" +
      quoteError.message
    );

    showPage("jobs");

    return;
  }

  await loadJobs();
  await loadQuotes();

  showJobProfile(createdJob.id);

  alert(
    `Quote #${quote.quote_number || ""} has been converted to a job.`
  );
}


// =====================================================
// DELETE QUOTE
// =====================================================

async function deleteQuote(quoteId) {

  const quote =
    quotes.find(
      q =>
        String(q.id) === String(quoteId)
    );

  if (!quote) return;

  const confirmed =
    confirm(
      `Delete Quote #${quote.quote_number || ""}? This cannot be undone.`
    );

  if (!confirmed) return;

  const { error } =
    await supabase
      .from("quotes")
      .delete()
      .eq("id", quote.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadQuotes();

  showPage("quotes");
}


// =====================================================
// INVOICES PAGE
// =====================================================

function renderInvoicesPage(content) {

  content.innerHTML = `

    <div class="page-actions">

      <div>
        <h2>Invoices</h2>
        <p>Create and track invoices.</p>
      </div>

      <button id="addInvoiceButton" class="button primary">
        + New Invoice
      </button>

    </div>

    <div class="panel">

      ${
        invoices.length
          ? invoices.map(invoice => {

              const customer =
                customers.find(
                  c =>
                    String(c.id) ===
                    String(invoice.customer_id)
                );

              return `

                <div
                  class="job-row"
                  data-invoice-id="${invoice.id}"
                  style="cursor:pointer;"
                >

                  <div>

                    <strong>
                      Invoice #${escapeHtml(
                        invoice.invoice_number || "—"
                      )}
                    </strong>

                    <div class="muted">

                      ${
                        customer
                          ? escapeHtml(customer.name)
                          : "Unknown customer"
                      }

                      ${
                        invoice.issue_date
                          ? " • " + invoice.issue_date
                          : ""
                      }

                    </div>

                  </div>

                  <div>

                    <strong>
                      £${Number(
                        invoice.total || 0
                      ).toFixed(2)}
                    </strong>

                    <div class="muted">
                      ${escapeHtml(
                        invoice.status || "sent"
                      )}
                    </div>

                  </div>

                </div>

              `;
            }).join("")
          : `

            <div class="empty-state">

              <div class="empty-icon">🧾</div>

              <h3>No invoices yet</h3>

              <p>
                Convert a completed job into an invoice.
              </p>

            </div>

          `
      }

    </div>
  `;

  document
    .getElementById("addInvoiceButton")
    .addEventListener(
      "click",
      showAddInvoiceForm
    );

  content
    .querySelectorAll("[data-invoice-id]")
    .forEach(row => {
      row.addEventListener(
        "click",
        () =>
          showInvoiceProfile(
            row.dataset.invoiceId
          )
      );
    });
}


// =====================================================
// ADD INVOICE
// =====================================================

function showAddInvoiceForm() {

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  const invoiceNumber =
    generateInvoiceNumber();

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>New Invoice</h2>
          <p>Create an invoice.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="invoiceForm">

        <label>Customer *</label>

        <select id="invoiceCustomer" required>

          <option value="">
            Select customer
          </option>

          ${customers.map(customer => `
            <option value="${customer.id}">
              ${escapeHtml(customer.name)}
            </option>
          `).join("")}

        </select>

        <label>Invoice Number *</label>

        <input
          id="invoiceNumber"
          value="${escapeHtml(invoiceNumber)}"
          required
        >

        <label>Description</label>

        <textarea
          id="invoiceDescription"
          placeholder="What is this invoice for?"
        ></textarea>

        <label>Subtotal</label>

        <input
          id="invoiceSubtotal"
          type="number"
          step="0.01"
          value="0"
        >

        <label>VAT %</label>

        <input
          id="invoiceVatPercent"
          type="number"
          step="0.01"
          value="20"
        >

        <label>VAT</label>

        <input
          id="invoiceVat"
          type="number"
          step="0.01"
          value="0"
          readonly
        >

        <label>Total</label>

        <input
          id="invoiceTotal"
          type="number"
          step="0.01"
          value="0"
          readonly
        >

        <label>Status</label>

        <select id="invoiceStatus">

          <option value="sent">
            Sent
          </option>

          <option value="paid">
            Paid
          </option>

        </select>

        <label>Issue Date</label>

        <input
          id="invoiceIssueDate"
          type="date"
          value="${todayDate()}"
        >

        <label>Due Date</label>

        <input
          id="invoiceDueDate"
          type="date"
        >

        <label>Notes</label>

        <textarea id="invoiceNotes"></textarea>

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
            Save Invoice
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );

  const subtotalInput =
    modal.querySelector("#invoiceSubtotal");

  const vatPercentInput =
    modal.querySelector("#invoiceVatPercent");

  const vatInput =
    modal.querySelector("#invoiceVat");

  const totalInput =
    modal.querySelector("#invoiceTotal");

  function calculateInvoice() {

    const subtotal =
      Number(subtotalInput.value) || 0;

    const vatPercent =
      Number(vatPercentInput.value) || 0;

    const vat =
      subtotal * vatPercent / 100;

    vatInput.value =
      vat.toFixed(2);

    totalInput.value =
      (subtotal + vat).toFixed(2);
  }

  subtotalInput.addEventListener(
    "input",
    calculateInvoice
  );

  vatPercentInput.addEventListener(
    "input",
    calculateInvoice
  );

  calculateInvoice();

  modal
    .querySelector("#invoiceForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const status =
          document.getElementById("invoiceStatus").value;

        const invoice = {

          user_id:
            currentUser.id,

          customer_id:
            document.getElementById("invoiceCustomer").value,

          invoice_number:
            document.getElementById("invoiceNumber").value.trim(),

          description:
            document.getElementById("invoiceDescription").value.trim(),

          status:
            status,

          subtotal:
            Number(
              document.getElementById("invoiceSubtotal").value
            ) || 0,

          vat:
            Number(
              document.getElementById("invoiceVat").value
            ) || 0,

          total:
            Number(
              document.getElementById("invoiceTotal").value
            ) || 0,

          issue_date:
            document.getElementById("invoiceIssueDate").value ||
            todayDate(),

          due_date:
            document.getElementById("invoiceDueDate").value ||
            null,

          paid_date:
            status === "paid"
              ? todayDate()
              : null,

          notes:
            document.getElementById("invoiceNotes").value.trim()
        };

        const { error } =
          await supabase
            .from("invoices")
            .insert(invoice);

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        await loadInvoices();

        showPage("invoices");
      }
    );
}


// =====================================================
// INVOICE PROFILE
// =====================================================

function showInvoiceProfile(invoiceId) {

  const invoice =
    invoices.find(
      item =>
        String(item.id) ===
        String(invoiceId)
    );

  if (!invoice) return;

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(invoice.customer_id)
    );

  const content =
    document.getElementById("pageContent");

  document.getElementById("pageTitle").textContent =
    `Invoice #${invoice.invoice_number || "—"}`;

  document.getElementById("pageSubtitle").textContent =
    "Invoice details";

  content.innerHTML = `

    <div class="page-actions">

      <button id="backInvoices" class="button secondary">
        ← Invoices
      </button>

      <div>

        <button id="editInvoice" class="button primary">
          Edit Invoice
        </button>

        <button id="deleteInvoice" class="button danger">
          Delete
        </button>

      </div>

    </div>

    <div class="content-grid">

      <div class="panel">

        <h2>Invoice Details</h2>

        <div class="detail-list">

          <div>
            <span>Invoice Number</span>

            <strong>
              ${escapeHtml(
                invoice.invoice_number || "—"
              )}
            </strong>
          </div>

          <div>
            <span>Customer</span>

            <strong>
              ${
                customer
                  ? escapeHtml(customer.name)
                  : "Unknown customer"
              }
            </strong>
          </div>

          <div>
            <span>Status</span>

            <strong>
              ${escapeHtml(
                invoice.status || "sent"
              )}
            </strong>
          </div>

          <div>
            <span>Description</span>

            <strong>
              ${escapeHtml(
                invoice.description || "—"
              )}
            </strong>
          </div>

          <div>
            <span>Issue Date</span>

            <strong>
              ${invoice.issue_date || "—"}
            </strong>
          </div>

          <div>
            <span>Due Date</span>

            <strong>
              ${invoice.due_date || "—"}
            </strong>
          </div>

          <div>
            <span>Paid Date</span>

            <strong>
              ${invoice.paid_date || "—"}
            </strong>
          </div>

          <div>
            <span>Notes</span>

            <strong>
              ${escapeHtml(
                invoice.notes || "—"
              )}
            </strong>
          </div>

        </div>

      </div>

      <div class="panel">

        <h2>Financial Summary</h2>

        <div class="detail-list">

          <div>
            <span>Subtotal</span>

            <strong>
              £${Number(
                invoice.subtotal || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>VAT</span>

            <strong>
              £${Number(
                invoice.vat || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Total</span>

            <strong>
              £${Number(
                invoice.total || 0
              ).toFixed(2)}
            </strong>
          </div>

        </div>

      </div>

    </div>
  `;

  document
    .getElementById("backInvoices")
    .addEventListener(
      "click",
      () => showPage("invoices")
    );

  document
    .getElementById("editInvoice")
    .addEventListener(
      "click",
      () => showEditInvoiceForm(invoice.id)
    );

  document
    .getElementById("deleteInvoice")
    .addEventListener(
      "click",
      () => deleteInvoice(invoice.id)
    );
}


// =====================================================
// EDIT INVOICE
// =====================================================

function showEditInvoiceForm(invoiceId) {

  const invoice =
    invoices.find(
      item =>
        String(item.id) ===
        String(invoiceId)
    );

  if (!invoice) return;

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Edit Invoice</h2>
          <p>Update invoice details.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="editInvoiceForm">

        <label>Customer *</label>

        <select id="editInvoiceCustomer" required>

          ${customers.map(customer => `
            <option
              value="${customer.id}"
              ${
                String(customer.id) ===
                String(invoice.customer_id)
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(customer.name)}
            </option>
          `).join("")}

        </select>

        <label>Invoice Number *</label>

        <input
          id="editInvoiceNumber"
          value="${escapeHtml(
            invoice.invoice_number || ""
          )}"
          required
        >

        <label>Description</label>

        <textarea
          id="editInvoiceDescription"
          placeholder="What is this invoice for?"
        >${escapeHtml(
          invoice.description || ""
        )}</textarea>

        <label>Subtotal</label>

        <input
          id="editInvoiceSubtotal"
          type="number"
          step="0.01"
          value="${Number(
            invoice.subtotal || 0
          ).toFixed(2)}"
        >

        <label>VAT %</label>

        <input
          id="editInvoiceVatPercent"
          type="number"
          step="0.01"
          value="${
            Number(invoice.subtotal || 0) > 0
              ? (
                  Number(invoice.vat || 0) /
                  Number(invoice.subtotal || 0) *
                  100
                ).toFixed(2)
              : "20"
          }"
        >

        <label>VAT</label>

        <input
          id="editInvoiceVat"
          type="number"
          step="0.01"
          value="${Number(
            invoice.vat || 0
          ).toFixed(2)}"
          readonly
        >

        <label>Total</label>

        <input
          id="editInvoiceTotal"
          type="number"
          step="0.01"
          value="${Number(
            invoice.total || 0
          ).toFixed(2)}"
          readonly
        >

        <label>Status</label>

        <select id="editInvoiceStatus">

          <option
            value="sent"
            ${
              invoice.status === "sent"
                ? "selected"
                : ""
            }
          >
            Sent
          </option>

          <option
            value="paid"
            ${
              invoice.status === "paid"
                ? "selected"
                : ""
            }
          >
            Paid
          </option>

        </select>

        <label>Issue Date</label>

        <input
          id="editInvoiceIssueDate"
          type="date"
          value="${invoice.issue_date || ""}"
        >

        <label>Due Date</label>

        <input
          id="editInvoiceDueDate"
          type="date"
          value="${invoice.due_date || ""}"
        >

        <label>Notes</label>

        <textarea id="editInvoiceNotes">${escapeHtml(
          invoice.notes || ""
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

  modal.querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );

  const subtotalInput =
    modal.querySelector("#editInvoiceSubtotal");

  const vatPercentInput =
    modal.querySelector("#editInvoiceVatPercent");

  const vatInput =
    modal.querySelector("#editInvoiceVat");

  const totalInput =
    modal.querySelector("#editInvoiceTotal");

  function calculateInvoice() {

    const subtotal =
      Number(subtotalInput.value) || 0;

    const vatPercent =
      Number(vatPercentInput.value) || 0;

    const vat =
      subtotal * vatPercent / 100;

    vatInput.value =
      vat.toFixed(2);

    totalInput.value =
      (subtotal + vat).toFixed(2);
  }

  subtotalInput.addEventListener(
    "input",
    calculateInvoice
  );

  vatPercentInput.addEventListener(
    "input",
    calculateInvoice
  );

  modal
    .querySelector("#editInvoiceForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const status =
          document.getElementById(
            "editInvoiceStatus"
          ).value;

        const updates = {

          customer_id:
            document.getElementById(
              "editInvoiceCustomer"
            ).value,

          invoice_number:
            document.getElementById(
              "editInvoiceNumber"
            ).value.trim(),

          description:
            document.getElementById(
              "editInvoiceDescription"
            ).value.trim(),

          status:

            status,

          subtotal:
            Number(
              document.getElementById(
                "editInvoiceSubtotal"
              ).value
            ) || 0,

          vat:
            Number(
              document.getElementById(
                "editInvoiceVat"
              ).value
            ) || 0,

          total:
            Number(
              document.getElementById(
                "editInvoiceTotal"
              ).value
            ) || 0,

          issue_date:
            document.getElementById(
              "editInvoiceIssueDate"
            ).value || null,

          due_date:
            document.getElementById(
              "editInvoiceDueDate"
            ).value || null,

          paid_date:
            status === "paid"
              ? (
                  invoice.paid_date ||
                  todayDate()
                )
              : null,

          notes:
            document.getElementById(
              "editInvoiceNotes"
            ).value.trim()
        };

        const { error } =
          await supabase
            .from("invoices")
            .update(updates)
            .eq("id", invoice.id);

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        await loadInvoices();

        showInvoiceProfile(invoice.id);
      }
    );
}


// =====================================================
// DELETE INVOICE
// =====================================================

async function deleteInvoice(invoiceId) {

  const invoice =
    invoices.find(
      item =>
        String(item.id) ===
        String(invoiceId)
    );

  if (!invoice) return;

  const confirmed =
    confirm(
      `Delete Invoice #${invoice.invoice_number || ""}? This cannot be undone.`
    );

  if (!confirmed) return;

  const { error } =
    await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadInvoices();

  showPage("invoices");
}


// =====================================================
// CONVERT JOB TO INVOICE
// =====================================================

async function convertJobToInvoice(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) ===
        String(jobId)
    );

  if (!job) {
    alert("Job could not be found.");
    return;
  }

  if (
    String(job.status).toLowerCase() ===
    "invoiced"
  ) {
    alert("This job has already been invoiced.");
    return;
  }

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(job.customer_id)
    );

  if (!customer) {
    alert(
      "The customer attached to this job could not be found."
    );
    return;
  }

  const confirmed =
    confirm(
      `Create an invoice for ${customer.name} for £${Number(
        job.price || 0
      ).toFixed(2)}?`
    );

  if (!confirmed) return;

  const subtotal =
    Number(job.price || 0);

  const invoice = {

    user_id:
      currentUser.id,

    customer_id:
      job.customer_id,

    invoice_number:
      generateInvoiceNumber(),

    description:
      job.title || "Job",

    status:
      "sent",

    subtotal:
      subtotal,

    vat:
      0,

    total:
      subtotal,

    issue_date:
      todayDate(),

    due_date:
      null,

    paid_date:
      null,

    notes:
      `Created from Job: ${job.title}\n\n${job.notes || ""}`.trim()
  };

  const {
    data: createdInvoice,
    error: invoiceError
  } =
    await supabase
      .from("invoices")
      .insert(invoice)
      .select()
      .single();

  if (invoiceError) {

    console.error(
      "Convert job to invoice:",
      invoiceError
    );

    alert(
      "The invoice could not be created:\n\n" +
      invoiceError.message
    );

    return;
  }

  const {
    error: jobError
  } =
    await supabase
      .from("jobs")
      .update({
        status: "invoiced"
      })
      .eq("id", job.id);

  if (jobError) {

    console.error(
      "Job status update:",
      jobError
    );

    await loadInvoices();
    await loadJobs();

    alert(
      "The invoice was created, but the job could not be marked as invoiced.\n\n" +
      jobError.message
    );

    showPage("invoices");

    return;
  }

  await loadInvoices();
  await loadJobs();

  showInvoiceProfile(createdInvoice.id);

  alert(
    `Invoice #${createdInvoice.invoice_number} has been created.`
  );
}


// =====================================================
// INVOICE NUMBER
// =====================================================

function generateInvoiceNumber() {

  const year =
    new Date().getFullYear();

  const next =
    invoices.length + 1;

  return `${year}-${String(next).padStart(4, "0")}`;
}


// =====================================================
// QUOTE NUMBER
// =====================================================

function generateQuoteNumber() {

  const year =
    new Date().getFullYear();

  const next =
    quotes.length + 1;

  return `${year}-${String(next).padStart(4, "0")}`;
}


// =====================================================
// SETTINGS
// =====================================================

function renderSettings(content) {

  content.innerHTML = `

    <div class="page-actions">
      <div>
        <h2>Settings</h2>
        <p>Manage your account and business preferences.</p>
      </div>
    </div>

    <div class="panel settings-panel">

      <!-- ACCOUNT -->
      <h2>Account</h2>

      <label>Email</label>
      <input
        type="email"
        value="${escapeHtml(currentUser.email || "")}"
        disabled
      >

      <label>New Password</label>
      <input
        type="password"
        id="settingsPassword"
        placeholder="Leave blank to keep your current password"
      >

      <button
        class="button primary"
        onclick="changeSettingsPassword()"
        style="margin-top:12px;"
      >
        Change Password
      </button>


      <hr>


      <!-- BUSINESS DETAILS -->
      <h2>Business Details</h2>

      <label>Business Name</label>
      <input
        id="settingsBusinessName"
        type="text"
        placeholder="Your business name"
      >

      <label>Contact Name</label>
      <input
        id="settingsContactName"
        type="text"
        placeholder="Your name"
      >

      <label>Phone</label>
      <input
        id="settingsPhone"
        type="text"
        placeholder="Phone number"
      >

      <label>Business Email</label>
      <input
        id="settingsBusinessEmail"
        type="email"
        placeholder="Business email"
      >

      <label>Address</label>
      <textarea
        id="settingsAddress"
        placeholder="Business address"
      ></textarea>

      <label>Postcode</label>
      <input
        id="settingsPostcode"
        type="text"
        placeholder="Postcode"
      >

      <label>Website</label>
      <input
        id="settingsWebsite"
        type="text"
        placeholder="https://"
      >


      <hr>


      <!-- INVOICE SETTINGS -->
      <h2>Invoice Settings</h2>

      <label>Invoice Prefix</label>
      <input
        id="settingsInvoicePrefix"
        type="text"
        placeholder="INV-"
      >

      <label>Next Invoice Number</label>
      <input
        id="settingsNextInvoiceNumber"
        type="number"
        min="1"
        placeholder="1"
      >

      <label>Default Payment Terms</label>
      <select id="settingsPaymentTerms">
        <option value="7">7 days</option>
        <option value="14">14 days</option>
        <option value="30" selected>30 days</option>
        <option value="60">60 days</option>
      </select>

      <label>Default VAT Rate (%)</label>
      <input
        id="settingsVatRate"
        type="number"
        step="0.01"
        min="0"
        value="20"
      >

      <label>Invoice Footer / Notes</label>
      <textarea
        id="settingsInvoiceFooter"
        placeholder="Payment details, bank information, thank you message, etc."
      ></textarea>


      <hr>


      <!-- QUOTE SETTINGS -->
      <h2>Quote Settings</h2>

      <label>Quote Prefix</label>
      <input
        id="settingsQuotePrefix"
        type="text"
        placeholder="QUO-"
      >

      <label>Next Quote Number</label>
      <input
        id="settingsNextQuoteNumber"
        type="number"
        min="1"
        placeholder="1"
      >

      <label>Quote Validity</label>
      <select id="settingsQuoteValidity">
        <option value="7">7 days</option>
        <option value="14">14 days</option>
        <option value="30" selected>30 days</option>
        <option value="60">60 days</option>
      </select>

      <label>Quote Footer / Notes</label>
      <textarea
        id="settingsQuoteFooter"
        placeholder="Terms, notes or other information shown on quotes."
      ></textarea>


      <hr>


      <!-- APPEARANCE -->
      <h2>Appearance</h2>

      <label>Primary Colour</label>
      <input
        id="settingsPrimaryColour"
        type="color"
        value="#2563eb"
        style="height:45px;padding:4px;"
      >

      <label>Currency</label>
      <select id="settingsCurrency">
        <option value="GBP" selected>GBP (£)</option>
        <option value="EUR">EUR (€)</option>
        <option value="USD">USD ($)</option>
      </select>

      <label>Date Format</label>
      <select id="settingsDateFormat">
        <option value="DD/MM/YYYY" selected>DD/MM/YYYY</option>
        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
      </select>


      <hr>


      <!-- NOTIFICATIONS -->
      <h2>Notifications</h2>

      <label>
        <input
          type="checkbox"
          id="settingsEmailNotifications"
          checked
        >
        Email notifications
      </label>

      <label>
        <input
          type="checkbox"
          id="settingsPaymentReminders"
        >
        Payment reminders
      </label>


      <div
        id="settingsMessage"
        class="muted"
        style="margin-top:15px;"
      ></div>

      <div
        style="
          display:flex;
          justify-content:flex-end;
          margin-top:25px;
        "
      >
        <button
          class="button primary"
          onclick="saveSettings()"
        >
          Save Settings
        </button>
      </div>

    </div>
  `;

  loadSettings();

}


// =====================================================
// SETTINGS HELPERS
// =====================================================

function loadSettings() {

  const settings = JSON.parse(
    localStorage.getItem("jobpilot_settings") || "{}"
  );

  const setValue = (id, value) => {
    const element = document.getElementById(id);

    if (element && value !== undefined && value !== null) {
      element.value = value;
    }
  };

  setValue(
    "settingsBusinessName",
    settings.businessName || ""
  );

  setValue(
    "settingsContactName",
    settings.contactName || ""
  );

  setValue(
    "settingsPhone",
    settings.phone || ""
  );

  setValue(
    "settingsBusinessEmail",
    settings.businessEmail || ""
  );

  setValue(
    "settingsAddress",
    settings.address || ""
  );

  setValue(
    "settingsPostcode",
    settings.postcode || ""
  );

  setValue(
    "settingsWebsite",
    settings.website || ""
  );

  setValue(
    "settingsInvoicePrefix",
    settings.invoicePrefix || "INV-"
  );

  setValue(
    "settingsNextInvoiceNumber",
    settings.nextInvoiceNumber || 1
  );

  setValue(
    "settingsPaymentTerms",
    settings.paymentTerms || 30
  );

  setValue(
    "settingsVatRate",
    settings.vatRate ?? 20
  );

  setValue(
    "settingsInvoiceFooter",
    settings.invoiceFooter || ""
  );

  setValue(
    "settingsQuotePrefix",
    settings.quotePrefix || "QUO-"
  );

  setValue(
    "settingsNextQuoteNumber",
    settings.nextQuoteNumber || 1
  );

  setValue(
    "settingsQuoteValidity",
    settings.quoteValidity || 30
  );

  setValue(
    "settingsQuoteFooter",
    settings.quoteFooter || ""
  );

  setValue(
    "settingsPrimaryColour",
    settings.primaryColour || "#2563eb"
  );

  setValue(
    "settingsCurrency",
    settings.currency || "GBP"
  );

  setValue(
    "settingsDateFormat",
    settings.dateFormat || "DD/MM/YYYY"
  );

  const emailNotifications =
    document.getElementById("settingsEmailNotifications");

  if (emailNotifications) {
    emailNotifications.checked =
      settings.emailNotifications !== false;
  }

  const paymentReminders =
    document.getElementById("settingsPaymentReminders");

  if (paymentReminders) {
    paymentReminders.checked =
      settings.paymentReminders === true;
  }

  applySettingsAppearance();
}


// =====================================================
// SAVE SETTINGS
// =====================================================

function saveSettings() {

  const getValue = (id) => {
    const element = document.getElementById(id);
    return element ? element.value : "";
  };

  const settings = {

    businessName:
      getValue("settingsBusinessName"),

    contactName:
      getValue("settingsContactName"),

    phone:
      getValue("settingsPhone"),

    businessEmail:
      getValue("settingsBusinessEmail"),

    address:
      getValue("settingsAddress"),

    postcode:
      getValue("settingsPostcode"),

    website:
      getValue("settingsWebsite"),

    invoicePrefix:
      getValue("settingsInvoicePrefix"),

    nextInvoiceNumber:
      Number(getValue("settingsNextInvoiceNumber")) || 1,

    paymentTerms:
      Number(getValue("settingsPaymentTerms")) || 30,

    vatRate:
      Number(getValue("settingsVatRate")) || 0,

    invoiceFooter:
      getValue("settingsInvoiceFooter"),

    quotePrefix:
      getValue("settingsQuotePrefix"),

    nextQuoteNumber:
      Number(getValue("settingsNextQuoteNumber")) || 1,

    quoteValidity:
      Number(getValue("settingsQuoteValidity")) || 30,

    quoteFooter:
      getValue("settingsQuoteFooter"),

    primaryColour:
      getValue("settingsPrimaryColour"),

    currency:
      getValue("settingsCurrency"),

    dateFormat:
      getValue("settingsDateFormat"),

    emailNotifications:
      document.getElementById(
        "settingsEmailNotifications"
      )?.checked ?? true,

    paymentReminders:
      document.getElementById(
        "settingsPaymentReminders"
      )?.checked ?? false
  };

  localStorage.setItem(
    "jobpilot_settings",
    JSON.stringify(settings)
  );

  applySettingsAppearance();

  const message =
    document.getElementById("settingsMessage");

  if (message) {
    message.textContent =
      "Settings saved successfully.";

    message.style.color = "var(--success)";

    setTimeout(() => {
      message.textContent = "";
    }, 3000);
  }
}


// =====================================================
// APPLY SETTINGS APPEARANCE
// =====================================================

function applySettingsAppearance() {

  const settings = JSON.parse(
    localStorage.getItem("jobpilot_settings") || "{}"
  );

  const colour =
    settings.primaryColour || "#2563eb";

  document.documentElement.style.setProperty(
    "--primary",
    colour
  );
}


// =====================================================
// CHANGE PASSWORD
// =====================================================

async function changeSettingsPassword() {

  const passwordInput =
    document.getElementById("settingsPassword");

  if (!passwordInput) return;

  const password =
    passwordInput.value.trim();

  if (!password) {
    alert("Please enter a new password.");
    return;
  }

  if (password.length < 6) {
    alert(
      "Password must be at least 6 characters."
    );
    return;
  }

  try {

    const { error } =
      await supabase.auth.updateUser({
        password
      });

    if (error) throw error;

    passwordInput.value = "";

    alert(
      "Password changed successfully."
    );

  } catch (error) {

    alert(
      "Could not change password: " +
      error.message
    );
  }
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {
  await supabase.auth.signOut();
}


// =====================================================
// HELPERS
// =====================================================

function getCustomerName(customerId) {

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(customerId)
    );

  return customer
    ? escapeHtml(customer.name)
    : "Unknown customer";
}


function todayDate() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(now.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(now.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// START
// =====================================================

init();
