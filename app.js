import { supabase } from "./supabase.js";
import { showFeedbackForm } from "./feedback.js";
import { showFeedbackAdmin } from "./feedback-admin.js";

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

          <button class="nav-item" id="feedbackButton" >
           🐛 Feedback
          </button>

          <button class="nav-item" id="adminFeedbackButton" >
           📋 Beta Feedback
          </button>

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


  // FEEDBACK BUTTON

  const feedbackButton =
    document.getElementById("feedbackButton");
    const adminFeedbackButton =
    document.getElementById(
      "adminFeedbackButton"
    );


  if (adminFeedbackButton) {

    if (
      currentUser &&
      String(currentUser.id) ===
        "9a89bdf0-1f17-48ec-a622-db59545e8ada"
    ) {

      adminFeedbackButton.style.display =
        "block";


      adminFeedbackButton.addEventListener(
        "click",
        () => showFeedbackAdmin()
      );

    } else {

      adminFeedbackButton.style.display =
        "none";

    }

  }

  if (feedbackButton) {

    feedbackButton.addEventListener(
      "click",
      () => showFeedbackForm()
    );

  }


  // LOGOUT BUTTON

  document
    .getElementById("logoutButton")
    .addEventListener(
      "click",
      logout
    );


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
    window.dispatchEvent(new Event("jobpilot:settings-rendered"));
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
// CUSTOMER PROFILE
// =====================================================

function showCustomerProfile(customerId) {

  const customer =
    customers.find(
      item =>
        String(item.id) === String(customerId)
    );

  if (!customer) return;

  const content =
    document.getElementById("pageContent");

  document.getElementById("pageTitle").textContent =
    customer.name;

  document.getElementById("pageSubtitle").textContent =
    "Customer profile";

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

  const customerInvoices =
    invoices.filter(
      invoice =>
        String(invoice.customer_id) ===
        String(customer.id)
    );

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

        <h2>Activity</h2>

        <div class="detail-list">

          <div>
            <span>Jobs</span>
            <strong>${customerJobs.length}</strong>
          </div>

          <div>
            <span>Quotes</span>
            <strong>${customerQuotes.length}</strong>
          </div>

          <div>
            <span>Invoices</span>
            <strong>${customerInvoices.length}</strong>
          </div>

        </div>

      </div>

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
          <p>Create a new customer.</p>
        </div>

        <button class="close">×</button>

      </div>

      <form id="customerForm">

        <label>Name *</label>

        <input
          id="customerName"
          required
          placeholder="Customer name"
        >

        <label>Phone</label>

        <input
          id="customerPhone"
          placeholder="Phone number"
        >

        <label>Email</label>

        <input
          id="customerEmail"
          type="email"
          placeholder="Email address"
        >

        <label>Address</label>

        <input
          id="customerAddress"
          placeholder="Street address"
        >

        <label>Town / City</label>

        <input
          id="customerCity"
          placeholder="Town / City"
        >

        <label>Postcode</label>

        <input
          id="customerPostcode"
          placeholder="Postcode"
        >

        <label>Notes</label>

        <textarea
          id="customerNotes"
          placeholder="Notes about this customer"
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
          user_id:
            currentUser.id,
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

        const { data, error } =
          await supabase
            .from("customers")
            .insert(customer)
            .select()
            .single();

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        customers.unshift(data);

        showCustomerProfile(data.id);
      }
    );
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
                  ? nextRecurringJob.scheduled_date || "No date"
                  : "No upcoming appointment"
              }
            </strong>

          </div>

        </div>

      </div>

    `;
  }


  document.getElementById("pageTitle").textContent =
    job.title;

  document.getElementById("pageSubtitle").textContent =
    "Job details";

  content.innerHTML = `

    <div class="page-actions">

      <button id="backJobs" class="button secondary">
        ← Jobs
      </button>

      <div>
        <button id="editJob" class="button primary">
          Edit Job
        </button>

        <button id="deleteJob" class="button danger">
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
            <span>Status</span>
            <strong>
              ${escapeHtml(job.status || "pending")}
            </strong>
          </div>

          <div>
            <span>Price</span>
            <strong>
              £${Number(job.price || 0).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Scheduled Date</span>
            <strong>
              ${job.scheduled_date || "—"}
            </strong>
          </div>

          <div>
            <span>Scheduled Time</span>
            <strong>
              ${job.scheduled_time || "—"}
            </strong>
          </div>

          <div>
            <span>Description</span>
            <strong>
              ${escapeHtml(job.description || "—")}
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

      ${recurringSection}

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

  if (isRecurring) {

    document
      .getElementById("skipRecurringJob")
      .addEventListener(
        "click",
        () => skipNextRecurringJob(job.id)
      );

    document
      .getElementById("stopRecurringJob")
      .addEventListener(
        "click",
        () => stopRecurringJob(job.id)
      );
  }
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
          <p>Create a new job.</p>
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
          placeholder="e.g. Driveway cleaning"
        >

        <label>Description</label>

        <textarea
          id="jobDescription"
          placeholder="Describe the work..."
        ></textarea>

        <label>Price (£)</label>

        <input
          id="jobPrice"
          type="number"
          step="0.01"
          placeholder="0.00"
        >

        <label>Scheduled Date</label>

        <input
          id="jobDate"
          type="date"
        >

        <label>Scheduled Time</label>

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
          <option value="invoiced">Invoiced</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <label>
          <input
            type="checkbox"
            id="jobRecurring"
          >
          Recurring job
        </label>

        <div
          id="recurringOptions"
          style="display:none; margin-top:15px;"
        >

          <label>
            Repeat every (weeks)
          </label>

          <input
            id="recurringInterval"
            type="number"
            min="1"
            value="4"
          >

        </div>

        <label>Notes</label>

        <textarea
          id="jobNotes"
          placeholder="Internal notes"
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

  modal.querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );

  const recurringCheckbox =
    document.getElementById("jobRecurring");

  const recurringOptions =
    document.getElementById("recurringOptions");

  recurringCheckbox.addEventListener(
    "change",
    () => {
      recurringOptions.style.display =
        recurringCheckbox.checked
          ? "block"
          : "none";
    }
  );

  modal
    .querySelector("#jobForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const recurring =
          document.getElementById("jobRecurring").checked;

        const recurringInterval =
          Number(
            document.getElementById("recurringInterval").value
          ) || 4;

        const job = {

          user_id:
            currentUser.id,

          customer_id:
            document.getElementById("jobCustomer").value,

          title:
            document.getElementById("jobTitle").value.trim(),

          description:
            document.getElementById("jobDescription").value.trim(),

          scheduled_date:
            document.getElementById("jobDate").value || null,

          scheduled_time:
            document.getElementById("jobTime").value || null,

          status:
            document.getElementById("jobStatus").value,

          price:
            Number(
              document.getElementById("jobPrice").value
            ) || 0,

          notes:
            document.getElementById("jobNotes").value.trim(),

          recurring:
            recurring,

          recurring_interval_weeks:
            recurring ? recurringInterval : null,

          recurring_parent_id:
            null,

          recurring_active:
            recurring
        };

        const {
          data: createdJob,
          error
        } =
          await supabase
            .from("jobs")
            .insert(job)
            .select()
            .single();

        if (error) {
          alert(error.message);
          return;
        }

        modal.remove();

        jobs.unshift(createdJob);

        if (recurring) {

          await createRecurringAppointments(
            createdJob,
            recurringInterval
          );

          await loadJobs();

        }

        showJobProfile(createdJob.id);
      }
    );
}


