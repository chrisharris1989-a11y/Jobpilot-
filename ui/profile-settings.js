import { supabase } from "../supabase.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function getAccountContent() {
  return document.getElementById("pageContent");
}

function backToAccount(content) {
  const back = content?.querySelector("[data-account-settings-back]");
  if (back) back.click();
  else document.querySelector('[data-settings-section="account"]')?.dispatchEvent(new Event("click"));
}

function renderProfile(content) {
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header"><h2>Profile</h2><p>Manage your personal details.</p></header>
      <button class="jp-settings-back" type="button" data-profile-back>← Account</button>
      <form class="jp-profile-form" novalidate>
        <div class="jp-profile-card">
          <div class="jp-profile-fields">
            <label>First name<input name="first_name" type="text" autocomplete="given-name" maxlength="100"></label>
            <label>Last name<input name="last_name" type="text" autocomplete="family-name" maxlength="100"></label>
            <label>Phone number<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
          </div>
          <div class="jp-profile-actions"><button class="jp-profile-save" type="submit">Save changes</button><span class="jp-profile-status" aria-live="polite"></span></div>
        </div>
      </form>
    </section>`;

  ensureProfileStyles();
  content.querySelector("[data-profile-back]")?.addEventListener("click", () => backToAccount(content));
  loadProfile(content);
  content.querySelector(".jp-profile-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector(".jp-profile-save");
    const status = form.querySelector(".jp-profile-status");
    const firstName = form.first_name.value.trim();
    const lastName = form.last_name.value.trim();
    const phone = form.phone.value.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    button.disabled = true; status.textContent = "Saving…";
    const { error } = await supabase.auth.updateUser({ data: { name: fullName, full_name: fullName, given_name: firstName, family_name: lastName, phone } });
    button.disabled = false;
    if (error) { status.textContent = error.message || "Unable to save your profile."; status.className = "jp-profile-status error"; return; }
    status.textContent = "Profile saved."; status.className = "jp-profile-status success";
  });
}

function renderEmailPassword(content) {
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header"><h2>Email &amp; Password</h2><p>Manage the email address and password you use to sign in.</p></header>
      <button class="jp-settings-back" type="button" data-account-settings-back>← Account</button>
      <div class="jp-account-form-card">
        <form class="jp-email-form" novalidate>
          <h3>Change email address</h3>
          <label>Current email<input name="current_email" type="email" readonly></label>
          <label>New email address<input name="new_email" type="email" autocomplete="email" placeholder="Enter a new email address"></label>
          <button type="submit">Update email</button>
          <span class="jp-account-status" data-email-status aria-live="polite"></span>
        </form>
        <div class="jp-account-divider"></div>
        <form class="jp-password-form" novalidate>
          <h3>Change password</h3>
          <label>New password<input name="password" type="password" autocomplete="new-password" minlength="6" placeholder="At least 6 characters"></label>
          <label>Confirm new password<input name="confirm_password" type="password" autocomplete="new-password" minlength="6" placeholder="Re-enter your password"></label>
          <button type="submit">Update password</button>
          <span class="jp-account-status" data-password-status aria-live="polite"></span>
        </form>
      </div>
    </section>`;

  ensureProfileStyles();
  content.querySelector("[data-account-settings-back]")?.addEventListener("click", () => backToAccount(content));
  loadCurrentEmail(content);

  content.querySelector(".jp-email-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const status = form.querySelector("[data-email-status]");
    const email = form.new_email.value.trim();
    if (!email) { status.textContent = "Enter a new email address."; status.className = "jp-account-status error"; return; }
    button.disabled = true; status.textContent = "Updating…"; status.className = "jp-account-status";
    const { error } = await supabase.auth.updateUser({ email });
    button.disabled = false;
    if (error) { status.textContent = error.message || "Unable to update your email."; status.className = "jp-account-status error"; return; }
    status.textContent = "Email updated. Check your inbox if confirmation is required."; status.className = "jp-account-status success";
    form.new_email.value = "";
  });

  content.querySelector(".jp-password-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const status = form.querySelector("[data-password-status]");
    const password = form.password.value;
    const confirm = form.confirm_password.value;
    if (password.length < 6) { status.textContent = "Password must be at least 6 characters."; status.className = "jp-account-status error"; return; }
    if (password !== confirm) { status.textContent = "Passwords do not match."; status.className = "jp-account-status error"; return; }
    button.disabled = true; status.textContent = "Updating…"; status.className = "jp-account-status";
    const { error } = await supabase.auth.updateUser({ password });
    button.disabled = false;
    if (error) { status.textContent = error.message || "Unable to update your password."; status.className = "jp-account-status error"; return; }
    status.textContent = "Password updated successfully."; status.className = "jp-account-status success";
    form.reset();
  });
}

