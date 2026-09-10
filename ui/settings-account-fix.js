// =====================================================
// JOBPILOT ACCOUNT SETTINGS
// =====================================================
// Settings > Account
// The Account page physically moves the existing Account and
// Business Details fields into exactly two sections. Nothing is
// cloned or hidden as a workaround.
// =====================================================

(function () {
  let boundPanel = null;
  let accountPage = null;
  let moved = false;

  function getPanel() {
    return document.querySelector(".settings-panel");
  }

  function addStyles() {
    if (document.getElementById("jobpilot-account-page-css")) return;
    const style = document.createElement("style");
    style.id = "jobpilot-account-page-css";
    style.textContent = `
      .jobpilot-account-page { display:block; }
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

  function findSection(panel, headingText) {
    return Array.from(panel.querySelectorAll(":scope > .settings-category-content > .settings-section"))
      .find(section => section.querySelector(":scope > h2")?.textContent.trim() === headingText)
      || Array.from(panel.querySelectorAll(":scope > .settings-section"))
        .find(section => section.querySelector(":scope > h2")?.textContent.trim() === headingText)
      || null;
  }

  function moveField(sourceSection, id, target) {
    const field = sourceSection?.querySelector(`#${id}`);
    if (!field) return false;

    const wrapper = document.createElement("div");
    wrapper.className = "jobpilot-account-field";

    const label = sourceSection.querySelector(`label[for="${id}"]`)
      || Array.from(sourceSection.querySelectorAll("label"))
        .find(item => item.nextElementSibling === field);

    if (label) wrapper.appendChild(label);
    wrapper.appendChild(field);
    target.appendChild(wrapper);
    return true;
  }

  function moveAccountFields(panel) {
    if (moved) return;

    const accountSource = findSection(panel, "Account");
    const businessSource = findSection(panel, "Business Details");
    if (!accountSource || !businessSource) return;

    const personal = document.createElement("section");
    personal.className = "jobpilot-account-section";
    personal.innerHTML = `
      <h2>Personal Details</h2>
      <p class="account-description">Your name and contact details.</p>
      <div class="jobpilot-account-fields"></div>
    `;

    const business = document.createElement("section");
    business.className = "jobpilot-account-section";
    business.innerHTML = `
      <h2>Business Details</h2>
      <p class="account-description">Your business name, email and address.</p>
      <div class="jobpilot-account-fields"></div>
    `;

    const personalFields = personal.querySelector(".jobpilot-account-fields");
    const businessFields = business.querySelector(".jobpilot-account-fields");

    // Move the actual existing DOM fields. These are not cloned.
    moveField(accountSource, "settingsContactName", personalFields);
    moveField(accountSource, "settingsPhone", personalFields);
    moveField(businessSource, "settingsBusinessName", businessFields);
    moveField(businessSource, "settingsBusinessEmail", businessFields);
    moveField(businessSource, "settingsAddress", businessFields);

    const accountHeading = accountSource.querySelector(":scope > h2");
    const businessHeading = businessSource.querySelector(":scope > h2");
    accountHeading?.remove();
    businessHeading?.remove();

    // The old Account section is no longer a Settings category.
    // The selected fields have been moved out of it, so remove the old wrapper.
    accountSource.remove();

    // Business Details remains available for any business-only fields that were
    // not requested on the Account page (for example postcode/website).
    // It is still a real section, not a hidden duplicate.

    accountPage.querySelector(".jobpilot-account-sections").append(personal, business);
    moved = true;
  }

  function buildAccountPage(panel) {
    if (accountPage?.isConnected) return;
    accountPage = document.createElement("div");
    accountPage.className = "jobpilot-account-page";
    accountPage.innerHTML = `
      <button type="button" class="jobpilot-account-back">← Back to Settings</button>
      <div class="jobpilot-account-sections"></div>
    `;
    panel.appendChild(accountPage);

    accountPage.querySelector(".jobpilot-account-back")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      accountPage.remove();
      accountPage = null;
      moved = false;
      const title = document.getElementById("pageTitle");
      const subtitle = document.getElementById("pageSubtitle");
      if (title) title.textContent = "Settings";
      if (subtitle) subtitle.textContent = "Manage your JobPilot account.";
    });
  }

  function openAccount(panel) {
    if (panel.dataset.sectionsPlaced !== "true") return;

    buildAccountPage(panel);
    moveAccountFields(panel);
    if (!moved) return;

    panel.querySelector(".settings-category-grid")?.remove();
    panel.querySelector(".settings-category-view-header")?.remove();
    panel.querySelectorAll(":scope > .settings-category-content").forEach(content => {
      if (content.childElementCount === 0) content.remove();
    });
    panel.querySelector(".settings-save-actions")?.remove();
    document.getElementById("deleteAccountCard")?.remove();

    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");
    if (title) title.textContent = "Account";
    if (subtitle) subtitle.textContent = "Manage your personal and business details.";
  }

  function bind(panel) {
    if (!panel || boundPanel === panel) return;
    boundPanel = panel;
    addStyles();

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

  const observer = new MutationObserver(() => {
    const panel = getPanel();
    if (panel) init();
  });
  observer.observe(document.body, { childList:true, subtree:true });

  const starter = setInterval(() => {
    const panel = getPanel();
    if (panel?.querySelector(".settings-category-grid")) {
      clearInterval(starter);
      init();
    }
  }, 50);
  setTimeout(() => clearInterval(starter), 10000);
})();