// =====================================================
// CREATE RECURRING APPOINTMENTS
// =====================================================

async function createRecurringAppointments(
  parentJob,
  intervalWeeks
) {

  const baseDate =
    parentJob.scheduled_date;

  if (!baseDate) return;

  const appointments = [];

  let currentDate =
    new Date(baseDate + "T00:00:00");

  for (let i = 1; i <= 12; i++) {

    currentDate.setDate(
      currentDate.getDate() +
      intervalWeeks * 7
    );

    const nextDate =
      currentDate
        .toISOString()
        .split("T")[0];

    appointments.push({
      user_id:
        currentUser.id,
      customer_id:
        parentJob.customer_id,
      title:
        parentJob.title,
      description:
        parentJob.description,
      scheduled_date:
        nextDate,
      scheduled_time:
        parentJob.scheduled_time,
      status:
        "pending",
      price:
        parentJob.price,
      notes:
        parentJob.notes,
      recurring:
        true,
      recurring_interval_weeks:
        intervalWeeks,
      recurring_parent_id:
        parentJob.id,
      recurring_active:
        true
    });
  }

  const { error } =
    await supabase
      .from("jobs")
      .insert(appointments);

  if (error) {

    console.error(
      "Recurring appointment creation failed:",
      error
    );

    alert(
      "The main job was created, but the recurring appointments could not be created.\n\n" +
      error.message
    );
  }
}


// =====================================================
// CREATE NEXT RECURRING APPOINTMENT
// =====================================================

