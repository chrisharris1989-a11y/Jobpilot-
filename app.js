import { supabase } from "./supabase.js";

let currentUser = null;
let customers = [];
let jobs = [];

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

  supabase.auth.onAuthStateChange(
    async (_event, session) => {

      currentUser = session?.user || null;

      if (currentUser) {
        await loadApp();
      } else {
        showLogin();
      }

    }
  );

}


// =====================================================
// LOGIN
// =====================================================

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
            type="submit"
            class="button primary auth-button"
          >
            Sign in
          </button>

        </form>

        <div id="authMessage"></div>

        <button
          id="signupButton"
          class="link-button"
          type="button"
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


// =====================================================
// LOGIN ACTION
// =====================================================

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

  }

}


// =====================================================
// SIGN UP
// =====================================================

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


// =====================================================
// AUTH MESSAGE
// =====================================================

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


// =====================================================
// LOAD APP
// =====================================================

async function loadApp() {

  await loadCustomers();

  await loadJobs();

  renderApp();

}


// =====================================================
// LOAD CUSTOMERS
// =====================================================

async function loadCustomers() {

  const { data, error } =
    await supabase
      .from("customers")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(
      "Customer loading error:",
      error
    );

    customers = [];

    return;

  }

  customers =
    data || [];

}


// =====================================================
// LOAD JOBS
// =====================================================

async function loadJobs() {

  const { data, error } =
    await supabase
      .from("jobs")
      .select("*")
      .order(
        "scheduled_date",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "Job loading error:",
      error
    );

    jobs = [];

    return;

  }

  jobs =
    data || [];

}


// =====================================================
// MAIN APP
// =====================================================

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
            ${
              currentUser.email
                .substring(0, 2)
                .toUpperCase()
            }
          </div>

        </header>


        <section
          id="pageContent"
        ></section>

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
    .getElementById(
      "logoutButton"
    )
    .addEventListener(
      "click",
      logout
    );


  showPage(
    "dashboard"
  );

}


// =====================================================
// PAGE SWITCHING
// =====================================================

function showPage(page) {

  document
    .querySelectorAll(
      ".nav-item"
    )
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
    .getElementById(
      "pageTitle"
    )
    .textContent =
    titles[page][0];


  document
    .getElementById(
      "pageSubtitle"
    )
    .textContent =
    titles[page][1];


  const content =
    document.getElementById(
      "pageContent"
    );


  if (page === "dashboard") {

    renderDashboard(
      content
    );

  }


  if (page === "customers") {

    renderCustomersPage(
      content
    );

  }


  if (page === "jobs") {

    renderJobsPage(
      content
    );

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

    renderSettings(
      content
    );

  }

}


// =====================================================
// DASHBOARD
// =====================================================

function renderDashboard(content) {

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
            ${jobs.length}
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
            ${customers.length}
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
            £0
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

                    <div>

                      <strong>
                        ${escapeHtml(
                          job.title
                        )}
                      </strong>

                      <div class="muted">
                        ${
                          job.scheduled_date ||
                          "No date"
                        }
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
          data-action="add-customer"
        >
          👤 Add Customer
        </button>


        <button
          class="quick-button"
          data-action="add-job"
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

          const action =
            button.dataset.action;

          if (
            action ===
            "add-customer"
          ) {

            showAddCustomerForm();

            return;

          }

          if (
            action ===
            "add-job"
          ) {

            showPage(
              "jobs"
            );

            return;

          }

          showPage(
            action
          );

        }
      );

    });

}


// =====================================================
// CUSTOMERS PAGE
// =====================================================

