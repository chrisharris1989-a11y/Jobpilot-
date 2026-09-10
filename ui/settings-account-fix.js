// =====================================================
// JOBPILOT SETTINGS ACCOUNT VIEW FIX
// =====================================================
// Clean Settings > Account view:
// Personal Details + Business Details.
// =====================================================

(function () {
  const ACCOUNT_FIELDS = [
    ["Personal Details", ["settingsContactName", "settingsPhone"]],
    ["Business Details", ["settingsBusinessName", "settingsBusinessEmail", "settingsAddress"]]
  ];

  let accountView = null;

  function getPanel() {
    return document.querySelector(".settings-panel");
  }

  function getField(id) {
    return document.getElementById(id);
  }

  function restoreLegacyAccountSection(panel) {
    const personalSection = panel.querySelector(".settings-section-personal-details");
    const accountSection = Array.from(panel.querySelectorAll(".settings-section"))
      .find(section => section.querySelector(":scope > h2")?.textContent.trim() === "Account Details");

    if (!personalSection || !accountSection) return;

    ["settingsContactName", "settingsPhone"].forEach((id) => {
      const input = personalSection.querySelector(`#${id}`);
      if (!input) return;
      const label = personalSection.querySelector(`label[for="${id}"]`) || input.previousElementSibling;
      if (label?.tagName === "LABEL") accountSection.appendChild(label);
      accountSection.appendChild(input);
    });

    personalSection.remove();
    const heading = accountSection.querySelector(":scope > h2");
    if (heading) heading.textContent = "Account";
  }

  function copyField(source, card, suffix) {
    if (!source) return;

    const row = document.createElement("div");
    row.className = "settings-account-field";

    const label = document.createElement("label");
    const sourceLabel = source.previousElementSibling;
    label.textContent = sourceLabel?.tagName === "LABEL"
      ? sourceLabel.textContent.trim()
      : ({
          settingsContactName: "Name",
          settingsPhone: "Phone",
          settingsBusinessName: "Business name",
          settingsBusinessEmail: "Business email",
          settingsAddress: "Address"
        }[source.id] || source.id);

    const clone = source.cloneNode(true);
    clone.id = `${source.id}-${suffix}`;
    clone.removeAttribute("name");
    label.htmlFor = clone.id;

    clone.addEventListener("input", () => {
      source.value = clone.value;
    });
    clone.addEventListener("change", () => {
      source.value = clone.value;
      source.dispatchEvent(new Event("change", { bubbles: true }));
    });

    row.append(label, clone);
    card.appendChild(row);
  }

  function refreshCardValues(panel) {
    ACCOUNT_FIELDS.forEach(([title, ids]) => {
      const card = panel.querySelector(`[data-settings-account-card="${title}"]`);
      if (!card) return;
      ids.forEach((id) => {
        const source = getField(id);
        const clone = card.querySelector(`#${id}-account-view`);
        if (source && clone) clone.value = source.value;
      });
    });
  }

  function createAccountView(panel) {
    if (accountView?.isConnected) return accountView;

    accountView = document.createElement("div");
    accountView.className = "settings-account-view is-hidden";
    const grid = document.createElement("div");
    grid.className = "settings-account-cards-clean";
    accountView.appendChild(grid);

    ACCOUNT_FIELDS.forEach(([title, ids]) => {
      const card = document.createElement("section");
      card.className = "settings-account-info-card";
      card.dataset.settingsAccountCard = title;

      const heading = document.createElement("h2");
      heading.textContent = title;
      card.appendChild(heading);

      ids.forEach((id) => copyField(getField(id), card, "account-view"));
      grid.appendChild(card);
    });

    panel.appendChild(accountView);
    refreshCardValues(panel);
    return accountView;
  }

  function hideAllSettingsContent(panel) {
    panel.querySelectorAll(".settings-section").forEach(section => section.classList.add("is-hidden"));
    panel.querySelector(".settings-category-grid")?.classList.add("is-hidden");
    panel.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
  }

  function showAccountView(panel) {
    restoreLegacyAccountSection(panel);
    const view = createAccountView(panel);
    refreshCardValues(panel);
    hideAllSettingsContent(panel);
    view.classList.remove("is-hidden");

    const header = panel.querySelector(".settings-category-view-header");
    header?.classList.remove("is-hidden");
    const title = header?.querySelector(".settings-category-view-title");
    const description = header?.querySelector(".settings-category-view-description");
    if (title) title.textContent = "Account";
    if (description) description.textContent = "Manage your personal and business details.";

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    if (pageTitle) pageTitle.textContent = "Account";
    if (pageSubtitle) pageSubtitle.textContent = "Manage your personal and business details.";
  }

  function showSettingsHome(panel) {
    accountView?.classList.add("is-hidden");
    panel.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    panel.querySelector(".settings-category-grid")?.classList.remove("is-hidden");
    panel.querySelectorAll(".settings-section").forEach(section => section.classList.add("is-hidden"));
    panel.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    if (pageTitle) pageTitle.textContent = "Settings";
    if (pageSubtitle) pageSubtitle.textContent = "Manage your JobPilot account.";
  }

  function install(panel) {
    if (!panel || panel.dataset.accountViewFixInstalled === "true") return;
    panel.dataset.accountViewFixInstalled = "true";

    restoreLegacyAccountSection(panel);
    createAccountView(panel);

    if (!document.getElementById("jobpilot-settings-account-fix-styles")) {
      const style = document.createElement("style");
      style.id = "jobpilot-settings-account-fix-styles";
      style.textContent = `
        .settings-account-view { margin: 0 0 18px; }
        .settings-account-view.is-hidden { display: none !important; }
        .settings-account-cards-clean {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .settings-account-info-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: var(--radius, 12px);
          box-shadow: var(--shadow, 0 2px 8px rgba(15, 23, 42, .04));
          padding: 24px;
        }
        .settings-account-info-card h2 { margin: 0 0 18px; }
        .settings-account-field { margin: 0 0 16px; }
        .settings-account-field:last-child { margin-bottom: 0; }
        .settings-account-field label { display: block; margin: 0 0 7px; font-weight: 600; }
        .settings-account-field input,
        .settings-account-field textarea,
        .settings-account-field select { width: 100%; box-sizing: border-box; }
        @media (max-width: 900px) {
          .settings-account-cards-clean { grid-template-columns: 1fr; }
        }
      `;
      document.head.appendChild(style);
    }

    const categoryGrid = panel.querySelector(".settings-category-grid");
    if (categoryGrid && categoryGrid.dataset.accountFixClickBound !== "true") {
      categoryGrid.dataset.accountFixClickBound = "true";
      categoryGrid.addEventListener("click", (event) => {
        const card = event.target.closest(".settings-category-card");
        if (!card) return;
        const title = card.querySelector(".settings-category-card-title")?.textContent.trim();
        if (title !== "Account") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showAccountView(panel);
      }, true);
    }

    const back = panel.querySelector(".settings-category-back");
    if (back && back.dataset.accountFixClickBound !== "true") {
      back.dataset.accountFixClickBound = "true";
      back.addEventListener("click", () => showSettingsHome(panel), true);
    }
  }

  function scan() {
    const panel = getPanel();
    if (panel) install(panel);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
})();
