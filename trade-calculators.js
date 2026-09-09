const TRADE_CALCULATORS = [
  { id: "unit-converter", icon: "📏", title: "Trade Unit Converter", description: "Convert common trade measurements including length, area, volume and weight." },
  { id: "area", icon: "▦", title: "Area Calculator", description: "Calculate floor, wall, roof and other rectangular areas." },
  { id: "volume", icon: "📦", title: "Volume Calculator", description: "Calculate the volume of a rectangular space or object." },
  { id: "material-waste", icon: "♻️", title: "Material Waste Calculator", description: "Add a practical waste allowance to your material quantity." },
  { id: "labour", icon: "👷", title: "Labour Cost Calculator", description: "Calculate labour cost from workers, hours and hourly rates." },
  { id: "job-time", icon: "⏱️", title: "Job Time Calculator", description: "Estimate job duration from quantity and productivity." },
  { id: "travel", icon: "🚐", title: "Travel Cost Calculator", description: "Calculate vehicle fuel cost from distance, economy and fuel price." },
  { id: "fuel-cost", icon: "⛽", title: "Fuel Cost Calculator", description: "Calculate the fuel cost of a journey from distance and vehicle economy." },
  { id: "profit", icon: "💷", title: "Trade Job Profit Calculator", description: "Calculate job profit after labour, materials, travel and other costs." },
  { id: "price-per-unit", icon: "💰", title: "Price Per Unit Calculator", description: "Calculate a material or service price per metre, square metre or unit." },
  { id: "waste-bags", icon: "🗑️", title: "Waste & Skip Volume Calculator", description: "Estimate waste volume from bags, skips or measured quantities." },
  { id: "paint", icon: "🖌️", title: "Paint Quantity Calculator", description: "Estimate paint required from surface area and coverage per litre." },
  { id: "tile", icon: "🔲", title: "Tile Quantity Calculator", description: "Estimate tiles required including a configurable waste allowance." }
];

const trNum = id => Number(document.getElementById(id)?.value || 0);
const trMoney = v => `£${Number(v || 0).toFixed(2)}`;
const trField = (id, label, step = "0.01", placeholder = "0") => `<label class="jp-calculator-field"><span>${label}</span><input id="${id}" type="number" min="0" step="${step}" placeholder="${placeholder}"></label>`;
const trBind = (ids, fn) => { ids.forEach(id => document.getElementById(id)?.addEventListener("input", fn)); ids.forEach(id => document.getElementById(id)?.addEventListener("change", fn)); fn(); };
const trOutput = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
const trShell = (title, description, fields, outputId, note = "") => {
  const content = document.getElementById("pageContent");
  const pageTitle = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (pageTitle) pageTitle.textContent = title;
  if (subtitle) subtitle.textContent = description;
  content.innerHTML = `<div class="jp-calculator-form-page"><div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-trade-back">← Back</button><div><h2>${title}</h2><p>${description}</p></div></div><div class="jp-calculator-panel"><div class="jp-calculator-fields">${fields}</div><div class="jp-calculator-output" id="${outputId}">Enter your figures to calculate.</div>${note ? `<div class="jp-calculator-note">${note}</div>` : ""}</div></div>`;
  document.getElementById("jp-trade-back")?.addEventListener("click", () => window.JobPilotCalculators?.open());
};

function renderTradeCalculators() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Trade Calculators";
  if (subtitle) subtitle.textContent = "Practical calculators for general trade work.";
  content.innerHTML = `<div class="jp-calculators-page"><div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-trade-category-back">← Back</button><div><h2>Trade Calculators</h2><p>Measurements, labour, travel, materials and job costing.</p></div></div><div class="jp-calculator-grid">${TRADE_CALCULATORS.map(c => `<button class="jp-calculator-category" type="button" data-trade-calculator="${c.id}"><span class="jp-calculator-icon">${c.icon}</span><span><strong>${c.title}</strong><small>${c.description}</small></span><span class="jp-calculator-arrow">→</span></button>`).join("")}</div></div>`;
  document.getElementById("jp-trade-category-back")?.addEventListener("click", () => window.JobPilotCalculators?.open());
  content.querySelectorAll("[data-trade-calculator]").forEach(b => b.addEventListener("click", () => openTradeCalculator(b.dataset.tradeCalculator)));
}

