import { supabase } from "./supabase.js";
import { showFeedbackForm } from "./feedback.js";
import { showFeedbackAdmin } from "./feedback-admin.js";
import { getJobPilotAddressContext, normalizeJobPilotPostalCode } from "./regional-address.js";

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
  if (typeof window.JobPilotStartSignup === "function") {
    window.JobPilotStartSignup();
    return;
  }

  showAuthMessage("Loading account setup...");
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

