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

const ELECTRICAL_CALCULATORS = [
  { id: "ohms-law", icon: "Ω", title: "Ohm's Law Calculator", description: "Calculate voltage, current, resistance and power from known values." },
  { id: "voltage-drop", icon: "📉", title: "Voltage Drop Calculator", description: "Calculate cable voltage drop and percentage using cable mV/A/m data." },
  { id: "cable-capacity", icon: "🔌", title: "Cable Capacity Check", description: "Check a cable's current capacity against design current and correction factors." },
  { id: "power-amps", icon: "⚡", title: "Power / Watts / Amps Calculator", description: "Convert between watts, volts and amps for single-phase or DC loads." },
  { id: "three-phase", icon: "3φ", title: "Three-Phase Power Calculator", description: "Calculate kW, kVA or current for three-phase systems." },
  { id: "breaker-sizing", icon: "🛡️", title: "Breaker / Fuse Sizing Calculator", description: "Compare design current and cable capacity and select a standard protective-device size." },
  { id: "maximum-demand", icon: "📊", title: "Maximum Demand Calculator", description: "Estimate maximum demand using connected loads and diversity percentages." },
  { id: "max-zs", icon: "Ω", title: "Earth Fault Loop / Max Zs Calculator", description: "Calculate fault current from Zs and compare measured Zs with a user-entered maximum." },
  { id: "adiabatic", icon: "🧯", title: "Adiabatic / CPC Size Calculator", description: "Calculate minimum conductor size using the adiabatic equation S = √(I²t) / k." },
  { id: "electrical-load", icon: "🏠", title: "Electrical Load Calculator", description: "Add multiple loads and estimate total power and current demand." }
];

const money = value => `£${Number(value || 0).toFixed(2)}`;
const num = id => Number(document.getElementById(id)?.value || 0);
const val = id => document.getElementById(id)?.value || "";
const esc = value => String(value).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

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
    button.addEventListener("click", () => openCalculator(button.dataset.calculator));
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
      if (button.dataset.category === "business") renderBusinessCalculators();
      if (button.dataset.category === "electrical") renderElectricalCalculators();
    });
  });
  ensureStyles();
}

function renderBusinessCalculators() {
  showCalculatorsPage("Business Calculators", "Pricing, profit and business calculations.", BUSINESS_CALCULATORS, renderCalculators);
}

function renderElectricalCalculators() {
  showCalculatorsPage("Electrical Calculators", "Electrical calculation aids for everyday trade work.", ELECTRICAL_CALCULATORS, renderCalculators);
}

