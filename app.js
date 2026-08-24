import { supabase } from "./supabase.js";

let currentUser = null;
let customers = [];
let jobs = [];
let quotes = [];

const app = document.getElementById("app");


// ===============================
// INIT
// ===============================

async function init() {

  const { data } =
    await supabase.auth.getSession();

  currentUser =
    data.session?.user || null;

  if (currentUser) {
    await loadApp();
  } else {
    showLogin();
  }


  supabase.auth.onAuthStateChange(
    async (_event, session) => {

      currentUser =
        session?.user || null;

      if (currentUser) {
        await loadApp();
      } else {
        showLogin();
      }

    }
  );

}


// ===============================
// LOGIN
// ===============================

function showLogin() {

  app.innerHTML = `

    <div class="auth-page">

      <div class="auth-card">

        <div class="auth-logo">

          <div class="logo-mark">
            J
          </div>

          <div>
            <strong>JobPilot</strong>
            <span>Trades CRM</span>
          </div>

        </div>


        <h1>
          Welcome to JobPilot
        </h1>


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


          <button
            class="button primary auth-button"
          >
            Sign in
          </button>

        </form>


        <div id="authMessage"></div>


        <button
          id="signupButton"
          class="link-button"
        >
          Create a new account
        </button>

      </div>

    </div>

  `;


  document
    .getElementById("loginForm")
    .addEventListener(
      "submit",
      login
    );


  document
    .getElementById("signupButton")
    .addEventListener(
      "click",
      signup
    );

}


async function login(event) {

  event.preventDefault();


  const email =
    document
      .getElementById("email")
      .value
      .trim();


  const password =
    document
      .getElementById("password")
      .value;


  showAuthMessage(
    "Signing in..."
  );


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

  }

}


async function signup() {

  const email =
    document
      .getElementById("email")
      .value
      .trim();


  const password =
    document
      .getElementById("password")
      .value;


  if (
    !email ||
    password.length < 6
  ) {

    showAuthMessage(
      "Enter an email and a password of at least 6 characters.",
      true
    );

    return;

  }


  showAuthMessage(
    "Creating account..."
  );


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


function showAuthMessage(
  message,
  error = false
) {

  const element =
    document.getElementById(
      "authMessage"
    );


  if (!element) return;


  element.textContent =
    message;


  element.style.color =
    error
      ? "#dc2626"
      : "#2563eb";

}


// ===============================
// LOAD APP
// ===============================

async function loadApp() {

  await loadCustomers();

  await loadJobs();

  await loadQuotes();

  renderApp();

}


// ===============================
// LOAD CUSTOMERS
// ===============================

async function loadCustomers() {

  const { data, error } =
    await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    console.error(
      "Customer loading error:",
      error
    );

    return;

  }


  customers =
    data || [];

}


// ===============================
// LOAD JOBS
// ===============================

async function loadJobs() {

  const { data, error } =
    await supabase
      .from("jobs")
      .select("*")
      .order("scheduled_date", {
        ascending: true
      });


  if (error) {

    console.error(
      "Job loading error:",
      error
    );

    return;

  }


  jobs =
    data || [];

}


// ===============================
// LOAD QUOTES
// ===============================

async function loadQuotes() {

  const { data, error } =
    await supabase
      .from("quotes")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    console.error(
      "Quote loading error:",
      error
    );

    return;

  }


  quotes =
    data || [];

}


// ===============================
// MAIN APP
// ===============================

