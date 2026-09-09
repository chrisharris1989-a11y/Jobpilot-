const CONSTRUCTION_CALCULATORS = [
  { id: "area", icon: "📐", title: "Area Calculator", description: "Calculate floor, wall, roof or other surface area." },
  { id: "volume", icon: "📦", title: "Volume Calculator", description: "Calculate cubic volume for rooms, excavations and materials." },
  { id: "concrete", icon: "🧱", title: "Concrete Calculator", description: "Estimate concrete volume and number of bags needed." },
  { id: "bricks", icon: "🧱", title: "Brick Calculator", description: "Estimate bricks required for a wall including waste." },
  { id: "blocks", icon: "⬛", title: "Block Calculator", description: "Estimate blocks required for a wall including waste." },
  { id: "mortar", icon: "🥣", title: "Mortar Calculator", description: "Estimate mortar volume and material quantities for brick or blockwork." },
  { id: "plaster", icon: "🪣", title: "Plaster Calculator", description: "Estimate plaster volume and material requirements from wall area and thickness." },
  { id: "roof-pitch", icon: "🏠", title: "Roof Pitch Calculator", description: "Calculate roof pitch, angle, rise and run." },
  { id: "stairs", icon: "🪜", title: "Stair Calculator", description: "Estimate stair riser, going, total rise and total run." },
  { id: "waste", icon: "♻️", title: "Material Waste Calculator", description: "Add a practical waste allowance to your material quantity." }
];

const cNum = id => Number(document.getElementById(id)?.value || 0);
const cEsc = value => String(value).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cRound = (n, dp = 2) => Number.isFinite(n) ? n.toFixed(dp) : "0.00";

function constructionShell(title, description, fields, outputId, note = "") {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = description;
  content.innerHTML = `
    <div class="jp-calculator-form-page">
      <div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-construction-back">← Back</button><div><h2>${title}</h2><p>${description}</p></div></div>
      <div class="jp-calculator-panel">
        <div class="jp-calculator-fields">${fields}</div>
        <div class="jp-calculator-output" id="${outputId}">Enter your figures to calculate.</div>
        ${note ? `<div class="jp-calculator-note">${note}</div>` : ""}
      </div>
    </div>`;
  document.getElementById("jp-construction-back")?.addEventListener("click", renderConstructionCalculators);
}

const cField = (id, label, step = "0.01", placeholder = "0") => `<label class="jp-calculator-field"><span>${label}</span><input id="${id}" type="number" min="0" step="${step}" placeholder="${placeholder}"></label>`;

function cBind(ids, calculate) {
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener("input", calculate);
    document.getElementById(id)?.addEventListener("change", calculate);
  });
  calculate();
}

