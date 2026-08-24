import { supabase } from "./supabase.js";

let currentUser = null;
let customers = [];
let jobs = [];

const app = document.getElementById("app");

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


// ===============================
// LOGIN
// ===============================

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

    showAuthMessage(
      error.message,
      true
    );

    return;

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

    showAuthMessage(
      error.message,
      true
    );

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


// ===============================
// LOAD APP
// ===============================

async function loadApp() {

  await loadCustomers();

  await loadJobs();

  renderApp();

}


// ===============================
// CUSTOMERS
// ===============================

async function loadCustomers() {

  const { data, error } = await supabase
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


// ===============================
// JOBS
// ===============================

async function loadJobs() {

  const { data, error } = await supabase
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


// ===============================
// MAIN APP
// ===============================

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
            ${currentUser.email.substring(0, 2).toUpperCase()}
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
    .addEventListener(
      "click",
      logout
    );


  showPage("dashboard");

}


// ===============================
// PAGE SWITCHING
// ===============================

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

    renderSimplePage(
      content,
      "💷",
      "Quotes",
      "Quote management is coming next."
    );

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


// ===============================
// DASHBOARD
// ===============================

function renderDashboard(content) {

  const jobCount =
    jobs.length;

  const customerCount =
    customers.length;


  content.innerHTML = `

    <div class="stats">

      <div class="stat-card">

        <div class="stat-icon">📋</div>

        <div>

          <span>Jobs</span>

          <strong>
            ${jobCount}
          </strong>

        </div>

      </div>


      <div class="stat-card">

        <div class="stat-icon">👥</div>

        <div>

          <span>Customers</span>

          <strong>
            ${customerCount}
          </strong>

        </div>

      </div>


      <div class="stat-card">

        <div class="stat-icon">💷</div>

        <div>

          <span>Quotes</span>

          <strong>£0</strong>

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
            ? jobs
                .slice(0, 5)
                .map(job => `
                  <div class="job-row">

                    <strong>
                      ${escapeHtml(job.title)}
                    </strong>

                    <span>
                      ${job.scheduled_date || "No date"}
                    </span>

                  </div>
                `)
                .join("")
            : `
              <div class="empty-state">

                <div class="empty-icon">
                  📋
                </div>

                <h3>
                  No jobs yet
                </h3>

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


// ===============================
// CUSTOMERS PAGE
// ===============================

function renderCustomersPage(content) {

  content.innerHTML = `

    <div class="page-actions">

      <div>

        <h2>
          Customers
        </h2>

        <p>
          Your customer database.
        </p>

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


// ===============================
// CUSTOMER TABLE
// ===============================

function renderCustomerTable(search = "") {

  const container =
    document.getElementById("customerTable");

  if (!container) return;


  const term =
    search.toLowerCase();


  const filtered =
    customers.filter(customer =>
      customer.name
        .toLowerCase()
        .includes(term)
    );


  if (!filtered.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          👥
        </div>

        <h3>
          No customers found
        </h3>

        <p>
          Add your first customer.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>Name</th>

          <th>Phone</th>

          <th>Email</th>

          <th>Postcode</th>

        </tr>

      </thead>


      <tbody>

        ${filtered.map(customer => `

          <tr>

            <td>
              <strong>
                ${escapeHtml(customer.name)}
              </strong>
            </td>

            <td>
              ${escapeHtml(customer.phone || "—")}
            </td>

            <td>
              ${escapeHtml(customer.email || "—")}
            </td>

            <td>
              ${escapeHtml(customer.postcode || "—")}
            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

}


// ===============================
// ADD CUSTOMER FORM
// ===============================

function showAddCustomerForm() {

  const modal =
    document.createElement("div");

  modal.className = "modal show";

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <h2>
            Add Customer
          </h2>

          <p>
            Create a customer record.
          </p>

        </div>

        <button class="close">
          ×
        </button>

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


// ===============================
// JOBS
// ===============================

function renderJobsPage(content) {

  content.innerHTML = `

    <div class="page-actions">

      <div>

        <h2>
          Jobs
        </h2>

        <p>
          Schedule and manage your work.
        </p>

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
                  ${job.status}
                </span>

              </div>

            `).join("")
          : `

            <div class="empty-state">

              <div class="empty-icon">
                📋
              </div>

              <h3>
                No jobs yet
              </h3>

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


// ===============================
// ADD JOB
// ===============================

function showAddJobForm() {

  const modal =
    document.createElement("div");

  modal.className = "modal show";


  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <h2>
            Add Job
          </h2>

          <p>
            Schedule work for a customer.
          </p>

        </div>

        <button class="close">
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


// ===============================
// SETTINGS
// ===============================

function renderSettings(content) {

  content.innerHTML = `

    <div class="panel settings-panel">

      <h2>
        Account
      </h2>

      <p class="muted">
        ${escapeHtml(currentUser.email)}
      </p>


      <hr>


      <h3>
        JobPilot
      </h3>

      <p class="muted">
        CRM for UK tradespeople.
      </p>

    </div>

  `;

}


// ===============================
// SIMPLE PLACEHOLDER
// ===============================

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


// ===============================
// LOGOUT
// ===============================

async function logout() {

  await supabase.auth.signOut();

}


// ===============================
// HTML ESCAPING
// ===============================

function escapeHtml(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


// ===============================
// START
// ===============================

init();
