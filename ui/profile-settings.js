import { supabase } from "../supabase.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function renderProfile(content) {
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header">
        <h2>Profile</h2>
        <p>Manage your personal details.</p>
      </header>
      <button class="jp-settings-back" type="button" data-profile-back>← Account</button>
      <form class="jp-profile-form" novalidate>
        <div class="jp-profile-card">
          <div class="jp-profile-fields">
            <label>First name<input name="first_name" type="text" autocomplete="given-name" maxlength="100"></label>
            <label>Last name<input name="last_name" type="text" autocomplete="family-name" maxlength="100"></label>
            <label>Phone number<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
          </div>
          <div class="jp-profile-actions">
            <button class="jp-profile-save" type="submit">Save changes</button>
            <span class="jp-profile-status" aria-live="polite"></span>
          </div>
        </div>
      </form>
    </section>
  `;

  ensureProfileStyles();

  content.querySelector("[data-profile-back]")?.addEventListener("click", () => {
    document.querySelector('[data-settings-account="profile"]')?.dispatchEvent(new Event("click"));
  });

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

    button.disabled = true;
    status.textContent = "Saving…";

    const { error } = await supabase.auth.updateUser({
      data: {
        name: fullName,
        full_name: fullName,
        given_name: firstName,
        family_name: lastName,
        phone
      }
    });

    button.disabled = false;
    if (error) {
      status.textContent = error.message || "Unable to save your profile.";
      status.className = "jp-profile-status error";
      return;
    }

    status.textContent = "Profile saved.";
    status.className = "jp-profile-status success";
  });
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
    .jp-profile-card { max-width:900px; margin-top:20px; padding:24px; border:1px solid rgba(0,0,0,.10); border-radius:14px; background:var(--card-bg,#fff); box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .jp-profile-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
    .jp-profile-fields label { display:flex; flex-direction:column; gap:7px; font-size:13px; font-weight:600; }
    .jp-profile-fields input { width:100%; box-sizing:border-box; padding:11px 12px; border:1px solid rgba(0,0,0,.14); border-radius:9px; background:transparent; color:inherit; font:inherit; font-weight:400; }
    .jp-profile-fields input:focus { outline:2px solid rgba(0,0,0,.14); outline-offset:1px; }
    .jp-profile-actions { display:flex; align-items:center; gap:14px; margin-top:22px; }
    .jp-profile-save { border:0; border-radius:9px; padding:10px 16px; cursor:pointer; background:#111827; color:#fff; font-weight:600; }
    .jp-profile-save:disabled { opacity:.55; cursor:wait; }
    .jp-profile-status { font-size:13px; opacity:.75; }
    .jp-profile-status.success { opacity:1; }
    .jp-profile-status.error { color:#b91c1c; opacity:1; }
    @media (max-width:700px) { .jp-profile-fields { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}

document.addEventListener("click", event => {
  const card = event.target.closest?.('[data-settings-account="profile"]');
  if (!card) return;
  const content = document.getElementById("pageContent");
  if (!content) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderProfile(content);
});