import { supabase } from "./supabase.js";

const CREATE_RECURRING_URL =
  "https://qxoynttvipducubmczwl.supabase.co/functions/v1/gocardless-create-recurring";

function addButtons() {
  document.querySelectorAll(".customer-row[data-customer-id]").forEach(row => {
    if (row.querySelector("[data-gocardless-recurring]")) return;

    const customerId = row.dataset.customerId;
    const action = document.createElement("button");
    action.type = "button";
    action.className = "button secondary";
    action.dataset.gocardlessRecurring = "true";
    action.textContent = "🏦 Monthly Direct Debit";
    action.style.marginLeft = "10px";
    action.addEventListener("click", event => {
      event.stopPropagation();
      openRecurringModal(customerId);
    });

    const view = row.querySelector("span:last-child");
    if (view) {
      view.replaceWith(action);
    } else {
      row.appendChild(action);
    }
  });
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

function watchCustomerList() {
  addButtons();
  const observer = new MutationObserver(addButtons);
  observer.observe(document.body, { childList: true, subtree: true });
}

watchCustomerList();
