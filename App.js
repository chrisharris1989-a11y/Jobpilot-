// ============================================
// JOBPILOT MVP
// ============================================

// Temporary local data.
// We will replace this with Supabase shortly.

let customers = JSON.parse(
  localStorage.getItem("jobpilot_customers") || "[]"
);

let jobs = JSON.parse(
  localStorage.getItem("jobpilot_jobs") || "[]"
);


// ============================================
// PAGE NAVIGATION
// ============================================

function showPage(page) {

  document.querySelectorAll(".page").forEach(function(section) {
    section.classList.remove("active-page");
  });

  const selectedPage = document.getElementById(page);

  if (selectedPage) {
    selectedPage.classList.add("active-page");
  }

  document.querySelectorAll(".nav-item").forEach(function(button) {
    button.classList.remove("active");
  });

  const navButtons = document.querySelectorAll(".nav-item");

  navButtons.forEach(function(button) {

    const onclick = button.getAttribute("onclick") || "";

    if (onclick.includes("'" + page + "'")) {
      button.classList.add("active");
    }

  });

  const titles = {

    dashboard: [
      "Dashboard",
      "Here's what's happening with your business."
    ],

    customers: [
      "Customers",
      "Manage your customers and their details."
    ],

    jobs: [
      "Jobs",
      "Schedule and manage your work."
    ],

    quotes: [
      "Quotes",
      "Create and track customer quotations."
    ],

    invoices: [
      "Invoices",
      "Create and track customer invoices."
    ],

    settings: [
      "Settings",
      "Manage your JobPilot business settings."
    ]

  };

  if (titles[page]) {

    document.getElementById("page-title").textContent =
      titles[page][0];

    document.getElementById("page-subtitle").textContent =
      titles[page][1];

  }

  // Close mobile sidebar

  const sidebar = document.querySelector(".sidebar");

  if (sidebar) {
    sidebar.classList.remove("open");
  }

  renderCustomers();
  updateDashboard();

}


// ============================================
// MOBILE SIDEBAR
// ============================================

function toggleSidebar() {

  const sidebar = document.querySelector(".sidebar");

  sidebar.classList.toggle("open");

}


// ============================================
// MODALS
// ============================================

function openModal(id) {

  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.add("show");
  }

}


function closeModal(id) {

  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");
  }

}


// Close modal when clicking outside

document.addEventListener("click", function(event) {

  if (event.target.classList.contains("modal")) {

    event.target.classList.remove("show");

  }

});


// ============================================
// ADD CUSTOMER
// ============================================

function addCustomer(event) {

  event.preventDefault();

  const customer = {

    id: Date.now(),

    name: document.getElementById("customerName").value.trim(),

    phone: document.getElementById("customerPhone").value.trim(),

    email: document.getElementById("customerEmail").value.trim(),

    address: document.getElementById("customerAddress").value.trim(),

    city: document.getElementById("customerCity").value.trim(),

    postcode: document.getElementById("customerPostcode").value.trim(),

    notes: document.getElementById("customerNotes").value.trim(),

    createdAt: new Date().toISOString()

  };


  customers.push(customer);


  localStorage.setItem(
    "jobpilot_customers",
    JSON.stringify(customers)
  );


  document.querySelector("#customerModal form").reset();


  closeModal("customerModal");


  renderCustomers();

  updateDashboard();


  alert("Customer added successfully.");

}


// ============================================
// RENDER CUSTOMERS
// ============================================

function renderCustomers() {

  const table = document.getElementById("customersTable");

  const empty = document.getElementById("customersEmpty");

  if (!table || !empty) {
    return;
  }


  const searchInput =
    document.getElementById("customerSearch");

  const search =
    searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";


  const filteredCustomers = customers.filter(function(customer) {

    return (

      customer.name.toLowerCase().includes(search) ||

      (customer.phone || "")
        .toLowerCase()
        .includes(search) ||

      (customer.email || "")
        .toLowerCase()
        .includes(search) ||

      (customer.city || "")
        .toLowerCase()
        .includes(search) ||

      (customer.postcode || "")
        .toLowerCase()
        .includes(search)

    );

  });


  if (customers.length === 0) {

    table.innerHTML = "";

    empty.style.display = "block";

    return;

  }


  empty.style.display = "none";


  table.innerHTML = "";


  filteredCustomers.forEach(function(customer) {

    const row = document.createElement("tr");


    row.innerHTML = `

      <td>
        <strong>${escapeHtml(customer.name)}</strong>
      </td>

      <td>
        ${escapeHtml(customer.phone || "—")}
      </td>

      <td>
        ${escapeHtml(customer.email || "—")}
      </td>

      <td>
        ${escapeHtml(
          customer.city ||
          customer.postcode ||
          "—"
        )}
      </td>

    `;


    table.appendChild(row);

  });


  if (filteredCustomers.length === 0) {

    table.innerHTML = `

      <tr>

        <td colspan="4"
            style="text-align:center;padding:30px;color:#697386;">

          No customers match your search.

        </td>

      </tr>

    `;

  }

}


// ============================================
// DASHBOARD
// ============================================

function updateDashboard() {

  const todayJobs =
    document.getElementById("todayJobs");

  if (todayJobs) {

    todayJobs.textContent = jobs.length;

  }


  const dashboardJobs =
    document.getElementById("dashboardJobs");


  if (dashboardJobs && jobs.length > 0) {

    dashboardJobs.innerHTML = jobs
      .slice(0, 5)
      .map(function(job) {

        return `

          <div style="
            text-align:left;
            padding:14px;
            border:1px solid #e5e9f0;
            border-radius:8px;
            margin-bottom:8px;
          ">

            <strong>
              ${escapeHtml(job.title)}
            </strong>

            <div style="
              color:#697386;
              font-size:13px;
              margin-top:4px;
            ">

              ${escapeHtml(job.customer || "")}

            </div>

          </div>

        `;

      })
      .join("");

  }


  const outstandingQuotes =
    document.getElementById("outstandingQuotes");

  const unpaidInvoices =
    document.getElementById("unpaidInvoices");

  const monthlyRevenue =
    document.getElementById("monthlyRevenue");


  if (outstandingQuotes) {
    outstandingQuotes.textContent = "£0";
  }

  if (unpaidInvoices) {
    unpaidInvoices.textContent = "£0";
  }

  if (monthlyRevenue) {
    monthlyRevenue.textContent = "£0";
  }

}


// ============================================
// HTML SAFETY
// ============================================

function escapeHtml(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


// ============================================
// STARTUP
// ============================================

document.addEventListener("DOMContentLoaded", function() {

  renderCustomers();

  updateDashboard();

});
