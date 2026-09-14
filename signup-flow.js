import { supabase } from "./supabase.js";

const COUNTRIES = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", available: true },
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", available: true },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", available: false },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", currency: "NZD", available: false },
  { code: "IE", name: "Ireland", flag: "🇮🇪", currency: "EUR", available: false },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD", available: false }
];

const PLANS = {
  core: { label: "Core", users: 1, prices: { GB: "£0", US: "$0" }, free: true },
  solo: { label: "Solo", users: 1, prices: { GB: "£7.49", US: "$29.99" } },
  team: { label: "Team", users: 5, prices: { GB: "£24.99", US: "$139.99" } },
  business: { label: "Business", users: 10, prices: { GB: "£59.99", US: "$209.99" } },
  pro: { label: "Pro", users: 15, prices: { GB: "£99.99", US: "$279.99" } }
};

const STORAGE_COUNTRY = "jobpilot_selected_country";
const STORAGE_PLAN = "jobpilot_selected_plan";
const STORAGE_PENDING = "jobpilot_pending_signup";

function countryByCode(code) {
  return COUNTRIES.find(country => country.code === code) || COUNTRIES[0];
}

function injectStyles() {
  if (document.getElementById("jobpilot-signup-flow-styles")) return;
  const style = document.createElement("style");
  style.id = "jobpilot-signup-flow-styles";
  style.textContent = `
    .jp-signup-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 18px;background:#f7f8fa}
    .jp-signup-card{width:min(760px,100%);background:#fff;border:1px solid #e7ebf0;border-radius:18px;padding:32px;box-shadow:0 12px 35px rgba(23,32,51,.08)}
    .jp-signup-logo{display:flex;align-items:center;gap:10px;margin-bottom:24px}.jp-signup-logo-mark{width:40px;height:40px;border-radius:10px;background:#1677e8;color:#fff;display:grid;place-items:center;font-weight:900;font-size:20px}.jp-signup-logo strong{display:block;font-size:18px}.jp-signup-logo span{display:block;font-size:12px;color:#667085}
    .jp-signup-card h1{margin:0 0 8px;font-size:30px;letter-spacing:-1px}.jp-signup-card .jp-sub{margin:0 0 25px;color:#667085}
    .jp-step{display:flex;gap:8px;margin-bottom:25px}.jp-step span{height:6px;flex:1;border-radius:99px;background:#e7ebf0}.jp-step span.active{background:#1677e8}
    .jp-country-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.jp-country,.jp-plan{width:100%;text-align:left;border:1px solid #e2e8f0;background:#fff;border-radius:12px;padding:15px;cursor:pointer}.jp-country:hover,.jp-plan:hover{border-color:#1677e8}.jp-country.selected,.jp-plan.selected{border:2px solid #1677e8;padding:14px;background:#f7fbff}.jp-country strong,.jp-plan strong{display:block;font-size:15px}.jp-country small,.jp-plan small{display:block;color:#667085;margin-top:3px}
    .jp-plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.jp-plan-price{font-size:22px;font-weight:900;margin-top:8px}.jp-plan-price small{display:inline;font-size:12px;font-weight:500}.jp-unavailable{opacity:.65}.jp-notice{margin:15px 0;padding:12px 14px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;color:#475467;font-size:13px}.jp-actions{display:flex;gap:10px;margin-top:24px}.jp-actions button{border:0;border-radius:9px;padding:12px 17px;font-weight:800;cursor:pointer}.jp-primary{background:#1677e8;color:#fff}.jp-secondary{background:#eef2f6;color:#172033}.jp-form{display:grid;gap:12px}.jp-form label{font-size:13px;font-weight:700}.jp-form input{width:100%;padding:12px;border:1px solid #d7dde5;border-radius:9px;font:inherit}.jp-error{color:#b91c1c;font-size:13px;margin-top:10px}.jp-success{color:#166534;font-size:13px;margin-top:10px}
    @media(max-width:600px){.jp-signup-card{padding:22px}.jp-country-grid,.jp-plan-grid{grid-template-columns:1fr}.jp-signup-card h1{font-size:26px}}
  `;
  document.head.appendChild(style);
}

