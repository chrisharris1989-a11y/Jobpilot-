import { supabase } from "./supabase.js";

let currentUser = null;
let customers = [];
let jobs = [];
let quotes = [];

const app = document.getElementById("app");


// =====================================================
// INIT
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
    console.error(error);
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
        ascending: true
      });

  if (error) {
    console.error(error);
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
    console.error("Quote loading error:", error);
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
              currentUser.email.substring(0, 2).toUpperCase()
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
          <strong>£${quoteValue().toFixed(2)}</strong>
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

                  <strong>
                    ${escapeHtml(job.title)}
                  </strong>

                  <span>
                    ${job.scheduled_date || "No date"}
                  </span>

                </div>
              `).join("")
            : `
              <div class="empty-state">

                <div class="empty-icon">📋</div>

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
// CUSTOMER PAGE
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
  const container =
    document.getElementById("customerTable");

  if (!container) return;

  const term =
    search.trim().toLowerCase();

  const filtered =
    customers.filter(customer =>
      `${customer.name || ""}
       ${customer.phone || ""}
       ${customer.email || ""}
       ${customer.city || ""}
       ${customer.postcode || ""}`
        .toLowerCase()
        .includes(term)
    );

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">👥</div>

        <h3>No customers found</h3>

        <p>
          Add a customer to get started.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="customer-table">

      ${filtered.map(customer => `
        <div
          class="job-row customer-row"
          data-customer-id="${customer.id}"
        >

          <div>

            <strong>
              ${escapeHtml(customer.name)}
            </strong>

            <div class="muted">
              ${escapeHtml(customer.phone || "")}
              ${customer.email
                ? " • " + escapeHtml(customer.email)
                : ""}
            </div>

          </div>

          <span>
            ${escapeHtml(customer.city || "")}
          </span>

        </div>
      `).join("")}

    </div>
  `;

  container
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

        <input
          id="customerName"
          required
        >

        <label>Phone</label>

        <input
          id="customerPhone"
        >

        <label>Email</label>

        <input
          id="customerEmail"
          type="email"
        >

        <label>Address</label>

        <input
          id="customerAddress"
        >

        <label>Town / City</label>

        <input
          id="customerCity"
        >

        <label>Postcode</label>

        <input
          id="customerPostcode"
        >

        <label>Notes</label>

        <textarea
          id="customerNotes"
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
              .value
              .trim(),

          phone:
            document
              .getElementById("customerPhone")
              .value
              .trim(),

          email:
            document
              .getElementById("customerEmail")
              .value
              .trim(),

          address_line1:
            document
              .getElementById("customerAddress")
              .value
              .trim(),

          city:
            document
              .getElementById("customerCity")
              .value
              .trim(),

          postcode:
            document
              .getElementById("customerPostcode")
              .value
              .trim(),

          notes:
            document
              .getElementById("customerNotes")
              .value
              .trim()
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

  const customerQuotes =
    quotes.filter(
      quote =>
        String(quote.customer_id) ===
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

      <div>
        <button
          id="backCustomers"
          class="button secondary"
        >
          ← Customers
        </button>
      </div>

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
            <strong>
              ${escapeHtml(customer.name)}
            </strong>
          </div>

          <div>
            <span>Phone</span>
            <strong>
              ${escapeHtml(customer.phone || "—")}
            </strong>
          </div>

          <div>
            <span>Email</span>
            <strong>
              ${escapeHtml(customer.email || "—")}
            </strong>
          </div>

          <div>
            <span>Address</span>
            <strong>
              ${escapeHtml(customer.address_line1 || "—")}
            </strong>
          </div>

          <div>
            <span>Town / City</span>
            <strong>
              ${escapeHtml(customer.city || "—")}
            </strong>
          </div>

          <div>
            <span>Postcode</span>
            <strong>
              ${escapeHtml(customer.postcode || "—")}
            </strong>
          </div>

          <div>
            <span>Notes</span>
            <strong>
              ${escapeHtml(customer.notes || "—")}
            </strong>
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
              <strong>
                £${totalValue.toFixed(2)}
              </strong>
            </div>
          </div>

          <div class="stat-card">
            <div>
              <span>Quotes</span>
              <strong>${customerQuotes.length}</strong>
            </div>
          </div>

        </div>

      </div>

    </div>

    <div class="panel customer-jobs">

      <div class="panel-header">

        <div>
          <h2>Job History</h2>
          <p>Previous and upcoming work.</p>
        </div>

      </div>

      ${
        customerJobs.length
          ? customerJobs.map(job => `
              <div class="job-row">

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

              <p>
                This customer doesn't have any jobs.
              </p>

            </div>
          `
      }

    </div>

    <div class="panel customer-jobs">

      <div class="panel-header">

        <div>
          <h2>Quotes</h2>
          <p>Quotes created for this customer.</p>
        </div>

      </div>

      ${
        customerQuotes.length
          ? customerQuotes.map(quote => `
              <div
                class="job-row"
                data-customer-quote="${quote.id}"
              >

                <div>

                  <strong>
                    ${escapeHtml(quote.quote_number)}
                  </strong>

                  <div class="muted">
                    ${formatQuoteStatus(quote.status)}
                  </div>

                </div>

                <strong>
                  £${Number(quote.total || 0).toFixed(2)}
                </strong>

              </div>
            `).join("")
          : `
            <div class="empty-state">

              <div class="empty-icon">💷</div>

              <h3>No quotes yet</h3>

              <p>
                No quotes have been created for this customer.
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
    .querySelectorAll("[data-customer-quote]")
    .forEach(row => {
      row.addEventListener(
        "click",
        () =>
          showQuote(
            row.dataset.customerQuote
          )
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
  await loadQuotes();

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
                  ${escapeHtml(job.status || "Scheduled")}
                </span>

              </div>
            `).join("")
          : `
            <div class="empty-state">

              <div class="empty-icon">📋</div>

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

        <select
          id="jobCustomer"
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

        <label>Job Title *</label>

        <input
          id="jobTitle"
          required
          placeholder="e.g. Window cleaning"
        >

        <label>Date</label>

        <input
          id="jobDate"
          type="date"
        >

        <label>Price</label>

        <input
          id="jobPrice"
          type="number"
          step="0.01"
          placeholder="0.00"
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
          user_id: currentUser.id,

          customer_id:
            document
              .getElementById("jobCustomer")
              .value,

          title:
            document
              .getElementById("jobTitle")
              .value
              .trim(),

          scheduled_date:
            document
              .getElementById("jobDate")
              .value || null,

          price:
            Number(
              document
                .getElementById("jobPrice")
                .value
            ) || 0,

          notes:
            document
              .getElementById("jobNotes")
              .value
              .trim()
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

        renderJobsPage(
          document.getElementById("pageContent")
        );
      }
    );
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
        + Create Quote
      </button>

    </div>

    <div class="panel">

      <div class="quote-filters">

        <input
          id="quoteSearch"
          class="search-input"
          placeholder="Search quotes..."
        >

        <select id="quoteStatusFilter">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>

      </div>

      <div id="quoteTable"></div>

    </div>
  `;

  document
    .getElementById("addQuoteButton")
    .addEventListener(
      "click",
      showAddQuoteForm
    );

  document
    .getElementById("quoteSearch")
    .addEventListener(
      "input",
      renderQuoteTable
    );

  document
    .getElementById("quoteStatusFilter")
    .addEventListener(
      "change",
      renderQuoteTable
    );

  renderQuoteTable();
}


// =====================================================
// QUOTE TABLE
// =====================================================

function renderQuoteTable() {
  const container =
    document.getElementById("quoteTable");

  if (!container) return;

  const search =
    document
      .getElementById("quoteSearch")
      ?.value
      .trim()
      .toLowerCase() || "";

  const status =
    document
      .getElementById("quoteStatusFilter")
      ?.value || "";

  const filtered =
    quotes.filter(quote => {

      const customer =
        customers.find(
          c =>
            String(c.id) ===
            String(quote.customer_id)
        );

      const customerName =
        customer?.name || "";

      const matchesSearch =
        !search ||
        `${quote.quote_number || ""}
         ${customerName}
         ${quote.notes || ""}`
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        !status ||
        String(quote.status || "").toLowerCase() ===
        status.toLowerCase();

      return matchesSearch && matchesStatus;
    });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">💷</div>

        <h3>No quotes found</h3>

        <p>
          Create your first quote to get started.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div>

      ${filtered.map(quote => {

        const customer =
          customers.find(
            c =>
              String(c.id) ===
              String(quote.customer_id)
          );

        return `
          <div
            class="job-row quote-row"
            data-quote-id="${quote.id}"
          >

            <div>

              <strong>
                ${escapeHtml(
                  quote.quote_number || "Quote"
                )}
              </strong>

              <div class="muted">
                ${escapeHtml(
                  customer?.name || "Unknown customer"
                )}
              </div>

            </div>

            <div>

              <span class="status-badge">
                ${formatQuoteStatus(quote.status)}
              </span>

            </div>

            <strong>
              £${Number(quote.total || 0).toFixed(2)}
            </strong>

          </div>
        `;
      }).join("")}

    </div>
  `;

  container
    .querySelectorAll("[data-quote-id]")
    .forEach(row => {
      row.addEventListener(
        "click",
        () =>
          showQuote(row.dataset.quoteId)
      );
    });
}


// =====================================================
// QUOTE NUMBER
// =====================================================

function generateQuoteNumber() {
  const year =
    new Date().getFullYear();

  const numbers =
    quotes
      .map(q => {
        const match =
          String(q.quote_number || "")
            .match(/(\d+)$/);

        return match
          ? Number(match[1])
          : 0;
      })
      .filter(Boolean);

  const next =
    numbers.length
      ? Math.max(...numbers) + 1
      : 1;

  return `Q-${year}-${String(next).padStart(4, "0")}`;
}


// =====================================================
// ADD QUOTE
// =====================================================

function showAddQuoteForm() {
  const modal =
    document.createElement("div");

  modal.className = "modal show";

  const today =
    new Date().toISOString().split("T")[0];

  const validUntil =
    new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

  modal.innerHTML = `
    <div class="modal-content">

      <div class="modal-header">

        <div>
          <h2>Create Quote</h2>
          <p>Create a quotation for your customer.</p>
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

        <label>Quote Number</label>

        <input
          id="quoteNumber"
          value="${generateQuoteNumber()}"
          readonly
        >

        <label>Quote Date</label>

        <input
          id="quoteDate"
          type="date"
          value="${today}"
        >

        <label>Valid Until</label>

        <input
          id="quoteValidUntil"
          type="date"
          value="${validUntil}"
        >

        <label>Description / Notes</label>

        <textarea
          id="quoteNotes"
          placeholder="Describe the work or add notes..."
        ></textarea>

        <label>Subtotal (£)</label>

        <input
          id="quoteSubtotal"
          type="number"
          min="0"
          step="0.01"
          value="0"
        >

        <label>VAT</label>

        <select id="quoteVatRate">

          <option value="0">
            No VAT
          </option>

          <option value="5">
            5%
          </option>

          <option value="20">
            20%
          </option>

        </select>

        <div class="quote-total-preview">

          <div>
            <span>VAT</span>
            <strong id="quoteVatAmount">
              £0.00
            </strong>
          </div>

          <div>
            <span>Total</span>
            <strong id="quoteTotal">
              £0.00
            </strong>
          </div>

        </div>

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

          <option value="declined">
            Declined
          </option>

        </select>

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

  const vatRateInput =
    modal.querySelector("#quoteVatRate");

  function updateQuoteTotal() {
    const subtotal =
      Number(subtotalInput.value) || 0;

    const vatRate =
      Number(vatRateInput.value) || 0;

    const vatAmount =
      subtotal * vatRate / 100;

    const total =
      subtotal + vatAmount;

    modal.querySelector("#quoteVatAmount")
      .textContent =
        `£${vatAmount.toFixed(2)}`;

    modal.querySelector("#quoteTotal")
      .textContent =
        `£${total.toFixed(2)}`;
  }

  subtotalInput.addEventListener(
    "input",
    updateQuoteTotal
  );

  vatRateInput.addEventListener(
    "change",
    updateQuoteTotal
  );

  updateQuoteTotal();

  modal
    .querySelector("#quoteForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const subtotal =
          Number(
            document
              .getElementById("quoteSubtotal")
              .value
          ) || 0;

        const vatRate =
          Number(
            document
              .getElementById("quoteVatRate")
              .value
          ) || 0;

        const vatAmount =
          Number(
            (subtotal * vatRate / 100)
              .toFixed(2)
          );

        const total =
          Number(
            (subtotal + vatAmount)
              .toFixed(2)
          );

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
              .value,

          status:
            document
              .getElementById("quoteStatus")
              .value,

          subtotal,

          // Supabase column is lowercase "vat"
          vat: vatAmount,

          total,

          notes:
            document
              .getElementById("quoteNotes")
              .value
              .trim(),

          valid_until:
            document
              .getElementById("quoteValidUntil")
              .value || null
        };

        if (!quote.customer_id) {
          alert("Please select a customer.");
          return;
        }

        const { error } =
          await supabase
            .from("quotes")
            .insert(quote);

        if (error) {
          alert(error.message);
          console.error(error);
          return;
        }

        modal.remove();

        await loadQuotes();

        renderQuotesPage(
          document.getElementById("pageContent")
        );
      }
    );
}


// =====================================================
// VIEW QUOTE
// =====================================================

function showQuote(quoteId) {
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
    quote.quote_number;

  document.getElementById("pageSubtitle").textContent =
    "Quote details";

  content.innerHTML = `
    <div class="page-actions">

      <div>

        <button
          id="backQuotes"
          class="button secondary"
        >
          ← Quotes
        </button>

      </div>

      <div>

        <button
          id="editQuote"
          class="button primary"
        >
          Edit Quote
        </button>

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

        <h2>
          ${escapeHtml(quote.quote_number)}
        </h2>

        <div class="detail-list">

          <div>
            <span>Customer</span>

            <strong>
              ${escapeHtml(
                customer?.name || "Unknown customer"
              )}
            </strong>
          </div>

          <div>
            <span>Status</span>

            <strong>
              ${formatQuoteStatus(quote.status)}
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

        <h2>Quote Summary</h2>

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

    <div class="panel">

      <div class="panel-header">

        <div>
          <h2>Actions</h2>
          <p>Manage this quote.</p>
        </div>

      </div>

      ${
        String(quote.status).toLowerCase() === "accepted"
          ? `
            <button
              id="convertQuoteToJob"
              class="button primary"
            >
              📋 Convert to Job
            </button>
          `
          : `
            <p class="muted">
              Accept the quote to convert it into a job.
            </p>
          `
      }

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
      () =>
        showEditQuoteForm(quote.id)
    );

  document
    .getElementById("deleteQuote")
    .addEventListener(
      "click",
      () =>
        deleteQuote(quote.id)
    );

  const convertButton =
    document.getElementById(
      "convertQuoteToJob"
    );

  if (convertButton) {
    convertButton.addEventListener(
      "click",
      () =>
        convertQuoteToJob(quote.id)
    );
  }
}