function calculatorShell(titleText, description, fields, outputId, back = renderBusinessCalculators, note = "") {
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
        ${note ? `<div class="jp-calculator-note">${note}</div>` : ""}
      </div>
    </div>`;
  document.getElementById("jp-calculator-form-back")?.addEventListener("click", back);
}

const field = (id, label, type = "number", step = "0.01", placeholder = "0") => `
  <label class="jp-calculator-field"><span>${label}</span><input id="${id}" type="${type}" min="0" step="${step}" placeholder="${placeholder}"></label>`;

const selectField = (id, label, options) => `
  <label class="jp-calculator-field"><span>${label}</span><select id="${id}">${options.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select></label>`;

function bindInputs(ids, calculate) {
  ids.forEach(id => document.getElementById(id)?.addEventListener("input", calculate));
  ids.forEach(id => document.getElementById(id)?.addEventListener("change", calculate));
  calculate();
}

function output(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function openCalculator(id) {
  if (BUSINESS_CALCULATORS.some(c => c.id === id)) return openBusinessCalculator(id);
  if (ELECTRICAL_CALCULATORS.some(c => c.id === id)) return openElectricalCalculator(id);
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
      output("jp-job-pricing-output", `<strong>Recommended price: ${money(price)}</strong><span>Total job cost: ${money(costs)}</span><span>Estimated profit: ${money(profit)}</span><span>Profit margin: ${margin.toFixed(2)}%</span>`);
    });
  }

  if (id === "profit-margin") {
    calculatorShell("Profit Margin Calculator", "Calculate your profit and margin from selling price and total cost.", field("jp-selling-price", "Selling price (£)") + field("jp-total-cost", "Total cost (£)"), "jp-profit-output");
    bindInputs(["jp-selling-price","jp-total-cost"], () => {
      const price = num("jp-selling-price"), cost = num("jp-total-cost"), profit = price - cost;
      const margin = price > 0 ? profit / price * 100 : 0;
      output("jp-profit-output", `<strong>Profit: ${money(profit)}</strong><span>Profit margin: ${margin.toFixed(2)}%</span><span>Total cost: ${money(cost)}</span>`);
    });
  }

  if (id === "hourly-rate") {
    calculatorShell("Hourly Rate Calculator", "Calculate the hourly rate needed to cover costs and reach your income target.", field("jp-income-target", "Target annual income (£)") + field("jp-business-costs", "Annual business costs (£)") + field("jp-billable-hours", "Billable hours per week") + field("jp-working-weeks", "Working weeks per year", "number", "1", "48"), "jp-rate-output");
    bindInputs(["jp-income-target","jp-business-costs","jp-billable-hours","jp-working-weeks"], () => {
      const target = num("jp-income-target") + num("jp-business-costs");
      const hours = num("jp-billable-hours") * num("jp-working-weeks");
      const rate = hours > 0 ? target / hours : 0;
      output("jp-rate-output", `<strong>Required hourly rate: ${money(rate)}</strong><span>Annual amount to generate: ${money(target)}</span><span>Annual billable hours: ${hours.toFixed(0)}</span>`);
    });
  }

  if (id === "break-even") {
    calculatorShell("Break-Even Calculator", "Find how many jobs you need to cover your fixed and variable costs.", field("jp-fixed-costs", "Fixed costs (£)") + field("jp-average-job", "Average job price (£)") + field("jp-variable-job", "Variable cost per job (£)"), "jp-breakeven-output");
    bindInputs(["jp-fixed-costs","jp-average-job","jp-variable-job"], () => {
      const fixed = num("jp-fixed-costs"), price = num("jp-average-job"), variable = num("jp-variable-job");
      const contribution = price - variable;
      const jobs = contribution > 0 ? Math.ceil(fixed / contribution) : 0;
      const revenue = jobs * price;
      output("jp-breakeven-output", `<strong>Break-even: ${jobs} jobs</strong><span>Break-even revenue: ${money(revenue)}</span><span>Contribution per job: ${money(contribution)}</span>`);
    });
  }

  if (id === "markup") {
    calculatorShell("Markup Calculator", "Calculate your selling price from a cost and desired markup.", field("jp-cost-price", "Cost price (£)") + field("jp-markup", "Markup (%)"), "jp-markup-output");
    bindInputs(["jp-cost-price","jp-markup"], () => {
      const cost = num("jp-cost-price"), markup = num("jp-markup");
      const markupAmount = cost * markup / 100;
      const price = cost + markupAmount;
      const margin = price > 0 ? markupAmount / price * 100 : 0;
      output("jp-markup-output", `<strong>Selling price: ${money(price)}</strong><span>Markup amount: ${money(markupAmount)}</span><span>Gross margin: ${margin.toFixed(2)}%</span>`);
    });
  }
}

function openElectricalCalculator(id) {
  const note = "Calculation aid only. Always verify electrical design, protective-device selection, installation method, correction factors and test results against current BS 7671 and applicable manufacturer data before installation or certification.";

  if (id === "ohms-law") {
    calculatorShell("Ohm's Law Calculator", "Calculate voltage, current, resistance and power from any two suitable values.",
      field("el-v", "Voltage (V)") + field("el-i", "Current (A)") + field("el-r", "Resistance (Ω)") + field("el-p", "Power (W)"), "el-ohm-output", renderElectricalCalculators, note);
    bindInputs(["el-v","el-i","el-r","el-p"], () => {
      const v = num("el-v"), i = num("el-i"), r = num("el-r"), p = num("el-p");
      let V = v, I = i, R = r, P = p;
      if (V && I) { R = V / I; P = V * I; }
      else if (V && R) { I = V / R; P = V * I; }
      else if (I && R) { V = I * R; P = V * I; }
      else if (P && V) { I = P / V; R = V / I; }
      else if (P && I) { V = P / I; R = V / I; }
      else if (P && R) { I = Math.sqrt(P / R); V = I * R; }
      output("el-ohm-output", `<strong>Results</strong><span>Voltage: ${V ? V.toFixed(2) : "—"} V</span><span>Current: ${I ? I.toFixed(2) : "—"} A</span><span>Resistance: ${R ? R.toFixed(2) : "—"} Ω</span><span>Power: ${P ? P.toFixed(2) : "—"} W</span>`);
    });
  }

  if (id === "voltage-drop") {
    calculatorShell("Voltage Drop Calculator", "Calculate voltage drop using the cable's published mV/A/m value.",
      field("el-vd-current", "Load current (A)") + field("el-vd-length", "One-way cable length (m)") + field("el-vd-mv", "Cable voltage-drop value (mV/A/m)") + field("el-vd-voltage", "Supply voltage (V)"), "el-vd-output", renderElectricalCalculators, note);
    bindInputs(["el-vd-current","el-vd-length","el-vd-mv","el-vd-voltage"], () => {
      const current = num("el-vd-current"), length = num("el-vd-length"), mv = num("el-vd-mv"), supply = num("el-vd-voltage");
      const drop = current * length * mv / 1000;
      const pct = supply > 0 ? drop / supply * 100 : 0;
      output("el-vd-output", `<strong>Voltage drop: ${drop.toFixed(2)} V</strong><span>Percentage drop: ${pct.toFixed(2)}%</span><span>Approx. load-end voltage: ${Math.max(0, supply - drop).toFixed(2)} V</span>`);
    });
  }

  if (id === "cable-capacity") {
    calculatorShell("Cable Capacity Check", "Check a cable's stated capacity after applying correction factors.",
      field("el-cable-design", "Design current Ib (A)") + field("el-cable-rating", "Cable reference capacity Iz (A)") + field("el-cable-factor", "Combined correction factor", "number", "0.01", "1.00") + field("el-cable-device", "Protective device In (A)"), "el-cable-output", renderElectricalCalculators, note);
    bindInputs(["el-cable-design","el-cable-rating","el-cable-factor","el-cable-device"], () => {
      const ib = num("el-cable-design"), izRef = num("el-cable-rating"), factor = num("el-cable-factor") || 1, inDevice = num("el-cable-device");
      const iz = izRef * factor;
      const pass = ib <= inDevice && inDevice <= iz;
      output("el-cable-output", `<strong>${pass ? "Check passes" : "Check requires review"}</strong><span>Adjusted cable capacity Iz: ${iz.toFixed(2)} A</span><span>Design current Ib: ${ib.toFixed(2)} A</span><span>Protective device In: ${inDevice.toFixed(2)} A</span><span>Rule checked: Ib ≤ In ≤ Iz</span>`);
    });
  }

  if (id === "power-amps") {
    calculatorShell("Power / Watts / Amps Calculator", "Calculate watts, volts or amps for a DC or single-phase load.",
      field("el-pa-power", "Power (W)") + field("el-pa-voltage", "Voltage (V)") + field("el-pa-current", "Current (A)"), "el-pa-output", renderElectricalCalculators, note);
    bindInputs(["el-pa-power","el-pa-voltage","el-pa-current"], () => {
      const p = num("el-pa-power"), v = num("el-pa-voltage"), i = num("el-pa-current");
      let P = p, V = v, I = i;
      if (P && V) I = P / V;
      else if (P && I) V = P / I;
      else if (V && I) P = V * I;
      output("el-pa-output", `<strong>Results</strong><span>Power: ${P ? P.toFixed(2) : "—"} W</span><span>Voltage: ${V ? V.toFixed(2) : "—"} V</span><span>Current: ${I ? I.toFixed(2) : "—"} A</span>`);
    });
  }

  if (id === "three-phase") {
    calculatorShell("Three-Phase Power Calculator", "Calculate three-phase power or current using line voltage and power factor.",
      field("el-3p-power", "Real power (kW)") + field("el-3p-current", "Line current (A)") + field("el-3p-voltage", "Line-to-line voltage (V)", "number", "1", "400") + field("el-3p-pf", "Power factor", "number", "0.01", "0.90"), "el-3p-output", renderElectricalCalculators, note);
    bindInputs(["el-3p-power","el-3p-current","el-3p-voltage","el-3p-pf"], () => {
      const kw = num("el-3p-power"), i = num("el-3p-current"), v = num("el-3p-voltage"), pf = num("el-3p-pf");
      let P = kw * 1000, I = i;
      if (kw && v && pf) I = P / (Math.sqrt(3) * v * pf);
      else if (i && v && pf) P = Math.sqrt(3) * v * i * pf;
      const kva = (P / 1000) / (pf || 1);
      output("el-3p-output", `<strong>Results</strong><span>Real power: ${(P / 1000).toFixed(2)} kW</span><span>Apparent power: ${kva.toFixed(2)} kVA</span><span>Line current: ${I ? I.toFixed(2) : "—"} A</span><span>Using ${v.toFixed(0)} V line-to-line and PF ${pf.toFixed(2)}</span>`);
    });
  }

  if (id === "breaker-sizing") {
    const devices = [["6","6 A"],["10","10 A"],["16","16 A"],["20","20 A"],["25","25 A"],["32","32 A"],["40","40 A"],["45","45 A"],["50","50 A"],["63","63 A"],["80","80 A"],["100","100 A"],["125","125 A"]];
    calculatorShell("Breaker / Fuse Sizing Calculator", "Compare design current and cable capacity and identify the next standard device size.",
      field("el-bs-design", "Design current Ib (A)") + field("el-bs-cable", "Adjusted cable capacity Iz (A)") + selectField("el-bs-device", "Select protective device", devices), "el-bs-output", renderElectricalCalculators, note);
    bindInputs(["el-bs-design","el-bs-cable","el-bs-device"], () => {
      const ib = num("el-bs-design"), iz = num("el-bs-cable"), selected = num("el-bs-device");
      const next = devices.map(d => Number(d[0])).find(x => x >= ib) || 0;
      const suitable = selected >= ib && selected <= iz;
      output("el-bs-output", `<strong>${suitable ? "Selected device fits the basic Ib ≤ In ≤ Iz check" : "Selected device requires review"}</strong><span>Design current Ib: ${ib.toFixed(2)} A</span><span>Selected device In: ${selected.toFixed(0)} A</span><span>Adjusted cable capacity Iz: ${iz.toFixed(2)} A</span><span>Next standard size at or above Ib: ${next ? next + " A" : "Above listed range"}</span>`);
    });
  }

  if (id === "maximum-demand") {
    calculatorShell("Maximum Demand Calculator", "Estimate demand from connected load groups and diversity percentages.",
      field("el-md-load1", "Lighting connected load (kW)") + field("el-md-div1", "Lighting diversity (%)", "number", "1", "80") + field("el-md-load2", "Socket / general connected load (kW)") + field("el-md-div2", "Socket diversity (%)", "number", "1", "60") + field("el-md-load3", "Fixed / appliance connected load (kW)") + field("el-md-div3", "Fixed-load diversity (%)", "number", "1", "75"), "el-md-output", renderElectricalCalculators, note);
    bindInputs(["el-md-load1","el-md-div1","el-md-load2","el-md-div2","el-md-load3","el-md-div3"], () => {
      const groups = [[num("el-md-load1"),num("el-md-div1")],[num("el-md-load2"),num("el-md-div2")],[num("el-md-load3"),num("el-md-div3")]];
      const demand = groups.reduce((s,[load,div]) => s + load * div / 100, 0);
      const connected = groups.reduce((s,[load]) => s + load, 0);
      output("el-md-output", `<strong>Estimated maximum demand: ${demand.toFixed(2)} kW</strong><span>Total connected load: ${connected.toFixed(2)} kW</span><span>Estimated diversified demand: ${demand.toFixed(2)} kW</span>`);
    });
  }

  if (id === "max-zs") {
    calculatorShell("Earth Fault Loop / Max Zs Calculator", "Calculate fault current from measured Zs or compare a measured Zs with a maximum permitted value.",
      field("el-zs-zs", "Measured Zs (Ω)") + field("el-zs-voltage", "Nominal voltage (V)", "number", "1", "230") + field("el-zs-max", "Maximum permitted Zs (Ω)"), "el-zs-output", renderElectricalCalculators, note);
    bindInputs(["el-zs-zs","el-zs-voltage","el-zs-max"], () => {
      const zs = num("el-zs-zs"), voltage = num("el-zs-voltage"), max = num("el-zs-max");
      const fault = zs > 0 ? voltage / zs : 0;
      const pass = max > 0 && zs > 0 ? zs <= max : null;
      output("el-zs-output", `<strong>${pass === null ? "Enter a maximum Zs to compare" : pass ? "Measured Zs is within the entered maximum" : "Measured Zs exceeds the entered maximum"}</strong><span>Estimated prospective earth-fault current: ${fault.toFixed(2)} A</span><span>Measured Zs: ${zs.toFixed(3)} Ω</span><span>Entered maximum Zs: ${max ? max.toFixed(3) + " Ω" : "—"}</span>`);
    });
  }

  if (id === "adiabatic") {
    calculatorShell("Adiabatic / CPC Size Calculator", "Calculate minimum conductor size using S = √(I²t) / k.",
      field("el-ad-current", "Fault current I (A)") + field("el-ad-time", "Disconnection time t (seconds)") + field("el-ad-k", "k value", "number", "0.01", "115"), "el-ad-output", renderElectricalCalculators, note);
    bindInputs(["el-ad-current","el-ad-time","el-ad-k"], () => {
      const I = num("el-ad-current"), t = num("el-ad-time"), k = num("el-ad-k");
      const s = k > 0 ? I * Math.sqrt(t) / k : 0;
      output("el-ad-output", `<strong>Minimum calculated conductor size: ${s.toFixed(2)} mm²</strong><span>Fault current: ${I.toFixed(2)} A</span><span>Disconnection time: ${t.toFixed(3)} s</span><span>k value: ${k.toFixed(2)}</span><span>Formula: S = √(I²t) / k</span>`);
    });
  }

  if (id === "electrical-load") {
    calculatorShell("Electrical Load Calculator", "Add multiple loads and estimate total power and current demand.",
      field("el-load1", "Load 1 (W)") + field("el-load2", "Load 2 (W)") + field("el-load3", "Load 3 (W)") + field("el-load4", "Load 4 (W)") + field("el-load5", "Load 5 (W)") + field("el-load-voltage", "Supply voltage (V)", "number", "1", "230") + field("el-load-pf", "Power factor", "number", "0.01", "1.00"), "el-load-output", renderElectricalCalculators, note);
    bindInputs(["el-load1","el-load2","el-load3","el-load4","el-load5","el-load-voltage","el-load-pf"], () => {
      const watts = ["el-load1","el-load2","el-load3","el-load4","el-load5"].reduce((s,id) => s + num(id), 0);
      const voltage = num("el-load-voltage"), pf = num("el-load-pf") || 1;
      const amps = voltage > 0 ? watts / voltage / pf : 0;
      output("el-load-output", `<strong>Total load: ${(watts / 1000).toFixed(2)} kW</strong><span>Total power: ${watts.toFixed(0)} W</span><span>Estimated current: ${amps.toFixed(2)} A</span><span>Voltage: ${voltage.toFixed(0)} V</span><span>Power factor: ${pf.toFixed(2)}</span>`);
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
    .jp-calculator-panel{max-width:820px;padding:22px;border:1px solid var(--border,#e5e7eb);border-radius:14px;background:#fff;box-shadow:var(--shadow,0 2px 8px rgba(15,23,42,.04))}.jp-calculator-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.jp-calculator-field{display:flex;flex-direction:column;gap:7px;font-weight:600}.jp-calculator-field input,.jp-calculator-field select{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d1d5db;border-radius:8px;font:inherit;background:#fff}.jp-calculator-output{display:flex;flex-direction:column;gap:8px;margin-top:22px;padding:18px;border-radius:10px;background:#f8fafc;line-height:1.45}.jp-calculator-output strong{font-size:21px}.jp-calculator-note{margin-top:14px;padding:12px 14px;border-radius:8px;background:#fff7ed;color:#7c2d12;font-size:13px;line-height:1.5}
    @media(max-width:760px){.jp-calculator-grid,.jp-calculator-fields{grid-template-columns:1fr}.jp-calculator-category{padding:16px}}
  `;
  document.head.appendChild(style);
}

ensureStyles();
window.JobPilotCalculators = { open: renderCalculators, categories: CATEGORIES, businessCalculators: BUSINESS_CALCULATORS, electricalCalculators: ELECTRICAL_CALCULATORS };