function openTradeCalculator(id) {
  if (id === "unit-converter") {
    trShell("Trade Unit Converter", "Convert common trade measurements.", trField("tr-value", "Value") + `<label class="jp-calculator-field"><span>Conversion</span><select id="tr-conversion"><option value="m-ft">Metres → feet</option><option value="ft-m">Feet → metres</option><option value="m2-ft2">m² → ft²</option><option value="ft2-m2">ft² → m²</option><option value="l-gal">Litres → UK gallons</option><option value="gal-l">UK gallons → litres</option><option value="kg-lb">kg → lb</option><option value="lb-kg">lb → kg</option></select></label>`, "tr-unit-output");
    trBind(["tr-value","tr-conversion"], () => { const v=trNum("tr-value"), c=document.getElementById("tr-conversion")?.value; const f={"m-ft":[3.28084,"ft"],"ft-m":[0.3048,"m"],"m2-ft2":[10.7639,"ft²"],"ft2-m2":[0.092903,"m²"],"l-gal":[0.219969,"UK gal"],"gal-l":[4.54609,"L"],"kg-lb":[2.20462,"lb"],"lb-kg":[0.453592,"kg"]}[c]||[1,""]; trOutput("tr-unit-output",`<strong>Result: ${(v*f[0]).toFixed(3)} ${f[1]}</strong>`); });
  }
  if (id === "area") {
    trShell("Area Calculator","Calculate rectangular area.",trField("tr-area-l","Length (m)")+trField("tr-area-w","Width (m)"),"tr-area-output");
    trBind(["tr-area-l","tr-area-w"],()=>trOutput("tr-area-output",`<strong>Area: ${(trNum("tr-area-l")*trNum("tr-area-w")).toFixed(2)} m²</strong>`));
  }
  if (id === "volume") {
    trShell("Volume Calculator","Calculate rectangular volume.",trField("tr-vol-l","Length (m)")+trField("tr-vol-w","Width (m)")+trField("tr-vol-h","Height/depth (m)"),"tr-vol-output");
    trBind(["tr-vol-l","tr-vol-w","tr-vol-h"],()=>trOutput("tr-vol-output",`<strong>Volume: ${(trNum("tr-vol-l")*trNum("tr-vol-w")*trNum("tr-vol-h")).toFixed(3)} m³</strong>`));
  }
  if (id === "material-waste") {
    trShell("Material Waste Calculator","Add a waste allowance to a base quantity.",trField("tr-waste-qty","Base quantity")+trField("tr-waste-pct","Waste allowance (%)"),"tr-waste-output");
    trBind(["tr-waste-qty","tr-waste-pct"],()=>{const q=trNum("tr-waste-qty"),p=trNum("tr-waste-pct");trOutput("tr-waste-output",`<strong>Order quantity: ${(q*(1+p/100)).toFixed(2)}</strong><span>Waste allowance: ${(q*p/100).toFixed(2)}</span>`);});
  }
  if (id === "labour") {
    trShell("Labour Cost Calculator","Calculate total labour cost.",trField("tr-lab-workers","Number of workers","1","1")+trField("tr-lab-hours","Hours per worker")+trField("tr-lab-rate","Hourly rate (£)"),"tr-lab-output");
    trBind(["tr-lab-workers","tr-lab-hours","tr-lab-rate"],()=>trOutput("tr-lab-output",`<strong>Labour cost: ${trMoney(trNum("tr-lab-workers")*trNum("tr-lab-hours")*trNum("tr-lab-rate"))}</strong>`));
  }
  if (id === "job-time") {
    trShell("Job Time Calculator","Estimate job duration from quantity and productivity.",trField("tr-time-qty","Quantity")+trField("tr-time-rate","Productivity (quantity/hour)"),"tr-time-output");
    trBind(["tr-time-qty","tr-time-rate"],()=>{const q=trNum("tr-time-qty"),r=trNum("tr-time-rate"),h=r?q/r:0;trOutput("tr-time-output",`<strong>Estimated time: ${h.toFixed(2)} hours</strong><span>That is approximately ${(h/8).toFixed(2)} working days at 8 hours/day.</span>`);});
  }
  if (id === "travel" || id === "fuel-cost") {
    trShell(id === "travel" ? "Travel Cost Calculator" : "Fuel Cost Calculator","Calculate vehicle fuel cost from distance and economy.",trField("tr-fuel-miles","Distance (miles)")+trField("tr-fuel-mpg","Vehicle economy (UK mpg)")+trField("tr-fuel-price","Fuel price (£/litre)"),"tr-fuel-output");
    trBind(["tr-fuel-miles","tr-fuel-mpg","tr-fuel-price"],()=>{const m=trNum("tr-fuel-miles"),mpg=trNum("tr-fuel-mpg"),p=trNum("tr-fuel-price"),litres=mpg?m/mpg*4.54609:0;trOutput("tr-fuel-output",`<strong>Fuel cost: ${trMoney(litres*p)}</strong><span>Fuel used: ${litres.toFixed(2)} litres</span>`);});
  }
  if (id === "profit") {
    trShell("Trade Job Profit Calculator","Calculate profit after direct job costs.",trField("tr-profit-revenue","Job revenue (£)")+trField("tr-profit-labour","Labour cost (£)")+trField("tr-profit-materials","Materials (£)")+trField("tr-profit-travel","Travel (£)")+trField("tr-profit-other","Other costs (£)"),"tr-profit-output");
    trBind(["tr-profit-revenue","tr-profit-labour","tr-profit-materials","tr-profit-travel","tr-profit-other"],()=>{const rev=trNum("tr-profit-revenue"),cost=trNum("tr-profit-labour")+trNum("tr-profit-materials")+trNum("tr-profit-travel")+trNum("tr-profit-other"),profit=rev-cost,margin=rev?profit/rev*100:0;trOutput("tr-profit-output",`<strong>Profit: ${trMoney(profit)}</strong><span>Profit margin: ${margin.toFixed(2)}%</span><span>Total costs: ${trMoney(cost)}</span>`);});
  }
  if (id === "price-per-unit") {
    trShell("Price Per Unit Calculator","Calculate a unit price from total cost and quantity.",trField("tr-unit-cost","Total cost (£)")+trField("tr-unit-qty","Quantity"),"tr-unit-output");
    trBind(["tr-unit-cost","tr-unit-qty"],()=>trOutput("tr-unit-output",`<strong>Price per unit: ${trMoney(trNum("tr-unit-qty")?trNum("tr-unit-cost")/trNum("tr-unit-qty"):0)}</strong>`));
  }
  if (id === "waste-bags") {
    trShell("Waste & Skip Volume Calculator","Estimate waste volume from bag or container counts.",trField("tr-waste-count","Number of bags/containers","1","1")+trField("tr-waste-size","Average volume each (m³)"),"tr-waste-volume-output");
    trBind(["tr-waste-count","tr-waste-size"],()=>trOutput("tr-waste-volume-output",`<strong>Estimated waste volume: ${(trNum("tr-waste-count")*trNum("tr-waste-size")).toFixed(2)} m³</strong>`));
  }
  if (id === "paint") {
    trShell("Paint Quantity Calculator","Estimate paint required from surface area and coverage.",trField("tr-paint-area","Surface area (m²)")+trField("tr-paint-coats","Number of coats","1","1","2")+trField("tr-paint-coverage","Coverage (m²/litre)"),"tr-paint-output");
    trBind(["tr-paint-area","tr-paint-coats","tr-paint-coverage"],()=>{const a=trNum("tr-paint-area"),c=trNum("tr-paint-coats"),cov=trNum("tr-paint-coverage"),l=cov?a*c/cov:0;trOutput("tr-paint-output",`<strong>Paint required: ${l.toFixed(2)} litres</strong><span>Round up to the next practical container size.</span>`);});
  }
  if (id === "tile") {
    trShell("Tile Quantity Calculator","Estimate tiles required including waste.",trField("tr-tile-area","Area to tile (m²)")+trField("tr-tile-length","Tile length (mm)")+trField("tr-tile-width","Tile width (mm)")+trField("tr-tile-waste","Waste allowance (%)","0.1","10"),"tr-tile-output");
    trBind(["tr-tile-area","tr-tile-length","tr-tile-width","tr-tile-waste"],()=>{const a=trNum("tr-tile-area"),tl=trNum("tr-tile-length")/1000,tw=trNum("tr-tile-width")/1000,w=trNum("tr-tile-waste"),tileArea=tl*tw,count=tileArea?Math.ceil(a*(1+w/100)/tileArea):0;trOutput("tr-tile-output",`<strong>Tiles required: ${count}</strong><span>Coverage including waste: ${(a*(1+w/100)).toFixed(2)} m²</span>`);});
  }
}

window.JobPilotTradeCalculators = { open: renderTradeCalculators, calculators: TRADE_CALCULATORS };
