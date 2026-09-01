import { supabase } from "../supabase.js";

const PLAN_OPTIONS = [
  { id: "solo", label: "Solo", description: "1 user" },
  { id: "team", label: "Team", description: "Up to 10 users" },
  { id: "business", label: "Business", description: "Up to 25 users" },
  { id: "pro", label: "Pro", description: "Up to 50 users" }
];

const PENDING_KEY = "jobpilot_pending_account_setup";
let setupPromise = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showAccountSetup() {
  if (setupPromise) return setupPromise;

  setupPromise = new Promise(resolve => {
    const existing = document.getElementById("jobpilot-account-setup");
    if (existing) return resolve(null);

    const root = document.createElement("div");
    root.id = "jobpilot-account-setup";
    root.innerHTML = `
      <div style="position:fixed;inset:0;z-index:100000;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit;overflow:auto;">
        <div style="width:100%;max-width:720px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:32px;box-shadow:0 20px 50px rgba(15,23,42,.14);">
          <div style="margin-bottom:24px;">
            <div style="font-size:28px;font-weight:800;color:#111827;">Set up your JobPilot account</div>
            <p style="margin:8px 0 0;color:#64748b;">Choose the account type that matches how you want to use JobPilot.</p>
          </div>

          <label style="display:block;font-weight:600;margin-bottom:8px;color:#111827;">Business name</label>
          <input id="jobpilot-signup-business" type="text" maxlength="120" placeholder="Your business name" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;margin-bottom:22px;font:inherit;">

          <div style="font-weight:600;margin-bottom:10px;color:#111827;">Account type</div>
          <div id="jobpilot-signup-plans" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
            ${PLAN_OPTIONS.map((plan, index) => `
              <button type="button" data-plan="${escapeHtml(plan.id)}" style="text-align:left;padding:16px;border:2px solid ${index === 0 ? "#2563eb" : "#e2e8f0"};border-radius:12px;background:#fff;cursor:pointer;font:inherit;">
                <div style="font-weight:700;color:#111827;">${escapeHtml(plan.label)}</div>
                <div style="font-size:13px;color:#64748b;margin-top:4px;">${escapeHtml(plan.description)}</div>
              </button>
            `).join("")}
          </div>

          <div id="jobpilot-signup-error" style="display:none;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;margin-top:18px;"></div>

          <button id="jobpilot-signup-continue" type="button" style="width:100%;margin-top:20px;padding:13px 16px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">Continue</button>
          <button id="jobpilot-signup-cancel" type="button" style="width:100%;margin-top:10px;padding:11px 16px;border:0;background:transparent;color:#64748b;font-weight:600;cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    let selectedPlan = "solo";

    root.querySelectorAll("[data-plan]").forEach(button => {
      button.addEventListener("click", () => {
        selectedPlan = button.dataset.plan;
        root.querySelectorAll("[data-plan]").forEach(option => {
          option.style.borderColor = option.dataset.plan === selectedPlan ? "#2563eb" : "#e2e8f0";
        });
      });
    });

    root.querySelector("#jobpilot-signup-cancel").addEventListener("click", () => {
      root.remove();
      setupPromise = null;
      resolve(null);
    });

    root.querySelector("#jobpilot-signup-continue").addEventListener("click", () => {
      const name = root.querySelector("#jobpilot-signup-business").value.trim();
      const errorBox = root.querySelector("#jobpilot-signup-error");

      if (!name) {
        errorBox.textContent = "Enter your business name to continue.";
        errorBox.style.display = "block";
        return;
      }

      root.remove();
      setupPromise = null;
      resolve({ name, plan: selectedPlan });
    });
  });

  return setupPromise;
}

async function createCompanyForCurrentUser(setup) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return false;

  const { error } = await supabase.rpc("create_my_company", {
    requested_plan: setup.plan,
    requested_name: setup.name
  });

  if (error) {
    console.error("JobPilot account setup:", error);
    return false;
  }

  return true;
}

async function completePendingSetup(session) {
  if (!session?.user) return;

  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return;

  let setup;
  try {
    setup = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(PENDING_KEY);
    return;
  }

  if (!setup?.name || !PLAN_OPTIONS.some(plan => plan.id === setup.plan)) {
    sessionStorage.removeItem(PENDING_KEY);
    return;
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership) {
    sessionStorage.removeItem(PENDING_KEY);
    return;
  }

  const created = await createCompanyForCurrentUser(setup);
  if (created) sessionStorage.removeItem(PENDING_KEY);
}

const originalSignUp = supabase.auth.signUp.bind(supabase.auth);
supabase.auth.signUp = async credentials => {
  const setup = await showAccountSetup();

  if (!setup) {
    return { data: { user: null, session: null }, error: new Error("Account setup cancelled") };
  }

  const result = await originalSignUp(credentials);

  if (result.error) return result;

  if (result.data?.session) {
    await createCompanyForCurrentUser(setup);
  } else {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(setup));
  }

  return result;
};

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session?.user) return;
  setTimeout(() => completePendingSetup(session), 0);
});
