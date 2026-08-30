// =====================================================
// JOBPILOT APP CORE
// =====================================================
// Section 1 extracted from the original app.js.
// This module owns application state, initialisation, the
// application shell and page switching.
//
// The remaining page/service functions are intentionally
// still in app.js at this stage and will be extracted into
// their own modules in the following sections.
// =====================================================

import { supabase } from "../supabase.js";
import { showFeedbackForm } from "../feedback.js";
import { showFeedbackAdmin } from "../feedback-admin.js";

export let currentUser = null;
export let customers = [];
export let jobs = [];
export let quotes = [];
export let invoices = [];

const app = document.getElementById("app");


// =====================================================
// INITIALISE
// =====================================================

export async function init() {
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
// LOAD APP
// =====================================================

export async function loadApp() {
  await loadCustomers();
  await loadJobs();
  await loadQuotes();
  await loadInvoices();

  renderApp();
}


// =====================================================
// MAIN APP
// =====================================================

export function renderApp() {
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

          <button class="nav-item" data-page="connections">
           🔗 Connections
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

export function showPage(page) {
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

    connections: [
      "Connections",
      "Manage your connected services."
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

  if (page === "connections") {
    renderConnectionsPage(content);
  }

  if (page === "settings") {
    renderSettings(content);
  }
}
