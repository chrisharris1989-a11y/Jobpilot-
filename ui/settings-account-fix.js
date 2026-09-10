// =====================================================
// JOBPILOT SETTINGS ACCOUNT
// =====================================================
// Settings > Account is a clean two-card landing page:
// Personal Details + Business Details.
// Clicking either card opens its own detail view.
// =====================================================

(function () {
  const GROUPS = {
    personal: {
      title: "Personal Details",
      description: "Your name and contact details.",
      fields: ["settingsContactName", "settingsPhone"]
    },
    business: {
      title: "Business Details",
      description: "Your business name, email and address.",
      fields: ["settingsBusinessName", "settingsBusinessEmail", "settingsAddress"]
    }
  };

  let accountPage = null;
  let detailPage = null;
  let installedPanel = null;

  const labels = {
    settingsContactName: "Name",
    settingsPhone: "Phone",
    settingsBusinessName: "Business name",
    settingsBusinessEmail: "Business email",
    settingsAddress: "Address"
  };

  function panel() {
    return document.querySelector(".settings-panel");
  }

  function field(id) {
    return document.getElementById(id);
  }

  function hideOriginalSettings(panel) {
    panel.querySelectorAll(".settings-section").forEach(section => {
      section.classList.add("is-hidden");
    });
    panel.querySelector(".settings-category-grid")?.classList.add("is-hidden");
    panel.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
  }

  function showHome(panel) {
    detailPage?.classList.add("is-hidden");
    accountPage?.classList.add("is-hidden");
    panel.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    panel.querySelector(".settings-category-grid")?.classList.remove("is-hidden");
    panel.querySelectorAll(".settings-section").forEach(section => section.classList.add("is-hidden"));
    panel.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
    setPageText("Settings", "Manage your JobPilot account.");
  }

  function setPageText(title, description) {
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle) pageSubtitle.textContent = description;
  }

  function makeCard(groupKey, group) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "settings-account-choice-card";
    card.dataset.accountChoice = groupKey;
    card.innerHTML = `
      <span class="settings-account-choice-title">${group.title}</span>
      <span class="settings-account-choice-description">${group.description}</span>
      <span class="settings-account-choice-arrow">›</span>
    `;
    return card;
  }

  function createAccountPage(panel) {
    if (accountPage?.isConnected) return accountPage;

    accountPage = document.createElement("div");
    accountPage.className = "settings-account-landing is-hidden";
    accountPage.innerHTML = `
      <div class="settings-account-choice-grid"></div>
    `;

    const grid = accountPage.querySelector(".settings-account-choice-grid");
    Object.entries(GROUPS).forEach(([key, group]) => {
      const card = makeCard(key, group);
      card.addEventListener("click", () => openDetail(panel, key));
      grid.appendChild(card);
    });

    panel.appendChild(accountPage);
    return accountPage;
  }

  function copyField(source, target, suffix) {
    if (!source) return;

    const existing = target.querySelector(`#${source.id}-${suffix}`);
    if (existing) {
      existing.value = source.value;
      return;
    }

    const row = document.createElement("div");
    row.className = "settings-account-detail-field";

    const label = document.createElement("label");
    label.textContent = labels[source.id] || source.previousElementSibling?.textContent?.trim() || source.id;

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
    target.appendChild(row);
  }

  function populateDetail(panel, key) {
    if (!detailPage?.isConnected) return;
    const group = GROUPS[key];
    const body = detailPage.querySelector(".settings-account-detail-body");
    if (!body) return;

    group.fields.forEach(id => copyField(field(id), body, "account-detail"));

    group.fields.forEach(id => {
      const source = field(id);
      const clone = body.querySelector(`#${id}-account-detail`);
      if (source && clone && document.activeElement !== clone) clone.value = source.value;
    });
  }

  function openDetail(panel, key) {
    const group = GROUPS[key];
    createAccountPage(panel);

    if (!detailPage?.isConnected) {
      detailPage = document.createElement("div");
      detailPage.className = "settings-account-detail-view is-hidden";
      detailPage.innerHTML = `
        <button type="button" class="settings-account-detail-back">← Back to Account</button>
        <div class="settings-account-detail-card">
          <h2 class="settings-account-detail-title"></h2>
          <p class="settings-account-detail-description"></p>
          <div class="settings-account-detail-body"></div>
        </div>
      `;
      panel.appendChild(detailPage);
      detailPage.querySelector(".settings-account-detail-back")?.addEventListener("click", () => {
        detailPage.classList.add("is-hidden");
        accountPage?.classList.remove("is-hidden");
        setPageText("Account", "Manage your personal and business details.");
      });
    }

    detailPage.querySelector(".settings-account-detail-title").textContent = group.title;
    detailPage.querySelector(".settings-account-detail-description").textContent = group.description;
    detailPage.querySelector(".settings-account-detail-body").replaceChildren();
    populateDetail(panel, key);

    hideOriginalSettings(panel);
    accountPage.classList.add("is-hidden");
    detailPage.classList.remove("is-hidden");
    setPageText(group.title, group.description);
  }

  function showAccount(panel) {
    createAccountPage(panel);
    hideOriginalSettings(panel);
    detailPage?.classList.add("is-hidden");
    accountPage.classList.remove("is-hidden");
    panel.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    setPageText("Account", "Manage your personal and business details.");
  }

  function installStyles() {
    if (document.getElementById("jobpilot-settings-account-clean-styles")) return;
    const style = document.createElement("style");
    style.id = "jobpilot-settings-account-clean-styles";
    style.textContent = `
      .settings-account-landing,
      .settings-account-detail-view { margin: 0 0 18px; }
      .settings-account-landing.is-hidden,
      .settings-account-detail-view.is-hidden { display: none !important; }
      .settings-account-choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
      .settings-account-choice-card { position: relative; min-height: 150px; width: 100%; padding: 24px; text-align: left; font: inherit; color: inherit; background: var(--surface, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: var(--radius, 12px); box-shadow: var(--shadow, 0 2px 8px rgba(15,23,42,.04)); cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
      .settings-account-choice-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(15,23,42,.08); border-color: var(--primary, #cbd5e1); }
      .settings-account-choice-title { display: block; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
      .settings-account-choice-description { display: block; max-width: 90%; font-size: 14px; line-height: 1.5; opacity: .72; }
      .settings-account-choice-arrow { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 28px; opacity: .5; }
      .settings-account-detail-back { margin: 0 0 18px; border: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff); color: inherit; border-radius: 10px; padding: 9px 13px; cursor: pointer; font: inherit; font-weight: 600; }
      .settings-account-detail-card { background: var(--surface, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: var(--radius, 12px); box-shadow: var(--shadow, 0 2px 8px rgba(15,23,42,.04)); padding: 24px; }
      .settings-account-detail-title { margin: 0 0 6px; }
      .settings-account-detail-description { margin: 0 0 22px; opacity: .7; }
      .settings-account-detail-field { margin: 0 0 17px; }
      .settings-account-detail-field:last-child { margin-bottom: 0; }
      .settings-account-detail-field label { display: block; margin: 0 0 7px; font-weight: 600; }
      .settings-account-detail-field input, .settings-account-detail-field textarea, .settings-account-detail-field select { width: 100%; box-sizing: border-box; }
      @media (max-width: 700px) { .settings-account-choice-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function bindAccountCard(panel) {
    const grid = panel.querySelector(".settings-category-grid");
    if (!grid || grid.dataset.cleanAccountBound === "true") return;
    grid.dataset.cleanAccountBound = "true";

    grid.addEventListener("click", event => {
      const card = event.target.closest(".settings-category-card");
      if (!card) return;
      const title = card.querySelector(".settings-category-card-title")?.textContent.trim();
      if (title !== "Account") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showAccount(panel);
    }, true);
  }

  function install() {
    const p = panel();
    if (!p) return;
    installedPanel = p;
    installStyles();
    createAccountPage(p);
    bindAccountCard(p);

    // Business fields can load asynchronously. Detail views are populated on click,
    // so they always read the current fields from the real Settings form.
  }

  const observer = new MutationObserver(() => install());
  observer.observe(document.body, { childList: true, subtree: true });
  install();
})();
