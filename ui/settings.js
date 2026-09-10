// JobPilot Settings
// Clean Settings entry point.

export function renderSettings(content = document.getElementById("pageContent")) {
  if (!content) return;
  renderSettingsOverview(content);
}

function renderSettingsOverview(content) {
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header">
        <h2>Settings</h2>
        <p>Manage your JobPilot settings.</p>
      </header>

      <div class="jp-settings-grid">
        <button class="jp-settings-card" type="button" data-settings-section="account">
          <span class="jp-settings-card-icon">👤</span>
          <span class="jp-settings-card-body">
            <strong>Account</strong>
            <small>Manage your profile, email address and password.</small>
          </span>
          <span class="jp-settings-card-arrow">→</span>
        </button>

        <button class="jp-settings-card" type="button" data-settings-section="company">
          <span class="jp-settings-card-icon">🏢</span>
          <span class="jp-settings-card-body">
            <strong>Company</strong>
            <small>Manage your company details and logo.</small>
          </span>
          <span class="jp-settings-card-arrow">→</span>
        </button>
      </div>
    </section>
  `;

  ensureSettingsStyles();

  content.querySelector('[data-settings-section="account"]')?.addEventListener("click", () => {
    renderAccountSettings(content);
  });

  content.querySelector('[data-settings-section="company"]')?.addEventListener("click", () => {
    renderCompanySettings(content);
  });
}

function renderAccountSettings(content) {
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header">
        <h2>Account</h2>
        <p>Manage your personal JobPilot account details and login information.</p>
      </header>

      <button class="jp-settings-back" type="button" data-settings-back>← Settings</button>

      <div class="jp-settings-grid">
        <button class="jp-settings-card" type="button" data-settings-account="profile">
          <span class="jp-settings-card-icon">👤</span>
          <span class="jp-settings-card-body">
            <strong>Profile</strong>
            <small>Manage your name and personal details.</small>
          </span>
          <span class="jp-settings-card-arrow">→</span>
        </button>

        <button class="jp-settings-card" type="button" data-settings-account="security">
          <span class="jp-settings-card-icon">🔐</span>
          <span class="jp-settings-card-body">
            <strong>Email &amp; Password</strong>
            <small>Manage the email address and password you use to sign in.</small>
          </span>
          <span class="jp-settings-card-arrow">→</span>
        </button>
      </div>
    </section>
  `;

  ensureSettingsStyles();

  content.querySelector("[data-settings-back]")?.addEventListener("click", () => {
    renderSettingsOverview(content);
  });

  content.querySelector('[data-settings-account="profile"]')?.addEventListener("click", () => {
    showAccountMessage("Profile settings are ready to be populated.");
  });

  content.querySelector('[data-settings-account="security"]')?.addEventListener("click", () => {
    showAccountMessage("Email & Password settings are ready to be populated.");
  });
}

function renderCompanySettings(content) {
  content.innerHTML = `
    <section class="settings-page jp-settings-page">
      <header class="page-header">
        <h2>Company</h2>
        <p>Manage your company details and branding.</p>
      </header>

      <button class="jp-settings-back" type="button" data-settings-back>← Settings</button>

      <div class="jp-settings-grid">
        <button class="jp-settings-card" type="button" data-settings-company="details">
          <span class="jp-settings-card-icon">🏢</span>
          <span class="jp-settings-card-body">
            <strong>Company Details</strong>
            <small>Manage your company name, address and contact details.</small>
          </span>
          <span class="jp-settings-card-arrow">→</span>
        </button>

        <button class="jp-settings-card" type="button" data-settings-company="logo">
          <span class="jp-settings-card-icon">🖼️</span>
          <span class="jp-settings-card-body">
            <strong>Company Logo</strong>
            <small>Upload and manage the logo used across JobPilot.</small>
          </span>
          <span class="jp-settings-card-arrow">→</span>
        </button>
      </div>
    </section>
  `;

  ensureSettingsStyles();

  content.querySelector("[data-settings-back]")?.addEventListener("click", () => {
    renderSettingsOverview(content);
  });

  content.querySelectorAll("[data-settings-company]").forEach(card => {
    card.addEventListener("click", () => {
      const labels = {
        details: "Company Details settings are ready to be populated.",
        logo: "Company Logo settings are ready to be populated."
      };
      showAccountMessage(labels[card.dataset.settingsCompany]);
    });
  });
}

function ensureSettingsStyles() {
  if (document.getElementById("jp-account-settings-styles")) return;

  const style = document.createElement("style");
  style.id = "jp-account-settings-styles";
  style.textContent = `
    .jp-settings-page { width:100%; }
    .jp-settings-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-top:20px; max-width:900px; }
    .jp-settings-card { appearance:none; border:1px solid rgba(0,0,0,.10); background:var(--card-bg,#fff); border-radius:14px; padding:20px; display:flex; align-items:center; gap:15px; text-align:left; cursor:pointer; color:inherit; box-shadow:0 2px 8px rgba(0,0,0,.04); transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .jp-settings-card:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(0,0,0,.08); border-color:rgba(0,0,0,.18); }
    .jp-settings-card-icon { width:42px; height:42px; display:grid; place-items:center; border-radius:10px; background:rgba(0,0,0,.05); font-size:20px; flex:0 0 42px; }
    .jp-settings-card-body { display:flex; flex-direction:column; gap:5px; min-width:0; flex:1; }
    .jp-settings-card-body strong { font-size:15px; }
    .jp-settings-card-body small { font-size:13px; opacity:.68; line-height:1.4; }
    .jp-settings-card-arrow { font-size:20px; opacity:.5; }
    .jp-settings-back { margin-top:4px; border:0; background:none; padding:6px 0; color:inherit; opacity:.7; cursor:pointer; font-size:13px; }
    .jp-settings-back:hover { opacity:1; }
    @media (max-width:700px) { .jp-settings-grid { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}

function showAccountMessage(message) {
  const existing = document.querySelector(".jp-settings-message");
  existing?.remove();

  const messageBox = document.createElement("div");
  messageBox.className = "jp-settings-message";
  messageBox.textContent = message;
  messageBox.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:9999;padding:12px 16px;border-radius:10px;background:var(--card-bg,#fff);border:1px solid rgba(0,0,0,.12);box-shadow:0 8px 24px rgba(0,0,0,.12);font-size:13px;";
  document.body.appendChild(messageBox);
  setTimeout(() => messageBox.remove(), 2500);
}

// Handle the static Settings button before app.js's generic page router.
document.addEventListener("click", event => {
  const button = event.target.closest?.('.nav-item[data-page="settings"]');
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  button.classList.add("active");

  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Settings";
  if (subtitle) subtitle.textContent = "Manage your JobPilot account settings.";

  renderSettings();
}, true);

function addSettingsTab() {
  const bottom = document.querySelector(".sidebar .sidebar-bottom");
  if (!bottom || bottom.querySelector('[data-page="settings"]')) return;

  const button = document.createElement("button");
  button.className = "nav-item";
  button.type = "button";
  button.dataset.page = "settings";
  button.textContent = "⚙️ Settings";

  bottom.insertBefore(button, bottom.firstChild);
}

const observer = new MutationObserver(addSettingsTab);
observer.observe(document.body, { childList: true, subtree: true });

addSettingsTab();
