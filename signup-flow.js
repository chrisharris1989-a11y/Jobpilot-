import { supabase } from "./supabase.js";

/* JobPilot signup flow
   Single source of truth: credentials -> country -> plan -> company -> Stripe.
   Country must be explicitly selected before plans are shown. */

const COUNTRIES = [
  ["GB", "United Kingdom", "£", "GBP"],
  ["US", "United States", "$", "USD"],
  ["AU", "Australia", "A$", "AUD"],
  ["NZ", "New Zealand", "NZ$", "NZD"],
  ["IE", "Ireland", "€", "EUR"],
  ["CA", "Canada", "C$", "CAD"]
];

const PRICES = {
  GB: { core: "£0", solo: "£7.49", team: "£24.99", business: "£59.99", pro: "£99.99" },
  US: { core: "$0", solo: "$29.99", team: "$139.99", business: "$209.99", pro: "$279.99" },
  AU: { core: "A$0", solo: "A$39.99", team: "A$79.99", business: "A$149.99", pro: "A$249.99" },
  NZ: { core: "NZ$0", solo: "NZ$44.99", team: "NZ$89.99", business: "NZ$169.99", pro: "NZ$279.99" },
  IE: { core: "€0", solo: "€14.99", team: "€34.99", business: "€74.99", pro: "€119.99" },
  CA: { core: "C$0", solo: "C$39.99", team: "C$79.99", business: "C$149.99", pro: "C$249.99" }
};

const PLANS = [
  ["core", "Core", 1],
  ["solo", "Solo", 1],
  ["team", "Team", 5],
  ["business", "Business", 10],
  ["pro", "Pro", 15]
];

let credentials = { email: "", password: "" };
let selectedCountry = null;
let selectedPlan = "core";
let companyName = "";
let running = false;

function root() { return document.getElementById("app"); }