async function createNextRecurringAppointment(job) {

  if (!job.scheduled_date) return null;

  const nextDate =
    new Date(job.scheduled_date + "T00:00:00");

  nextDate.setDate(
    nextDate.getDate() +
    (Number(job.recurring_interval_weeks) || 4) * 7
  );

  const nextDateString =
    nextDate
      .toISOString()
      .split("T")[0];

  const nextJob = {
    user_id:
      currentUser.id,

    customer_id:
      job.customer_id,

    title:
      job.title,

    description:
      job.description,

    scheduled_date:
      nextDateString,

    scheduled_time:
      job.scheduled_time,

    status:
      "pending",

    price:
      job.price,

    notes:
      job.notes,

    recurring:
      true,

    recurring_interval_weeks:
      job.recurring_interval_weeks,

    recurring_parent_id:
      job.recurring_parent_id || job.id,

    recurring_active:
      job.recurring_active !== false
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

    alert(
      "Could not create the next recurring appointment:\n\n" +
      error.message
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

    alert(
      "This job is not currently recurring."
    );

    return;
  }


  const confirmed =
    confirm(
      "Skip the next recurring appointment?"
    );


  if (!confirmed) return;


  const currentSeriesId =
    job.recurring_parent_id ||
    job.id;


  const nextJob =
    jobs
      .filter(item => {
        const itemSeriesId =
          item.recurring_parent_id ||
          item.id;

        return (
          String(itemSeriesId) === String(currentSeriesId) &&
          String(item.id) !== String(job.id) &&
          String(item.status).toLowerCase() !== "completed" &&
          String(item.status).toLowerCase() !== "cancelled"
        );
      })
      .sort((a, b) => {
        const dateA =
          a.scheduled_date || "9999-12-31";
        const dateB =
          b.scheduled_date || "9999-12-31";
        return dateA.localeCompare(dateB);
      })[0];


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


  await createNextRecurringAppointment(nextJob);
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
      `Delete \"${job.title}\"? This cannot be undone.`
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
                  c => String(c.id) === String(quote.customer_id)
                );

              return `
                <div class="job-row">
                  <div>
                    <strong>
                      Quote #${escapeHtml(quote.quote_number || "—")}
                    </strong>
                    <div class="muted">
                      ${customer ? escapeHtml(customer.name) : "Unknown customer"}
                      ${quote.valid_until ? " • Valid until " + quote.valid_until : ""}
                    </div>
                  </div>
                  <div>
                    <strong>
                      £${Number(quote.total || 0).toFixed(2)}
                    </strong>
                    <span class="muted">
                      ${escapeHtml(quote.status || "draft")}
                    </span>
                    <button class="button secondary quote-view" data-quote-id="${quote.id}">
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

  document
    .querySelectorAll(".quote-view")
    .forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.stopPropagation();
          showQuoteProfile(button.dataset.quoteId);
        }
      );
    });
}


// =====================================================
// ADD QUOTE
// =====================================================

function showAddQuoteForm() {
  const modal = document.createElement("div");
  modal.className = "modal show";

  const quoteNumber = generateQuoteNumber();

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>New Quote</h2>
          <p>Create a quotation.</p>
        </div>
        <button class="close">×</button>
      </div>
      <form id="quoteForm">
        <label>Customer *</label>
        <select id="quoteCustomer" required>
          <option value="">Select customer</option>
          ${customers.map(customer => `
            <option value="${customer.id}">
              ${escapeHtml(customer.name)}
            </option>
          `).join("")}
        </select>
        <label>Quote Number *</label>
        <input id="quoteNumber" value="${escapeHtml(quoteNumber)}" required>
        <label>Description</label>
        <textarea id="quoteDescription" placeholder="What is this quote for?"></textarea>
        <label>Subtotal</label>
        <input id="quoteSubtotal" type="number" step="0.01" value="0">
        <label>VAT %</label>
        <input id="quoteVatPercent" type="number" step="0.01" value="20">
        <label>VAT</label>
        <input id="quoteVat" type="number" step="0.01" value="0" readonly>
        <label>Total</label>
        <input id="quoteTotal" type="number" step="0.01" value="0" readonly>
        <label>Status</label>
        <select id="quoteStatus">
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
        <label>Valid Until</label>
        <input id="quoteValidUntil" type="date">
        <label>Notes</label>
        <textarea id="quoteNotes"></textarea>
        <div class="modal-actions">
          <button type="button" class="button secondary close">Cancel</button>
          <button type="submit" class="button primary">Save Quote</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener("click", () => modal.remove())
    );

  const subtotalInput = modal.querySelector("#quoteSubtotal");
  const vatPercentInput = modal.querySelector("#quoteVatPercent");
  const vatInput = modal.querySelector("#quoteVat");
  const totalInput = modal.querySelector("#quoteTotal");

  function calculateQuote() {
    const subtotal = Number(subtotalInput.value) || 0;
    const vatPercent = Number(vatPercentInput.value) || 0;
    const vat = subtotal * vatPercent / 100;
    vatInput.value = vat.toFixed(2);
    totalInput.value = (subtotal + vat).toFixed(2);
  }

  subtotalInput.addEventListener("input", calculateQuote);
  vatPercentInput.addEventListener("input", calculateQuote);
  calculateQuote();

  modal
    .querySelector("#quoteForm")
    .addEventListener("submit", async event => {
      event.preventDefault();

      const quote = {
        user_id: currentUser.id,
        customer_id: document.getElementById("quoteCustomer").value,
        quote_number: document.getElementById("quoteNumber").value.trim(),
        description: document.getElementById("quoteDescription").value.trim(),
        status: document.getElementById("quoteStatus").value,
        subtotal: Number(document.getElementById("quoteSubtotal").value) || 0,
        vat: Number(document.getElementById("quoteVat").value) || 0,
        total: Number(document.getElementById("quoteTotal").value) || 0,
        valid_until: document.getElementById("quoteValidUntil").value || null,
        notes: document.getElementById("quoteNotes").value.trim()
      };

      const { data, error } = await supabase
        .from("quotes")
        .insert(quote)
        .select()
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      modal.remove();
      quotes.unshift(data);
      showQuoteProfile(data.id);
    });
}


// =====================================================
// QUOTE PROFILE
// =====================================================

function showQuoteProfile(quoteId) {
  const quote = quotes.find(q => String(q.id) === String(quoteId));
  if (!quote) return;

  const customer = customers.find(c => String(c.id) === String(quote.customer_id));
  const content = document.getElementById("pageContent");

  document.getElementById("pageTitle").textContent = `Quote #${quote.quote_number || "—"}`;
  document.getElementById("pageSubtitle").textContent = "Quote details";

  content.innerHTML = `
    <div class="page-actions">
      <button id="backQuotes" class="button secondary">← Quotes</button>
      <div>
        <button id="editQuote" class="button primary">Edit Quote</button>
        <button id="deleteQuote" class="button danger">Delete</button>
      </div>
    </div>
    <div class="content-grid">
      <div class="panel">
        <h2>Quote Details</h2>
        <div class="detail-list">
          <div><span>Quote Number</span><strong>${escapeHtml(quote.quote_number || "—")}</strong></div>
          <div><span>Customer</span><strong>${customer ? escapeHtml(customer.name) : "Unknown customer"}</strong></div>
          <div><span>Status</span><strong>${escapeHtml(quote.status || "draft")}</strong></div>
          <div><span>Description</span><strong>${escapeHtml(quote.description || "—")}</strong></div>
          <div><span>Valid Until</span><strong>${quote.valid_until || "—"}</strong></div>
          <div><span>Notes</span><strong>${escapeHtml(quote.notes || "—")}</strong></div>
        </div>
      </div>
      <div class="panel">
        <h2>Financial Summary</h2>
        <div class="detail-list">
          <div><span>Subtotal</span><strong>£${Number(quote.subtotal || 0).toFixed(2)}</strong></div>
          <div><span>VAT</span><strong>£${Number(quote.vat || 0).toFixed(2)}</strong></div>
          <div><span>Total</span><strong>£${Number(quote.total || 0).toFixed(2)}</strong></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("backQuotes").addEventListener("click", () => showPage("quotes"));
  document.getElementById("editQuote").addEventListener("click", () => showEditQuoteForm(quote.id));
  document.getElementById("deleteQuote").addEventListener("click", () => deleteQuote(quote.id));
}


// =====================================================
// EDIT QUOTE
// =====================================================

function showEditQuoteForm(quoteId) {
  const quote = quotes.find(q => String(q.id) === String(quoteId));
  if (!quote) return;

  const modal = document.createElement("div");
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
            <option value="${customer.id}" ${String(customer.id) === String(quote.customer_id) ? "selected" : ""}>
              ${escapeHtml(customer.name)}
            </option>
          `).join("")}
        </select>
        <label>Quote Number *</label>
        <input id="editQuoteNumber" value="${escapeHtml(quote.quote_number || "")}" required>
        <label>Description</label>
        <textarea id="editQuoteDescription">${escapeHtml(quote.description || "")}</textarea>
        <label>Subtotal</label>
        <input id="editQuoteSubtotal" type="number" step="0.01" value="${Number(quote.subtotal || 0)}">
        <label>VAT %</label>
        <input id="editQuoteVatPercent" type="number" step="0.01" value="20">
        <label>VAT</label>
        <input id="editQuoteVat" type="number" step="0.01" value="${Number(quote.vat || 0)}" readonly>
        <label>Total</label>
        <input id="editQuoteTotal" type="number" step="0.01" value="${Number(quote.total || 0)}" readonly>
        <label>Status</label>
        <select id="editQuoteStatus">
          <option value="draft" ${quote.status === "draft" ? "selected" : ""}>Draft</option>
          <option value="sent" ${quote.status === "sent" ? "selected" : ""}>Sent</option>
          <option value="accepted" ${quote.status === "accepted" ? "selected" : ""}>Accepted</option>
          <option value="rejected" ${quote.status === "rejected" ? "selected" : ""}>Rejected</option>
        </select>
        <label>Valid Until</label>
        <input id="editQuoteValidUntil" type="date" value="${escapeHtml(quote.valid_until || "")}">
        <label>Notes</label>
        <textarea id="editQuoteNotes">${escapeHtml(quote.notes || "")}</textarea>
        <div class="modal-actions">
          <button type="button" class="button secondary close">Cancel</button>
          <button type="submit" class="button primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".close").forEach(button =>
    button.addEventListener("click", () => modal.remove())
  );

  const subtotalInput = modal.querySelector("#editQuoteSubtotal");
  const vatPercentInput = modal.querySelector("#editQuoteVatPercent");
  const vatInput = modal.querySelector("#editQuoteVat");
  const totalInput = modal.querySelector("#editQuoteTotal");

  function calculateQuote() {
    const subtotal = Number(subtotalInput.value) || 0;
    const vatPercent = Number(vatPercentInput.value) || 0;
    const vat = subtotal * vatPercent / 100;
    vatInput.value = vat.toFixed(2);
    totalInput.value = (subtotal + vat).toFixed(2);
  }

  subtotalInput.addEventListener("input", calculateQuote);
  vatPercentInput.addEventListener("input", calculateQuote);

  modal.querySelector("#editQuoteForm").addEventListener("submit", async event => {
    event.preventDefault();

    const updates = {
      customer_id: document.getElementById("editQuoteCustomer").value,
      quote_number: document.getElementById("editQuoteNumber").value.trim(),
      description: document.getElementById("editQuoteDescription").value.trim(),
      subtotal: Number(document.getElementById("editQuoteSubtotal").value) || 0,
      vat: Number(document.getElementById("editQuoteVat").value) || 0,
      total: Number(document.getElementById("editQuoteTotal").value) || 0,
      status: document.getElementById("editQuoteStatus").value,
      valid_until: document.getElementById("editQuoteValidUntil").value || null,
      notes: document.getElementById("editQuoteNotes").value.trim()
    };

    const { error } = await supabase
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
  });

  calculateQuote();
}


