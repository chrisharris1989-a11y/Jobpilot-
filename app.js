import { supabase } from "./supabase.js";

let currentUser = null;
let customers = [];
let jobs = [];
let quotes = [];

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
    .forEach(button =>
      button.classList.remove("active")
    );

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
    renderSimplePage(
      content,
      "🧾",
      "Invoices",
      "Invoice management is coming next."
    );
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
          <strong>£0</strong>
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
                    £${Number(
                      job.price || 0
                    ).toFixed(2)}
                  </span>

                </div>
              `).join("")
            : `
              <div class="empty-state">

                <div class="empty-icon">
                  📋
                </div>

                <h3>No jobs yet</h3>

                <p>
                  Add your first job to get started.
                </p>

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

        <button
          class="quick-button"
          data-action="customers"
        >
          👤 Add Customer
        </button>

        <button
          class="quick-button"
          data-action="jobs"
        >
          📋 Add Job
        </button>

        <button
          class="quick-button"
          data-action="quotes"
        >
          💷 Create Quote
        </button>

        <button
          class="quick-button"
          data-action="invoices"
        >
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

      <button
        id="addCustomerButton"
        class="button primary"
      >
        + Add Customer
      </button>

    </div>

    <div class="panel">

      <input
        id="customerSearch"
        class="search-input"
        placeholder="Search customers..."
      >

      <div
        id="customerTable"
        class="table-container"
      ></div>

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


// =====================================================
// CUSTOMER TABLE
// =====================================================

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

        <div class="empty-icon">
          👥
        </div>

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
            Save Customer
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelectorAll(".close")
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
            document
              .getElementById("customerName")
              .value.trim(),

          phone:
            document
              .getElementById("customerPhone")
              .value.trim(),

          email:
            document
              .getElementById("customerEmail")
              .value.trim(),

          address_line1:
            document
              .getElementById("customerAddress")
              .value.trim(),

          city:
            document
              .getElementById("customerCity")
              .value.trim(),

          postcode:
            document
              .getElementById("customerPostcode")
              .value.trim(),

          notes:
            document
              .getElementById("customerNotes")
              .value.trim()
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
        String(item.id) ===
        String(customerId)
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

      <button
        id="backCustomers"
        class="button secondary"
      >
        ← Customers
      </button>

      <div>

        <button
          id="editCustomer"
          class="button primary"
        >
          Edit Customer
        </button>

        <button
          id="deleteCustomer"
          class="button danger"
        >
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
                    • ${formatStatus(job.status)}
                  </div>

                </div>

                <strong>
                  £${Number(job.price || 0).toFixed(2)}
                </strong>

              </div>
            `).join("")
          : `
            <div class="empty-state">

              <div class="empty-icon">
                📋
              </div>

              <h3>No jobs yet</h3>

              <p>
                This customer doesn't have any jobs.
              </p>

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
        () => showJobProfile(row.dataset.historyJob)
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
        String(item.id) ===
        String(customerId)
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
            document
              .getElementById("editCustomerName")
              .value.trim(),

          phone:
            document
              .getElementById("editCustomerPhone")
              .value.trim(),

          email:
            document
              .getElementById("editCustomerEmail")
              .value.trim(),

          address_line1:
            document
              .getElementById("editCustomerAddress")
              .value.trim(),

          city:
            document
              .getElementById("editCustomerCity")
              .value.trim(),

          postcode:
            document
              .getElementById("editCustomerPostcode")
              .value.trim(),

          notes:
            document
              .getElementById("editCustomerNotes")
              .value.trim()
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
        String(item.id) ===
        String(customerId)
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

      <button
        id="addJobButton"
        class="button primary"
      >
        + Add Job
      </button>

    </div>

    <div class="panel">

      ${
        jobs.length
          ? jobs.map(job => `

              <div
                class="job-row"
                style="cursor:pointer;"
                data-job-id="${job.id}"
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

                    ${
                      job.scheduled_time
                        ? " • " + job.scheduled_time
                        : ""
                    }

                  </div>

                </div>

                <div style="text-align:right;">

                  <div>
                    <span class="status-badge">
                      ${formatStatus(job.status)}
                    </span>
                  </div>

                  <strong>
                    £${Number(
                      job.price || 0
                    ).toFixed(2)}
                  </strong>

                </div>

              </div>

            `).join("")
          : `

            <div class="empty-state">

              <div class="empty-icon">
                📋
              </div>

              <h3>No jobs yet</h3>

              <p>
                Add your first job.
              </p>

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

          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>

        </select>

        <label>Price</label>

        <input
          id="jobPrice"
          type="number"
          step="0.01"
          value="0"
        >

        <label>Notes</label>

        <textarea id="jobNotes"></textarea>

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
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );

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
            document
              .getElementById("jobCustomer")
              .value,

          title:
            document
              .getElementById("jobTitle")
              .value.trim(),

          description:
            document
              .getElementById("jobDescription")
              .value.trim(),

          scheduled_date:
            document
              .getElementById("jobDate")
              .value || null,

          scheduled_time:
            document
              .getElementById("jobTime")
              .value || null,

          status:
            document
              .getElementById("jobStatus")
              .value,

          price:
            Number(
              document
                .getElementById("jobPrice")
                .value
            ) || 0,

          notes:
            document
              .getElementById("jobNotes")
              .value.trim()
        };

        const { error } =
          await supabase
            .from("jobs")
            .insert(job);

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        await loadJobs();

        showPage("jobs");
      }
    );
}


// =====================================================
// JOB PROFILE
// =====================================================

function showJobProfile(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) ===
        String(jobId)
    );

  if (!job) return;

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(job.customer_id)
    );

  const content =
    document.getElementById("pageContent");

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
              ${escapeHtml(job.title || "—")}
            </strong>
          </div>

          <div>
            <span>Description</span>
            <strong>
              ${escapeHtml(job.description || "—")}
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
              ${formatStatus(job.status)}
            </strong>
          </div>

          <div>
            <span>Notes</span>
            <strong>
              ${escapeHtml(job.notes || "—")}
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
              £${Number(job.price || 0).toFixed(2)}
            </strong>
          </div>

        </div>

      </div>

    </div>
  `;

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
}


