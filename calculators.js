const CATEGORIES = [
  { id: "business", icon: "💼", title: "Business", description: "Pricing, profit, costs and business calculations." },
  { id: "electrical", icon: "⚡", title: "Electrical", description: "Electrical calculations for everyday trade work." },
  { id: "plumbing", icon: "🚰", title: "Plumbing", description: "Flow, pressure, pipe and water calculations." },
  { id: "construction", icon: "🧱", title: "Construction", description: "Measurements, materials, quantities and building calculations." },
  { id: "cleaning", icon: "🧽", title: "Cleaning", description: "Cleaning prices, time, chemicals and usage calculations." },
  { id: "trade", icon: "🛠️", title: "Trade", description: "General trade, labour, travel and measurement calculations." }
];

const BUSINESS_CALCULATORS = [
  { id: "job-pricing", icon: "💷", title: "Job Pricing Calculator", description: "Work out a recommended job price from labour, materials, costs and target profit." },
  { id: "profit-margin", icon: "📈", title: "Profit Margin Calculator", description: "Calculate profit and profit margin from your selling price and total costs." },
  { id: "hourly-rate", icon: "⏱️", title: "Hourly Rate Calculator", description: "Calculate the hourly rate you need to cover costs and reach your income target." },
  { id: "break-even", icon: "⚖️", title: "Break-Even Calculator", description: "Find how many jobs you need to cover your fixed and variable costs." },
  { id: "markup", icon: "💰", title: "Markup Calculator", description: "Add your desired markup to a cost and calculate the selling price and profit." }
];

const money = value => `£${Number(value || 0).toFixed(2)}`;
const num = id => Number(document.getElementById(id)?.value || 0);

function showCalculatorsPage(titleText, subtitleText, cards, back) {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = titleText;
  if (subtitle) subtitle.textContent = subtitleText;

  content.innerHTML = `
    <div class="jp-calculators-page">
      <div class="page-actions">
        <button type="button" class="jp-calculator-back" id="jp-calculator-back">← Back</button>
        <div><h2>${titleText}</h2><p>${subtitleText}</p></div>
      </div>
      <div class="jp-calculator-grid">
        ${cards.map(c => `
          <button class="jp-calculator-category" type="button" data-calculator="${c.id}">
            <span class="jp-calculator-icon">${c.icon}</span>
            <span><strong>${c.title}</strong><small>${c.description}</small></span>
            <span class="jp-calculator-arrow">→</span>
          </button>`).join("")}
      </div>
    </div>`;
  document.getElementById("jp-calculator-back")?.addEventListener("click", back);
  content.querySelectorAll("[data-calculator]").forEach(button => {
    button.addEventListener("click", () => openBusinessCalculator(button.dataset.calculator));
  });
}

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

  content.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.category === "business") {
        renderBusinessCalculators();
      }
    });
  });
  ensureStyles();
}

function renderBusinessCalculators() {
  showCalculatorsPage(
    "Business Calculators",
    "Pricing, profit and business calculations.",
    BUSINESS_CALCULATORS,
    renderCalculators
  );
}

function calculatorShell(titleText, description, fields, outputId) {
  const content = document.getElementById("pageContent");
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = titleText;
  if (subtitle) subtitle.textContent = description;
  content.innerHTML = `
    <div class="jp-calculator-form-page">
      <div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-calculator-form-back">← Back</button><div><h2>${titleText}</h2><p>${description}</p></div></div>
      <div class="jp-calculator-panel">
        <div class="jp-calculator-fields">${fields}</div>
        <div class="jp-calculator-output" id="${outputId}">Enter your figures to calculate.</div>
      </div>
    </div>`;
  document.getElementById("jp-calculator-form-back")?.addEventListener("click", renderBusinessCalculators);
}

const field = (id, label, type = "number", step = "0.01", placeholder = "0") => `
  <label class="jp-calculator-field"><span>${label}</span><input id="${id}" type="${type}" min="0" step="${step}" placeholder="${placeholder}"></label>`;

function bindInputs(ids, calculate) {
  ids.forEach(id => document.getElementById(id)?.addEventListener("input", calculate));
  calculate();
}