function renderCustomersPage(
  content
) {

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
        type="button"
      >
        + Add Customer
      </button>

    </div>


    <div class="panel">

      <input
        id="customerSearch"
        class="search-input"
        type="search"
        placeholder="Search customers..."
      >


      <div
        id="customerTable"
        class="table-container"
      ></div>

    </div>

  `;


  const addButton =
    document.getElementById(
      "addCustomerButton"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      showAddCustomerForm
    );

  }


  const search =
    document.getElementById(
      "customerSearch"
    );


  if (search) {

    search.addEventListener(
      "input",
      event =>
        renderCustomerTable(
          event.target.value
        )
    );

  }


  renderCustomerTable();

}


// =====================================================
// CUSTOMER TABLE
// =====================================================

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
      .trim()
      .toLowerCase();


  const filtered =
    customers.filter(
      customer => {

        const name =
          String(
            customer.name || ""
          ).toLowerCase();

        const phone =
          String(
            customer.phone || ""
          ).toLowerCase();

        const email =
          String(
            customer.email || ""
          ).toLowerCase();

        const postcode =
          String(
            customer.postcode || ""
          ).toLowerCase();

        return (
          name.includes(term) ||
          phone.includes(term) ||
          email.includes(term) ||
          postcode.includes(term)
        );

      }
    );


  if (!filtered.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          👥
        </div>

        <h3>
          ${
            term
              ? "No customers found"
              : "No customers yet"
          }
        </h3>

        <p>
          ${
            term
              ? "Try a different search."
              : "Add your first customer to get started."
          }
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>
            Name
          </th>

          <th>
            Phone
          </th>

          <th>
            Email
          </th>

          <th>
            Postcode
          </th>

          <th>
            Actions
          </th>

        </tr>

      </thead>


      <tbody>

        ${filtered.map(customer => `

          <tr>

            <td>

              <button
                class="customer-link"
                data-customer-id="${customer.id}"
                type="button"
              >
                ${escapeHtml(
                  customer.name
                )}
              </button>

            </td>


            <td>
              ${escapeHtml(
                customer.phone || "—"
              )}
            </td>


            <td>
              ${escapeHtml(
                customer.email || "—"
              )}
            </td>


            <td>
              ${escapeHtml(
                customer.postcode || "—"
              )}
            </td>


            <td>

              <button
                class="small-button"
                data-edit-customer="${customer.id}"
                type="button"
              >
                Edit
              </button>

            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;


  document
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


  document
    .querySelectorAll(
      "[data-edit-customer]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          showEditCustomerForm(
            button.dataset.editCustomer
          )
      );

    });

}


// =====================================================
// ADD CUSTOMER
// =====================================================

function showAddCustomerForm() {

  const modal =
    document.createElement(
      "div"
    );

  modal.className =
    "modal";


  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <h2>
            Add Customer
          </h2>

          <p>
            Create a new customer.
          </p>

        </div>


        <button
          type="button"
          class="close"
          aria-label="Close"
        >
          ×
        </button>

      </div>


      <form id="customerForm">

        <label>
          Name *
        </label>

        <input
          id="customerName"
          type="text"
          required
        >


        <label>
          Phone
        </label>

        <input
          id="customerPhone"
          type="tel"
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
          type="text"
        >


        <label>
          Town / City
        </label>

        <input
          id="customerCity"
          type="text"
        >


        <label>
          Postcode
        </label>

        <input
          id="customerPostcode"
          type="text"
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
    .querySelectorAll(
      ".close"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          modal.remove()
      );

    });


  modal
    .querySelector(
      "#customerForm"
    )
    .addEventListener(
      "submit",
      saveCustomer
    );

}


// =====================================================
// SAVE CUSTOMER
// =====================================================

async function saveCustomer(
  event
) {

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


  if (!customer.name) {

    alert(
      "Please enter the customer's name."
    );

    return;

  }


  const { error } =
    await supabase
      .from("customers")
      .insert(customer);


  if (error) {

    console.error(
      "Customer save error:",
      error
    );

    alert(
      error.message
    );

    return;

  }


  const modal =
    document.querySelector(
      ".modal"
    );

  if (modal) {
    modal.remove();
  }


  await loadCustomers();


  showPage(
    "customers"
  );

}


