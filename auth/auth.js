// =====================================================
// JOBPILOT AUTHENTICATION
// =====================================================
// Section 2 extracted from the original app.js.
// Handles the login/signup interface and Supabase Auth
// operations. Application state remains owned by the core.
// =====================================================

import { supabase } from "../supabase.js";

const app = document.getElementById("app");


// =====================================================
// LOGIN SCREEN
// =====================================================

export function showLogin() {
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
          <input id="email" type="email" required placeholder="you@example.com">

          <label>Password</label>
          <input id="password" type="password" required minlength="6" placeholder="••••••••">

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


// =====================================================
// LOGIN
// =====================================================

export async function login(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  showAuthMessage("Signing in...");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showAuthMessage(error.message, true);
  }
}


// =====================================================
// SIGN UP
// =====================================================

export async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || password.length < 6) {
    showAuthMessage(
      "Enter an email and a password of at least 6 characters.",
      true
    );
    return;
  }

  showAuthMessage("Creating account...");

  const { error } = await supabase.auth.signUp({
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


// =====================================================
// LOGOUT
// =====================================================

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    alert("Could not sign out:\n\n" + error.message);
  }
}


// =====================================================
// AUTH MESSAGE
// =====================================================

export function showAuthMessage(message, error = false) {
  const element = document.getElementById("authMessage");

  if (!element) return;

  element.textContent = message;
  element.style.color = error ? "#dc2626" : "#2563eb";
}