function render(html) {
  injectStyles();
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="jp-signup-wrap"><div class="jp-signup-card">${html}</div></div>`;
}

function header(step, title, subtitle) {
  return `
    <div class="jp-signup-logo"><div class="jp-signup-logo-mark">J</div><div><strong>JobPilot</strong><span>Trades CRM</span></div></div>
    <div class="jp-step"><span class="${step >= 1 ? "active" : ""}"></span><span class="${step >= 2 ? "active" : ""}"></span><span class="${step >= 3 ? "active" : ""}"></span></div>
    <h1>${title}</h1><p class="jp-sub">${subtitle}</p>
  `;
}

function selectedCountry() {
  return countryByCode(String(localStorage.getItem(STORAGE_COUNTRY) || "").toUpperCase());
}

function selectedPlan() {
  return String(localStorage.getItem(STORAGE_PLAN) || "core").toLowerCase();
}

function showCountryStep() {
  render(`
    ${header(1, "Where is your business based?", "Choose your country first. Your plan and pricing will then be shown for your market.")}
    <div class="jp-country-grid">
      ${COUNTRIES.map(country => `
        <button type="button" class="jp-country ${selectedCountry().code === country.code ? "selected" : ""}" data-country="${country.code}">
          <strong>${country.flag} ${country.name}</strong>
          <small>${country.currency}</small>
        </button>`).join("")}
    </div>
    <div class="jp-actions"><button type="button" class="jp-primary" id="jp-country-next">Continue</button><button type="button" class="jp-secondary" id="jp-country-login">Back to sign in</button></div>
  `);

  document.querySelectorAll("[data-country]").forEach(button => button.addEventListener("click", () => {
    localStorage.setItem(STORAGE_COUNTRY, button.dataset.country);
    document.querySelectorAll("[data-country]").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
  }));
  document.getElementById("jp-country-next")?.addEventListener("click", showPlanStep);
  document.getElementById("jp-country-login")?.addEventListener("click", () => location.reload());
}

function showPlanStep() {
  const country = selectedCountry();
  localStorage.setItem(STORAGE_COUNTRY, country.code);
  const hasRegionalPricing = country.available;
  render(`
    ${header(2, "Choose your plan", `Plans for ${country.name}.`)}
    <div class="jp-plan-grid">
      ${Object.entries(PLANS).map(([key, plan]) => {
        const price = plan.prices[country.code];
        const available = Boolean(price);
        return `<button type="button" class="jp-plan ${selectedPlan() === key ? "selected" : ""} ${!available ? "jp-unavailable" : ""}" data-plan="${key}" ${!available ? "disabled" : ""}>
          <strong>${plan.label}</strong><small>${plan.users} user${plan.users === 1 ? "" : "s"}</small>
          <div class="jp-plan-price">${price || "Pricing coming soon"}${price ? " <small>/ month</small>" : ""}</div>
        </button>`;
      }).join("")}
    </div>
    ${hasRegionalPricing ? "" : `<div class="jp-notice">Core is available now in ${country.name}. Local pricing for paid plans is being prepared. You can create your free Core account now.</div>`}
    <div class="jp-actions"><button type="button" class="jp-primary" id="jp-plan-next">Continue</button><button type="button" class="jp-secondary" id="jp-plan-back">Back</button></div>
  `);

  if (!PLANS[selectedPlan()]?.prices[country.code]) localStorage.setItem(STORAGE_PLAN, "core");
  document.querySelectorAll("[data-plan]:not([disabled])").forEach(button => button.addEventListener("click", () => {
    localStorage.setItem(STORAGE_PLAN, button.dataset.plan);
    document.querySelectorAll("[data-plan]").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
  }));
  document.getElementById("jp-plan-next")?.addEventListener("click", showAccountStep);
  document.getElementById("jp-plan-back")?.addEventListener("click", showCountryStep);
}

function showAccountStep() {
  const country = selectedCountry();
  const plan = selectedPlan();
  const planInfo = PLANS[plan] || PLANS.core;
  render(`
    ${header(3, "Create your JobPilot account", `${planInfo.label} for ${country.name}.`)}
    <form id="jp-signup-form" class="jp-form">
      <label for="jp-email">Email</label><input id="jp-email" type="email" required placeholder="you@example.com">
      <label for="jp-password">Password</label><input id="jp-password" type="password" required minlength="6" placeholder="At least 6 characters">
      <div id="jp-signup-message"></div>
      <div class="jp-actions"><button class="jp-primary" type="submit">Create account</button><button class="jp-secondary" type="button" id="jp-account-back">Back</button></div>
    </form>
  `);
  document.getElementById("jp-account-back")?.addEventListener("click", showPlanStep);
  document.getElementById("jp-signup-form")?.addEventListener("submit", createAccount);
}

async function createAccount(event) {
  event.preventDefault();
  const email = document.getElementById("jp-email")?.value.trim();
  const password = document.getElementById("jp-password")?.value || "";
  const message = document.getElementById("jp-signup-message");
  const country = selectedCountry();
  const plan = selectedPlan();
  if (!email || password.length < 6) {
    message.className = "jp-error";
    message.textContent = "Enter a valid email and a password of at least 6 characters.";
    return;
  }
  message.className = "jp-success";
  message.textContent = "Creating your account...";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        country_code: country.code,
        selected_country: country.code,
        selected_plan: plan
      }
    }
  });
  if (error) {
    message.className = "jp-error";
    message.textContent = error.message;
    return;
  }
  localStorage.setItem(STORAGE_COUNTRY, country.code);
  localStorage.setItem(STORAGE_PLAN, plan);
  localStorage.setItem(STORAGE_PENDING, JSON.stringify({ country: country.code, plan, email }));

  if (data.session && plan !== "core") {
    message.textContent = "Account created. Opening secure checkout...";
    await openCheckout(data.session, country.code, plan, message);
    return;
  }

  if (data.session && plan === "core") {
    localStorage.removeItem(STORAGE_PENDING);
    message.textContent = "Account created. Loading JobPilot...";
    setTimeout(() => location.reload(), 600);
    return;
  }

  message.textContent = "Account created. Check your email if confirmation is required, then sign in to continue.";
}

async function openCheckout(session, country, plan, message) {
  try {
    const response = await fetch("https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-billing-v1", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", plan, country, origin: window.location.origin })
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || "Could not open Stripe checkout.");
    window.location.assign(result.url);
  } catch (error) {
    message.className = "jp-error";
    message.textContent = error.message || "Could not open Stripe checkout. Your account has been created. You can sign in and manage billing later.";
  }
}

async function resumePendingCheckout(session) {
  const raw = localStorage.getItem(STORAGE_PENDING);
  if (!raw || !session) return;
  let pending;
  try { pending = JSON.parse(raw); } catch (_) { localStorage.removeItem(STORAGE_PENDING); return; }
  if (!pending?.plan || pending.plan === "core") { localStorage.removeItem(STORAGE_PENDING); return; }
  localStorage.removeItem(STORAGE_PENDING);
  await openCheckout(session, pending.country || selectedCountry().code, pending.plan, null);
}

function interceptSignupButton() {
  const capture = event => {
    if (event.target?.id !== "signupButton") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showCountryStep();
  };
  document.addEventListener("click", capture, true);
}

injectStyles();
interceptSignupButton();
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) resumePendingCheckout(session);
});