// =====================================================
// EDIT JOB
// =====================================================

function showEditJobForm(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) ===
        String(jobId)
    );

  if (!job) return;

  const modal =
    document.createElement("div");

  modal.className = "modal show";

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

        <textarea id="editJobDescription">${escapeHtml(
          job.description || ""
        )}</textarea>

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
            value="in_progress"
            ${job.status === "in_progress" ? "selected" : ""}
          >
            In Progress
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

        </select>

        <label>Price</label>

        <input
          id="editJobPrice"
          type="number"
          step="0.01"
          value="${Number(job.price || 0).toFixed(2)}"
        >

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
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );

  modal
    .querySelector("#editJobForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const updates = {

          customer_id:
            document
              .getElementById("editJobCustomer")
              .value,

          title:
            document
              .getElementById("editJobTitle")
              .value.trim(),

          description:
            document
              .getElementById("editJobDescription")
              .value.trim(),

          scheduled_date:
            document
              .getElementById("editJobDate")
              .value || null,

          scheduled_time:
            document
              .getElementById("editJobTime")
              .value || null,

          status:
            document
              .getElementById("editJobStatus")
              .value,

          price:
            Number(
              document
                .getElementById("editJobPrice")
                .value
            ) || 0,

          notes:
            document
              .getElementById("editJobNotes")
              .value.trim()
        };

        const { error } =
          await supabase
            .from("jobs")
            .update(updates)
            .eq("id", job.id);

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        await loadJobs();

        showJobProfile(job.id);
      }
    );
}


// =====================================================
// DELETE JOB
// =====================================================

async function deleteJob(jobId) {

  const job =
    jobs.find(
      item =>
        String(item.id) ===
        String(jobId)
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

      <button
        id="addQuoteButton"
        class="button primary"
      >
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

                <div
                  class="job-row"
                  style="cursor:pointer;"
                  data-quote-id="${quote.id}"
                >

                  <div>

                    <strong>
                      Quote #${escapeHtml(
                        quote.quote_number || "—"
                      )}
                    </strong>

                    <div>
                      ${escapeHtml(
                        quote.title || "Untitled quote"
                      )}
                    </div>

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

                  <div style="text-align:right;">

                    <div>
                      <span class="status-badge">
                        ${formatStatus(quote.status)}
                      </span>
                    </div>

                    <strong>
                      £${Number(
                        quote.total || 0
                      ).toFixed(2)}
                    </strong>

                  </div>

                </div>

              `;
            }).join("")
          : `

            <div class="empty-state">

              <div class="empty-icon">
                💷
              </div>

              <h3>No quotes yet</h3>

              <p>
                Create your first quote.
              </p>

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
    .querySelectorAll("[data-quote-id]")
    .forEach(row => {
      row.addEventListener(
        "click",
        () =>
          showQuoteProfile(
            row.dataset.quoteId
          )
      );
    });
}


