const TRADE_CALCULATORS = [
  { id: "unit-converter", icon: "📏", title: "Trade Unit Converter", description: "Convert common trade measurements." },
  { id: "labour", icon: "👷", title: "Labour Cost Calculator", description: "Calculate total labour cost from workers, hours and hourly rates." },
  { id: "job-time", icon: "⏱️", title: "Job Time Calculator", description: "Estimate job duration from quantity and productivity." },
  { id: "price-per-unit", icon: "💰", title: "Price Per Unit Calculator", description: "Calculate the cost per metre, unit or other quantity." },
  { id: "waste-bags", icon: "🗑️", title: "Waste & Skip Volume Calculator", description: "Estimate waste volume from bags or containers." },
  { id: "coverage", icon: "📐", title: "Coverage Calculator", description: "Calculate how much area a material will cover from quantity and coverage rate." }
];

const trNum = id => Number(document.getElementById(id)?.value || 0);
const trMoney = v => `£${Number(v || 0).toFixed(2)}`;
const trField = (id, label, step = "0.01", placeholder = "0") => `<label class="jp-calculator-field"><span>${label}</span><input id="${id}" type="number" min="0" step="${step}" placeholder="${placeholder}"></label>`;
const trBind = (ids, fn) => { ids.forEach(id => document.getElementById(id)?.addEventListener("input", fn)); ids.forEach(id => document.getElementById(id)?.addEventListener("change", fn)); fn(); };
const trOutput = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
const trShell = (title, description, fields, outputId) => {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const pageTitle = document.getElementById("pageTitle"), subtitle = document.getElementById("pageSubtitle");
  if (pageTitle) pageTitle.textContent = title;
  if (subtitle) subtitle.textContent = description;
  content.innerHTML = `<div class="jp-calculator-form-page"><div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-trade-back">← Back</button><div><h2>${title}</h2><p>${description}</p></div></div><div class="jp-calculator-panel"><div class="jp-calculator-fields">${fields}</div><div class="jp-calculator-output" id="${outputId}">Enter your figures to calculate.</div></div></div>`;
  document.getElementById("jp-trade-back")?.addEventListener("click", () => window.JobPilotCalculators?.open());
};

function renderTradeCalculators() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const title = document.getElementById("pageTitle"), subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Trade Calculators";
  if (subtitle) subtitle.textContent = "Practical calculators for general trade work.";
  content.innerHTML = `<div class="jp-calculators-page"><div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-trade-category-back">← Back</button><div><h2>Trade Calculators</h2><p>Labour, time, materials, quantities and coverage.</p></div></div><div class="jp-calculator-grid">${TRADE_CALCULATORS.map(c => `<button class="jp-calculator-category" type="button" data-trade-calculator="${c.id}"><span class="jp-calculator-icon">${c.icon}</span><span><strong>${c.title}</strong><small>${c.description}</small></span><span class="jp-calculator-arrow">→</span></button>`).join("")}</div></div>`;
  document.getElementById("jp-trade-category-back")?.addEventListener("click", () => window.JobPilotCalculators?.open());
  content.querySelectorAll("[data-trade-calculator]").forEach(b => b.addEventListener("click", () => openTradeCalculator(b.dataset.tradeCalculator)));
}

function openTradeCalculator(id) {
  if (id === "unit-converter") {
    trShell("Trade Unit Converter", "Convert common trade measurements.", trField("tr-value", "Value") + `<label class="jp-calculator-field"><span>Conversion</span><select id="tr-conversion"><option value="m-ft">Metres → feet</option><option value="ft-m">Feet → metres</option><option value="m2-ft2">m² → ft²</option><option value="ft2-m2">ft² → m²</option><option value="l-gal">Litres → UK gallons</option><option value="gal-l">UK gallons → litres</option><option value="kg-lb">kg → lb</option><option value="lb-kg">lb → kg</option></select></label>`, "tr-unit-output");
    trBind(["tr-value","tr-conversion"], () => { const v=trNum("tr-value"), c=document.getElementById("tr-conversion")?.value; const f={"m-ft":[3.28084,"ft"],"ft-m":[0.3048,"m"],"m2-ft2":[10.7639,"ft²"],"ft2-m2":[0.092903,"m²"],"l-gal":[0.219969,"UK gal"],"gal-l":[4.54609,"L"],"kg-lb":[2.20462,"lb"],"lb-kg":[0.453592,"kg"]}[c]||[1,""]; trOutput("tr-unit-output",`<strong>Result: ${(v*f[0]).toFixed(3)} ${f[1]}</strong>`); });
  }
  if (id === "labour") {
    trShell("Labour Cost Calculator","Calculate total labour cost.",trField("tr-lab-workers","Number of workers","1","1")+trField("tr-lab-hours","Hours per worker")+trField("tr-lab-rate","Hourly rate (£)"),"tr-lab-output");
    trBind(["tr-lab-workers","tr-lab-hours","tr-lab-rate"],()=>trOutput("tr-lab-output",`<strong>Labour cost: ${trMoney(trNum("tr-lab-workers")*trNum("tr-lab-hours")*trNum("tr-lab-rate"))}</strong>`));
  }
  if (id === "job-time") {
    trShell("Job Time Calculator","Estimate job duration from quantity and productivity.",trField("tr-time-qty","Quantity")+trField("tr-time-rate","Productivity (quantity/hour)"),"tr-time-output");
    trBind(["tr-time-qty","tr-time-rate"],()=>{const q=trNum("tr-time-qty"),r=trNum("tr-time-rate"),h=r?q/r:0;trOutput("tr-time-output",`<strong>Estimated time: ${h.toFixed(2)} hours</strong>`);});
  }
  if (id === "price-per-unit") {
    trShell("Price Per Unit Calculator","Calculate the cost per unit.",trField("tr-unit-cost","Total cost (£)")+trField("tr-unit-qty","Quantity"),"tr-unit-output");
    trBind(["tr-unit-cost","tr-unit-qty"],()=>trOutput("tr-unit-output",`<strong>Price per unit: ${trMoney(trNum("tr-unit-qty")?trNum("tr-unit-cost")/trNum("tr-unit-qty"):0)}</strong>`));
  }
  if (id === "waste-bags") {
    trShell("Waste & Skip Volume Calculator","Estimate waste volume from bags or containers.",trField("tr-waste-count","Number of bags/containers","1","1")+trField("tr-waste-size","Average volume each (m³)"),"tr-waste-volume-output");
    trBind(["tr-waste-count","tr-waste-size"],()=>trOutput("tr-waste-volume-output",`<strong>Estimated waste volume: ${(trNum("tr-waste-count")*trNum("tr-waste-size")).toFixed(2)} m³</strong>`));
  }
  if (id === "coverage") {
    trShell("Coverage Calculator","Calculate the area covered by a material.",trField("tr-coverage-qty","Material quantity")+trField("tr-coverage-rate","Coverage per unit (m²)"),"tr-coverage-output");
    trBind(["tr-coverage-qty","tr-coverage-rate"],()=>trOutput("tr-coverage-output",`<strong>Coverage: ${(trNum("tr-coverage-qty")*trNum("tr-coverage-rate")).toFixed(2)} m²</strong>`));
  }
}

window.JobPilotTradeCalculators = { open: renderTradeCalculators, calculators: TRADE_CALCULATORS };
document.addEventListener("click", event => { const button = event.target.closest?.('[data-category="trade"]'); if (button) renderTradeCalculators(); });
