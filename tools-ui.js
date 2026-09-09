import "./job-planner.js";

function getToolsButton() { return document.getElementById("jobpilot-tools-button"); }
function setToolsActive() { document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active")); getToolsButton()?.classList.add("active"); }

function renderToolsPage() {
  const content = document.getElementById("pageContent"); if (!content) return;
  const title = document.getElementById("pageTitle"); const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Tools";
  if (subtitle) subtitle.textContent = "Practical tools to help you plan and run your work.";
  setToolsActive();
  content.innerHTML = `
    <div class="jp-tools-page">
      <div class="page-actions"><div><h2>Tools</h2><p>Practical tools that connect directly to your JobPilot data.</p></div></div>
      <div class="jp-tools-grid">
        <button class="jp-tool-card" id="jp-open-job-planner" type="button"><span class="jp-tool-icon">📋</span><span><strong>Job Planner</strong><small>Break a job into tasks, dates and responsibilities.</small></span><span class="jp-tool-arrow">→</span></button>
        <button class="jp-tool-card" id="jp-open-calculators" type="button"><span class="jp-tool-icon">🧮</span><span><strong>Calculators</strong><small>Useful business and trade calculators for pricing, costs, measurements and more.</small></span><span class="jp-tool-arrow">→</span></button>
      </div>
    </div>`;
  if (!document.getElementById("jp-tools-styles")) {
    const style=document.createElement("style"); style.id="jp-tools-styles"; style.textContent=`.jp-tools-page{display:flex;flex-direction:column;gap:18px}.jp-tools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.jp-tool-card{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:14px;align-items:center;text-align:left;padding:18px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04));font:inherit;color:inherit}.jp-tool-card:not(.jp-tool-card-locked){cursor:pointer}.jp-tool-card:not(.jp-tool-card-locked):hover{border-color:#cbd5e1;transform:translateY(-1px)}.jp-tool-icon{font-size:25px;text-align:center}.jp-tool-card strong{display:block;margin-bottom:4px}.jp-tool-card small{display:block;color:#64748b;line-height:1.45}.jp-tool-arrow{font-size:20px;color:#64748b}.jp-tool-lock{font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#f1f5f9;color:#475569}.jp-tool-card-locked{opacity:.68}@media(max-width:760px){.jp-tools-grid{grid-template-columns:1fr}}`; document.head.appendChild(style);
  }
  document.getElementById("jp-open-job-planner")?.addEventListener("click",()=>window.JobPilotJobPlanner?.open());
  document.getElementById("jp-open-calculators")?.addEventListener("click",()=>window.JobPilotCalculators?.open());
}

function addToolsButton() {
  const managementButton = document.getElementById("jobpilot-management-button"); if (!managementButton || getToolsButton()) return;
  const button=document.createElement("button"); button.id="jobpilot-tools-button"; button.className="nav-item"; button.type="button"; button.textContent="🛠️ Tools"; button.addEventListener("click",renderToolsPage); managementButton.insertAdjacentElement("afterend",button);
}
addToolsButton();
const toolsNavObserver=new MutationObserver(()=>addToolsButton()); toolsNavObserver.observe(document.body,{childList:true,subtree:true});