// =====================================================
// ADD QUOTE
// =====================================================

function showAddQuoteForm() {

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  const quoteNumber =
    generateQuoteNumber();

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

        <select
          id="quoteCustomer"
          required
        >

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


        <h3 style="margin-top:20px;">
          Quote Details
        </h3>

        <label>Job / Service Title *</label>

        <input
          id="quoteTitle"
          required
          placeholder="e.g. Driveway pressure washing"
        >

        <label>Details / Scope of Work</label>

        <textarea
          id="quoteDescription"
          rows="5"
          placeholder="Describe the work included in this quotation..."
        ></textarea>


        <h3 style="margin-top:20px;">
          Financial Details
        </h3>

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
          value="20"
        >

        <label>VAT Amount</label>

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


        <h3 style="margin-top:20px;">
          Quote Settings
        </h3>

        <label>Status</label>

        <select id="quoteStatus">

          <option value="draft">
            Draft
          </option>

          <option value="sent">
            Sent
          </option>

          <option value="accepted">
            Accepted
          </option>

          <option value="rejected">
            Rejected
          </option>

          <option value="expired">
            Expired
          </option>

        </select>

        <label>Valid Until</label>

        <input
          id="quoteValidUntil"
          type="date"
        >

        <label>Notes</label>

        <textarea
          id="quoteNotes"
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
            Save Quote
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );


  const subtotalInput =
    modal.querySelector("#quoteSubtotal");

  const vatPercentInput =
    modal.querySelector("#quoteVatPercent");

  const vatInput =
    modal.querySelector("#quoteVat");

  const totalInput =
    modal.querySelector("#quoteTotal");


  function updateQuoteTotals() {

    const subtotal =
      Number(subtotalInput.value) || 0;

    const vatPercent =
      Number(vatPercentInput.value) || 0;

    const vat =
      subtotal * vatPercent / 100;

    const total =
      subtotal + vat;

    vatInput.value =
      vat.toFixed(2);

    totalInput.value =
      total.toFixed(2);
  }


  subtotalInput.addEventListener(
    "input",
    updateQuoteTotals
  );

  vatPercentInput.addEventListener(
    "input",
    updateQuoteTotals
  );

  updateQuoteTotals();


  modal
    .querySelector("#quoteForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const quote = {

          user_id:
            currentUser.id,

          customer_id:
            document
              .getElementById("quoteCustomer")
              .value,

          quote_number:
            document
              .getElementById("quoteNumber")
              .value.trim(),

          title:
            document
              .getElementById("quoteTitle")
              .value.trim(),

          description:
            document
              .getElementById("quoteDescription")
              .value.trim(),

          status:
            document
              .getElementById("quoteStatus")
              .value,

          subtotal:
            Number(
              document
                .getElementById("quoteSubtotal")
                .value
            ) || 0,

          vat_percent:
            Number(
              document
                .getElementById("quoteVatPercent")
                .value
            ) || 0,

          vat:
            Number(
              document
                .getElementById("quoteVat")
                .value
            ) || 0,

          total:
            Number(
              document
                .getElementById("quoteTotal")
                .value
            ) || 0,

          notes:
            document
              .getElementById("quoteNotes")
              .value.trim(),

          valid_until:
            document
              .getElementById("quoteValidUntil")
              .value || null
        };


        const { error } =
          await supabase
            .from("quotes")
            .insert(quote);

        if (error) {
          alert(error.message);
          return;
        }

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
        String(q.id) ===
        String(quoteId)
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

      <button
        id="backQuotes"
        class="button secondary"
      >
        ← Quotes
      </button>

      <div>

        <button
          id="editQuote"
          class="button primary"
        >
          Edit Quote
        </button>

        ${
          quote.status !== "converted"
            ? `
              <button
                id="convertQuote"
                class="button primary"
              >
                Convert to Job
              </button>
            `
            : `
              <span>
                ✓ Converted to Job
              </span>
            `
        }

        <button
          id="deleteQuote"
          class="button danger"
        >
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
              ${escapeHtml(
                quote.quote_number || "—"
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
            <span>Title</span>
            <strong>
              ${escapeHtml(
                quote.title || "—"
              )}
            </strong>
          </div>

          <div>
            <span>Description</span>
            <strong>
              ${escapeHtml(
                quote.description || "—"
              )}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              ${formatStatus(quote.status)}
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
              ${escapeHtml(
                quote.notes || "—"
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
                quote.subtotal || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>VAT Rate</span>
            <strong>
              ${Number(
                quote.vat_percent || 0
              ).toFixed(2)}%
            </strong>
          </div>

          <div>
            <span>VAT</span>
            <strong>
              £${Number(
                quote.vat || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Total</span>
            <strong>
              £${Number(
                quote.total || 0
              ).toFixed(2)}
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


  document
    .getElementById("editQuote")
    .addEventListener(
      "click",
      () => showEditQuoteForm(quote.id)
    );


  const convertButton =
    document.getElementById("convertQuote");

  if (convertButton) {

    convertButton.addEventListener(
      "click",
      () =>
        convertQuoteToJob(quote.id)
    );

  }


  document
    .getElementById("deleteQuote")
    .addEventListener(
      "click",
      () =>
        deleteQuote(quote.id)
    );
}


// =====================================================
// EDIT QUOTE
// =====================================================

function showEditQuoteForm(quoteId) {

  const quote =
    quotes.find(
      q =>
        String(q.id) ===
        String(quoteId)
    );

  if (!quote) return;

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Edit Quote</h2>
          <p>Update quotation details.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="editQuoteForm">

        <label>Customer *</label>

        <select id="editQuoteCustomer" required>

          ${customers.map(customer => `

            <option
              value="${customer.id}"
              ${
                String(customer.id) ===
                String(quote.customer_id)
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(customer.name)}
            </option>

          `).join("")}

        </select>


        <label>Quote Number *</label>

        <input
          id="editQuoteNumber"
          value="${escapeHtml(
            quote.quote_number || ""
          )}"
          required
        >


        <h3 style="margin-top:20px;">
          Quote Details
        </h3>

        <label>Job / Service Title *</label>

        <input
          id="editQuoteTitle"
          value="${escapeHtml(
            quote.title || ""
          )}"
          required
        >

        <label>Details / Scope of Work</label>

        <textarea
          id="editQuoteDescription"
          rows="5"
        >${escapeHtml(
          quote.description || ""
        )}</textarea>


        <h3 style="margin-top:20px;">
          Financial Details
        </h3>

        <label>Subtotal</label>

        <input
          id="editQuoteSubtotal"
          type="number"
          step="0.01"
          min="0"
          value="${Number(
            quote.subtotal || 0
          ).toFixed(2)}"
        >

        <label>VAT %</label>

        <input
          id="editQuoteVatPercent"
          type="number"
          step="0.01"
          min="0"
          value="${Number(
            quote.vat_percent || 0
          )}"
        >

        <label>VAT Amount</label>

        <input
          id="editQuoteVat"
          type="number"
          step="0.01"
          value="${Number(
            quote.vat || 0
          ).toFixed(2)}"
          readonly
        >

        <label>Total</label>

        <input
          id="editQuoteTotal"
          type="number"
          step="0.01"
          value="${Number(
            quote.total || 0
          ).toFixed(2)}"
          readonly
        >


        <h3 style="margin-top:20px;">
          Quote Settings
        </h3>

        <label>Status</label>

        <select id="editQuoteStatus">

          <option
            value="draft"
            ${quote.status === "draft" ? "selected" : ""}
          >
            Draft
          </option>

          <option
            value="sent"
            ${quote.status === "sent" ? "selected" : ""}
          >
            Sent
          </option>

          <option
            value="accepted"
            ${quote.status === "accepted" ? "selected" : ""}
          >
            Accepted
          </option>

          <option
            value="rejected"
            ${quote.status === "rejected" ? "selected" : ""}
          >
            Rejected
          </option>

          <option
            value="expired"
            ${quote.status === "expired" ? "selected" : ""}
          >
            Expired
          </option>

          ${
            quote.status === "converted"
              ? `
                <option value="converted" selected>
                  Converted
                </option>
              `
              : ""
          }

        </select>

        <label>Valid Until</label>

        <input
          id="editQuoteValidUntil"
          type="date"
          value="${quote.valid_until || ""}"
        >

        <label>Notes</label>

        <textarea id="editQuoteNotes">${escapeHtml(
          quote.notes || ""
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
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );


  const subtotalInput =
    modal.querySelector("#editQuoteSubtotal");

  const vatPercentInput =
    modal.querySelector("#editQuoteVatPercent");

  const vatInput =
    modal.querySelector("#editQuoteVat");

  const totalInput =
    modal.querySelector("#editQuoteTotal");


  function updateTotals() {

    const subtotal =
      Number(subtotalInput.value) || 0;

    const vatPercent =
      Number(vatPercentInput.value) || 0;

    const vat =
      subtotal * vatPercent / 100;

    const total =
      subtotal + vat;

    vatInput.value =
      vat.toFixed(2);

    totalInput.value =
      total.toFixed(2);
  }


  subtotalInput.addEventListener(
    "input",
    updateTotals
  );

  vatPercentInput.addEventListener(
    "input",
    updateTotals
  );


  modal
    .querySelector("#editQuoteForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        updateTotals();

        const updates = {

          customer_id:
            document
              .getElementById("editQuoteCustomer")
              .value,

          quote_number:
            document
              .getElementById("editQuoteNumber")
              .value.trim(),

          title:
            document
              .getElementById("editQuoteTitle")
              .value.trim(),

          description:
            document
              .getElementById("editQuoteDescription")
              .value.trim(),

          status:
            document
              .getElementById("editQuoteStatus")
              .value,

          subtotal:
            Number(
              document
                .getElementById("editQuoteSubtotal")
                .value
            ) || 0,

          vat_percent:
            Number(
              document
                .getElementById("editQuoteVatPercent")
                .value
            ) || 0,

          vat:
            Number(
              document
                .getElementById("editQuoteVat")
                .value
            ) || 0,

          total:
            Number(
              document
                .getElementById("editQuoteTotal")
                .value
            ) || 0,

          valid_until:
            document
              .getElementById("editQuoteValidUntil")
              .value || null,

          notes:
            document
              .getElementById("editQuoteNotes")
              .value.trim()
        };


        const { error } =
          await supabase
            .from("quotes")
            .update(updates)
            .eq("id", quote.id);


        if (error) {
          alert(error.message);
          return;
        }


        modal.remove();

        await loadQuotes();

        showQuoteProfile(quote.id);
      }
    );
}


