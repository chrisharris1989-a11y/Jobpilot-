const CATEGORIES = [
  { id: "business", icon: "💼", title: "Business", description: "Pricing, profit, costs and business calculations." },
  { id: "electrical", icon: "⚡", title: "Electrical", description: "Electrical calculations for everyday trade work." },
  { id: "plumbing", icon: "🚰", title: "Plumbing", description: "Flow, pressure, pipe and water calculations." },
  { id: "construction", icon: "🧱", title: "Construction", description: "Measurements, materials, quantities and building calculations." },
  { id: "cleaning", icon: "🧽", title: "Cleaning", description: "Cleaning prices, time, chemicals and usage calculations." },
  { id: "trade", icon: "🛠️", title: "Trade", description: "General trade, labour, travel and measurement calculations." }
];

function renderCalculators() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Calculators";
  if (subtitle) subtitle.textContent = "Practical calculators for your business and trade work.";

  content.innerHTML = `
    <div class="jp-calculators-page">
      <div class="page-actions">
        <div><h2>Calculators</h2><p>Choose a category to find the calculator you need.</p></div>
      </div>
      <div class="jp-calculator-grid">
        ${CATEGORIES.map(c => `
          <button class="jp-calculator-category" type="button" data-category="${c.id}">
            <span class="jp-calculator-icon">${c.icon}</span>
            <span><strong>${c.title}</strong><small>${c.description}</small></span>
            <span class="jp-calculator-arrow">→</span>
          </button>`).join("")}
      </div>
    </div>`;

  if (!document.getElementById("jp-calculators-styles")) {
    const style = document.createElement("style");
    style.id = "jp-calculators-styles";
    style.textContent = `
      .jp-calculators-page{display:flex;flex-direction:column;gap:18px}
      .jp-calculator-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .jp-calculator-category{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:14px;align-items:center;text-align:left;padding:20px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04));font:inherit;color:inherit;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
      .jp-calculator-category:hover{border-color:#cbd5e1;transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,23,42,.08)}
      .jp-calculator-icon{font-size:27px;text-align:center}
      .jp-calculator-category strong{display:block;margin-bottom:5px;font-size:16px}
      .jp-calculator-category small{display:block;color:#64748b;line-height:1.45}
      .jp-calculator-arrow{font-size:21px;color:#64748b}
      @media(max-width:760px){.jp-calculator-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }
}

window.JobPilotCalculators = { open: renderCalculators, categories: CATEGORIES };