// =====================================================
// CONVERT QUOTE TO JOB
// =====================================================

async function convertQuoteToJob(quoteId) {
  const quote = quotes.find(q => String(q.id) === String(quoteId));
  if (!quote) return;

  const customer = customers.find(c => String(c.id) === String(quote.customer_id));
  if (!customer) {
    alert("Customer could not be found.");
    return;
  }

  const confirmed = confirm(`Create a job for ${customer.name} for £${Number(quote.total || 0).toFixed(2)}?`);
  if (!confirmed) return;

  const job = {
    user_id: currentUser.id,
    customer_id: quote.customer_id,
    title: `Quote #${quote.quote_number || "Job"}`,
    description: `Converted from Quote #${quote.quote_number || ""}`,
    scheduled_date: null,
    scheduled_time: null,
    status: "pending",
    price: Number(quote.total || 0),
    notes: quote.notes || ""
  };

  const { data: createdJob, error: jobError } = await supabase
    .from("jobs")
    .insert(job)
    .select()
    .single();

  if (jobError) {
    alert("The job could not be created:\n\n" + jobError.message);
    return;
  }

  const { error: quoteError } = await supabase
    .from("quotes")
    .update({ status: "converted" })
    .eq("id", quote.id);

  if (quoteError) {
    await loadJobs();
    alert("The job was created, but the quote could not be marked as converted.\n\n" + quoteError.message);
    showPage("jobs");
    return;
  }

  await loadJobs();
  await loadQuotes();
  showJobProfile(createdJob.id);
  alert(`Quote #${quote.quote_number || ""} has been converted to a job.`);
}