// =====================================================
// CONVERT QUOTE TO JOB
// =====================================================

async function convertQuoteToJob(quoteId) {

  const quote =
    quotes.find(
      q =>
        String(q.id) ===
        String(quoteId)
    );

  if (!quote) {
    alert("Quote could not be found.");
    return;
  }

  if (quote.status === "converted") {
    alert(
      "This quote has already been converted to a job."
    );
    return;
  }

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(quote.customer_id)
    );

  if (!customer) {
    alert(
      "The customer attached to this quote could not be found."
    );
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
      quote.title ||
      `Quote #${quote.quote_number || "Job"}`,

    description:
      quote.description ||
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

    console.error(
      "Convert quote - job error:",
      jobError
    );

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

    console.error(
      "Convert quote - quote update error:",
      quoteError
    );

    await loadJobs();

    alert(
      "The job was created successfully, but the quote could not be marked as converted.\n\n" +
      quoteError.message
    );

    showPage("jobs");

    return;
  }


  await loadJobs();
  await loadQuotes();


  const newJob =
    jobs.find(
      item =>
        String(item.id) ===
        String(createdJob.id)
    );


  if (newJob) {
    showJobProfile(newJob.id);
  } else {
    showPage("jobs");
  }


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
        String(q.id) ===
        String(quoteId)
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

    <div class="panel settings-panel">

      <h2>Account</h2>

      <p class="muted">
        ${escapeHtml(currentUser.email)}
      </p>

      <hr>

      <h3>JobPilot</h3>

      <p class="muted">
        CRM for UK tradespeople.
      </p>

    </div>
  `;
}


// =====================================================
// SIMPLE PAGE
// =====================================================

function renderSimplePage(
  content,
  icon,
  title,
  message
) {

  content.innerHTML = `

    <div class="panel">

      <div class="empty-state">

        <div class="empty-icon">
          ${icon}
        </div>

        <h3>${title}</h3>

        <p>${message}</p>

      </div>

    </div>
  `;
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


function formatStatus(status) {

  const statuses = {

    pending: "Pending",

    scheduled: "Scheduled",

    in_progress: "In Progress",

    completed: "Completed",

    cancelled: "Cancelled",

    draft: "Draft",

    sent: "Sent",

    accepted: "Accepted",

    rejected: "Rejected",

    expired: "Expired",

    converted: "Converted"

  };

  return statuses[status] ||
    String(status || "Unknown");
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