async function loadCurrentEmail(content) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return;
  const input = content.querySelector('[name="current_email"]');
  if (input) input.value = data.user.email || "";
}

async function loadProfile(content) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return;
  const meta = data.user.user_metadata || {};
  const firstName = meta.given_name || meta.first_name || "";
  const lastName = meta.family_name || meta.last_name || "";
  const fallbackName = String(meta.name || meta.full_name || "").trim();
  const parts = fallbackName.split(/\s+/).filter(Boolean);
  const form = content.querySelector(".jp-profile-form");
  if (!form) return;
  form.first_name.value = firstName || parts.shift() || "";
  form.last_name.value = lastName || parts.join(" ");
  form.phone.value = meta.phone || "";
}

function ensureProfileStyles() {
  if (document.getElementById("jp-profile-settings-styles")) return;
  const style = document.createElement("style");
  style.id = "jp-profile-settings-styles";
  style.textContent = `
    .jp-profile-card,.jp-account-form-card { max-width:900px; margin-top:20px; padding:24px; border:1px solid rgba(0,0,0,.10); border-radius:14px; background:var(--card-bg,#fff); box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .jp-profile-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
    .jp-profile-fields label,.jp-account-form-card label { display:flex; flex-direction:column; gap:7px; font-size:13px; font-weight:600; margin-bottom:16px; }
    .jp-profile-fields input,.jp-account-form-card input { width:100%; box-sizing:border-box; padding:11px 12px; border:1px solid rgba(0,0,0,.14); border-radius:9px; background:transparent; color:inherit; font:inherit; font-weight:400; }
    .jp-profile-fields input:focus,.jp-account-form-card input:focus { outline:2px solid rgba(0,0,0,.14); outline-offset:1px; }
    .jp-profile-actions { display:flex; align-items:center; gap:14px; margin-top:22px; }
    .jp-profile-save,.jp-account-form-card form button { border:0; border-radius:9px; padding:10px 16px; cursor:pointer; background:#111827; color:#fff; font-weight:600; }
    .jp-profile-save:disabled,.jp-account-form-card form button:disabled { opacity:.55; cursor:wait; }
    .jp-profile-status,.jp-account-status { font-size:13px; opacity:.75; }
    .jp-profile-status.success,.jp-account-status.success { color:#15803d; opacity:1; }
    .jp-profile-status.error,.jp-account-status.error { color:#b91c1c; opacity:1; }
    .jp-account-form-card h3 { margin:0 0 18px; font-size:16px; }
    .jp-account-divider { height:1px; background:rgba(0,0,0,.10); margin:28px 0; }
    .jp-account-status { display:block; margin-top:12px; }
    @media (max-width:700px) { .jp-profile-fields { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}

// The Account cards are currently rendered by settings.js without data attributes.
// Handle them here by their visible labels so the existing settings layout remains unchanged.
document.addEventListener("click", event => {
  const content = getAccountContent();
  if (!content) return;
  const button = event.target.closest?.(".jp-settings-card");
  if (!button) return;
  const section = content.querySelector(".jp-settings-page h2")?.textContent?.trim();
  if (section !== "Account") return;
  const label = button.querySelector("strong")?.textContent?.trim();
  if (label === "Profile") {
    event.preventDefault(); event.stopImmediatePropagation(); renderProfile(content);
  } else if (label === "Email & Password") {
    event.preventDefault(); event.stopImmediatePropagation(); renderEmailPassword(content);
  }
}, true);

document.addEventListener("click", event => {
  const card = event.target.closest?.('[data-settings-account="profile"]');
  if (!card) return;
  const content = getAccountContent();
  if (!content) return;
  event.preventDefault(); event.stopImmediatePropagation(); renderProfile(content);
});