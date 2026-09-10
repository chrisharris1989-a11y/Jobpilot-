// =====================================================
// JOBPILOT SETTINGS UI
// =====================================================

(function () {
  const SETTINGS_CATEGORIES = [
    ["Account", "Manage your personal details and account access.", ["Account"]],
    ["Business", "Business details, branding and company information.", ["Business Details", "Business"]],
    ["Notifications", "Control email, push and SMS notifications.", ["Notifications", "SMS Automation"]],
    ["Integrations", "Connect JobPilot with your other business services.", ["Connections", "Integrations"]],
    ["Billing & Subscription", "Manage your plan, subscription and billing.", ["Billing & Subscription", "Billing", "Subscription"]],
    ["Team", "Manage team members, roles and access.", ["Team", "Users", "Team Members"]],
    ["App / Preferences", "Choose your app and business preferences.", ["Preferences", "App Preferences"]],
    ["Security", "Manage account security and access.", ["Security"]],
    ["Danger Zone", "Export data or permanently delete your account.", ["Danger Zone"]]
  ];

  const ACCOUNT_SUBTITLE = "Manage your personal and business details.";
  const SETTINGS_SUBTITLE = "Manage your JobPilot account.";

  function isSettingsPage() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function isAccountPage(panel) {
    return Boolean(panel?.querySelector(".jobpilot-account-page"));
  }

  function setAccountHeader() {
    document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Account"));
    document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode(ACCOUNT_SUBTITLE));
  }

  function setSettingsHeader() {
    document.getElementById("pageTitle")?.replaceChildren(document.createTextNode("Settings"));
    document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode(SETTINGS_SUBTITLE));
  }

  function addSettingsSectionStyles() {
    if (document.getElementById("jobpilot-settings-section-styles")) return;
    const style = document.createElement("style");
    style.id = "jobpilot-settings-section-styles";
    style.textContent = `
      .settings-panel.settings-sectionized { background:transparent; border:0; box-shadow:none; padding:0; }
      .settings-category-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:0 0 24px; }
      .settings-category-card { appearance:none; width:100%; min-height:118px; text-align:left; font:inherit; color:inherit; background:var(--surface,#fff); border:1px solid var(--border,#e5e7eb); border-radius:var(--radius,12px); box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04)); padding:18px; cursor:pointer; }
      .settings-category-card-title { display:block; font-weight:700; font-size:16px; margin-bottom:7px; }
      .settings-category-card-description { display:block; font-size:13px; line-height:1.45; opacity:.72; }
      .settings-section { background:var(--surface,#fff); border:1px solid var(--border,#e5e7eb); border-radius:var(--radius,12px); box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04)); padding:24px; margin:0 0 18px; scroll-margin-top:24px; }
      .settings-section > h2:first-child { margin-top:0; }
      .settings-section > hr { display:none; }
      .settings-save-actions { display:flex; justify-content:flex-end; margin-top:6px; padding-top:2px; }
      .settings-section.settings-business-details { padding-bottom:26px; }
      .settings-section.settings-business-details > label { display:block; margin:0 0 7px; }
      .settings-section.settings-business-details > input,.settings-section.settings-business-details > textarea,.settings-section.settings-business-details > select { display:block; width:100%; margin:0 0 18px; }
      .settings-category-view-header { display:flex; align-items:center; gap:14px; margin:0 0 18px; }
      .settings-category-back { flex:0 0 auto; border:1px solid var(--border,#e5e7eb); background:var(--surface,#fff); color:inherit; border-radius:10px; padding:9px 13px; cursor:pointer; font:inherit; font-weight:600; }
      .settings-category-view-title { margin:0; font-size:22px; }
      .settings-category-view-description { margin:3px 0 0; opacity:.7; font-size:14px; }
      .settings-category-content.is-hidden { display:none!important; }
      .settings-category-view-header.is-hidden,.settings-save-actions.is-hidden { display:none!important; }
      .jobpilot-account-page { display:block; }
      .jobpilot-account-sections { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
      .jobpilot-account-section { box-sizing:border-box; background:var(--surface,#fff); border:1px solid var(--border,#e5e7eb); border-radius:var(--radius,12px); box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04)); padding:24px; }
      .jobpilot-account-section h2 { margin:0 0 6px; font-size:19px; }
      .jobpilot-account-section .account-description { margin:0 0 20px; opacity:.7; font-size:14px; }
      .jobpilot-account-field { margin-bottom:16px; }
      .jobpilot-account-field:last-child { margin-bottom:0; }
      .jobpilot-account-field label { display:block; margin-bottom:7px; font-weight:600; }
      .jobpilot-account-field input,.jobpilot-account-field textarea,.jobpilot-account-field select { width:100%; box-sizing:border-box; }
      .jobpilot-account-back { display:inline-block; margin:0 0 18px; }
      @media (min-width:700px) { .settings-section.settings-business-details { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:20px; row-gap:7px; } .settings-section.settings-business-details > h2 { grid-column:1/-1; margin-bottom:5px; } .settings-section.settings-business-details > input,.settings-section.settings-business-details > textarea,.settings-section.settings-business-details > select { margin-bottom:12px; } }
      @media (max-width:900px) { .settings-category-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .jobpilot-account-sections { grid-template-columns:1fr; } }
      @media (max-width:560px) { .settings-category-grid { grid-template-columns:1fr; } .settings-category-view-header { align-items:flex-start; } }
    `;
    document.head.appendChild(style);
  }

  function removeStripeFromSettings() {
    if (!isSettingsPage()) return;
    const status = document.getElementById("stripeConnectionStatus");
    const button = document.getElementById("connectStripeButton");
    const card = status?.closest(".connection-card") || button?.closest(".connection-card");
    card?.remove();
  }

  function markBusinessDetailsSection() {
    const heading = Array.from(document.querySelectorAll(".settings-section > h2")).find(item => item.textContent.trim() === "Business Details");
    heading?.closest(".settings-section")?.classList.add("settings-business-details");
  }

  function categoryForHeading(text) {
    const heading = String(text || "").trim().toLowerCase();
    return SETTINGS_CATEGORIES.find(([, , keywords]) => keywords.some(keyword => {
      const key = keyword.toLowerCase();
      return heading === key || heading.includes(key);
    }))?.[0] || null;
  }

  function placeSectionsIntoCategories(panel) {
    if (panel.dataset.sectionsPlaced === "true") return;
    const sections = Array.from(panel.querySelectorAll(":scope > .settings-section"));
    if (!sections.length) return;
    const containers = new Map();
    SETTINGS_CATEGORIES.forEach(([title]) => {
      const content = document.createElement("div");
      content.className = "settings-category-content is-hidden";
      content.dataset.category = title;
      panel.appendChild(content);
      containers.set(title, content);
    });
    sections.forEach(section => {
      const heading = section.querySelector(":scope > h2")?.textContent.trim() || "";
      const category = categoryForHeading(heading);
      if (category && containers.has(category)) containers.get(category).appendChild(section);
      else section.remove();
    });
    panel.dataset.sectionsPlaced = "true";
  }

  function showCategoryView(panel, title, description) {
    if (isAccountPage(panel)) return;
    const grid = panel.querySelector(".settings-category-grid");
    const saveActions = panel.parentElement?.querySelector(".settings-save-actions");
    const header = panel.querySelector(".settings-category-view-header");
    const deleteCard = document.getElementById("deleteAccountCard");
    if (!grid || !header) return;
    header.querySelector(".settings-category-view-title")?.replaceChildren(document.createTextNode(title));
    header.querySelector(".settings-category-view-description")?.replaceChildren(document.createTextNode(description));
    grid.classList.add("is-hidden");
    header.classList.remove("is-hidden");
    panel.querySelectorAll(":scope > .settings-category-content").forEach(content => content.classList.toggle("is-hidden", content.dataset.category !== title));
    deleteCard?.classList.toggle("is-hidden", title !== "Danger Zone");
    saveActions?.classList.remove("is-hidden");
  }

  function showSettingsCategories(panel) {
    if (isAccountPage(panel)) return;
    panel.querySelector(".settings-category-grid")?.classList.remove("is-hidden");
    panel.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    panel.querySelectorAll(":scope > .settings-category-content").forEach(content => content.classList.add("is-hidden"));
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
    panel.parentElement?.querySelector(".settings-save-actions")?.classList.add("is-hidden");
  }

  function findSection(panel, headingText) {
    return Array.from(panel.querySelectorAll(".settings-section")).find(section => section.querySelector(":scope > h2")?.textContent.trim() === headingText) || null;
  }

  function findField(panel, id) {
    return panel.querySelector(`#${id}`);
  }

  function moveField(panel, id, target) {
    const field = findField(panel, id);
    if (!field || !target) return false;
    const wrapper = document.createElement("div");
    wrapper.className = "jobpilot-account-field";
    const label = Array.from(panel.querySelectorAll("label")).find(item => item.htmlFor === id || item.nextElementSibling === field);
    if (label) wrapper.appendChild(label);
    wrapper.appendChild(field);
    target.appendChild(wrapper);
    return true;
  }

  function openAccountPage(panel) {
    if (isAccountPage(panel)) return;
    const accountSection = findSection(panel, "Account");
    const businessSection = findSection(panel, "Business Details");
    if (!accountSection || !businessSection) return;

    const restoreNodes = {
      categoryGrid: panel.querySelector(".settings-category-grid"),
      categoryHeader: panel.querySelector(".settings-category-view-header"),
      categoryContents: Array.from(panel.querySelectorAll(":scope > .settings-category-content")),
      saveActions: panel.parentElement?.querySelector(".settings-save-actions"),
      deleteCard: document.getElementById("deleteAccountCard"),
      accountSection,
      businessSection
    };

    const page = document.createElement("div");
    page.className = "jobpilot-account-page";
    page.innerHTML = `
      <button type="button" class="jobpilot-account-back settings-category-back">← Back to Settings</button>
      <div class="jobpilot-account-sections">
        <section class="jobpilot-account-section">
          <h2>Personal Details</h2>
          <p class="account-description">Your name and contact details.</p>
          <div class="jobpilot-account-fields"></div>
        </section>
        <section class="jobpilot-account-section">
          <h2>Business Details</h2>
          <p class="account-description">Your business name, email and address.</p>
          <div class="jobpilot-account-fields"></div>
        </section>
      </div>
    `;

    const containers = page.querySelectorAll(".jobpilot-account-fields");
    moveField(panel, "settingsContactName", containers[0]);
    moveField(panel, "settingsPhone", containers[0]);
    moveField(panel, "settingsBusinessName", containers[1]);
    moveField(panel, "settingsBusinessEmail", containers[1]);
    moveField(panel, "settingsAddress", containers[1]);

    accountSection.remove();
    restoreNodes.categoryGrid?.remove();
    restoreNodes.categoryHeader?.remove();
    restoreNodes.categoryContents.forEach(node => node.remove());
    restoreNodes.saveActions?.remove();
    restoreNodes.deleteCard?.remove();
    panel.appendChild(page);
    panel.dataset.accountOpen = "true";
    setAccountHeader();

    page.querySelector(".jobpilot-account-back")?.addEventListener("click", () => {
      const restoreField = (id, targetSection) => {
        const field = page.querySelector(`#${id}`);
        if (!field) return;
        const wrapper = field.closest(".jobpilot-account-field");
        const label = wrapper?.querySelector("label");
        if (label) targetSection.appendChild(label);
        targetSection.appendChild(field);
        wrapper?.remove();
      };

      restoreField("settingsContactName", restoreNodes.accountSection);
      restoreField("settingsPhone", restoreNodes.accountSection);
      restoreField("settingsBusinessName", restoreNodes.businessSection);
      restoreField("settingsBusinessEmail", restoreNodes.businessSection);
      restoreField("settingsAddress", restoreNodes.businessSection);
      page.remove();

      const accountCategory = restoreNodes.categoryContents.find(node => node.dataset.category === "Account");
      const businessCategory = restoreNodes.categoryContents.find(node => node.dataset.category === "Business");
      accountCategory?.appendChild(restoreNodes.accountSection);
      businessCategory?.appendChild(restoreNodes.businessSection);
      restoreNodes.categoryContents.forEach(node => panel.appendChild(node));
      if (restoreNodes.categoryGrid) panel.insertBefore(restoreNodes.categoryGrid, panel.firstChild);
      if (restoreNodes.categoryHeader) panel.insertBefore(restoreNodes.categoryHeader, panel.firstChild);
      if (restoreNodes.saveActions && !restoreNodes.saveActions.isConnected) panel.parentElement?.appendChild(restoreNodes.saveActions);
      if (restoreNodes.deleteCard && !restoreNodes.deleteCard.isConnected) panel.parentElement?.appendChild(restoreNodes.deleteCard);
      panel.dataset.accountOpen = "false";
      setSettingsHeader();
      markBusinessDetailsSection();
      showSettingsCategories(panel);
    });
  }

  function addSettingsCategoryCards(panel) {
    if (panel.querySelector(".settings-category-grid")) return;
    const header = document.createElement("div");
    header.className = "settings-category-view-header is-hidden";
    header.innerHTML = `<button type="button" class="settings-category-back">← Back to Settings</button><div><h2 class="settings-category-view-title">Settings</h2><p class="settings-category-view-description"></p></div>`;
    panel.prepend(header);
    header.querySelector(".settings-category-back")?.addEventListener("click", () => {
      showSettingsCategories(panel);
      setSettingsHeader();
    });

    const grid = document.createElement("div");
    grid.className = "settings-category-grid";
    grid.setAttribute("aria-label", "Settings categories");
    SETTINGS_CATEGORIES.forEach(([title, description]) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "settings-category-card";
      card.innerHTML = `<span class="settings-category-card-title">${title}</span><span class="settings-category-card-description">${description}</span>`;
      card.addEventListener("click", () => {
        if (title === "Account") {
          openAccountPage(panel);
          return;
        }
        showCategoryView(panel, title, description);
        document.getElementById("pageTitle")?.replaceChildren(document.createTextNode(title));
        document.getElementById("pageSubtitle")?.replaceChildren(document.createTextNode(description));
      });
      grid.appendChild(card);
    });
    panel.insertBefore(grid, panel.querySelector(":scope > .settings-section") || null);
  }

  function moveSaveActionOutsideCards(panel) {
    if (panel.dataset.saveActionMoved === "true") return;
    const saveButton = panel.querySelector('button[onclick="saveSettings()"]');
    const message = document.getElementById("settingsMessage");
    if (!saveButton) return;
    const saveContainer = saveButton.parentElement;
    const pageContent = panel.parentElement;
    if (!pageContent) return;
    const wrapper = document.createElement("div");
    wrapper.className = "settings-save-actions";
    if (message && message.parentElement === panel) wrapper.appendChild(message);
    if (saveContainer && saveContainer.parentElement === panel) wrapper.appendChild(saveContainer);
    else wrapper.appendChild(saveButton);
    pageContent.appendChild(wrapper);
    panel.dataset.saveActionMoved = "true";
  }

  function sectionizeSettings() {
    if (!isSettingsPage()) return;
    const panel = document.querySelector(".settings-panel");
    if (!panel || panel.dataset.sectionized === "true" || isAccountPage(panel)) return;
    addSettingsSectionStyles();
    const headings = Array.from(panel.querySelectorAll(":scope > h2"));
    if (!headings.length) return;
    removeStripeFromSettings();
    moveSaveActionOutsideCards(panel);
    Array.from(panel.querySelectorAll(":scope > h2")).forEach(heading => {
      const section = document.createElement("section");
      section.className = "settings-section";
      panel.insertBefore(section, heading);
      section.appendChild(heading);
      let node = section.nextSibling;
      while (node) {
        const next = node.nextSibling;
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "H2") break;
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "HR") { node.remove(); break; }
        section.appendChild(node);
        node = next;
      }
    });
    addSettingsCategoryCards(panel);
    placeSectionsIntoCategories(panel);
    panel.classList.add("settings-sectionized");
    panel.dataset.sectionized = "true";
    markBusinessDetailsSection();
    showSettingsCategories(panel);
  }

  addSettingsSectionStyles();
  const observer = new MutationObserver(() => {
    const panel = document.querySelector(".settings-panel");
    if (panel && isAccountPage(panel)) {
      setAccountHeader();
      return;
    }
    removeStripeFromSettings();
    sectionizeSettings();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  removeStripeFromSettings();
  sectionizeSettings();
})();