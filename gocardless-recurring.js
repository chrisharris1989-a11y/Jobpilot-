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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("customers")
    .select("id,name,email")
    .eq("user_id", user.id)
    .eq("name", name)
    .limit(10);

  const { data: matches, error } = await query;
  if (error || !matches?.length) return null;

  if (values.email && values.email !== "—") {
    const emailMatch = matches.find(customer =>
      String(customer.email || "").toLowerCase() === values.email.toLowerCase()
    );
    if (emailMatch) return emailMatch;
  }

  return matches[0];
}

async function getDirectDebitStatus(customerId) {
  const { data: subscriptions } = await supabase
    .from("gocardless_subscriptions")
    .select("id,status,amount,currency,interval,interval_unit,day_of_month,start_date")
    .eq("customer_id", customerId)
    .in("status", ["active", "pending_submission", "pending_customer_approval"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (subscriptions?.length) {
    const sub = subscriptions[0];
    if (sub.status === "active") return { state: "active", subscription: sub };
    return { state: "pending", subscription: sub };
  }

  const { data: mandates } = await supabase
    .from("gocardless_mandates")
    .select("id,status")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (mandates?.length && !["cancelled", "failed", "expired"].includes(String(mandates[0].status))) {
    return { state: "pending", mandate: mandates[0] };
  }

  return { state: "none" };
}

function createDirectDebitButton(customerId, state) {
  const action = document.createElement("button");
  action.type = "button";
  action.className = "button secondary";
  action.dataset.gocardlessRecurring = "true";
  action.style.marginLeft = "10px";

  if (state === "active") {
    action.textContent = "✓ Direct Debit Active";
    action.disabled = true;
    action.title = "This customer has an active recurring Direct Debit.";
  } else if (state === "pending") {
    action.textContent = "⏳ Direct Debit Setup Pending";
    action.disabled = true;
    action.title = "The Direct Debit setup is still being processed.";
  } else {
    action.textContent = "🏦 Monthly Direct Debit";
    action.addEventListener("click", () => openRecurringModal(customerId));
  }

  return action;
}

async function addProfileButton() {
  if (document.querySelector("[data-gocardless-profile-action]")) return true;

  const editButton = document.getElementById("editCustomer");
  const deleteButton = document.getElementById("deleteCustomer");
  if (!editButton || !deleteButton) return false;

  const customer = await getProfileCustomer();
  if (!customer) return false;

  const status = await getDirectDebitStatus(customer.id);
  const action = createDirectDebitButton(customer.id, status.state);
  action.dataset.gocardlessProfileAction = "true";

  editButton.parentElement?.insertBefore(action, editButton);
  return true;
}

async function openRecurringModal(customerId) {
  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Set up Monthly Direct Debit</h2>
          <p>The customer will authorise the Direct Debit securely through GoCardless.</p>
        </div>
        <button class="close" type="button">×</button>
      </div>

      <form id="gocardlessRecurringForm">
        <label>Monthly Amount (£)</label>
        <input id="gcRecurringAmount" type="number" min="0.01" step="0.01" required placeholder="50.00">

        <label>Payment Day</label>
        <select id="gcRecurringDay">
          ${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}">${i + 1}${[1,21].includes(i+1) ? "st" : [2,22].includes(i+1) ? "nd" : [3,23].includes(i+1) ? "rd" : "th"} of each month</option>`).join("")}
        </select>

        <label>Description</label>
        <input id="gcRecurringDescription" maxlength="255" value="Monthly Direct Debit" required>

        <p class="muted" style="margin-top:12px;">
          GoCardless will handle the bank authorisation and Direct Debit mandate. JobPilot does not collect or store bank details.
        </p>

        <div class="modal-actions">
          <button type="button" class="button secondary close">Cancel</button>
          <button type="submit" class="button primary">Continue to GoCardless</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelectorAll(".close").forEach(button =>
    button.addEventListener("click", () => modal.remove())
  );

  modal.querySelector("#gocardlessRecurringForm").addEventListener("submit", async event => {
    event.preventDefault();

    const submit = modal.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Preparing GoCardless...";

    try {
      const amount = Math.round(Number(modal.querySelector("#gcRecurringAmount").value) * 100);
      const dayOfMonth = Number(modal.querySelector("#gcRecurringDay").value);
      const description = modal.querySelector("#gcRecurringDescription").value.trim();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You are not logged in.");

      const response = await fetch(CREATE_RECURRING_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: session.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_id: customerId,
          amount,
          day_of_month: dayOfMonth,
          description
        })
      });

      const result = await response.json();
      if (!response.ok || !result.authorisation_url) {
        throw new Error(result.error || "Could not start GoCardless Direct Debit setup.");
      }

      window.location.href = result.authorisation_url;
    } catch (error) {
      console.error("GoCardless recurring setup:", error);
      alert("Could not start the Direct Debit setup:\n\n" + (error?.message || error));
      submit.disabled = false;
      submit.textContent = "Continue to GoCardless";
    }
  });
}

function watchCustomerProfiles() {
  const observer = new MutationObserver(() => {
    addProfileButton().catch(error => console.error("GoCardless profile UI:", error));
  });

  observer.observe(document.body, { childList: true, subtree: true });
  addProfileButton().catch(error => console.error("GoCardless profile UI:", error));
}

watchCustomerProfiles();
