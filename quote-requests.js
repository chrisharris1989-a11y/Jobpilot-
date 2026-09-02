import { supabase } from "./supabase.js";

async function getActiveMembership() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_members")
    .select("company_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("JobPilot quote request membership:", error);
    return null;
  }

  return data || null;
}

function showQuoteRequestForm() {
  const existing = document.getElementById("jobpilot-quote-request-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "jobpilot-quote-request-modal";
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Request a Quote</h2>
          <p>Send the job details to management.</p>
        </div>
        <button class="close" type="button">×</button>
      </div>

      <form id="jobpilotQuoteRequestForm">
        <label>Customer name *</label>
        <input id="qrCustomerName" required placeholder="Customer name">

        <label>Phone</label>
        <input id="qrPhone" type="tel" placeholder="Phone number">

        <label>Email</label>
        <input id="qrEmail" type="email" placeholder="customer@example.com">

        <label>Job address</label>
        <input id="qrAddress" placeholder="Address / postcode">

        <label>Job description *</label>
        <textarea id="qrDescription" required rows="5" placeholder="Describe the work the customer wants quoting for..."></textarea>

        <label>Preferred date</label>
        <input id="qrPreferredDate" type="date">

        <div id="qrMessage" class="muted" style="margin-top:12px"></div>

        <div class="modal-actions">
          <button type="button" class="button secondary close">Cancel</button>
          <button type="submit" class="button primary">Send to Management</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".close").forEach(button => {
    button.addEventListener("click", () => modal.remove());
  });

  modal.querySelector("#jobpilotQuoteRequestForm").addEventListener("submit", async event => {
    event.preventDefault();

    const message = modal.querySelector("#qrMessage");
    const submit = modal.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "Sending...";
    message.textContent = "";

    const { data: { user } = {} } = await supabase.auth.getUser();
    const membership = await getActiveMembership();

    if (!user || !membership?.company_id) {
      message.textContent = "We could not find your company. Please sign out and back in.";
      submit.disabled = false;
      submit.textContent = "Send to Management";
      return;
    }

    const payload = {
      company_id: membership.company_id,
      requested_by: user.id,
      customer_name: modal.querySelector("#qrCustomerName").value.trim(),
      phone: modal.querySelector("#qrPhone").value.trim() || null,
      email: modal.querySelector("#qrEmail").value.trim() || null,
      address: modal.querySelector("#qrAddress").value.trim() || null,
      description: modal.querySelector("#qrDescription").value.trim(),
      preferred_date: modal.querySelector("#qrPreferredDate").value || null
    };

    const { error } = await supabase.from("quote_requests").insert(payload);

    if (error) {
      console.error("JobPilot quote request:", error);
      message.textContent = error.message;
      submit.disabled = false;
      submit.textContent = "Send to Management";
      return;
    }

    modal.remove();
    alert("Quote request sent to management.");
  });
}

window.showQuoteRequestForm = showQuoteRequestForm;