// =====================================================
// CUSTOMER PROFILE
// =====================================================

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
        Number(
          job.price || 0
        ),
      0
    );


  const content =
    document.getElementById(
      "pageContent"
    );


  document.getElementById(
    "pageTitle"
  ).textContent =
    customer.name;


  document.getElementById(
    "pageSubtitle"
  ).textContent =
    "Customer profile";


  content.innerHTML = `

    <div class="page-actions">

      <button
        id="backCustomers"
        class="button secondary"
        type="button"
      >
        ← Customers
      </button>


      <div>

        <button
          id="editCustomer"
          class="button primary"
          type="button"
        >
          Edit Customer
        </button>


        <button
          id="deleteCustomer"
          class="button danger"
          type="button"
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
                customer.phone || "—"
              )}
            </strong>
          </div>


          <div>
            <span>Email</span>
            <strong>
              ${escapeHtml(
                customer.email || "—"
              )}
            </strong>
          </div>


          <div>
            <span>Address</span>
            <strong>
              ${escapeHtml(
                customer.address_line1 || "—"
              )}
            </strong>
          </div>


          <div>
            <span>Town / City</span>
            <strong>
              ${escapeHtml(
                customer.city || "—"
              )}
            </strong>
          </div>


          <div>
            <span>Postcode</span>
            <strong>
              ${escapeHtml(
                customer.postcode || "—"
              )}
            </strong>
          </div>


          <div>
            <span>Notes</span>
            <strong>
              ${escapeHtml(
                customer.notes || "—"
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
                      ${
                        job.scheduled_date ||
                        "No date"
                      }
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


// =====================================================
// EDIT CUSTOMER
// =====================================================

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
    "modal";


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


        <button
          type="button"
          class="close"
        >
          ×
        </button>

      </div>


      <form id="editCustomerForm">

        <label>
          Name *
        </label>

        <input
          id="editCustomerName"
          value="${escapeAttribute(
            customer.name
          )}"
          required
        >


        <label>
          Phone
        </label>

        <input
          id="editCustomerPhone"
          value="${escapeAttribute(
            customer.phone || ""
          )}"
        >


        <label>
          Email
        </label>

        <input
          id="editCustomerEmail"
          type="email"
          value="${escapeAttribute(
            customer.email || ""
          )}"
        >


        <label>
          Address
        </label>

        <input
          id="editCustomerAddress"
          value="${escapeAttribute(
            customer.address_line1 || ""
          )}"
        >


        <label>
          Town / City
        </label>

        <input
          id="editCustomerCity"
          value="${escapeAttribute(
            customer.city || ""
          )}"
        >


        <label>
          Postcode
        </label>

        <input
          id="editCustomerPostcode"
          value="${escapeAttribute(
            customer.postcode || ""
          )}"
        >


        <label>
          Notes
        </label>

        <textarea
          id="editCustomerNotes"
        >${escapeHtml(
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


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(
      ".close"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          modal.remove()
      );

    });


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
            .update(updates)
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


// =====================================================
// DELETE CUSTOMER
// =====================================================

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


// =====================================================
// JOBS PAGE
// =====================================================

// ===============================
// JOBS
// ===============================

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

      <div class="job-filters">

        <input
          id="jobSearch"
          class="search-input"
          placeholder="Search jobs..."
        >

        <select id="jobStatusFilter">
          <option value="">All statuses</option>
          <option value="Quoted">Quoted</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

      </div>

      <div id="jobsTable"></div>

    </div>

  `;

  document
    .getElementById("addJobButton")
    .addEventListener(
      "click",
      showAddJobForm
    );

  document
    .getElementById("jobSearch")
    .addEventListener(
      "input",
      renderJobsTableFromFilters
    );

  document
    .getElementById("jobStatusFilter")
    .addEventListener(
      "change",
      renderJobsTableFromFilters
    );

  renderJobsTableFromFilters();
}


// ===============================
// JOB TABLE
// ===============================

function renderJobsTableFromFilters() {

  const search =
    document
      .getElementById("jobSearch")
      ?.value
      .toLowerCase()
      .trim() || "";

  const status =
    document
      .getElementById("jobStatusFilter")
      ?.value || "";

  const filteredJobs =
    jobs.filter(job => {

      const customer =
        customers.find(
          customer =>
            String(customer.id) ===
            String(job.customer_id)
        );

      const customerName =
        customer?.name || "";

      const searchable =
        `
          ${job.title || ""}
          ${customerName}
          ${job.notes || ""}
          ${job.status || ""}
        `.toLowerCase();

      const matchesSearch =
        !search ||
        searchable.includes(search);

      const matchesStatus =
        !status ||
        (job.status || "Scheduled") === status;

      return matchesSearch && matchesStatus;

    });


  const container =
    document.getElementById("jobsTable");

  if (!container) return;


  if (!filteredJobs.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📋
        </div>

        <h3>
          No jobs found
        </h3>

        <p>
          Try changing your search or filters.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = `

    <div class="jobs-list">

      ${filteredJobs.map(job => {

        const customer =
          customers.find(
            customer =>
              String(customer.id) ===
              String(job.customer_id)
          );

        const customerName =
          customer?.name || "Unknown customer";

        const status =
          job.status || "Scheduled";

        return `

          <button
            class="job-card"
            data-job-id="${job.id}"
          >

            <div class="job-card-main">

              <strong>
                ${escapeHtml(job.title || "Untitled job")}
              </strong>

              <span>
                ${escapeHtml(customerName)}
              </span>

            </div>

            <div class="job-card-details">

              <span>
                📅 ${job.scheduled_date || "No date"}
              </span>

              <span>
                £${Number(job.price || 0).toFixed(2)}
              </span>

              <span class="status-badge">
                ${escapeHtml(status)}
              </span>

            </div>

          </button>

        `;

      }).join("")}

    </div>

  `;


  container
    .querySelectorAll(".job-card")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          showJobProfile(
            button.dataset.jobId
          )
      );

    });

}