function renderApp() {

  app.innerHTML = `

    <div class="app-layout">

      <aside class="sidebar">

        <div class="logo">

          <div class="logo-mark">
            J
          </div>

          <div>
            <strong>JobPilot</strong>
            <span>Trades CRM</span>
          </div>

        </div>


        <nav>

          <button
            class="nav-item active"
            data-page="dashboard"
          >
            🏠 Dashboard
          </button>


          <button
            class="nav-item"
            data-page="customers"
          >
            👥 Customers
          </button>


          <button
            class="nav-item"
            data-page="jobs"
          >
            📋 Jobs
          </button>


          <button
            class="nav-item"
            data-page="quotes"
          >
            💷 Quotes
          </button>


          <button
            class="nav-item"
            data-page="invoices"
          >
            🧾 Invoices
          </button>

        </nav>


        <div class="sidebar-bottom">

          <button
            class="nav-item"
            data-page="settings"
          >
            ⚙️ Settings
          </button>


          <button
            class="nav-item"
            id="logoutButton"
          >
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
    .querySelectorAll(
      ".nav-item[data-page]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          showPage(
            button.dataset.page
          )
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

      button.classList.remove(
        "active"
      );

    });


  const activeButton =
    document.querySelector(
      `.nav-item[data-page="${page}"]`
    );


  if (activeButton) {

    activeButton.classList.add(
      "active"
    );

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


  document
    .getElementById("pageTitle")
    .textContent =
      titles[page][0];


  document
    .getElementById("pageSubtitle")
    .textContent =
      titles[page][1];


  const content =
    document.getElementById(
      "pageContent"
    );


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


// ===============================
// DASHBOARD
// ===============================

function renderDashboard(content) {

  const jobCount =
    jobs.length;


  const customerCount =
    customers.length;


  const quoteCount =
    quotes.length;


  content.innerHTML = `

    <div class="stats">

      <div class="stat-card">

        <div class="stat-icon">
          📋
        </div>

        <div>

          <span>
            Jobs
          </span>

          <strong>
            ${jobCount}
          </strong>

        </div>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          👥
        </div>

        <div>

          <span>
            Customers
          </span>

          <strong>
            ${customerCount}
          </strong>

        </div>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          💷
        </div>

        <div>

          <span>
            Quotes
          </span>

          <strong>
            ${quoteCount}
          </strong>

        </div>

      </div>


      <div class="stat-card">

        <div class="stat-icon">
          🧾
        </div>

        <div>

          <span>
            Invoices
          </span>

          <strong>
            £0
          </strong>

        </div>

      </div>

    </div>


    <div class="content-grid">

      <div class="panel">

        <div class="panel-header">

          <div>

            <h2>
              Upcoming Jobs
            </h2>

            <p>
              Your scheduled work
            </p>

          </div>

        </div>


        ${
          jobs.length

            ? jobs
                .slice(0, 5)
                .map(job => `

                  <div class="job-row">

                    <strong>
                      ${escapeHtml(
                        job.title
                      )}
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

            <h2>
              Quick Actions
            </h2>

            <p>
              Common tasks
            </p>

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
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showPage(
            button.dataset.action
          );

        }
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
    .getElementById(
      "addCustomerButton"
    )
    .addEventListener(
      "click",
      showAddCustomerForm
    );


  document
    .getElementById(
      "customerSearch"
    )
    .addEventListener(
      "input",
      event =>
        renderCustomerTable(
          event.target.value
        )
    );


  renderCustomerTable();

}


// ===============================
// CUSTOMER TABLE
// ===============================

function renderCustomerTable(
  search = ""
) {

  const container =
    document.getElementById(
      "customerTable"
    );


  if (!container) return;


  const term =
    search
      .toLowerCase()
      .trim();


  const filtered =
    customers.filter(customer => {

      const searchable = `

        ${customer.name || ""}
        ${customer.phone || ""}
        ${customer.email || ""}
        ${customer.city || ""}
        ${customer.postcode || ""}

      `.toLowerCase();


      return searchable.includes(
        term
      );

    });


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
          Add your first customer to get started.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = `

    <div class="jobs-list">

      ${filtered.map(customer => `

        <button
          class="job-card"
          data-customer-id="${customer.id}"
        >

          <div class="job-card-main">

            <strong>
              ${escapeHtml(
                customer.name
              )}
            </strong>

            <span>
              ${escapeHtml(
                customer.phone || ""
              )}
            </span>

          </div>


          <div class="job-card-details">

            <span>
              ${escapeHtml(
                customer.email || ""
              )}
            </span>

            <span>
              ${escapeHtml(
                customer.postcode || ""
              )}
            </span>

          </div>

        </button>

      `).join("")}

    </div>

  `;


  container
    .querySelectorAll(
      "[data-customer-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          showCustomerProfile(
            button.dataset.customerId
          )
      );

    });

}


// ===============================
// ADD CUSTOMER
// ===============================

function showAddCustomerForm() {

  const modal =
    document.createElement(
      "div"
    );


  modal.className =
    "modal show";


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

        <label>
          Name *
        </label>

        <input
          id="customerName"
          required
        >


        <label>
          Phone
        </label>

        <input
          id="customerPhone"
        >


        <label>
          Email
        </label>

        <input
          id="customerEmail"
          type="email"
        >


        <label>
          Address
        </label>

        <input
          id="customerAddress"
        >


        <label>
          Town / City
        </label>

        <input
          id="customerCity"
        >


        <label>
          Postcode
        </label>

        <input
          id="customerPostcode"
        >


        <label>
          Notes
        </label>

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


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(".close")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => modal.remove()
      );

    });


  modal
    .querySelector(
      "#customerForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const customer = {

          user_id:
            currentUser.id,

          name:
            document
              .getElementById(
                "customerName"
              )
              .value
              .trim(),

          phone:
            document
              .getElementById(
                "customerPhone"
              )
              .value
              .trim(),

          email:
            document
              .getElementById(
                "customerEmail"
              )
              .value
              .trim(),

          address_line1:
            document
              .getElementById(
                "customerAddress"
              )
              .value
              .trim(),

          city:
            document
              .getElementById(
                "customerCity"
              )
              .value
              .trim(),

          postcode:
            document
              .getElementById(
                "customerPostcode"
              )
              .value
              .trim(),

          notes:
            document
              .getElementById(
                "customerNotes"
              )
              .value
              .trim()

        };


        const { error } =
          await supabase
            .from("customers")
            .insert(
              customer
            );


        if (error) {

          alert(
            error.message
          );

          return;

        }


        modal.remove();

        await loadCustomers();

        renderCustomersPage(
          document.getElementById(
            "pageContent"
          )
        );

      }
    );

}


// ===============================
// CUSTOMER PROFILE
// ===============================

function showCustomerProfile(
  customerId
) {

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
        total +
        Number(job.price || 0),
      0
    );


  const content =
    document.getElementById(
      "pageContent"
    );


  document
    .getElementById(
      "pageTitle"
    )
    .textContent =
      customer.name;


  document
    .getElementById(
      "pageSubtitle"
    )
    .textContent =
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

        <h2>
          Customer Details
        </h2>


        <div class="detail-list">

          <div>
            <span>Name</span>

            <strong>
              ${escapeHtml(
                customer.name
              )}
            </strong>
          </div>


          <div>
            <span>Phone</span>

            <strong>
              ${escapeHtml(
                customer.phone ||
                "—"
              )}
            </strong>
          </div>


          <div>
            <span>Email</span>

            <strong>
              ${escapeHtml(
                customer.email ||
                "—"
              )}
            </strong>
          </div>


          <div>
            <span>Address</span>

            <strong>
              ${escapeHtml(
                customer.address_line1 ||
                "—"
              )}
            </strong>
          </div>


          <div>
            <span>Town / City</span>

            <strong>
              ${escapeHtml(
                customer.city ||
                "—"
              )}
            </strong>
          </div>


          <div>
            <span>Postcode</span>

            <strong>
              ${escapeHtml(
                customer.postcode ||
                "—"
              )}
            </strong>
          </div>


          <div>
            <span>Notes</span>

            <strong>
              ${escapeHtml(
                customer.notes ||
                "—"
              )}
            </strong>
          </div>

        </div>

      </div>


      <div class="panel">

        <h2>
          Customer Summary
        </h2>


        <div class="stats">

          <div class="stat-card">

            <div>

              <span>
                Jobs
              </span>

              <strong>
                ${customerJobs.length}
              </strong>

            </div>

          </div>


          <div class="stat-card">

            <div>

              <span>
                Job Value
              </span>

              <strong>
                £${totalValue.toFixed(2)}
              </strong>

            </div>

          </div>

        </div>

      </div>

    </div>


    <div class="panel customer-jobs">

      <div class="panel-header">

        <div>

          <h2>
            Job History
          </h2>

          <p>
            Previous and upcoming work.
          </p>

        </div>

      </div>


      ${
        customerJobs.length

          ? customerJobs
              .map(job => `

                <div class="job-row">

                  <div>

                    <strong>
                      ${escapeHtml(
                        job.title
                      )}
                    </strong>

                    <div class="muted">
                      ${job.scheduled_date || "No date"}
                    </div>

                  </div>


                  <strong>
                    £${Number(
                      job.price || 0
                    ).toFixed(2)}
                  </strong>

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
                This customer doesn't have any jobs.
              </p>

            </div>

          `
      }

    </div>

  `;


  document
    .getElementById(
      "backCustomers"
    )
    .addEventListener(
      "click",
      () =>
        showPage(
          "customers"
        )
    );


  document
    .getElementById(
      "editCustomer"
    )
    .addEventListener(
      "click",
      () =>
        showEditCustomerForm(
          customer.id
        )
    );


  document
    .getElementById(
      "deleteCustomer"
    )
    .addEventListener(
      "click",
      () =>
        deleteCustomer(
          customer.id
        )
    );

}


// ===============================
// EDIT CUSTOMER
// ===============================

function showEditCustomerForm(
  customerId
) {

  const customer =
    customers.find(
      item =>
        String(item.id) ===
        String(customerId)
    );


  if (!customer) return;


  const modal =
    document.createElement(
      "div"
    );


  modal.className =
    "modal show";


  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <h2>
            Edit Customer
          </h2>

          <p>
            Update customer details.
          </p>

        </div>


        <button class="close">
          ×
        </button>

      </div>


      <form id="editCustomerForm">

        <label>Name *</label>

        <input
          id="editCustomerName"
          value="${escapeHtml(
            customer.name ||
            ""
          )}"
          required
        >


        <label>Phone</label>

        <input
          id="editCustomerPhone"
          value="${escapeHtml(
            customer.phone ||
            ""
          )}"
        >


        <label>Email</label>

        <input
          id="editCustomerEmail"
          type="email"
          value="${escapeHtml(
            customer.email ||
            ""
          )}"
        >


        <label>Address</label>

        <input
          id="editCustomerAddress"
          value="${escapeHtml(
            customer.address_line1 ||
            ""
          )}"
        >


        <label>Town / City</label>

        <input
          id="editCustomerCity"
          value="${escapeHtml(
            customer.city ||
            ""
          )}"
        >


        <label>Postcode</label>

        <input
          id="editCustomerPostcode"
          value="${escapeHtml(
            customer.postcode ||
            ""
          )}"
        >


        <label>Notes</label>

        <textarea
          id="editCustomerNotes"
        >${escapeHtml(
          customer.notes ||
          ""
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


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );


  modal
    .querySelector(
      "#editCustomerForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const updates = {

          name:
            document
              .getElementById(
                "editCustomerName"
              )
              .value
              .trim(),

          phone:
            document
              .getElementById(
                "editCustomerPhone"
              )
              .value
              .trim(),

          email:
            document
              .getElementById(
                "editCustomerEmail"
              )
              .value
              .trim(),

          address_line1:
            document
              .getElementById(
                "editCustomerAddress"
              )
              .value
              .trim(),

          city:
            document
              .getElementById(
                "editCustomerCity"
              )
              .value
              .trim(),

          postcode:
            document
              .getElementById(
                "editCustomerPostcode"
              )
              .value
              .trim(),

          notes:
            document
              .getElementById(
                "editCustomerNotes"
              )
              .value
              .trim()

        };


        const { error } =
          await supabase
            .from("customers")
            .update(
              updates
            )
            .eq(
              "id",
              customer.id
            );


        if (error) {

          alert(
            error.message
          );

          return;

        }


        modal.remove();

        await loadCustomers();

        showCustomerProfile(
          customer.id
        );

      }
    );

}