// =====================================================
// DELETE QUOTE
// =====================================================

async function deleteQuote(quoteId) {
  const quote = quotes.find(q => String(q.id) === String(quoteId));
  if (!quote) return;

  const confirmed = confirm(`Delete Quote #${quote.quote_number || ""}? This cannot be undone.`);
  if (!confirmed) return;

  const { error } = await supabase
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
      <button id="addInvoiceButton" class="button primary">+ New Invoice</button>
    </div>
    <div class="panel">
      ${invoices.length ? invoices.map(invoice => {
        const customer = customers.find(c => String(c.id) === String(invoice.customer_id));
        return `
          <div class="job-row" data-invoice-id="${invoice.id}" style="cursor:pointer;">
            <div>
              <strong>Invoice #${escapeHtml(invoice.invoice_number || "—")}</strong>
              <div class="muted">
                ${customer ? escapeHtml(customer.name) : "Unknown customer"}
                ${invoice.issue_date ? " • " + invoice.issue_date : ""}
              </div>
            </div>
            <div>
              <strong>£${Number(invoice.total || 0).toFixed(2)}</strong>
              <div class="muted">${escapeHtml(invoice.status || "sent")}</div>
            </div>
          </div>
        `;
      }).join("") : `
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <h3>No invoices yet</h3>
          <p>Convert a completed job into an invoice.</p>
        </div>
      `}
    </div>
  `;

  document.getElementById("addInvoiceButton").addEventListener("click", showAddInvoiceForm);

  content.querySelectorAll("[data-invoice-id]").forEach(row => {
    row.addEventListener("click", () => showInvoiceProfile(row.dataset.invoiceId));
  });
}


// =====================================================
// ADD INVOICE
// =====================================================

function showAddInvoiceForm() {
  const modal = document.createElement("div");
  modal.className = "modal show";
  const invoiceNumber = generateInvoiceNumber();

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div><h2>New Invoice</h2><p>Create an invoice.</p></div>
        <button class="close">×</button>
      </div>
      <form id="invoiceForm">
        <label>Customer *</label>
        <select id="invoiceCustomer" required>
          <option value="">Select customer</option>
          ${customers.map(customer => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`).join("")}
        </select>
        <label>Invoice Number *</label>
        <input id="invoiceNumber" value="${escapeHtml(invoiceNumber)}" required>
        <label>Description</label>
        <textarea id="invoiceDescription" placeholder="What is this invoice for?"></textarea>
        <label>Subtotal</label>
        <input id="invoiceSubtotal" type="number" step="0.01" value="0">
        <label>VAT %</label>
        <input id="invoiceVatPercent" type="number" step="0.01" value="20">
        <label>VAT</label>
        <input id="invoiceVat" type="number" step="0.01" value="0" readonly>
        <label>Total</label>
        <input id="invoiceTotal" type="number" step="0.01" value="0" readonly>
        <label>Status</label>
        <select id="invoiceStatus"><option value="sent">Sent</option><option value="paid">Paid</option></select>
        <label>Issue Date</label>
        <input id="invoiceIssueDate" type="date" value="${todayDate()}">
        <label>Due Date</label>
        <input id="invoiceDueDate" type="date">
        <label>Notes</label>
        <textarea id="invoiceNotes"></textarea>
        <div class="modal-actions">
          <button type="button" class="button secondary close">Cancel</button>
          <button type="submit" class="button primary">Save Invoice</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".close").forEach(button =>
    button.addEventListener("click", () => modal.remove())
  );

  const subtotalInput = modal.querySelector("#invoiceSubtotal");
  const vatPercentInput = modal.querySelector("#invoiceVatPercent");
  const vatInput = modal.querySelector("#invoiceVat");
  const totalInput = modal.querySelector("#invoiceTotal");

  function calculateInvoice() {
    const subtotal = Number(subtotalInput.value) || 0;
    const vatPercent = Number(vatPercentInput.value) || 0;
    const vat = subtotal * vatPercent / 100;
    vatInput.value = vat.toFixed(2);
    totalInput.value = (subtotal + vat).toFixed(2);
  }

  subtotalInput.addEventListener("input", calculateInvoice);
  vatPercentInput.addEventListener("input", calculateInvoice);
  calculateInvoice();

  modal.querySelector("#invoiceForm").addEventListener("submit", async event => {
    event.preventDefault();
    const status = document.getElementById("invoiceStatus").value;
    const invoice = {
      user_id: currentUser.id,
      customer_id: document.getElementById("invoiceCustomer").value,
      invoice_number: document.getElementById("invoiceNumber").value.trim(),
      description: document.getElementById("invoiceDescription").value.trim(),
      status,
      subtotal: Number(document.getElementById("invoiceSubtotal").value) || 0,
      vat: Number(document.getElementById("invoiceVat").value) || 0,
      total: Number(document.getElementById("invoiceTotal").value) || 0,
      issue_date: document.getElementById("invoiceIssueDate").value || todayDate(),
      due_date: document.getElementById("invoiceDueDate").value || null,
      paid_date: status === "paid" ? todayDate() : null,
      notes: document.getElementById("invoiceNotes").value.trim()
    };

    const { error } = await supabase.from("invoices").insert(invoice);
    if (error) {
      alert(error.message);
      return;
    }

    modal.remove();
    await loadInvoices();
    showPage("invoices");
  });
}


