import { supabase } from "./supabase.js";

const CREATE_RECURRING_URL =
  "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-create-recurring";

async function getProfileCustomer() {
  const profile = document.getElementById("editCustomer");
  if (!profile) return null;

  const detailList = document.querySelector(".detail-list");
  const values = {};
  if (detailList) {
    detailList.querySelectorAll(":scope > div").forEach(item => {
      const label = item.querySelector("span")?.textContent?.trim().toLowerCase();
      const value = item.querySelector("strong")?.textContent?.trim();
      if (label && value) values[label] = value;
    });
  }

  const name = values.name || document.getElementById("pageTitle")?.textContent?.trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("id,name,email,address_line1,address_line2,city,postcode")
    .eq("name", name)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to find profile customer", error);
    return null;
  }
  return data;
}

async function getDirectDebitStatus(customerId) {
  const { data: customerLink } = await supabase
    .from("gocardless_customers")
    .select("gocardless_customer_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!customerLink?.gocardless_customer_id) return "none";

  const { data: mandate } = await supabase
    .from("gocardless_mandates")
    .select("id,status,cancelled_at,updated_at")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("gocardless_subscriptions")
    .select("status,cancelled_at,updated_at")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subscriptionStatus = String(subscription?.status || "").toLowerCase();
  const mandateStatus = String(mandate?.status || "").toLowerCase();

  if (["cancelled", "canceled", "finished", "failed", "expired"].includes(subscriptionStatus) ||
      ["cancelled", "canceled", "failed", "expired"].includes(mandateStatus)) {
    return "cancelled";
  }

  if (["active", "created", "pending_customer_approval", "pending_submission"].includes(subscriptionStatus)) {
    return subscriptionStatus === "active" ? "active" : "pending";
  }

  if (mandateStatus && mandateStatus !== "active") return "pending";
  if (mandateStatus === "active") return "active";

  return "none";
}

function buildDirectDebitButton(customer, status) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-secondary gocardless-recurring-btn";

  if (status === "active") {
    button.textContent = "✓ Direct Debit Active";
    button.disabled = true;
    button.title = "This customer has an active Direct Debit subscription";
  } else if (status === "cancelled") {
    button.textContent = "✕ Direct Debit Cancelled";
    button.disabled = true;
    button.title = "This customer's Direct Debit has been cancelled";
  } else if (status === "pending") {
    button.textContent = "Direct Debit Setup Pending";
    button.disabled = true;
    button.title = "Direct Debit setup is still pending";
  } else {
    button.textContent = "Monthly Direct Debit";
    button.addEventListener("click", () => openRecurringSetup(customer));
  }

  return button;
}

async function openRecurringSetup(customer) {
  const monthly = window.prompt("Monthly amount (£)", "10");
  if (monthly === null) return;
  const amount = Math.round(Number(monthly) * 100);
  if (!Number.isInteger(amount) || amount < 1) {
    alert("Please enter a valid monthly amount.");
    return;
  }

  const day = window.prompt("Payment day (1-28)", "1");
  if (day === null) return;
  const dayOfMonth = Number(day);
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
    alert("Payment day must be between 1 and 28.");
    return;
  }

  const description = window.prompt("Description", "Monthly Direct Debit");
  if (description === null) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    alert("Please sign in again before setting up Direct Debit.");
    return;
  }

  try {
    const response = await fetch(CREATE_RECURRING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: customer.id,
        amount,
        day_of_month: dayOfMonth,
        description: description.slice(0, 255),
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.authorisation_url) {
      throw new Error(result.error || "Unable to start Direct Debit setup");
    }

    window.location.href = result.authorisation_url;
  } catch (error) {
    console.error(error);
    alert(`Could not start the Direct Debit Setup: ${error.message}`);
  }
}

async function addProfileDirectDebitAction() {
  const customer = await getProfileCustomer();
  if (!customer) return;

  const status = await getDirectDebitStatus(customer.id);
  const button = buildDirectDebitButton(customer, status);

  const editButton = document.getElementById("editCustomer");
  if (!editButton) return;

  const existing = document.querySelector(".gocardless-recurring-btn");
  if (existing) existing.remove();

  editButton.parentElement?.appendChild(button);
}

function removeListDirectDebitButtons() {
  document.querySelectorAll(".customer-row .gocardless-recurring-btn").forEach(button => button.remove());
}

function refreshDirectDebitUI() {
  removeListDirectDebitButtons();
  addProfileDirectDebitAction().catch(error => console.error("Direct Debit UI error", error));
}

const observer = new MutationObserver(() => {
  clearTimeout(window.__jobpilotGcRefresh);
  window.__jobpilotGcRefresh = setTimeout(refreshDirectDebitUI, 100);
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener("load", refreshDirectDebitUI);
setTimeout(refreshDirectDebitUI, 250);