// ===============================
// DELETE CUSTOMER
// ===============================

async function deleteCustomer(
  customerId
) {

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
      .eq(
        "id",
        customer.id
      );


  if (error) {

    alert(
      error.message
    );

    return;

  }


  await loadCustomers();

  await loadJobs();

  showPage(
    "customers"
  );

}


// ===============================
// JOBS PAGE
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

          ? jobs
              .map(job => `

                <div class="job-row">

                  <div>

                    <strong>
                      ${escapeHtml(
                        job.title
                      )}
                    </strong>

                    <div class="muted">
                      ${job.scheduled_date || "No date"}
                    </div>

                  </div>


                  <span>
                    ${escapeHtml(
                      job.status ||
                      "Scheduled"
                    )}
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
                Add your first job.
              </p>

            </div>

          `
      }

    </div>

  `;


  document
    .getElementById(
      "addJobButton"
    )
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
    document.createElement(
      "div"
    );


  modal.className =
    "modal show";


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

        <label>
          Customer *
        </label>


        <select
          id="jobCustomer"
          required
        >

          <option value="">
            Select customer
          </option>


          ${customers
            .map(
              customer => `

                <option
                  value="${customer.id}"
                >
                  ${escapeHtml(
                    customer.name
                  )}
                </option>

              `
            )
            .join("")}

        </select>


        <label>
          Job Title *
        </label>


        <input
          id="jobTitle"
          required
          placeholder="e.g. Window cleaning"
        >


        <label>
          Date
        </label>


        <input
          id="jobDate"
          type="date"
        >


        <label>
          Price
        </label>


        <input
          id="jobPrice"
          type="number"
          step="0.01"
          placeholder="0.00"
        >


        <label>
          Notes
        </label>


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


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );


  modal
    .querySelector(
      "#jobForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const job = {

          user_id:
            currentUser.id,

          customer_id:
            document
              .getElementById(
                "jobCustomer"
              )
              .value,

          title:
            document
              .getElementById(
                "jobTitle"
              )
              .value
              .trim(),

          scheduled_date:
            document
              .getElementById(
                "jobDate"
              )
              .value ||
            null,

          price:
            Number(
              document
                .getElementById(
                  "jobPrice"
                )
                .value
            ) || 0,

          notes:
            document
              .getElementById(
                "jobNotes"
              )
              .value
              .trim()

        };


        const { error } =
          await supabase
            .from("jobs")
            .insert(
              job
            );


        if (error) {

          alert(
            error.message
          );

          return;

        }


        modal.remove();

        await loadJobs();

        renderJobsPage(
          document.getElementById(
            "pageContent"
          )
        );

      }
    );

}


// ===============================
// QUOTES PAGE
// ===============================

function renderQuotesPage(
  content
) {

  content.innerHTML = `

    <div class="page-actions">

      <div>

        <h2>
          Quotes
        </h2>

        <p>
          Create and manage customer quotations.
        </p>

      </div>


      <button
        id="addQuoteButton"
        class="button primary"
      >
        + Create Quote
      </button>

    </div>


    <div class="panel">

      <div class="job-filters">

        <input
          id="quoteSearch"
          class="search-input"
          placeholder="Search quotes..."
        >


        <select
          id="quoteStatusFilter"
        >

          <option value="">
            All statuses
          </option>

          <option value="Draft">
            Draft
          </option>

          <option value="Sent">
            Sent
          </option>

          <option value="Accepted">
            Accepted
          </option>

          <option value="Rejected">
            Rejected
          </option>

          <option value="Expired">
            Expired
          </option>

        </select>

      </div>


      <div id="quotesTable"></div>

    </div>

  `;


  document
    .getElementById(
      "addQuoteButton"
    )
    .addEventListener(
      "click",
      showAddQuoteForm
    );


  document
    .getElementById(
      "quoteSearch"
    )
    .addEventListener(
      "input",
      renderQuotesTable
    );


  document
    .getElementById(
      "quoteStatusFilter"
    )
    .addEventListener(
      "change",
      renderQuotesTable
    );


  renderQuotesTable();

}


// ===============================
// QUOTE TABLE
// ===============================

function renderQuotesTable() {

  const container =
    document.getElementById(
      "quotesTable"
    );


  if (!container) return;


  const search =
    document
      .getElementById(
        "quoteSearch"
      )
      ?.value
      .toLowerCase()
      .trim() || "";


  const status =
    document
      .getElementById(
        "quoteStatusFilter"
      )
      ?.value || "";


  const filtered =
    quotes.filter(
      quote => {

        const customer =
          customers.find(
            item =>
              String(item.id) ===
              String(
                quote.customer_id
              )
          );


        const customerName =
          customer?.name || "";


        const searchable = `

          ${quote.quote_number || ""}
          ${customerName}
          ${quote.notes || ""}
          ${quote.status || ""}

        `.toLowerCase();


        return (
          (!search ||
            searchable.includes(
              search
            )) &&
          (!status ||
            quote.status === status)
        );

      }
    );


  if (!filtered.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          💷
        </div>

        <h3>
          No quotes found
        </h3>

        <p>
          Create your first quote to get started.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = `

    <div class="jobs-list">

      ${filtered
        .map(quote => {

          const customer =
            customers.find(
              item =>
                String(item.id) ===
                String(
                  quote.customer_id
                )
            );


          return `

            <button
              class="job-card"
              data-quote-id="${quote.id}"
            >

              <div class="job-card-main">

                <strong>
                  ${escapeHtml(
                    quote.quote_number ||
                    "Quote"
                  )}
                </strong>


                <span>
                  ${escapeHtml(
                    customer?.name ||
                    "Unknown customer"
                  )}
                </span>

              </div>


              <div class="job-card-details">

                <span>
                  £${Number(
                    quote.total || 0
                  ).toFixed(2)}
                </span>


                <span>
                  Valid until:
                  ${quote.valid_until || "—"}
                </span>


                <span class="status-badge">
                  ${escapeHtml(
                    quote.status ||
                    "Draft"
                  )}
                </span>

              </div>

            </button>

          `;

        })
        .join("")}

    </div>

  `;


  container
    .querySelectorAll(
      "[data-quote-id]"
    )
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


// ===============================
// QUOTE PROFILE
// ===============================

function showQuoteProfile(
  quoteId
) {

  const quote =
    quotes.find(
      item =>
        String(item.id) ===
        String(quoteId)
    );


  if (!quote) return;


  const customer =
    customers.find(
      item =>
        String(item.id) ===
        String(
          quote.customer_id
        )
    );


  const content =
    document.getElementById(
      "pageContent"
    );


  document
    .getElementById(
      "pageTitle"
    )
    .textContent =
      quote.quote_number ||
      "Quote";


  document
    .getElementById(
      "pageSubtitle"
    )
    .textContent =
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
          Quote Details
        </h2>


        <div class="detail-list">

          <div>

            <span>
              Quote Number
            </span>

            <strong>
              ${escapeHtml(
                quote.quote_number ||
                "—"
              )}
            </strong>

          </div>


          <div>

            <span>
              Customer
            </span>

            <strong>
              ${escapeHtml(
                customer?.name ||
                "—"
              )}
            </strong>

          </div>


          <div>

            <span>
              Status
            </span>

            <strong>
              ${escapeHtml(
                quote.status ||
                "Draft"
              )}
            </strong>

          </div>


          <div>

            <span>
              Subtotal
            </span>

            <strong>
              £${Number(
                quote.subtotal ||
                0
              ).toFixed(2)}
            </strong>

          </div>


          <div>

            <span>
              VAT
            </span>

            <strong>
              £${Number(
                quote.vat ||
                0
              ).toFixed(2)}
            </strong>

          </div>


          <div>

            <span>
              Total
            </span>

            <strong>
              £${Number(
                quote.total ||
                0
              ).toFixed(2)}
            </strong>

          </div>


          <div>

            <span>
              Valid Until
            </span>

            <strong>
              ${quote.valid_until ||
                "—"}
            </strong>

          </div>


          <div>

            <span>
              Notes
            </span>

            <strong>
              ${escapeHtml(
                quote.notes ||
                "—"
              )}
            </strong>

          </div>

        </div>

      </div>


      <div class="panel">

        <h2>
          Customer
        </h2>


        ${
          customer

            ? `

              <div class="detail-list">

                <div>

                  <span>
                    Name
                  </span>

                  <strong>
                    ${escapeHtml(
                      customer.name
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Phone
                  </span>

                  <strong>
                    ${escapeHtml(
                      customer.phone ||
                      "—"
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Email
                  </span>

                  <strong>
                    ${escapeHtml(
                      customer.email ||
                      "—"
                    )}
                  </strong>

                </div>

              </div>

            `

            : `

              <p class="muted">
                Customer not found.
              </p>

            `
        }

      </div>

    </div>

  `;


  document
    .getElementById(
      "backQuotes"
    )
    .addEventListener(
      "click",
      () =>
        showPage("quotes")
    );


  document
    .getElementById(
      "editQuote"
    )
    .addEventListener(
      "click",
      () =>
        showEditQuoteForm(
          quote.id
        )
    );


  document
    .getElementById(
      "deleteQuote"
    )
    .addEventListener(
      "click",
      () =>
        deleteQuote(
          quote.id
        )
    );

}


// ===============================
// ADD QUOTE
// ===============================

function showAddQuoteForm() {

  const modal =
    document.createElement(
      "div"
    );


  modal.className =
    "modal show";


  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <h2>
            Create Quote
          </h2>

          <p>
            Create a quotation for a customer.
          </p>

        </div>


        <button class="close">
          ×
        </button>

      </div>


      <form id="quoteForm">

        <label>
          Customer *
        </label>


        <select
          id="quoteCustomer"
          required
        >

          <option value="">
            Select customer
          </option>


          ${customers
            .map(
              customer => `

                <option
                  value="${customer.id}"
                >
                  ${escapeHtml(
                    customer.name
                  )}
                </option>

              `
            )
            .join("")}

        </select>


        <label>
          Quote Number
        </label>


        <input
          id="quoteNumber"
          value="${getNextQuoteNumber()}"
          required
        >


        <label>
          Subtotal
        </label>


        <input
          id="quoteSubtotal"
          type="number"
          step="0.01"
          min="0"
          value="0"
        >


        <label>
          VAT
        </label>


        <input
          id="quoteVAT"
          type="number"
          step="0.01"
          min="0"
          value="0"
        >


        <label>
          Total
        </label>


        <input
          id="quoteTotal"
          type="number"
          step="0.01"
          min="0"
          value="0"
          readonly
        >


        <label>
          Status
        </label>


        <select
          id="quoteStatus"
        >

          <option value="Draft">
            Draft
          </option>

          <option value="Sent">
            Sent
          </option>

          <option value="Accepted">
            Accepted
          </option>

          <option value="Rejected">
            Rejected
          </option>

          <option value="Expired">
            Expired
          </option>

        </select>


        <label>
          Valid Until
        </label>


        <input
          id="quoteValidUntil"
          type="date"
        >


        <label>
          Notes
        </label>


        <textarea
          id="quoteNotes"
          placeholder="Quote notes..."
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


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );


  const subtotalInput =
    modal.querySelector(
      "#quoteSubtotal"
    );


  const vatInput =
    modal.querySelector(
      "#quoteVAT"
    );


  const totalInput =
    modal.querySelector(
      "#quoteTotal"
    );


  function updateTotal() {

    const subtotal =
      Number(
        subtotalInput.value
      ) || 0;


    const vat =
      Number(
        vatInput.value
      ) || 0;


    totalInput.value =
      (
        subtotal +
        vat
      ).toFixed(2);

  }


  subtotalInput.addEventListener(
    "input",
    updateTotal
  );


  vatInput.addEventListener(
    "input",
    updateTotal
  );


  modal
    .querySelector(
      "#quoteForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const quote = {

          user_id:
            currentUser.id,

          customer_id:
            document
              .getElementById(
                "quoteCustomer"
              )
              .value,

          quote_number:
            document
              .getElementById(
                "quoteNumber"
              )
              .value
              .trim(),

          status:
            document
              .getElementById(
                "quoteStatus"
              )
              .value,

          subtotal:
            Number(
              document
                .getElementById(
                  "quoteSubtotal"
                )
                .value
            ) || 0,

          vat:
            Number(
              document
                .getElementById(
                  "quoteVAT"
                )
                .value
            ) || 0,

          total:
            Number(
              document
                .getElementById(
                  "quoteTotal"
                )
                .value
            ) || 0,

          notes:
            document
              .getElementById(
                "quoteNotes"
              )
              .value
              .trim(),

          valid_until:
            document
              .getElementById(
                "quoteValidUntil"
              )
              .value ||
            null

        };


        const { error } =
          await supabase
            .from("quotes")
            .insert(
              quote
            );


        if (error) {

          alert(
            error.message
          );

          return;

        }


        modal.remove();

        await loadQuotes();

        renderQuotesPage(
          document.getElementById(
            "pageContent"
          )
        );

      }
    );

}