// =====================================================
// INVOICE PROFILE
// =====================================================

function showInvoiceProfile(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  const customer = customers.find(c => String(c.id) === String(invoice.customer_id));
  const content = document.getElementById("pageContent");

  document.getElementById("pageTitle").textContent = `Invoice #${invoice.invoice_number || "—"}`;
  document.getElementById("pageSubtitle").textContent = "Invoice details";

  content.innerHTML = `
    <div class="page-actions">
      <button id="backInvoices" class="button secondary">← Invoices</button>
      <div>
        <button id="editInvoice" class="button primary">Edit Invoice</button>
        <button id="deleteInvoice" class="button danger">Delete</button>
      </div>
    </div>
    <div class="content-grid">
      <div class="panel">
        <h2>Invoice Details</h2>
        <div class="detail-list">
          <div><span>Invoice Number</span><strong>${escapeHtml(invoice.invoice_number || "—")}</strong></div>
          <div><span>Customer</span><strong>${customer ? escapeHtml(customer.name) : "Unknown customer"}</strong></div>
          <div><span>Status</span><strong>${escapeHtml(invoice.status || "sent")}</strong></div>
          <div><span>Description</span><strong>${escapeHtml(invoice.description || "—")}</strong></div>
          <div><span>Issue Date</span><strong>${invoice.issue_date || "—"}</strong></div>
          <div><span>Due Date</span><strong>${invoice.due_date || "—"}</strong></div>
          <div><span>Paid Date</span><strong>${invoice.paid_date || "—"}</strong></div>
          <div><span>Notes</span><strong>${escapeHtml(invoice.notes || "—")}</strong></div>
        </div>
      </div>
      <div class="panel">
        <h2>Financial Summary</h2>
        <div class="detail-list">
          <div><span>Subtotal</span><strong>£${Number(invoice.subtotal || 0).toFixed(2)}</strong></div>
          <div><span>VAT</span><strong>£${Number(invoice.vat || 0).toFixed(2)}</strong></div>
          <div><span>Total</span><strong>£${Number(invoice.total || 0).toFixed(2)}</strong></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("backInvoices").addEventListener("click", () => showPage("invoices"));
  document.getElementById("editInvoice").addEventListener("click", () => showEditInvoiceForm(invoice.id));
  document.getElementById("deleteInvoice").addEventListener("click", () => deleteInvoice(invoice.id));

  if (invoice.status !== "paid") {
    const sendButton = document.createElement("button");
    sendButton.id = "sendInvoiceButton";
    sendButton.className = "button primary";
    sendButton.textContent = "📤 Send Invoice";
    sendButton.style.marginRight = "10px";
    sendButton.addEventListener("click", async () => {
      const phone = customer?.phone || "";
      if (!phone) {
        alert("This customer does not have a phone number saved.");
        return;
      }
      if (!invoice.public_token) {
        alert("This invoice does not have a payment link yet.");
        return;
      }
      let whatsappNumber = phone.replace(/\D/g, "");
      if (whatsappNumber.startsWith("0")) whatsappNumber = "44" + whatsappNumber.substring(1);
      const paymentLink = `${window.location.origin}/public-invoice.html?token=${encodeURIComponent(invoice.public_token)}`;
      const message = `Hi ${customer.name},\n\nYour invoice #${invoice.invoice_number || ""} from ${currentUser.email || "JobPilot"} is ready.\n\nView and pay your invoice here:\n${paymentLink}\n\nThank you.`;
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    });
    const actions = document.querySelector(".page-actions > div:last-child");
    if (actions) actions.prepend(sendButton);
  }
}


// =====================================================
// DELETE INVOICE
// =====================================================