// =====================================================
// EDIT QUOTE
// =====================================================

function showEditQuoteForm(quoteId) {
  const quote =
    quotes.find(
      q =>
        String(q.id) === String(quoteId)
    );

  if (!quote) return;

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  const currentVat =
    Number(quote.vat || 0);

  const currentSubtotal =
    Number(quote.subtotal || 0);

  let vatRate = 0;

  if (currentSubtotal > 0) {
    vatRate =
      Math.round(
        currentVat /
        currentSubtotal *
        100
      );
  }

  if (![0, 5, 20].includes(vatRate)) {
    vatRate = 0;
  }

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

        <select
          id="editQuoteCustomer"
          required
        >

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

        <label>Quote Number</label>

        <input
          value="${escapeHtml(
            quote.quote_number || ""
          )}"
          readonly
        >

        <label>Valid Until</label>

        <input
          id="editQuoteValidUntil"
          type="date"
          value="${quote.valid_until || ""}"
        >

        <label>Description / Notes</label>

        <textarea
          id="editQuoteNotes"
        >${escapeHtml(
          quote.notes || ""
        )}</textarea>

        <label>Subtotal (£)</label>

        <input
          id="editQuoteSubtotal"
          type="number"
          min="0"
          step="0.01"
          value="${currentSubtotal.toFixed(2)}"
        >

        <label>VAT</label>

        <select id="editQuoteVatRate">

          <option
            value="0"
            ${vatRate === 0 ? "selected" : ""}
          >
            No VAT
          </option>

          <option
            value="5"
            ${vatRate === 5 ? "selected" : ""}
          >
            5%
          </option>

          <option
            value="20"
            ${vatRate === 20 ? "selected" : ""}
          >
            20%
          </option>

        </select>

        <div class="quote-total-preview">

          <div>
            <span>VAT</span>

            <strong id="editQuoteVatAmount">
              £${currentVat.toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Total</span>

            <strong id="editQuoteTotal">
              £${Number(
                quote.total || 0
              ).toFixed(2)}
            </strong>
          </div>

        </div>

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
            value="declined"
            ${quote.status === "declined" ? "selected" : ""}
          >
            Declined
          </option>

          <option
            value="expired"
            ${quote.status === "expired" ? "selected" : ""}
          >
            Expired
          </option>

        </select>

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

  function updateEditTotal() {
    const subtotal =
      Number(
        modal.querySelector(
          "#editQuoteSubtotal"
        ).value
      ) || 0;

    const rate =
      Number(
        modal.querySelector(
          "#editQuoteVatRate"
        ).value
      ) || 0;

    const vat =
      subtotal * rate / 100;

    const total =
      subtotal + vat;

    modal.querySelector(
      "#editQuoteVatAmount"
    ).textContent =
      `£${vat.toFixed(2)}`;

    modal.querySelector(
      "#editQuoteTotal"
    ).textContent =
      `£${total.toFixed(2)}`;
  }

  modal
    .querySelector("#editQuoteSubtotal")
    .addEventListener(
      "input",
      updateEditTotal
    );

  modal
    .querySelector("#editQuoteVatRate")
    .addEventListener(
      "change",
      updateEditTotal
    );

  updateEditTotal();

  modal
    .querySelector("#editQuoteForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const subtotal =
          Number(
            modal.querySelector(
              "#editQuoteSubtotal"
            ).value
          ) || 0;

        const rate =
          Number(
            modal.querySelector(
              "#editQuoteVatRate"
            ).value
          ) || 0;

        const vat =
          Number(
            (subtotal * rate / 100)
              .toFixed(2)
          );

        const total =
          Number(
            (subtotal + vat)
              .toFixed(2)
          );

        const updates = {

          customer_id:
            modal.querySelector(
              "#editQuoteCustomer"
            ).value,

          status:
            modal.querySelector(
              "#editQuoteStatus"
            ).value,

          subtotal,

          // Supabase column is lowercase "vat"
          vat,

          total,

          notes:
            modal.querySelector(
              "#editQuoteNotes"
            ).value.trim(),

          valid_until:
            modal.querySelector(
              "#editQuoteValidUntil"
            ).value || null
        };

        const { error } =
          await supabase
            .from("quotes")
            .update(updates)
            .eq("id", quote.id);

        if (error) {
          alert(error.message);
          console.error(error);
          return;
        }

        modal.remove();

        await loadQuotes();

        showQuote(quote.id);
      }
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
      `Delete ${quote.quote_number}? This cannot be undone.`
    );

  if (!confirmed) return;

  const { error } =
    await supabase
      .from("quotes")
      .delete()
      .eq("id", quote.id);

  if (error) {
    alert(error.message);
    console.error(error);
    return;
  }

  await loadQuotes();

  showPage("quotes");
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

  if (!quote) return;

  if (
    String(quote.status).toLowerCase() !==
    "accepted"
  ) {
    alert(
      "Only accepted quotes can be converted into jobs."
    );
    return;
  }

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(quote.customer_id)
    );

  const title =
    `Work from ${quote.quote_number}`;

  const confirmed =
    confirm(
      `Create a job for ${customer?.name || "this customer"} from ${quote.quote_number}?`
    );

  if (!confirmed) return;

  const job = {
    user_id: currentUser.id,

    customer_id:
      quote.customer_id,

    title,

    scheduled_date: null,

    price:
      Number(quote.total || 0),

    notes:
      quote.notes || ""
  };

  const { error } =
    await supabase
      .from("jobs")
      .insert(job);

  if (error) {
    alert(error.message);
    console.error(error);
    return;
  }

  alert("Job created successfully.");

  await loadJobs();

  showPage("jobs");
}


// =====================================================
// QUOTE HELPERS
// =====================================================

function formatQuoteStatus(status) {
  const value =
    String(status || "draft")
      .toLowerCase();

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


function quoteValue() {
  return quotes.reduce(
    (total, quote) =>
      total + Number(quote.total || 0),
    0
  );
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
// SIMPLE PLACEHOLDER
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

        <h3>
          ${title}
        </h3>

        <p>
          ${message}
        </p>

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
// HTML ESCAPING
// =====================================================

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
