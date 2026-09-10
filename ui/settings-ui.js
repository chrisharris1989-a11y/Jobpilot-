// =====================================================
// JOBPILOT SETTINGS UI
// =====================================================
// Keeps integrations off Settings and provides the shared
// visual treatment for the Settings sections.
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

  function isSettingsPage() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function removeStripeFromSettings() {
    if (!isSettingsPage()) return;

    const status = document.getElementById("stripeConnectionStatus");
    const button = document.getElementById("connectStripeButton");
    if (!status && !button) return;

    const card = status?.closest(".connection-card") || button?.closest(".connection-card");
    if (card) {
      card.remove();
      return;
    }

    let container = status || button;
    while (container && container.parentElement) {
      container = container.parentElement;
      if (container.contains(status) && container.contains(button)) {
        const headings = container.querySelectorAll("h2");
        if (headings.length <= 1) container.remove();
        break;
      }
    }
  }

  function addSettingsSectionStyles() {
    if (document.getElementById("jobpilot-settings-section-styles")) return;

    const style = document.createElement("style");
    style.id = "jobpilot-settings-section-styles";
    style.textContent = `
      .settings-panel.settings-sectionized {
        background: transparent;
        border: 0;
        box-shadow: none;
        padding: 0;
      }

      .settings-category-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin: 0 0 24px;
      }

      .settings-category-card {
        appearance: none;
        width: 100%;
        min-height: 118px;
        text-align: left;
        font: inherit;
        color: inherit;
        background: var(--surface, #ffffff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: var(--radius, 12px);
        box-shadow: var(--shadow, 0 2px 8px rgba(15, 23, 42, 0.04));
        padding: 18px;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
      }

      .settings-category-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
        border-color: var(--primary, #cbd5e1);
      }

      .settings-category-card:focus-visible {
        outline: 2px solid var(--primary, #2563eb);
        outline-offset: 2px;
      }

      .settings-category-card-title {
        display: block;
        font-weight: 700;
        font-size: 16px;
        margin-bottom: 7px;
      }

      .settings-category-card-description {
        display: block;
        font-size: 13px;
        line-height: 1.45;
        opacity: .72;
      }

      .settings-section {
        background: var(--surface, #ffffff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: var(--radius, 12px);
        box-shadow: var(--shadow, 0 2px 8px rgba(15, 23, 42, 0.04));
        padding: 24px;
        margin: 0 0 18px;
        scroll-margin-top: 24px;
      }

      .settings-section > h2:first-child { margin-top: 0; }
      .settings-section > hr { display: none; }
      .settings-section > label:first-of-type { margin-top: 4px; }
      .settings-section > p:first-of-type { margin-top: 0; }
      .settings-section:last-of-type { margin-bottom: 0; }

      .settings-save-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 6px;
        padding-top: 2px;
      }

      .settings-section.settings-business-details {
        padding-bottom: 26px;
      }

      .settings-section.settings-business-details > label {
        display: block;
        margin: 0 0 7px;
      }

      .settings-section.settings-business-details > input,
      .settings-section.settings-business-details > textarea,
      .settings-section.settings-business-details > select {
        display: block;
        width: 100%;
        margin: 0 0 18px;
      }

      .settings-category-view-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 0 0 18px;
      }

      .settings-category-back {
        flex: 0 0 auto;
        border: 1px solid var(--border, #e5e7eb);
        background: var(--surface, #ffffff);
        color: inherit;
        border-radius: 10px;
        padding: 9px 13px;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
      }

      .settings-category-view-title {
        margin: 0;
        font-size: 22px;
      }

      .settings-category-view-description {
        margin: 3px 0 0;
        opacity: .7;
        font-size: 14px;
      }

      .settings-account-cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        margin-bottom: 18px;
      }

      .settings-account-cards > .settings-section {
        margin: 0;
      }

      .settings-category-grid.is-hidden,
      .settings-section.is-hidden,
      #deleteAccountCard.is-hidden {
        display: none !important;
      }

      .settings-category-view-header.is-hidden,
      .settings-save-actions.is-hidden {
        display: none !important;
      }

      @media (min-width: 700px) {
        .settings-section.settings-business-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 20px;
          row-gap: 7px;
        }

        .settings-section.settings-business-details > h2 {
          grid-column: 1 / -1;
          margin-bottom: 5px;
        }

        .settings-section.settings-business-details > label,
        .settings-section.settings-business-details > input,
        .settings-section.settings-business-details > textarea,
        .settings-section.settings-business-details > select {
          min-width: 0;
        }

        .settings-section.settings-business-details > input,
        .settings-section.settings-business-details > textarea,
        .settings-section.settings-business-details > select {
          margin-bottom: 12px;
        }
      }

      @media (max-width: 900px) {
        .settings-category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .settings-account-cards { grid-template-columns: 1fr; }
      }

      @media (max-width: 560px) {
        .settings-category-grid { grid-template-columns: 1fr; }
        .settings-category-view-header { align-items: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  function markBusinessDetailsSection() {
    const heading = Array.from(document.querySelectorAll(".settings-section > h2"))
      .find((item) => item.textContent.trim() === "Business Details");
    heading?.closest(".settings-section")?.classList.add("settings-business-details");
  }

  function splitPersonalDetailsSection(panel) {
    if (panel.querySelector(".settings-section-personal-details")) return;

    const accountSection = Array.from(panel.querySelectorAll(":scope > .settings-section"))
      .find(section => section.querySelector(":scope > h2")?.textContent.trim() === "Account");
    if (!accountSection) return;

    const nameInput = accountSection.querySelector("#settingsContactName");
    const phoneInput = accountSection.querySelector("#settingsPhone");
    if (!nameInput && !phoneInput) return;

    // The original Account section becomes Account Details.
    const accountHeading = accountSection.querySelector(":scope > h2");
    if (accountHeading) accountHeading.textContent = "Account Details";

    const personalSection = document.createElement("section");
    personalSection.className = "settings-section settings-section-personal-details";

    const heading = document.createElement("h2");
    heading.textContent = "Personal Details";
    personalSection.appendChild(heading);

    [nameInput, phoneInput].forEach(input => {
      if (!input) return;
      const label = input.previousElementSibling;
      if (label?.tagName === "LABEL") personalSection.appendChild(label);
      personalSection.appendChild(input);
    });

    accountSection.insertAdjacentElement("afterend", personalSection);
  }

  function findCategorySections(keywords) {
    const sections = Array.from(document.querySelectorAll(".settings-section"));
    return sections.filter((section) => {
      const heading = section.querySelector(":scope > h2");
      const text = heading?.textContent.trim().toLowerCase() || "";
      return keywords.some((keyword) => text === keyword.toLowerCase() || text.includes(keyword.toLowerCase()));
    });
  }

  function showCategoryView(panel, title, description, keywords) {
    const grid = panel.querySelector(".settings-category-grid");
    const sections = Array.from(panel.querySelectorAll(":scope > .settings-section"));
    const saveActions = panel.parentElement?.querySelector(".settings-save-actions");
    const header = panel.querySelector(".settings-category-view-header");
    const deleteCard = document.getElementById("deleteAccountCard");

    if (!grid || !header) return;

    const titleElement = header.querySelector(".settings-category-view-title");
    const descriptionElement = header.querySelector(".settings-category-view-description");
    if (titleElement) titleElement.textContent = title;
    if (descriptionElement) descriptionElement.textContent = description;

    let matchingSections = findCategorySections(keywords);
    const isAccount = title === "Account";
    const isDangerZone = title === "Danger Zone";

    // Account is a parent category containing exactly two information cards.
    if (isAccount) {
      matchingSections = findCategorySections(["Account Details", "Personal Details"]);
    }

    grid.classList.add("is-hidden");
    header.classList.remove("is-hidden");
    sections.forEach(section => section.classList.toggle("is-hidden", !matchingSections.includes(section)));
    deleteCard?.classList.toggle("is-hidden", !isDangerZone);
    saveActions?.classList.remove("is-hidden");

    if (isAccount) {
      const visibleSections = matchingSections.filter(section => !section.classList.contains("is-hidden"));
      if (visibleSections.length >= 2) {
        const wrapper = document.createElement("div");
        wrapper.className = "settings-account-cards";
        visibleSections.forEach(section => wrapper.appendChild(section));
        panel.appendChild(wrapper);
      }
    }
  }

  function showSettingsCategories(panel) {
    const grid = panel.querySelector(".settings-category-grid");
    const sections = Array.from(panel.querySelectorAll(".settings-section"));
    const saveActions = panel.parentElement?.querySelector(".settings-save-actions");
    const header = panel.querySelector(".settings-category-view-header");
    const deleteCard = document.getElementById("deleteAccountCard");

    // If Account cards were wrapped, put the sections back directly under the panel.
    const accountWrapper = panel.querySelector(":scope > .settings-account-cards");
    if (accountWrapper) {
      Array.from(accountWrapper.children).forEach(section => panel.appendChild(section));
      accountWrapper.remove();
    }

    grid?.classList.remove("is-hidden");
    header?.classList.add("is-hidden");
    sections.forEach(section => section.classList.add("is-hidden"));
    deleteCard?.classList.add("is-hidden");
    saveActions?.classList.add("is-hidden");
  }

  function addSettingsCategoryCards(panel) {
    if (panel.querySelector(".settings-category-grid")) return;

    const header = document.createElement("div");
    header.className = "settings-category-view-header is-hidden";
    header.innerHTML = `
      <button type="button" class="settings-category-back">← Back to Settings</button>
      <div>
        <h2 class="settings-category-view-title">Settings</h2>
        <p class="settings-category-view-description"></p>
      </div>
    `;
    panel.prepend(header);

    header.querySelector(".settings-category-back")?.addEventListener("click", () => {
      showSettingsCategories(panel);
      const pageTitle = document.getElementById("pageTitle");
      const pageSubtitle = document.getElementById("pageSubtitle");
      if (pageTitle) pageTitle.textContent = "Settings";
      if (pageSubtitle) pageSubtitle.textContent = "Manage your JobPilot account.";
    });

    const grid = document.createElement("div");
    grid.className = "settings-category-grid";
    grid.setAttribute("aria-label", "Settings categories");

    SETTINGS_CATEGORIES.forEach(([title, description, keywords]) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "settings-category-card";
      card.innerHTML = `
        <span class="settings-category-card-title">${title}</span>
        <span class="settings-category-card-description">${description}</span>
      `;

      card.addEventListener("click", () => {
        showCategoryView(panel, title, description, keywords);

        const pageTitle = document.getElementById("pageTitle");
        const pageSubtitle = document.getElementById("pageSubtitle");
        if (pageTitle) pageTitle.textContent = title;
        if (pageSubtitle) pageSubtitle.textContent = description;
      });

      grid.appendChild(card);
    });

    panel.insertBefore(grid, panel.querySelector(":scope > .settings-section"));
    showSettingsCategories(panel);
  }

  function sectionizeSettings() {
    if (!isSettingsPage()) return;

    const panel = document.querySelector(".settings-panel");
    if (!panel || panel.dataset.sectionized === "true") return;

    const headings = Array.from(panel.querySelectorAll(":scope > h2"));
    if (!headings.length) return;

    addSettingsSectionStyles();
    removeStripeFromSettings();
    moveSaveActionOutsideCards(panel);

    const remainingHeadings = Array.from(panel.querySelectorAll(":scope > h2"));
    remainingHeadings.forEach((heading) => {
      const section = document.createElement("section");
      section.className = "settings-section";
      panel.insertBefore(section, heading);
      section.appendChild(heading);

      let node = section.nextSibling;
      while (node) {
        const next = node.nextSibling;
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "H2") break;
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "HR") {
          node.remove();
          break;
        }
        section.appendChild(node);
        node = next;
      }
    });

    splitPersonalDetailsSection(panel);
    addSettingsCategoryCards(panel);
    panel.classList.add("settings-sectionized");
    panel.dataset.sectionized = "true";
    markBusinessDetailsSection();
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

  const observer = new MutationObserver(() => {
    removeStripeFromSettings();
    sectionizeSettings();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  removeStripeFromSettings();
  sectionizeSettings();
})();