async function deleteInvoice(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  const confirmed = confirm(`Delete Invoice #${invoice.invoice_number || ""}? This cannot be undone.`);
  if (!confirmed) return;
  const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
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
  const job = jobs.find(item => String(item.id) === String(jobId));
  if (!job) {
    alert("Job could not be found.");
    return;
  }
  if (String(job.status).toLowerCase() === "invoiced") {
    alert("This job has already been invoiced.");
    return;
  }
  const customer = customers.find(c => String(c.id) === String(job.customer_id));
  if (!customer) {
    alert("The customer attached to this job could not be found.");
    return;
  }
  const confirmed = confirm(`Create an invoice for ${customer.name} for £${Number(job.price || 0).toFixed(2)}?`);
  if (!confirmed) return;
  const subtotal = Number(job.price || 0);
  const invoice = {
    user_id: currentUser.id,
    customer_id: job.customer_id,
    invoice_number: generateInvoiceNumber(),
    description: job.title || "Job",
    status: "sent",
    subtotal,
    vat: 0,
    total: subtotal,
    issue_date: todayDate(),
    due_date: null,
    paid_date: null,
    notes: `Created from Job: ${job.title}\n\n${job.notes || ""}`.trim()
  };
  const { data: createdInvoice, error: invoiceError } = await supabase.from("invoices").insert(invoice).select().single();
  if (invoiceError) {
    console.error("Convert job to invoice:", invoiceError);
    alert("The invoice could not be created:\n\n" + invoiceError.message);
    return;
  }
  const { error: jobError } = await supabase.from("jobs").update({ status: "invoiced" }).eq("id", job.id);
  if (jobError) {
    console.error("Job status update:", jobError);
    await loadInvoices();
    await loadJobs();
    alert("The invoice was created, but the job could not be marked as invoiced.\n\n" + jobError.message);
    showPage("invoices");
    return;
  }
  await loadInvoices();
  await loadJobs();
  showInvoiceProfile(createdInvoice.id);
  alert(`Invoice #${createdInvoice.invoice_number} has been created.`);
}


// =====================================================
// INVOICE NUMBER
// =====================================================

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const next = invoices.length + 1;
  return `${year}-${String(next).padStart(4, "0")}`;
}


// =====================================================
// QUOTE NUMBER
// =====================================================