function cOutput(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function renderConstructionCalculators() {
  const content = document.getElementById("pageContent");
  if (!content) return;
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (pageTitle) pageTitle.textContent = "Construction Calculators";
  if (pageSubtitle) pageSubtitle.textContent = "Measurements, materials, quantities and building calculations.";
  content.innerHTML = `
    <div class="jp-calculators-page">
      <div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-construction-category-back">← Back</button><div><h2>Construction Calculators</h2><p>Measurements, materials, quantities and building calculations.</p></div></div>
      <div class="jp-calculator-grid">
        ${CONSTRUCTION_CALCULATORS.map(c => `<button class="jp-calculator-category" type="button" data-construction-calculator="${c.id}"><span class="jp-calculator-icon">${c.icon}</span><span><strong>${c.title}</strong><small>${c.description}</small></span><span class="jp-calculator-arrow">→</span></button>`).join("")}
      </div>
    </div>`;
  document.getElementById("jp-construction-category-back")?.addEventListener("click", () => window.JobPilotCalculators?.open());
  content.querySelectorAll("[data-construction-calculator]").forEach(button => button.addEventListener("click", () => openConstructionCalculator(button.dataset.constructionCalculator)));
}

function openConstructionCalculator(id) {
  const note = "Construction calculation aid only. Verify quantities, structural requirements, product data, tolerances, waste allowances and site conditions before ordering materials or carrying out work.";

  if (id === "area") {
    constructionShell("Area Calculator", "Calculate the area of a rectangular surface.", cField("con-length", "Length (m)") + cField("con-width", "Width (m)"), "con-area-output");
    cBind(["con-length","con-width"], () => {
      const area = cNum("con-length") * cNum("con-width");
      cOutput("con-area-output", `<strong>Area: ${cRound(area)} m²</strong><span>${cRound(area * 10.7639)} ft²</span>`);
    });
  }

  if (id === "volume") {
    constructionShell("Volume Calculator", "Calculate cubic volume from length, width and depth/height.", cField("con-v-length", "Length (m)") + cField("con-v-width", "Width (m)") + cField("con-v-height", "Height / depth (m)"), "con-volume-output");
    cBind(["con-v-length","con-v-width","con-v-height"], () => {
      const volume = cNum("con-v-length") * cNum("con-v-width") * cNum("con-v-height");
      cOutput("con-volume-output", `<strong>Volume: ${cRound(volume)} m³</strong><span>${cRound(volume * 1000)} litres</span><span>${cRound(volume * 35.3147)} ft³</span>`);
    });
  }

  if (id === "concrete") {
    constructionShell("Concrete Calculator", "Estimate concrete volume and approximate 25 kg bag count.", cField("con-c-length", "Length (m)") + cField("con-c-width", "Width (m)") + cField("con-c-depth", "Depth (m)") + cField("con-c-waste", "Waste allowance (%)", "0.1", "5"), "concrete-output", note);
    cBind(["con-c-length","con-c-width","con-c-depth","con-c-waste"], () => {
      const base = cNum("con-c-length") * cNum("con-c-width") * cNum("con-c-depth");
      const volume = base * (1 + cNum("con-c-waste") / 100);
      const bags = Math.ceil(volume / 0.0125);
      cOutput("concrete-output", `<strong>Concrete required: ${cRound(volume)} m³</strong><span>Approx. 25 kg bags: ${bags}</span><span>Base volume before waste: ${cRound(base)} m³</span>`);
    });
  }

  if (id === "bricks") {
    constructionShell("Brick Calculator", "Estimate bricks required for a wall using a standard 60 bricks/m² planning rate.", cField("con-b-length", "Wall length (m)") + cField("con-b-height", "Wall height (m)") + cField("con-b-openings", "Openings area (m²)") + cField("con-b-waste", "Waste allowance (%)", "0.1", "5"), "bricks-output", note);
    cBind(["con-b-length","con-b-height","con-b-openings","con-b-waste"], () => {
      const area = Math.max(0, cNum("con-b-length") * cNum("con-b-height") - cNum("con-b-openings"));
      const net = area * 60;
      const total = Math.ceil(net * (1 + cNum("con-b-waste") / 100));
      cOutput("bricks-output", `<strong>Bricks required: ${total.toLocaleString()}</strong><span>Net wall area: ${cRound(area)} m²</span><span>Planning rate: 60 bricks/m²</span>`);
    });
  }

  if (id === "blocks") {
    constructionShell("Block Calculator", "Estimate standard 440 × 215 mm blocks required for a wall.", cField("con-bl-length", "Wall length (m)") + cField("con-bl-height", "Wall height (m)") + cField("con-bl-openings", "Openings area (m²)") + cField("con-bl-waste", "Waste allowance (%)", "0.1", "5"), "blocks-output", note);
    cBind(["con-bl-length","con-bl-height","con-bl-openings","con-bl-waste"], () => {
      const area = Math.max(0, cNum("con-bl-length") * cNum("con-bl-height") - cNum("con-bl-openings"));
      const net = area / (0.44 * 0.215);
      const total = Math.ceil(net * (1 + cNum("con-bl-waste") / 100));
      cOutput("blocks-output", `<strong>Blocks required: ${total.toLocaleString()}</strong><span>Net wall area: ${cRound(area)} m²</span><span>Based on 440 × 215 mm block face area</span>`);
    });
  }

  if (id === "mortar") {
    constructionShell("Mortar Calculator", "Estimate mortar volume for brick or blockwork from wall area and joint assumptions.", cField("con-m-area", "Wall area (m²)") + cField("con-m-thickness", "Average mortar allowance (mm)", "0.1", "10") + cField("con-m-waste", "Waste allowance (%)", "0.1", "10"), "mortar-output", note);
    cBind(["con-m-area","con-m-thickness","con-m-waste"], () => {
      const base = cNum("con-m-area") * cNum("con-m-thickness") / 1000;
      const volume = base * (1 + cNum("con-m-waste") / 100);
      cOutput("mortar-output", `<strong>Estimated mortar: ${cRound(volume)} m³</strong><span>${cRound(volume * 1000)} litres</span><span>Allowance before waste: ${cRound(base)} m³</span>`);
    });
  }

  if (id === "plaster") {
    constructionShell("Plaster Calculator", "Estimate plaster volume from surface area and average application thickness.", cField("con-p-area", "Surface area (m²)") + cField("con-p-thickness", "Average thickness (mm)", "0.1", "10") + cField("con-p-waste", "Waste allowance (%)", "0.1", "10"), "plaster-output", note);
    cBind(["con-p-area","con-p-thickness","con-p-waste"], () => {
      const base = cNum("con-p-area") * cNum("con-p-thickness") / 1000;
      const volume = base * (1 + cNum("con-p-waste") / 100);
      cOutput("plaster-output", `<strong>Estimated plaster volume: ${cRound(volume)} m³</strong><span>${cRound(volume * 1000)} litres</span><span>Allowance before waste: ${cRound(base)} m³</span>`);
    });
  }

  if (id === "roof-pitch") {
    constructionShell("Roof Pitch Calculator", "Calculate roof pitch angle and rise from the run.", cField("con-r-riser", "Rise (m)") + cField("con-r-run", "Run (m)"), "roof-pitch-output", note);
    cBind(["con-r-riser","con-r-run"], () => {
      const rise = cNum("con-r-riser"), run = cNum("con-r-run");
      const angle = run > 0 ? Math.atan(rise / run) * 180 / Math.PI : 0;
      const ratio = rise > 0 ? run / rise : 0;
      const slope = run > 0 ? rise / run * 100 : 0;
      const rafter = Math.sqrt(rise * rise + run * run);
      cOutput("roof-pitch-output", `<strong>Pitch angle: ${cRound(angle, 1)}°</strong><span>Pitch: ${cRound(slope, 1)}%</span><span>Rise/run ratio: 1:${ratio ? cRound(ratio, 2) : "0"}</span><span>Rafter length: ${cRound(rafter)} m</span>`);
    });
  }

  if (id === "stairs") {
    constructionShell("Stair Calculator", "Estimate stair riser and going from total rise and desired riser height.", cField("con-s-rise", "Total rise (mm)") + cField("con-s-riser", "Target riser height (mm)", "1", "175") + cField("con-s-going", "Target going (mm)", "1", "250"), "stairs-output", note);
    cBind(["con-s-rise","con-s-riser","con-s-going"], () => {
      const rise = cNum("con-s-rise"), target = cNum("con-s-riser"), going = cNum("con-s-going");
      const steps = target > 0 ? Math.max(1, Math.round(rise / target)) : 0;
      const actualRiser = steps > 0 ? rise / steps : 0;
      const totalRun = Math.max(0, steps - 1) * going;
      cOutput("stairs-output", `<strong>Risers: ${steps}</strong><span>Actual riser: ${cRound(actualRiser, 1)} mm</span><span>Target going: ${cRound(going, 0)} mm</span><span>Estimated total run: ${cRound(totalRun, 0)} mm</span>`);
    });
  }

  if (id === "waste") {
    constructionShell("Material Waste Calculator", "Add a waste allowance to a calculated material quantity.", cField("con-w-quantity", "Base quantity") + cField("con-w-percent", "Waste allowance (%)", "0.1", "5"), "waste-output");
    cBind(["con-w-quantity","con-w-percent"], () => {
      const base = cNum("con-w-quantity"), waste = base * cNum("con-w-percent") / 100, total = base + waste;
      cOutput("waste-output", `<strong>Order quantity: ${cRound(total)}</strong><span>Base quantity: ${cRound(base)}</span><span>Waste allowance: ${cRound(waste)}</span>`);
    });
  }
}

function installConstructionCategoryHandler() {
  if (window.__jobPilotConstructionCalculatorsInstalled) return;
  window.__jobPilotConstructionCalculatorsInstalled = true;
  document.addEventListener("click", event => {
    const button = event.target.closest?.('[data-category="construction"]');
    if (button) renderConstructionCalculators();
  });
}

installConstructionCategoryHandler();
window.JobPilotConstructionCalculators = { open: renderConstructionCalculators, calculators: CONSTRUCTION_CALCULATORS };