// ===============================
// QUOTE NUMBER
// ===============================

function getNextQuoteNumber() {

  const numbers =
    quotes.map(
      quote => {

        const match =
          String(
            quote.quote_number ||
            ""
          ).match(
            /(\d+)$/
          );


        return match
          ? Number(
              match[1]
            )
          : 0;

      }
    );


  const highest =
    numbers.length
      ? Math.max(
          ...numbers
        )
      : 0;


  return `Q-${String(
    highest + 1
  ).padStart(
    4,
    "0"
  )}`;

}


// ===============================
// EDIT QUOTE
// ===============================

function showEditQuoteForm(
  quoteId
) {

  const quote =
    quotes.find(
      item =>
        String(item.id) ===
        String(quoteId)
    );


  if (!quote) return;


  const modal =
    document.createElement(
      "div"
    );


  modal.className =
    "modal show";


  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <h2>
            Edit Quote
          </h2>

          <p>
            Update quotation details.
          </p>

        </div>


        <button class="close">
          ×
        </button>

      </div>


      <form id="editQuoteForm">

        <label>
          Customer *
        </label>


        <select
          id="editQuoteCustomer"
          required
        >

          ${customers
            .map(
              customer => `

                <option
                  value="${customer.id}"
                  ${
                    String(
                      customer.id
                    ) ===
                    String(
                      quote.customer_id
                    )
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHtml(
                    customer.name
                  )}
                </option>

              `
            )
            .join("")}

        </select>


        <label>
          Quote Number
        </label>


        <input
          id="editQuoteNumber"
          value="${escapeHtml(
            quote.quote_number ||
            ""
          )}"
          required
        >


        <label>
          Subtotal
        </label>


        <input
          id="editQuoteSubtotal"
          type="number"
          step="0.01"
          min="0"
          value="${
            quote.subtotal ||
            0
          }"
        >


        <label>
          VAT
        </label>


        <input
          id="editQuoteVAT"
          type="number"
          step="0.01"
          min="0"
          value="${
            quote.vat ||
            0
          }"
        >


        <label>
          Total
        </label>


        <input
          id="editQuoteTotal"
          type="number"
          step="0.01"
          value="${
            quote.total ||
            0
          }"
          readonly
        >


        <label>
          Status
        </label>


        <select
          id="editQuoteStatus"
        >

          ${
            [
              "Draft",
              "Sent",
              "Accepted",
              "Rejected",
              "Expired"
            ]
              .map(
                status => `

                  <option
                    value="${status}"
                    ${
                      quote.status ===
                      status
                        ? "selected"
                        : ""
                    }
                  >
                    ${status}
                  </option>

                `
              )
              .join("")
          }

        </select>


        <label>
          Valid Until
        </label>


        <input
          id="editQuoteValidUntil"
          type="date"
          value="${
            quote.valid_until ||
            ""
          }"
        >


        <label>
          Notes
        </label>


        <textarea
          id="editQuoteNotes"
        >${escapeHtml(
          quote.notes ||
          ""
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


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(".close")
    .forEach(button =>
      button.addEventListener(
        "click",
        () => modal.remove()
      )
    );


  const subtotalInput =
    modal.querySelector(
      "#editQuoteSubtotal"
    );


  const vatInput =
    modal.querySelector(
      "#editQuoteVAT"
    );


  const totalInput =
    modal.querySelector(
      "#editQuoteTotal"
    );


  function updateTotal() {

    const subtotal =
      Number(
        subtotalInput.value
      ) || 0;


    const vat =
      Number(
        vatInput.value
      ) || 0;


    totalInput.value =
      (
        subtotal +
        vat
      ).toFixed(2);

  }


  subtotalInput.addEventListener(
    "input",
    updateTotal
  );


  vatInput.addEventListener(
    "input",
    updateTotal
  );


  modal
    .querySelector(
      "#editQuoteForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const updates = {

          customer_id:
            document
              .getElementById(
                "editQuoteCustomer"
              )
              .value,

          quote_number:
            document
              .getElementById(
                "editQuoteNumber"
              )
              .value
              .trim(),

          status:
            document
              .getElementById(
                "editQuoteStatus"
              )
              .value,

          subtotal:
            Number(
              document
                .getElementById(
                  "editQuoteSubtotal"
                )
                .value
            ) || 0,

          vat:
            Number(
              document
                .getElementById(
                  "editQuoteVAT"
                )
                .value
            ) || 0,

          total:
            Number(
              document
                .getElementById(
                  "editQuoteTotal"
                )
                .value
            ) || 0,

          notes:
            document
              .getElementById(
                "editQuoteNotes"
              )
              .value
              .trim(),

          valid_until:
            document
              .getElementById(
                "editQuoteValidUntil"
              )
              .value ||
            null

        };


        const { error } =
          await supabase
            .from("quotes")
            .update(
              updates
            )
            .eq(
              "id",
              quote.id
            );


        if (error) {

          alert(
            error.message
          );

          return;

        }


        modal.remove();

        await loadQuotes();

        showQuoteProfile(
          quote.id
        );

      }
    );

}


// ===============================
// DELETE QUOTE
// ===============================

async function deleteQuote(
  quoteId
) {

  const quote =
    quotes.find(
      item =>
        String(item.id) ===
        String(quoteId)
    );


  if (!quote) return;


  const confirmed =
    confirm(
      `Delete ${
        quote.quote_number ||
        "this quote"
      }? This cannot be undone.`
    );


  if (!confirmed) return;


  const { error } =
    await supabase
      .from("quotes")
      .delete()
      .eq(
        "id",
        quote.id
      );


  if (error) {

    alert(
      error.message
    );

    return;

  }


  await loadQuotes();

  showPage(
    "quotes"
  );

}


// ===============================
// SETTINGS
// ===============================

function renderSettings(
  content
) {

  content.innerHTML = `

    <div class="panel settings-panel">

      <h2>
        Account
      </h2>


      <p class="muted">
        ${escapeHtml(
          currentUser.email
        )}
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
// SIMPLE PAGE
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

function escapeHtml(
  value
) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


// ===============================
// START
// ===============================

init();
