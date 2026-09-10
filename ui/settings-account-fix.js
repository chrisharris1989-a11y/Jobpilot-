// =====================================================
// JOBPILOT ACCOUNT PAGE
// =====================================================
// Settings > Account
// Account is rendered as one clean page with two sections.
// This module binds once per Settings panel and does not
// observe the whole document or rebuild on every mutation.
// =====================================================

(function () {
  const GROUPS = [
    {
      title: "Personal Details",
      description: "Your name and contact details.",
      fields: [["settingsContactName", "Name"], ["settingsPhone", "Phone"]]
    },
    {
      title: "Business Details",
      description: "Your business name, email and address.",
      fields: [
        ["settingsBusinessName", "Business name"],
        ["settingsBusinessEmail", "Business email"],
        ["settingsAddress", "Address"]
      ]
    }
  ];

  let boundPanel = null;
  let accountPage = null;

  function getPanel() {
    return document.querySelector(".settings-panel");
  }

  function getSource(id) {
    return document.getElementById(id);
  }

  function addStyles() {
    if (document.getElementById("jobpilot-account-page-css")) return;
    const style = document.createElement("style");
    style.id = "jobpilot-account-page-css";
    style.textContent = `
      .jobpilot-account-page { display:block; }
      .jobpilot-account-page.is-hidden { display:none!important; }
      .jobpilot-account-back { margin:0 0 18px; border:1px solid var(--border,#e5e7eb); background:var(--surface,#fff); color:inherit; border-radius:10px; padding:9px 13px; cursor:pointer; font:inherit; font-weight:600; }
      .jobpilot-account-sections { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
      .jobpilot-account-section { box-sizing:border-box; background:var(--surface,#fff); border:1px solid var(--border,#e5e7eb); border-radius:var(--radius,12px); box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04)); padding:24px; }
      .jobpilot-account-section h2 { margin:0 0 6px; font-size:19px; }
      .jobpilot-account-section .account-description { margin:0 0 20px; opacity:.7; font-size:14px; }
      .jobpilot-account-field { margin-bottom:16px; }
      .jobpilot-account-field:last-child { margin-bottom:0; }
      .jobpilot-account-field label { display:block; margin-bottom:7px; font-weight:600; }
      .jobpilot-account-field input,.jobpilot-account-field textarea,.jobpilot-account-field select { width:100%; box-sizing:border-box; }
      @media(max-width:900px) { .jobpilot-account-sections { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  function hideSettingsHome(panel) {
    panel.querySelector(".settings-category-grid")?.classList.add("is-hidden");
    panel.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    panel.querySelectorAll(".settings-section").forEach(section => section.classList.add("is-hidden"));
    panel.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
  }

  function showSettingsHome(panel) {
    accountPage?.classList.add("is-hidden");
    panel.querySelector(".settings-category-grid")?.classList.remove("is-hidden");
    panel.querySelectorAll(".settings-section").forEach(section => section.classList.add("is-hidden"));
    panel.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    panel.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");

    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");
    if (title) title.textContent = "Settings";
    if (subtitle) subtitle.textContent = "Manage your JobPilot account.";
  }

  function makeField(id, labelText) {
    const original = getSource(id);
    if (!original) return null;

    const row = document.createElement("div");
    row.className = "jobpilot-account-field";

    const label = document.createElement("label");
    label.textContent = labelText;

    let field;
    if (original.tagName === "TEXTAREA") {
      field = document.createElement("textarea");
      field.rows = original.rows || 3;
    } else if (original.tagName === "SELECT") {
      field = document.createElement("select");
      field.innerHTML = original.innerHTML;
    } else {
      field = document.createElement("input");
      field.type = original.type || "text";
    }

    field.id = `${id}-account-page`;
    field.value = original.value || "";
    field.placeholder = original.placeholder || "";
    field.autocomplete = original.autocomplete || "off";
    label.htmlFor = field.id;

    field.addEventListener("input", () => {
      original.value = field.value;
      original.dispatchEvent(new Event("input", { bubbles:true }));
    });
    field.addEventListener("change", () => {
      original.value = field.value;
      original.dispatchEvent(new Event("change", { bubbles:true }));
    });

    row.append(label, field);
    return row;
  }

  function buildAccountPage(panel) {
    if (accountPage && accountPage.isConnected) return;

    accountPage = document.createElement("div");
    accountPage.className = "jobpilot-account-page is-hidden";
    accountPage.innerHTML = `
      <button type="button" class="jobpilot-account-back">← Back to Settings</button>
      <div class="jobpilot-account-sections">
        ${GROUPS.map((group, index) => `
          <section class="jobpilot-account-section" data-account-group="${index}">
            <h2>${group.title}</h2>
            <p class="account-description">${group.description}</p>
            <div class="jobpilot-account-fields"></div>
          </section>
        `).join("")}
      </div>
    `;

    panel.appendChild(accountPage);

    accountPage.querySelector(".jobpilot-account-back")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      showSettingsHome(panel);
    });
  }

  function populateAccountPage() {
    if (!accountPage) return;

    GROUPS.forEach((group, index) => {
      const body = accountPage.querySelector(`[data-account-group="${index}"] .jobpilot-account-fields`);
      if (!body) return;
      body.replaceChildren();
      group.fields.forEach(([id, label]) => {
        const field = makeField(id, label);
        if (field) body.appendChild(field);
      });
    });
  }

  function openAccount(panel) {
    buildAccountPage(panel);
    populateAccountPage();
    hideSettingsHome(panel);
    accountPage.classList.remove("is-hidden");

    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");
    if (title) title.textContent = "Account";
    if (subtitle) subtitle.textContent = "Manage your personal and business details.";
  }

  function bind(panel) {
    if (!panel || boundPanel === panel) return;
    boundPanel = panel;
    addStyles();
    buildAccountPage(panel);

    const grid = panel.querySelector(".settings-category-grid");
    if (!grid) return;

    grid.addEventListener("click", event => {
      const card = event.target.closest(".settings-category-card");
      if (!card || !grid.contains(card)) return;
      const title = card.querySelector(".settings-category-card-title")?.textContent.trim();
      if (title !== "Account") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      openAccount(panel);
    }, true);
  }

  function init() {
    const panel = getPanel();
    if (!panel) return;
    bind(panel);
  }

  // Settings UI creates its category grid after page navigation. Wait for
  // that single element rather than observing/rebuilding the entire body.
  const starter = setInterval(() => {
    const panel = getPanel();
    if (panel?.querySelector(".settings-category-grid")) {
      clearInterval(starter);
      init();
    }
  }, 50);

  setTimeout(() => clearInterval(starter), 10000);
})();
