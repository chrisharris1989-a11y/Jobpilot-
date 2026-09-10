// =====================================================
// JOBPILOT SETTINGS ACCOUNT PAGE
// =====================================================
// Settings > Account
// One page containing two sections:
// 1. Personal Details
// 2. Business Details
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

  const getPanel = () => document.querySelector(".settings-panel");
  const getField = id => document.getElementById(id);
  const labels = {
    settingsContactName: "Name",
    settingsPhone: "Phone",
    settingsBusinessName: "Business name",
    settingsBusinessEmail: "Business email",
    settingsAddress: "Address"
  };

  function styles() {
    if (document.getElementById("jobpilot-account-page-styles")) return;
    const s = document.createElement("style");
    s.id = "jobpilot-account-page-styles";
    s.textContent = `
      .settings-account-page.is-hidden { display:none!important; }
      .settings-account-sections { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
      .settings-account-section { background:var(--surface,#fff); border:1px solid var(--border,#e5e7eb); border-radius:var(--radius,12px); box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04)); padding:24px; }
      .settings-account-section h2 { margin:0 0 6px; font-size:19px; }
      .settings-account-section > p { margin:0 0 22px; opacity:.7; font-size:14px; }
      .settings-account-field { margin-bottom:17px; }
      .settings-account-field:last-child { margin-bottom:0; }
      .settings-account-field label { display:block; margin-bottom:7px; font-weight:600; }
      .settings-account-field input, .settings-account-field textarea, .settings-account-field select { width:100%; box-sizing:border-box; }
      .settings-account-back { margin:0 0 18px; border:1px solid var(--border,#e5e7eb); background:var(--surface,#fff); color:inherit; border-radius:10px; padding:9px 13px; cursor:pointer; font:inherit; font-weight:600; }
      @media(max-width:900px) { .settings-account-sections { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(s);
  }

  function hideOriginal(p) {
    p.querySelectorAll(".settings-section").forEach(x => x.classList.add("is-hidden"));
    p.querySelector(".settings-category-grid")?.classList.add("is-hidden");
    p.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
  }

  function pageText(title, subtitle) {
    const a = document.getElementById("pageTitle");
    const b = document.getElementById("pageSubtitle");
    if (a) a.textContent = title;
    if (b) b.textContent = subtitle;
  }

  function createAccountPage(p) {
    if (accountPage?.isConnected) return;

    accountPage = document.createElement("div");
    accountPage.className = "settings-account-page is-hidden";
    accountPage.innerHTML = `
      <button type="button" class="settings-account-back">← Back to Settings</button>
      <div class="settings-account-sections">
        <section class="settings-account-section" data-account-section="personal">
          <h2>Personal Details</h2>
          <p>Your name and contact details.</p>
          <div class="settings-account-fields"></div>
        </section>
        <section class="settings-account-section" data-account-section="business">
          <h2>Business Details</h2>
          <p>Your business name, email and address.</p>
          <div class="settings-account-fields"></div>
        </section>
      </div>
    `;

    p.appendChild(accountPage);

    accountPage.querySelector(".settings-account-back").addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      showSettings(p);
    }, true);
  }

  function populateAccountPage(p) {
    if (!accountPage?.isConnected) createAccountPage(p);

    Object.entries(GROUPS).forEach(([key, group]) => {
      const section = accountPage.querySelector(`[data-account-section="${key}"]`);
      const body = section?.querySelector(".settings-account-fields");
      if (!body) return;

      body.replaceChildren();

      group.fields.forEach(id => {
        const source = getField(id);
        if (!source) return;

        const row = document.createElement("div");
        row.className = "settings-account-field";

        const label = document.createElement("label");
        label.textContent = labels[id];

        const input = source.cloneNode(true);
        input.id = `${id}-account-page`;
        input.removeAttribute("name");
        input.value = source.value;
        label.htmlFor = input.id;

        input.addEventListener("input", () => {
          source.value = input.value;
        });
        input.addEventListener("change", () => {
          source.value = input.value;
          source.dispatchEvent(new Event("change", { bubbles:true }));
        });

        row.append(label, input);
        body.appendChild(row);
      });
    });
  }

  function showAccount(p) {
    createAccountPage(p);
    populateAccountPage(p);
    hideOriginal(p);
    accountPage.classList.remove("is-hidden");
    p.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    pageText("Account", "Manage your personal and business details.");
  }

  function showSettings(p) {
    accountPage?.classList.add("is-hidden");
    p.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    p.querySelector(".settings-category-grid")?.classList.remove("is-hidden");
    p.querySelectorAll(".settings-section").forEach(x => x.classList.add("is-hidden"));
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
    pageText("Settings", "Manage your JobPilot account.");
  }

  function bind(p) {
    styles();
    createAccountPage(p);

    const grid = p.querySelector(".settings-category-grid");
    if (grid && !grid.dataset.accountPageBound) {
      grid.dataset.accountPageBound = "1";
      grid.addEventListener("click", e => {
        const card = e.target.closest(".settings-category-card");
        if (!card) return;
        const title = card.querySelector(".settings-category-card-title")?.textContent.trim();
        if (title !== "Account") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        showAccount(p);
      }, true);
    }
  }

  const observer = new MutationObserver(() => {
    const p = getPanel();
    if (p) bind(p);
  });

  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(() => {
    const p = getPanel();
    if (p) bind(p);
  }, 100);
})();