// ===============================
// JOB PROFILE
// ===============================

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
      item =>
        String(item.id) ===
        String(job.customer_id)
    );


  const content =
    document.getElementById("pageContent");


  document.getElementById("pageTitle").textContent =
    job.title || "Job";

  document.getElementById("pageSubtitle").textContent =
    "Job details";


  content.innerHTML = `

    <div class="page-actions">

      <div>

        <button
          id="backJobs"
          class="button secondary"
        >
          ← Jobs
        </button>

      </div>

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

        <h2>
          Job Details
        </h2>

        <div class="detail-list">

          <div>
            <span>Job</span>
            <strong>
              ${escapeHtml(job.title || "—")}
            </strong>
          </div>

          <div>
            <span>Customer</span>
            <strong>
              ${escapeHtml(customer?.name || "—")}
            </strong>
          </div>

          <div>
            <span>Date</span>
            <strong>
              ${job.scheduled_date || "—"}
            </strong>
          </div>

          <div>
            <span>Price</span>
            <strong>
              £${Number(job.price || 0).toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              ${escapeHtml(job.status || "Scheduled")}
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

        <h2>
          Customer
        </h2>

        ${
          customer
            ? `
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


// ===============================
// EDIT JOB
// ===============================

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

          <h2>
            Edit Job
          </h2>

          <p>
            Update the job details.
          </p>

        </div>

        <button class="close">
          ×
        </button>

      </div>


      <form id="editJobForm">

        <label>Customer *</label>

        <select
          id="editJobCustomer"
          required
        >

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
          required
          value="${escapeHtml(job.title || "")}"
        >


        <label>Date</label>

        <input
          id="editJobDate"
          type="date"
          value="${job.scheduled_date || ""}"
        >


        <label>Price</label>

        <input
          id="editJobPrice"
          type="number"
          step="0.01"
          value="${job.price || 0}"
        >


        <label>Status</label>

        <select id="editJobStatus">

          <option value="Quoted"
            ${job.status === "Quoted" ? "selected" : ""}>
            Quoted
          </option>

          <option value="Scheduled"
            ${job.status === "Scheduled" ? "selected" : ""}>
            Scheduled
          </option>

          <option value="In Progress"
            ${job.status === "In Progress" ? "selected" : ""}>
            In Progress
          </option>

          <option value="Completed"
            ${job.status === "Completed" ? "selected" : ""}>
            Completed
          </option>

          <option value="Cancelled"
            ${job.status === "Cancelled" ? "selected" : ""}>
            Cancelled
          </option>

        </select>


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
              .value
              .trim(),

          scheduled_date:
            document
              .getElementById("editJobDate")
              .value || null,

          price:
            Number(
              document
                .getElementById("editJobPrice")
                .value
            ) || 0,

          status:
            document
              .getElementById("editJobStatus")
              .value,

          notes:
            document
              .getElementById("editJobNotes")
              .value
              .trim()

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


// ===============================
// DELETE JOB
// ===============================

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


        <label>Status</label>

        <select id="jobStatus">

          <option value="Scheduled">
            Scheduled
          </option>

          <option value="Quoted">
            Quoted
          </option>

          <option value="In Progress">
            In Progress
          </option>

          <option value="Completed">
            Completed
          </option>

          <option value="Cancelled">
            Cancelled
          </option>

        </select>


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

          status:
            document
              .getElementById("jobStatus")
              .value,

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
// SETTINGS
// =====================================================

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


// =====================================================
// PLACEHOLDER PAGES
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

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )

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


// =====================================================
// ATTRIBUTE ESCAPING
// =====================================================

function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );

}


// =====================================================
// START
// =====================================================

init();
