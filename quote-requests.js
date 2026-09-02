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

        <label>Phone number *</label>
        <input id="qrPhone" type="tel" required placeholder="Phone number">

        <label>Email</label>
        <input id="qrEmail" type="email" placeholder="customer@example.com">

        <label>Job address</label>
        <input id="qrAddress" placeholder="Address / postcode">

        <label>Job description *</label>
        <textarea id="qrDescription" required rows="5" placeholder="Describe the work the customer wants quoting for..."></textarea>

        <label>Preferred date</label>
        <input id="qrPreferredDate" type="date">

        <label>Pictures</label>
        <input id="qrPictures" type="file" accept="image/*" multiple>
        <div id="qrPictureStatus" class="muted" style="margin-top:6px">Add photos of the job to help management prepare the quote. You can add up to 10 pictures, including taking them one at a time.</div>

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

  const pictureInput = modal.querySelector("#qrPictures");
  const pictureStatus = modal.querySelector("#qrPictureStatus");
  let selectedPictures = [];

  pictureInput.addEventListener("change", () => {
    const newlySelected = Array.from(pictureInput.files || []);

    for (const file of newlySelected) {
      const duplicate = selectedPictures.some(existing =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
      );

      if (!duplicate && selectedPictures.length < 10) {
        selectedPictures.push(file);
      }
    }

    if (newlySelected.length && selectedPictures.length >= 10) {
      pictureStatus.textContent = "10 pictures selected (maximum).";
    } else if (selectedPictures.length) {
      pictureStatus.textContent = `${selectedPictures.length} picture${selectedPictures.length === 1 ? "" : "s"} selected. Tap the picture button again to add another.`;
    } else {
      pictureStatus.textContent = "Add photos of the job to help management prepare the quote. You can add up to 10 pictures, including taking them one at a time.";
    }

    // A mobile camera/file picker replaces the input's FileList each time it is opened.
    // Keep our own array so taking a second photo does not replace the first.
    pictureInput.value = "";
  });

  modal.querySelector("#jobpilotQuoteRequestForm").addEventListener("submit", async event => {
    event.preventDefault();

    const message = modal.querySelector("#qrMessage");
    const submit = modal.querySelector("button[type=submit]");
    const pictures = selectedPictures;

    if (pictures.length > 10) {
      message.textContent = "Please select no more than 10 pictures.";
      return;
    }

    const oversized = pictures.find(file => file.size > 10 * 1024 * 1024);
    if (oversized) {
      message.textContent = `"${oversized.name}" is larger than 10MB. Please choose a smaller picture.`;
      return;
    }

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

    const requestId = crypto.randomUUID();
    const imagePaths = [];

    for (let index = 0; index < pictures.length; index += 1) {
      const file = pictures[index];
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `photo-${index + 1}.jpg`;
      const path = `${membership.company_id}/${requestId}/${Date.now()}-${index}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("quote-request-images")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });

      if (uploadError) {
        console.error("JobPilot quote request image upload:", uploadError);
        message.textContent = `Picture ${index + 1} could not be uploaded. Please try again.`;
        submit.disabled = false;
        submit.textContent = "Send to Management";
        return;
      }

      imagePaths.push(path);
    }

    const payload = {
      id: requestId,
      company_id: membership.company_id,
      requested_by: user.id,
      customer_name: modal.querySelector("#qrCustomerName").value.trim(),
      phone: modal.querySelector("#qrPhone").value.trim(),
      email: modal.querySelector("#qrEmail").value.trim() || null,
      address: modal.querySelector("#qrAddress").value.trim() || null,
      description: modal.querySelector("#qrDescription").value.trim(),
      preferred_date: modal.querySelector("#qrPreferredDate").value || null,
      image_paths: imagePaths
    };

    const { error } = await supabase
      .from("quote_requests")
      .insert(payload);

    if (error) {
      console.error("JobPilot quote request:", error);
      message.textContent = error.message || "The quote request could not be created.";
      submit.disabled = false;
      submit.textContent = "Send to Management";
      return;
    }

    modal.remove();
    alert("Quote request sent to management.");
  });
}

window.showQuoteRequestForm = showQuoteRequestForm;