function openBusinessCalculator(id) {
  if (id === "job-pricing") {
    calculatorShell("Job Pricing Calculator", "Calculate a recommended price based on your costs and target profit.",
      field("jp-hours", "Labour hours") + field("jp-labour-rate", "Labour rate (£/hour)") + field("jp-materials", "Materials (£)") + field("jp-other-costs", "Other job costs (£)") + field("jp-overheads", "Overheads allocated to job (£)") + field("jp-margin", "Target profit margin (%)"), "jp-job-pricing-output");
    bindInputs(["jp-hours","jp-labour-rate","jp-materials","jp-other-costs","jp-overheads","jp-margin"], () => {
      const labour = num("jp-hours") * num("jp-labour-rate");
      const costs = labour + num("jp-materials") + num("jp-other-costs") + num("jp-overheads");
      const margin = Math.min(Math.max(num("jp-margin"), 0), 99.99);
      const price = costs / (1 - margin / 100);
      const profit = price - costs;
      document.getElementById("jp-job-pricing-output").innerHTML = `<strong>Recommended price: ${money(price)}</strong><span>Total job cost: ${money(costs)}</span><span>Estimated profit: ${money(profit)}</span><span>Profit margin: ${margin.toFixed(2)}%</span>`;
    });
  }

  if (id === "profit-margin") {
    calculatorShell("Profit Margin Calculator", "Calculate your profit and margin from selling price and total cost.",
      field("jp-selling-price", "Selling price (£)") + field("jp-total-cost", "Total cost (£)"), "jp-profit-output");
    bindInputs(["jp-selling-price","jp-total-cost"], () => {
      const price = num("jp-selling-price"), cost = num("jp-total-cost"), profit = price - cost;
      const margin = price > 0 ? profit / price * 100 : 0;
      document.getElementById("jp-profit-output").innerHTML = `<strong>Profit: ${money(profit)}</strong><span>Profit margin: ${margin.toFixed(2)}%</span><span>Total cost: ${money(cost)}</span>`;
    });
  }

  if (id === "hourly-rate") {
    calculatorShell("Hourly Rate Calculator", "Calculate the hourly rate needed to cover costs and reach your income target.",
      field("jp-income-target", "Target annual income (£)") + field("jp-business-costs", "Annual business costs (£)") + field("jp-billable-hours", "Billable hours per week") + field("jp-working-weeks", "Working weeks per year", "number", "1", "48"), "jp-rate-output");
    bindInputs(["jp-income-target","jp-business-costs","jp-billable-hours","jp-working-weeks"], () => {
      const target = num("jp-income-target") + num("jp-business-costs");
      const hours = num("jp-billable-hours") * num("jp-working-weeks");
      const rate = hours > 0 ? target / hours : 0;
      document.getElementById("jp-rate-output").innerHTML = `<strong>Required hourly rate: ${money(rate)}</strong><span>Annual amount to generate: ${money(target)}</span><span>Annual billable hours: ${hours.toFixed(0)}</span>`;
    });
  }

  if (id === "break-even") {
    calculatorShell("Break-Even Calculator", "Find how many jobs you need to cover your fixed and variable costs.",
      field("jp-fixed-costs", "Fixed costs (£)") + field("jp-average-job", "Average job price (£)") + field("jp-variable-job", "Variable cost per job (£)"), "jp-breakeven-output");
    bindInputs(["jp-fixed-costs","jp-average-job","jp-variable-job"], () => {
      const fixed = num("jp-fixed-costs"), price = num("jp-average-job"), variable = num("jp-variable-job");
      const contribution = price - variable;
      const jobs = contribution > 0 ? Math.ceil(fixed / contribution) : 0;
      const revenue = jobs * price;
      document.getElementById("jp-breakeven-output").innerHTML = `<strong>Break-even: ${jobs} jobs</strong><span>Break-even revenue: ${money(revenue)}</span><span>Contribution per job: ${money(contribution)}</span>`;
    });
  }

  if (id === "markup") {
    calculatorShell("Markup Calculator", "Calculate your selling price from a cost and desired markup.",
      field("jp-cost-price", "Cost price (£)") + field("jp-markup", "Markup (%)"), "jp-markup-output");
    bindInputs(["jp-cost-price","jp-markup"], () => {
      const cost = num("jp-cost-price"), markup = num("jp-markup");
      const markupAmount = cost * markup / 100;
      const price = cost + markupAmount;
      const margin = price > 0 ? markupAmount / price * 100 : 0;
      document.getElementById("jp-markup-output").innerHTML = `<strong>Selling price: ${money(price)}</strong><span>Markup amount: ${money(markupAmount)}</span><span>Gross margin: ${margin.toFixed(2)}%</span>`;
    });
  }
}

function ensureStyles() {
  if (document.getElementById("jp-calculators-styles")) return;
  const style = document.createElement("style");
  style.id = "jp-calculators-styles";
  style.textContent = `
    .jp-calculators-page,.jp-calculator-form-page{display:flex;flex-direction:column;gap:18px}
    .jp-calculator-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .jp-calculator-category{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:14px;align-items:center;text-align:left;padding:20px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04));font:inherit;color:inherit;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
    .jp-calculator-category:hover{border-color:#cbd5e1;transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,23,42,.08)}
    .jp-calculator-icon{font-size:27px;text-align:center}.jp-calculator-category strong{display:block;margin-bottom:5px;font-size:16px}.jp-calculator-category small{display:block;color:#64748b;line-height:1.45}.jp-calculator-arrow{font-size:21px;color:#64748b}
    .jp-calculator-back{border:0;background:none;padding:0;color:inherit;font:inherit;cursor:pointer;text-align:left}.jp-calculator-back:hover{text-decoration:underline}
    .jp-calculator-panel{max-width:760px;padding:22px;border:1px solid var(--border,#e5e7eb);border-radius:14px;background:#fff;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04))}.jp-calculator-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.jp-calculator-field{display:flex;flex-direction:column;gap:7px;font-weight:600}.jp-calculator-field input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d1d5db;border-radius:8px;font:inherit}.jp-calculator-output{display:flex;flex-direction:column;gap:8px;margin-top:22px;padding:18px;border-radius:10px;background:#f8fafc;line-height:1.45}.jp-calculator-output strong{font-size:21px}
    @media(max-width:760px){.jp-calculator-grid,.jp-calculator-fields{grid-template-columns:1fr}.jp-calculator-category{padding:16px}}
  `;
  document.head.appendChild(style);
}

ensureStyles();
window.JobPilotCalculators = { open: renderCalculators, categories: CATEGORIES, businessCalculators: BUSINESS_CALCULATORS };