function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const next = quotes.length + 1;
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
      <h2>Account</h2>
      <label>Email</label>
      <input type="email" value="${escapeHtml(currentUser.email || "")}" disabled>
      <label>New Password</label>
      <input type="password" id="settingsPassword" placeholder="Leave blank to keep your current password">
      <button class="button primary" onclick="changeSettingsPassword()" style="margin-top:12px;">Change Password</button>

      <hr>

      <h2>Payments</h2>
      <p>Connect your Stripe account to allow your customers to pay your invoices online.</p>
      <div id="stripeConnectionStatus" class="muted" style="margin:12px 0;">Checking Stripe connection...</div>
      <button class="button primary" id="connectStripeButton" type="button">💳 Connect Stripe</button>

      <hr>

      <h2>Business Details</h2>
      <label>Business Name</label>
      <input id="settingsBusinessName" type="text" placeholder="Your business name">
      <label>Contact Name</label>
      <input id="settingsContactName" type="text" placeholder="Your name">
      <label>Phone</label>
      <input id="settingsPhone" type="text" placeholder="Phone number">
      <label>Business Email</label>
      <input id="settingsBusinessEmail" type="email" placeholder="Business email">
      <label>Address</label>
      <textarea id="settingsAddress" placeholder="Business address"></textarea>
      <label>Postcode</label>
      <input id="settingsPostcode" type="text" placeholder="Postcode">
      <label>Website</label>
      <input id="settingsWebsite" type="text" placeholder="https://">

      <hr>

      <h2>Customer Invoice Information</h2>
      <p class="muted">Choose which business details your customers can see on your public invoices.</p>
      <label><input type="checkbox" id="settingsShowContactName" checked> Show contact name</label>
      <label><input type="checkbox" id="settingsShowPhone" checked> Show phone number</label>
      <label><input type="checkbox" id="settingsShowEmail" checked> Show business email</label>
      <label><input type="checkbox" id="settingsShowWebsite" checked> Show website</label>
      <label><input type="checkbox" id="settingsShowAddress"> <strong>Show business address</strong></label>

      <hr>

      <h2>Invoice Settings</h2>
      <label>Invoice Prefix</label>
      <input id="settingsInvoicePrefix" type="text" placeholder="INV-">
      <label>Next Invoice Number</label>
      <input id="settingsNextInvoiceNumber" type="number" min="1">
      <label>Payment Terms (days)</label>
      <input id="settingsPaymentTerms" type="number" min="0">
      <label>Default VAT Rate (%)</label>
      <input id="settingsVatRate" type="number" min="0" step="0.01">
      <label>Invoice Footer</label>
      <textarea id="settingsInvoiceFooter"></textarea>

      <hr>

      <h2>Quote Settings</h2>
      <label>Quote Prefix</label>
      <input id="settingsQuotePrefix" type="text" placeholder="QUO-">
      <label>Next Quote Number</label>
      <input id="settingsNextQuoteNumber" type="number" min="1">
      <label>Quote Validity (days)</label>
      <input id="settingsQuoteValidity" type="number" min="0">
      <label>Quote Footer</label>
      <textarea id="settingsQuoteFooter"></textarea>

      <hr>

      <h2>Currency</h2>
      <select id="settingsCurrency">
        <option value="GBP">GBP (£)</option>
        <option value="EUR">EUR (€)</option>
        <option value="USD">USD ($)</option>
      </select>

      <button id="saveSettingsButton" class="button primary" style="margin-top:20px;">Save Settings</button>
    </div>
  `;

  const stripeButton = document.getElementById("connectStripeButton");
  if (stripeButton && typeof window.initStripePayments === "function") {
    window.initStripePayments();
  }

  const saveButton = document.getElementById("saveSettingsButton");
  if (saveButton) {
    saveButton.addEventListener("click", saveSettings);
  }

  const savedSettings = JSON.parse(localStorage.getItem("jobpilot_settings") || "{}");
  if (savedSettings) {
    document.getElementById("settingsBusinessName").value = savedSettings.businessName || "";
    document.getElementById("settingsContactName").value = savedSettings.contactName || "";
    document.getElementById("settingsPhone").value = savedSettings.phone || "";
    document.getElementById("settingsBusinessEmail").value = savedSettings.businessEmail || "";
    document.getElementById("settingsAddress").value = savedSettings.address || "";
    document.getElementById("settingsPostcode").value = savedSettings.postcode || "";
    document.getElementById("settingsWebsite").value = savedSettings.website || "";
    document.getElementById("settingsInvoicePrefix").value = savedSettings.invoicePrefix || "INV-";
    document.getElementById("settingsNextInvoiceNumber").value = savedSettings.nextInvoiceNumber || 1;
    document.getElementById("settingsPaymentTerms").value = savedSettings.paymentTerms || 30;
    document.getElementById("settingsVatRate").value = savedSettings.vatRate ?? 20;
    document.getElementById("settingsInvoiceFooter").value = savedSettings.invoiceFooter || "";
    document.getElementById("settingsQuotePrefix").value = savedSettings.quotePrefix || "QUO-";
    document.getElementById("settingsNextQuoteNumber").value = savedSettings.nextQuoteNumber || 1;
    document.getElementById("settingsQuoteValidity").value = savedSettings.quoteValidity || 30;
    document.getElementById("settingsQuoteFooter").value = savedSettings.quoteFooter || "";
    document.getElementById("settingsCurrency").value = savedSettings.currency || "GBP";
    document.getElementById("settingsShowContactName").checked = savedSettings.showContactName !== false;
    document.getElementById("settingsShowPhone").checked = savedSettings.showPhone !== false;
    document.getElementById("settingsShowEmail").checked = savedSettings.showEmail !== false;
    document.getElementById("settingsShowWebsite").checked = savedSettings.showWebsite !== false;
    document.getElementById("settingsShowAddress").checked = savedSettings.showAddress === true;
  }
}


async function saveSettings() {
  const settings = {
    business_name: document.getElementById("settingsBusinessName").value.trim(),
    contact_name: document.getElementById("settingsContactName").value.trim(),
    phone: document.getElementById("settingsPhone").value.trim(),
    email: document.getElementById("settingsBusinessEmail").value.trim(),
    address_line1: document.getElementById("settingsAddress").value.trim(),
    postcode: document.getElementById("settingsPostcode").value.trim(),
    website: document.getElementById("settingsWebsite").value.trim(),
    invoice_prefix: document.getElementById("settingsInvoicePrefix").value.trim(),
    next_invoice_number: Number(document.getElementById("settingsNextInvoiceNumber").value) || 1,
    invoice_payment_terms: Number(document.getElementById("settingsPaymentTerms").value) || 30,
    default_vat_rate: Number(document.getElementById("settingsVatRate").value) || 0,
    invoice_footer: document.getElementById("settingsInvoiceFooter").value.trim(),
    quote_prefix: document.getElementById("settingsQuotePrefix").value.trim(),
    next_quote_number: Number(document.getElementById("settingsNextQuoteNumber").value) || 1,
    quote_validity_days: Number(document.getElementById("settingsQuoteValidity").value) || 30,
    quote_footer: document.getElementById("settingsQuoteFooter").value.trim(),
    currency: document.getElementById("settingsCurrency").value,
    show_contact_name_on_invoice: document.getElementById("settingsShowContactName").checked,
    show_phone_on_invoice: document.getElementById("settingsShowPhone").checked,
    show_email_on_invoice: document.getElementById("settingsShowEmail").checked,
    show_website_on_invoice: document.getElementById("settingsShowWebsite").checked,
    show_address_on_invoice: document.getElementById("settingsShowAddress").checked
  };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: currentUser.id, ...settings }, { onConflict: "user_id" });

  if (error) {
    alert("Could not save settings:\n\n" + error.message);
    return;
  }

  localStorage.setItem("jobpilot_settings", JSON.stringify({
    businessName: settings.business_name,
    contactName: settings.contact_name,
    phone: settings.phone,
    businessEmail: settings.email,
    address: settings.address_line1,
    postcode: settings.postcode,
    website: settings.website,
    invoicePrefix: settings.invoice_prefix,
    nextInvoiceNumber: settings.next_invoice_number,
    paymentTerms: settings.invoice_payment_terms,
    vatRate: settings.default_vat_rate,
    invoiceFooter: settings.invoice_footer,
    quotePrefix: settings.quote_prefix,
    nextQuoteNumber: settings.next_quote_number,
    quoteValidity: settings.quote_validity_days,
    quoteFooter: settings.quote_footer,
    currency: settings.currency,
    showContactName: settings.show_contact_name_on_invoice,
    showPhone: settings.show_phone_on_invoice,
    showEmail: settings.show_email_on_invoice,
    showWebsite: settings.show_website_on_invoice,
    showAddress: settings.show_address_on_invoice
  }));

  alert("Settings saved.");
}


// =====================================================
// CHANGE PASSWORD
// =====================================================

async function changeSettingsPassword() {
  const password = document.getElementById("settingsPassword")?.value || "";
  if (!password) {
    alert("Enter a new password.");
    return;
  }
  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    alert(error.message);
    return;
  }
  document.getElementById("settingsPassword").value = "";
  alert("Password changed successfully.");
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

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// START
// =====================================================

init();