function css() {
  if (document.getElementById("jp-signup-rebuild-css")) return;
  const s = document.createElement("style");
  s.id = "jp-signup-rebuild-css";
  s.textContent = `
    .jp-sr{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px;background:#f7f8fa}
    .jp-sc{width:min(720px,100%);background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:32px;box-shadow:0 14px 40px rgba(16,24,40,.08)}
    .jp-sl{display:flex;align-items:center;gap:10px;margin-bottom:24px}.jp-sm{width:40px;height:40px;border-radius:10px;background:#1677e8;color:#fff;display:grid;place-items:center;font-weight:800}.jp-sl b{display:block}.jp-sl small{color:#667085}
    .jp-progress{display:flex;gap:7px;margin:0 0 25px}.jp-progress i{height:5px;flex:1;border-radius:9px;background:#e4e7ec}.jp-progress i.on{background:#1677e8}
    .jp-sc h1{font-size:28px;margin:0 0 8px}.jp-sub{color:#667085;margin:0 0 24px}.jp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.jp-choice{border:1px solid #d0d5dd;background:#fff;border-radius:12px;padding:16px;text-align:left;cursor:pointer}.jp-choice.sel{border:2px solid #1677e8;padding:15px;background:#f5faff}.jp-choice b{display:block}.jp-choice small{color:#667085}.jp-price{font-size:21px;font-weight:800;margin-top:8px}.jp-actions{display:flex;gap:10px;margin-top:24px}.jp-btn{border:0;border-radius:9px;padding:12px 18px;font-weight:700;cursor:pointer}.jp-main{background:#1677e8;color:#fff}.jp-back{background:#eef2f6;color:#172033}.jp-msg{margin-top:12px;font-size:14px}.jp-err{color:#b42318}.jp-ok{color:#067647}.jp-input{width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:10px;padding:13px 14px;font-size:16px;margin-top:8px}.jp-label{display:block;font-weight:700;margin-top:4px}@media(max-width:600px){.jp-sc{padding:22px}.jp-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function shell(step,title,subtitle,body) {
  root().innerHTML = `<div class="jp-sr"><div class="jp-sc">
    <div class="jp-sl"><div class="jp-sm">J</div><div><b>JobPilot</b><small>Trades CRM</small></div></div>
    <div class="jp-progress"><i class="on"></i><i class="${step>=2?"on":""}"></i><i class="${step>=3?"on":""}"></i><i class="${step>=4?"on":""}"></i></div>
    <h1>${title}</h1><p class="jp-sub">${subtitle}</p>${body}
  </div></div>`;
}

function startSignup() {
  if (running) return;
  css();
  const email = document.getElementById("email")?.value.trim() || "";
  const password = document.getElementById("password")?.value || "";

  if (!email || password.length < 6) {
    const m = document.getElementById("authMessage");
    if (m) {
      m.textContent = "Enter an email and a password of at least 6 characters.";
      m.style.color = "#b42318";
    }
    return;
  }

  credentials = { email, password };
  selectedCountry = null;
  selectedPlan = "core";
  companyName = "";
  showCountry();
}

function showCountry() {
  shell(1, "Choose your country", "Select your country before choosing a plan. This determines the currency and pricing you will see.", `
    <div class="jp-grid">
      ${COUNTRIES.map(c => `<button type="button" class="jp-choice" data-country="${c[0]}"><b>${c[1]}</b><small>${c[3]}</small></button>`).join("")}
    </div>
    <div class="jp-actions">
      <button type="button" class="jp-btn jp-back" id="jp-signup-cancel">Back</button>
    </div>`);

  document.querySelectorAll("[data-country]").forEach(button => {
    button.onclick = () => {
      selectedCountry = button.dataset.country;
      selectedPlan = "core";
      showPlans();
    };
  });
  document.getElementById("jp-signup-cancel").onclick = () => location.reload();
}

function showPlans() {
  if (!selectedCountry || !PRICES[selectedCountry]) {
    showCountry();
    return;
  }
  const country = COUNTRIES.find(c => c[0] === selectedCountry);
  shell(2, "Choose your plan", `Plans and pricing for ${country[1]}.`, `
    <div class="jp-grid">
      ${PLANS.map(plan => `<button type="button" class="jp-choice ${plan[0]===selectedPlan?"sel":""}" data-plan="${plan[0]}"><b>${plan[1]}</b><small>${plan[2]} user${plan[2]===1?"":"s"}</small><div class="jp-price">${PRICES[selectedCountry][plan[0]]} <small>/ month</small></div></button>`).join("")}
    </div>
    <div class="jp-actions">
      <button type="button" class="jp-btn jp-main" id="jp-plan-continue">Continue</button>
      <button type="button" class="jp-btn jp-back" id="jp-plan-back">Back</button>
    </div>
    <div id="jp-msg" class="jp-msg"></div>`);

  document.querySelectorAll("[data-plan]").forEach(button => {
    button.onclick = () => {
      selectedPlan = button.dataset.plan;
      document.querySelectorAll("[data-plan]").forEach(b => b.classList.remove("sel"));
      button.classList.add("sel");
    };
  });
  document.getElementById("jp-plan-back").onclick = showCountry;
  document.getElementById("jp-plan-continue").onclick = showCompany;
}

function showCompany() {
  if (!selectedCountry || !PRICES[selectedCountry]) {
    showCountry();
    return;
  }
  const country = COUNTRIES.find(c => c[0] === selectedCountry);
  shell(3, "Enter your company name", `This is the business name that will be used to identify your JobPilot account in Stripe.`, `
    <label class="jp-label" for="jp-company-name">Company name</label>
    <input id="jp-company-name" class="jp-input" type="text" maxlength="120" autocomplete="organization" placeholder="Your company name" value="${companyName.replace(/"/g, "&quot;")}">
    <div class="jp-actions">
      <button type="button" class="jp-btn jp-main" id="jp-company-continue">Continue to Stripe</button>
      <button type="button" class="jp-btn jp-back" id="jp-company-back">Back</button>
    </div>
    <div id="jp-msg" class="jp-msg"></div>`);

  document.getElementById("jp-company-back").onclick = showPlans;
  document.getElementById("jp-company-continue").onclick = () => {
    const value = document.getElementById("jp-company-name")?.value.trim() || "";
    if (!value) {
      const msg = document.getElementById("jp-msg");
      msg.className = "jp-msg jp-err";
      msg.textContent = "Enter your company name to continue.";
      return;
    }
    companyName = value;
    createAccount();
  };
}

async function createAccount() {
  if (running || !selectedCountry || !PRICES[selectedCountry] || !companyName) return;
  running = true;
  const msg = document.getElementById("jp-msg");
  const btn = document.getElementById("jp-company-continue");
  if (btn) btn.disabled = true;
  if (msg) {
    msg.className = "jp-msg jp-ok";
    msg.textContent = "Creating your account...";
  }

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: { data: { country_code: selectedCountry, selected_country: selectedCountry, selected_plan: selectedPlan, company_name: companyName } }
  });

  if (error) {
    running = false;
    if (btn) btn.disabled = false;
    if (msg) { msg.className = "jp-msg jp-err"; msg.textContent = error.message; }
    return;
  }

  if (!data.session) {
    running = false;
    if (btn) btn.disabled = false;
    if (msg) { msg.className = "jp-msg jp-err"; msg.textContent = "Please confirm your email before continuing."; }
    return;
  }

  const company = await supabase.rpc("create_my_company", { requested_name: companyName, requested_plan: selectedPlan });
  if (company.error) {
    running = false;
    if (btn) btn.disabled = false;
    if (msg) { msg.className = "jp-msg jp-err"; msg.textContent = company.error.message; }
    return;
  }

  const maxUsers = { core:1, solo:1, team:5, business:10, pro:15 }[selectedPlan];
  await supabase.from("companies").update({ country_code:selectedCountry, max_users:maxUsers }).eq("id",company.data);

  if (selectedPlan === "core") {
    if (msg) msg.textContent = "Account created. Loading JobPilot...";
    setTimeout(() => location.reload(), 500);
    return;
  }

  if (msg) msg.textContent = "Opening secure Stripe checkout...";
  try {
    const response = await fetch("https://qxoynttvipducubmczwl.supabase.co/functions/v1/stripe-billing-v2", {
      method: "POST",
      headers: { Authorization:`Bearer ${data.session.access_token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ action:"checkout", plan:selectedPlan, country:selectedCountry, company_name:companyName, origin:location.origin })
    });
    const out = await response.json();
    if (!response.ok || !out.url) throw new Error(out.error || "Could not open Stripe checkout.");
    location.assign(out.url);
  } catch (e) {
    running = false;
    if (btn) btn.disabled = false;
    if (msg) { msg.className = "jp-msg jp-err"; msg.textContent = e.message || "Could not open Stripe checkout."; }
  }
}

export { startSignup };
css();
