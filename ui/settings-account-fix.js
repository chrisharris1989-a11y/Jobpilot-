// =====================================================
// JOBPILOT ACCOUNT PAGE
// =====================================================
// Settings > Account
// One page containing two sections:
// Personal Details and Business Details.
// =====================================================

(function () {
  const GROUPS = [
    {
      title: "Personal Details",
      description: "Your name and contact details.",
      fields: [
        ["settingsContactName", "Name"],
        ["settingsPhone", "Phone"]
      ]
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

  let page;

  function panel() {
    return document.querySelector(".settings-panel");
  }

  function source(id) {
    return document.querySelector(`#${id}`) || document.querySelector(`[id="${id}"]`);
  }

  function css() {
    if (document.getElementById("jobpilot-account-page-css")) return;
    const style = document.createElement("style");
    style.id = "jobpilot-account-page-css";
    style.textContent = `
      .jobpilot-account-page { display:block; }
      .jobpilot-account-page.is-hidden { display:none!important; }
      .jobpilot-account-sections { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
      .jobpilot-account-section { box-sizing:border-box; background:var(--surface,#fff); border:1px solid var(--border,#e5e7eb); border-radius:var(--radius,12px); padding:24px; }
      .jobpilot-account-section h2 { margin:0 0 6px; font-size:19px; }
      .jobpilot-account-section .account-description { margin:0 0 20px; opacity:.7; font-size:14px; }
      .jobpilot-account-field { margin-bottom:16px; }
      .jobpilot-account-field:last-child { margin-bottom:0; }
      .jobpilot-account-field label { display:block; margin-bottom:7px; font-weight:600; }
      .jobpilot-account-field input, .jobpilot-account-field textarea, .jobpilot-account-field select { width:100%; box-sizing:border-box; }
      .jobpilot-account-back { margin:0 0 18px; border:1px solid var(--border,#e5e7eb); background:var(--surface,#fff); color:inherit; border-radius:10px; padding:9px 13px; cursor:pointer; font:inherit; font-weight:600; }
      @media(max-width:900px) { .jobpilot-account-sections { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  function hideOriginal(p) {
    p.querySelector(".settings-category-grid")?.classList.add("is-hidden");
    p.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    p.querySelectorAll(".settings-section").forEach(section => section.classList.add("is-hidden"));
    p.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
  }

  function showSettings(p) {
    page?.classList.add("is-hidden");
    p.querySelector(".settings-category-grid")?.classList.remove("is-hidden");
    p.querySelectorAll(".settings-section").forEach(section => section.classList.add("is-hidden"));
    p.querySelector(".settings-category-view-header")?.classList.add("is-hidden");
    p.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
    const title=document.getElementById("pageTitle");
    const subtitle=document.getElementById("pageSubtitle");
    if(title) title.textContent="Settings";
    if(subtitle) subtitle.textContent="Manage your JobPilot account.";
  }

  function makeField(id, labelText) {
    const original = source(id);
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

    field.value = original.value || "";
    field.id = `${id}-account-page`;
    field.placeholder = original.placeholder || "";
    field.autocomplete = original.autocomplete || "off";
    label.htmlFor = field.id;

    field.addEventListener("input", () => { original.value = field.value; });
    field.addEventListener("change", () => {
      original.value = field.value;
      original.dispatchEvent(new Event("change", { bubbles:true }));
      original.dispatchEvent(new Event("input", { bubbles:true }));
    });

    row.append(label, field);
    return row;
  }

  function build() {
    const p = panel();
    if (!p) return;

    if (!page || !page.isConnected) {
      page = document.createElement("div");
      page.className = "jobpilot-account-page is-hidden";
      page.innerHTML = `
        <button type="button" class="jobpilot-account-back">← Back to Settings</button>
        <div class="jobpilot-account-sections">
          ${GROUPS.map((group, i) => `
            <section class="jobpilot-account-section" data-group="${i}">
              <h2>${group.title}</h2>
              <p class="account-description">${group.description}</p>
              <div class="jobpilot-account-fields"></div>
            </section>
          `).join("")}
        </div>
      `;
      p.appendChild(page);

      page.querySelector(".jobpilot-account-back").addEventListener("click", e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        showSettings(p);
      }, true);
    }

    GROUPS.forEach((group, index) => {
      const body = page.querySelector(`[data-group="${index}"] .jobpilot-account-fields`);
      if (!body) return;
      body.replaceChildren();
      group.fields.forEach(([id, label]) => {
        const field = makeField(id, label);
        if (field) body.appendChild(field);
      });
    });
  }

  function openAccount() {
    const p = panel();
    if (!p) return;
    build();
    hideOriginal(p);
    page.classList.remove("is-hidden");
    const title=document.getElementById("pageTitle");
    const subtitle=document.getElementById("pageSubtitle");
    if(title) title.textContent="Account";
    if(subtitle) subtitle.textContent="Manage your personal and business details.";
  }

  function bind() {
    const p = panel();
    if (!p) return;
    css();
    build();

    const grid=p.querySelector(".settings-category-grid");
    if(grid && !grid.dataset.jobpilotAccountBound){
      grid.dataset.jobpilotAccountBound="1";
      grid.addEventListener("click", e=>{
        const card=e.target.closest(".settings-category-card");
        if(!card) return;
        const title=card.querySelector(".settings-category-card-title")?.textContent.trim();
        if(title!=="Account") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        openAccount();
      }, true);
    }
  }

  const observer=new MutationObserver(bind);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(bind,100);
})();
