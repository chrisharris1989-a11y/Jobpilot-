// =====================================================
// JOBPILOT SETTINGS ACCOUNT NAVIGATION
// =====================================================
// Settings > Account > Personal Details / Business Details
// =====================================================

(function () {
  const GROUPS = {
    personal: { title: "Personal Details", description: "Your name and contact details.", fields: ["settingsContactName", "settingsPhone"] },
    business: { title: "Business Details", description: "Your business name, email and address.", fields: ["settingsBusinessName", "settingsBusinessEmail", "settingsAddress"] }
  };
  let accountPage = null;
  let detailPage = null;

  const getPanel = () => document.querySelector(".settings-panel");
  const getField = id => document.getElementById(id);
  const labels = { settingsContactName:"Name", settingsPhone:"Phone", settingsBusinessName:"Business name", settingsBusinessEmail:"Business email", settingsAddress:"Address" };

  function styles() {
    if (document.getElementById("jobpilot-account-hierarchy-styles")) return;
    const s=document.createElement("style"); s.id="jobpilot-account-hierarchy-styles";
    s.textContent=`
      .settings-account-landing.is-hidden,.settings-account-detail-view.is-hidden{display:none!important}
      .settings-account-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-bottom:18px}
      .settings-account-choice-card{position:relative;min-height:130px;width:100%;padding:24px;text-align:left;font:inherit;color:inherit;background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:var(--radius,12px);box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04));cursor:pointer}
      .settings-account-choice-title{display:block;font-size:18px;font-weight:700;margin-bottom:8px}.settings-account-choice-description{display:block;font-size:14px;opacity:.7}.settings-account-choice-arrow{position:absolute;right:20px;top:50%;font-size:28px;transform:translateY(-50%);opacity:.5}
      .settings-account-detail-back{margin:0 0 18px;border:1px solid var(--border,#e5e7eb);background:var(--surface,#fff);color:inherit;border-radius:10px;padding:9px 13px;cursor:pointer;font:inherit;font-weight:600}
      .settings-account-detail-card{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:var(--radius,12px);box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04));padding:24px}.settings-account-detail-title{margin:0 0 6px}.settings-account-detail-description{margin:0 0 22px;opacity:.7}.settings-account-detail-field{margin-bottom:17px}.settings-account-detail-field label{display:block;margin-bottom:7px;font-weight:600}.settings-account-detail-field input,.settings-account-detail-field textarea,.settings-account-detail-field select{width:100%;box-sizing:border-box}
      @media(max-width:700px){.settings-account-choice-grid{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function hideOriginal(p){
    p.querySelectorAll(".settings-section").forEach(x=>x.classList.add("is-hidden"));
    p.querySelector(".settings-category-grid")?.classList.add("is-hidden");
    p.querySelector(".settings-save-actions")?.classList.add("is-hidden");
    document.getElementById("deleteAccountCard")?.classList.add("is-hidden");
  }
  function pageText(t,d){const a=document.getElementById("pageTitle"),b=document.getElementById("pageSubtitle");if(a)a.textContent=t;if(b)b.textContent=d;}

  function createAccountPage(p){
    if(accountPage?.isConnected)return;
    accountPage=document.createElement("div"); accountPage.className="settings-account-landing is-hidden";
    accountPage.innerHTML=`<div class="settings-account-choice-grid">
      <button type="button" class="settings-account-choice-card" data-account-choice="personal"><span class="settings-account-choice-title">Personal Details</span><span class="settings-account-choice-description">Your name and contact details.</span><span class="settings-account-choice-arrow">›</span></button>
      <button type="button" class="settings-account-choice-card" data-account-choice="business"><span class="settings-account-choice-title">Business Details</span><span class="settings-account-choice-description">Your business name, email and address.</span><span class="settings-account-choice-arrow">›</span></button>
    </div>`;
    p.appendChild(accountPage);
    accountPage.addEventListener("click",e=>{const c=e.target.closest("[data-account-choice]");if(!c)return;e.preventDefault();e.stopImmediatePropagation();openDetail(p,c.dataset.accountChoice)},true);
  }

  function createDetailPage(p){
    if(detailPage?.isConnected)return;
    detailPage=document.createElement("div"); detailPage.className="settings-account-detail-view is-hidden";
    detailPage.innerHTML=`<button type="button" class="settings-account-detail-back">← Back to Account</button><section class="settings-account-detail-card"><h2 class="settings-account-detail-title"></h2><p class="settings-account-detail-description"></p><div class="settings-account-detail-body"></div></section>`;
    p.appendChild(detailPage);
    detailPage.querySelector(".settings-account-detail-back").addEventListener("click",()=>{detailPage.classList.add("is-hidden");accountPage.classList.remove("is-hidden");pageText("Account","Manage your personal and business details.")});
  }

  function openDetail(p,key){
    const group=GROUPS[key]; createAccountPage(p); createDetailPage(p);
    const body=detailPage.querySelector(".settings-account-detail-body"); body.replaceChildren();
    group.fields.forEach(id=>{
      const source=getField(id); if(!source)return;
      const row=document.createElement("div");row.className="settings-account-detail-field";
      const label=document.createElement("label");label.textContent=labels[id];
      const input=source.cloneNode(true);input.id=`${id}-account-detail`;input.removeAttribute("name");label.htmlFor=input.id;
      input.value=source.value;
      input.addEventListener("input",()=>source.value=input.value);
      input.addEventListener("change",()=>{source.value=input.value;source.dispatchEvent(new Event("change",{bubbles:true}))});
      row.append(label,input);body.appendChild(row);
    });
    hideOriginal(p); accountPage.classList.add("is-hidden"); detailPage.classList.remove("is-hidden");
    pageText(group.title,group.description);
  }

  function showAccount(p){createAccountPage(p);createDetailPage(p);hideOriginal(p);detailPage.classList.add("is-hidden");accountPage.classList.remove("is-hidden");p.querySelector(".settings-category-view-header")?.classList.add("is-hidden");pageText("Account","Manage your personal and business details.");}
  function showSettings(p){accountPage?.classList.add("is-hidden");detailPage?.classList.add("is-hidden");p.querySelector(".settings-category-view-header")?.classList.add("is-hidden");p.querySelector(".settings-category-grid")?.classList.remove("is-hidden");p.querySelectorAll(".settings-section").forEach(x=>x.classList.add("is-hidden"));document.getElementById("deleteAccountCard")?.classList.add("is-hidden");pageText("Settings","Manage your JobPilot account.");}

  function bind(p){
    styles();createAccountPage(p);createDetailPage(p);
    const grid=p.querySelector(".settings-category-grid");
    if(grid&&!grid.dataset.accountHierarchyBound){grid.dataset.accountHierarchyBound="1";grid.addEventListener("click",e=>{const c=e.target.closest(".settings-category-card");if(!c)return;if(c.querySelector(".settings-category-card-title")?.textContent.trim()!=="Account")return;e.preventDefault();e.stopImmediatePropagation();showAccount(p)},true)}
    const back=p.querySelector(".settings-category-back");
    if(back&&!back.dataset.accountHierarchyBound){back.dataset.accountHierarchyBound="1";back.addEventListener("click",()=>showSettings(p),true)}
  }
  const observer=new MutationObserver(()=>{const p=getPanel();if(p)bind(p)}); observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{const p=getPanel();if(p)bind(p)},100);
})();