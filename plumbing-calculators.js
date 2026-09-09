const PLUMBING_CALCULATORS = [
  { id: "pipe-flow", icon: "💧", title: "Pipe Flow Rate Calculator", description: "Calculate water flow from pipe diameter and velocity." },
  { id: "water-pressure", icon: "💦", title: "Water Pressure Calculator", description: "Convert between water pressure, head and elevation." },
  { id: "pipe-size", icon: "📏", title: "Pipe Size Calculator", description: "Estimate the minimum internal pipe diameter from flow and target velocity." },
  { id: "cylinder-size", icon: "🚿", title: "Hot Water Cylinder Calculator", description: "Estimate hot-water storage volume from household demand." },
  { id: "boiler-output", icon: "🔥", title: "Boiler Output Calculator", description: "Estimate heating output from room or property heat demand." },
  { id: "radiator-size", icon: "♨️", title: "Radiator Size Calculator", description: "Calculate radiator output required for a room and convert to BTU/h." },
  { id: "pump-head", icon: "🔄", title: "Pump Flow & Head Calculator", description: "Calculate required pump head from static lift and pressure requirements." },
  { id: "drainage-fall", icon: "↘️", title: "Drainage Fall Calculator", description: "Calculate pipe fall, gradient and total drop over a drainage run." },
  { id: "pipe-volume", icon: "🪣", title: "Pipe Volume Calculator", description: "Calculate the amount of water contained in a pipe run." },
  { id: "water-heating-cost", icon: "£", title: "Water Heating Cost Calculator", description: "Estimate energy use, heat-up time and cost for heating water." }
];

const pn = id => Number(document.getElementById(id)?.value || 0);
const pout = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
const pfield = (id, label, step = "0.01", placeholder = "0") => `<label class="jp-calculator-field"><span>${label}</span><input id="${id}" type="number" min="0" step="${step}" placeholder="${placeholder}"></label>`;

function plumbingShell(title, description, fields, outputId, note = "Plumbing calculation aid only. Always verify the result against current UK regulations, manufacturer data, system design requirements and site conditions.") {
  const content = document.getElementById("pageContent");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (!content) return;
  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = description;
  content.innerHTML = `<div class="jp-calculator-form-page"><div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-plumbing-back">← Back</button><div><h2>${title}</h2><p>${description}</p></div></div><div class="jp-calculator-panel"><div class="jp-calculator-fields">${fields}</div><div class="jp-calculator-output" id="${outputId}">Enter your figures to calculate.</div><div class="jp-calculator-note">${note}</div></div></div>`;
  document.getElementById("jp-plumbing-back")?.addEventListener("click", renderPlumbingCalculators);
}

function bind(ids, calculate) {
  ids.forEach(id => { document.getElementById(id)?.addEventListener("input", calculate); document.getElementById(id)?.addEventListener("change", calculate); });
  calculate();
}

function renderPlumbingCalculators() {
  const content = document.getElementById("pageContent");
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (!content) return;
  if (title) title.textContent = "Plumbing Calculators";
  if (subtitle) subtitle.textContent = "Flow, pressure, pipe, heating and drainage calculation aids.";
  content.innerHTML = `<div class="jp-calculators-page"><div class="page-actions"><button type="button" class="jp-calculator-back" id="jp-plumbing-category-back">← Back</button><div><h2>Plumbing Calculators</h2><p>Useful calculators for plumbing and heating work.</p></div></div><div class="jp-calculator-grid">${PLUMBING_CALCULATORS.map(c => `<button class="jp-calculator-category" type="button" data-plumbing-calculator="${c.id}"><span class="jp-calculator-icon">${c.icon}</span><span><strong>${c.title}</strong><small>${c.description}</small></span><span class="jp-calculator-arrow">→</span></button>`).join("")}</div></div>`;
  document.getElementById("jp-plumbing-category-back")?.addEventListener("click", () => window.JobPilotCalculators?.open());
  content.querySelectorAll("[data-plumbing-calculator]").forEach(btn => btn.addEventListener("click", () => openPlumbingCalculator(btn.dataset.plumbingCalculator)));
}

function openPlumbingCalculator(id) {
  if (id === "pipe-flow") {
    plumbingShell("Pipe Flow Rate Calculator", "Calculate flow rate from pipe diameter and water velocity.", pfield("pl-flow-diameter", "Internal pipe diameter (mm)") + pfield("pl-flow-velocity", "Water velocity (m/s)", "0.01", "1.00"), "pl-flow-output");
    bind(["pl-flow-diameter","pl-flow-velocity"], () => { const d = pn("pl-flow-diameter") / 1000, v = pn("pl-flow-velocity"); const area = Math.PI * d * d / 4; const lps = area * v * 1000; pout("pl-flow-output", `<strong>Flow rate: ${lps.toFixed(2)} L/s</strong><span>${(lps * 60).toFixed(1)} L/min</span><span>${(lps * 3.6).toFixed(3)} m³/h</span>`); });
  }

  if (id === "water-pressure") {
    plumbingShell("Water Pressure Calculator", "Convert water head into pressure, or pressure into an equivalent water head.", pfield("pl-pressure-head", "Water head (m)", "0.01", "0") + pfield("pl-pressure-bar", "Pressure (bar)", "0.01", "0"), "pl-pressure-output");
    bind(["pl-pressure-head","pl-pressure-bar"], () => { const head = pn("pl-pressure-head"), bar = pn("pl-pressure-bar"); const pressure = head ? head * 0.0980665 : bar; const calculatedHead = bar ? bar / 0.0980665 : head; pout("pl-pressure-output", `<strong>Pressure: ${pressure.toFixed(3)} bar</strong><span>Equivalent water head: ${calculatedHead.toFixed(2)} m</span><span>Pressure: ${(pressure * 100).toFixed(1)} kPa</span>`); });
  }

  if (id === "pipe-size") {
    plumbingShell("Pipe Size Calculator", "Estimate the minimum internal diameter from required flow and target velocity.", pfield("pl-size-flow", "Required flow (L/min)") + pfield("pl-size-velocity", "Target maximum velocity (m/s)", "0.01", "1.50"), "pl-size-output");
    bind(["pl-size-flow","pl-size-velocity"], () => { const q = pn("pl-size-flow") / 60000, v = pn("pl-size-velocity"); const d = v > 0 ? Math.sqrt((4 * q) / (Math.PI * v)) * 1000 : 0; const common = [8,10,12,15,22,28,35,42,54,63,90,110].find(x => x >= d) || 0; pout("pl-size-output", `<strong>Minimum internal diameter: ${d.toFixed(1)} mm</strong><span>Nearest common nominal size at or above this diameter: ${common ? common + " mm" : "Above listed range"}</span><span>Check actual internal bore and manufacturer data before selecting pipework.</span>`); });
  }

  if (id === "cylinder-size") {
    plumbingShell("Hot Water Cylinder Calculator", "Estimate storage volume from occupants and daily hot-water demand.", pfield("pl-cyl-people", "Number of occupants", "1", "2") + pfield("pl-cyl-litres", "Estimated hot-water use per person (L/day)", "1", "50") + pfield("pl-cyl-peak", "Peak-demand factor", "0.01", "0.60"), "pl-cyl-output");
    bind(["pl-cyl-people","pl-cyl-litres","pl-cyl-peak"], () => { const people = pn("pl-cyl-people"), litres = pn("pl-cyl-litres"), factor = pn("pl-cyl-peak") || 0.6; const daily = people * litres, storage = daily * factor; pout("pl-cyl-output", `<strong>Estimated storage requirement: ${storage.toFixed(0)} L</strong><span>Estimated daily hot-water demand: ${daily.toFixed(0)} L</span><span>Peak-demand factor used: ${(factor * 100).toFixed(0)}%</span>`); });
  }

  if (id === "boiler-output") {
    plumbingShell("Boiler Output Calculator", "Estimate boiler output from total room heat demand with a hot-water allowance.", pfield("pl-boiler-heat", "Space-heating demand (kW)") + pfield("pl-boiler-hotwater", "Hot-water allowance (kW)") + pfield("pl-boiler-margin", "Design margin (%)", "1", "10"), "pl-boiler-output");
    bind(["pl-boiler-heat","pl-boiler-hotwater","pl-boiler-margin"], () => { const heat = pn("pl-boiler-heat"), hw = pn("pl-boiler-hotwater"), margin = pn("pl-boiler-margin"); const required = (heat + hw) * (1 + margin / 100); pout("pl-boiler-output", `<strong>Estimated boiler output: ${required.toFixed(1)} kW</strong><span>Base demand: ${(heat + hw).toFixed(1)} kW</span><span>Design margin: ${margin.toFixed(1)}%</span>`); });
  }

  if (id === "radiator-size") {
    plumbingShell("Radiator Size Calculator", "Calculate required radiator output and convert between watts and BTU/h.", pfield("pl-rad-heat", "Room heat loss / required output (W)") + pfield("pl-rad-rated-dt", "Radiator catalogue ΔT (°C)", "1", "50") + pfield("pl-rad-actual-dt", "Actual system ΔT (°C)", "1", "50"), "pl-rad-output");
    bind(["pl-rad-heat","pl-rad-rated-dt","pl-rad-actual-dt"], () => { const heat = pn("pl-rad-heat"), rated = pn("pl-rad-rated-dt"), actual = pn("pl-rad-actual-dt"); const requiredRated = actual > 0 && rated > 0 ? heat * Math.pow(rated / actual, 1.3) : heat; pout("pl-rad-output", `<strong>Required radiator catalogue output: ${requiredRated.toFixed(0)} W</strong><span>Approx. BTU/h: ${(requiredRated * 3.412142).toFixed(0)} BTU/h</span><span>Room demand entered: ${heat.toFixed(0)} W</span><span>Actual ΔT: ${actual.toFixed(1)}°C</span>`); });
  }

  if (id === "pump-head") {
    plumbingShell("Pump Flow & Head Calculator", "Estimate pump head from static lift, required pressure and system losses.", pfield("pl-pump-flow", "Required flow (L/min)") + pfield("pl-pump-lift", "Static lift (m)") + pfield("pl-pump-pressure", "Required pressure at outlet (bar)") + pfield("pl-pump-loss", "Estimated pipe/fitting losses (m)"), "pl-pump-output");
    bind(["pl-pump-flow","pl-pump-lift","pl-pump-pressure","pl-pump-loss"], () => { const flow = pn("pl-pump-flow"), lift = pn("pl-pump-lift"), pressure = pn("pl-pump-pressure"), loss = pn("pl-pump-loss"); const pressureHead = pressure / 0.0980665; const head = lift + pressureHead + loss; pout("pl-pump-output", `<strong>Estimated pump head: ${head.toFixed(2)} m</strong><span>Required flow: ${flow.toFixed(1)} L/min</span><span>Pressure head: ${pressureHead.toFixed(2)} m</span><span>Static lift: ${lift.toFixed(2)} m</span><span>Estimated system losses: ${loss.toFixed(2)} m</span>`); });
  }

  if (id === "drainage-fall") {
    plumbingShell("Drainage Fall Calculator", "Calculate total fall from a drainage run and gradient ratio.", pfield("pl-fall-length", "Pipe run length (m)") + pfield("pl-fall-ratio", "Gradient ratio (1 in X)", "1", "40"), "pl-fall-output", "Guidance only. Drainage design must be checked against current Building Regulations Approved Document H and any local or sewer-adopter requirements.");
    bind(["pl-fall-length","pl-fall-ratio"], () => { const length = pn("pl-fall-length"), ratio = pn("pl-fall-ratio"); const drop = ratio > 0 ? length / ratio * 1000 : 0; const percent = ratio > 0 ? 100 / ratio : 0; pout("pl-fall-output", `<strong>Total fall: ${drop.toFixed(0)} mm</strong><span>Gradient: ${percent.toFixed(3)}%</span><span>Fall per metre: ${(1000 / (ratio || 1)).toFixed(2)} mm/m</span><span>Gradient: 1 in ${ratio.toFixed(0)}</span>`); });
  }

  if (id === "pipe-volume") {
    plumbingShell("Pipe Volume Calculator", "Calculate the volume of water contained in a pipe run.", pfield("pl-vol-diameter", "Internal pipe diameter (mm)") + pfield("pl-vol-length", "Pipe length (m)"), "pl-vol-output");
    bind(["pl-vol-diameter","pl-vol-length"], () => { const d = pn("pl-vol-diameter") / 1000, length = pn("pl-vol-length"); const litres = Math.PI * d * d / 4 * length * 1000; pout("pl-vol-output", `<strong>Water volume: ${litres.toFixed(2)} L</strong><span>Volume: ${(litres / 1000).toFixed(4)} m³</span><span>Internal diameter: ${(d * 1000).toFixed(1)} mm</span>`); });
  }

  if (id === "water-heating-cost") {
    plumbingShell("Water Heating Cost Calculator", "Estimate energy, heat-up time and cost to heat a volume of water.", pfield("pl-heat-volume", "Water volume (L)") + pfield("pl-heat-start", "Starting temperature (°C)") + pfield("pl-heat-target", "Target temperature (°C)") + pfield("pl-heat-power", "Heater power (kW)", "0.01", "3.00") + pfield("pl-heat-cost", "Electricity cost (£/kWh)", "0.001", "0.30"), "pl-heat-output");
    bind(["pl-heat-volume","pl-heat-start","pl-heat-target","pl-heat-power","pl-heat-cost"], () => { const litres = pn("pl-heat-volume"), start = pn("pl-heat-start"), target = pn("pl-heat-target"), power = pn("pl-heat-power"), rate = pn("pl-heat-cost"); const delta = Math.max(0, target - start); const kwh = litres * 4.186 * delta / 3600; const hours = power > 0 ? kwh / power : 0; const cost = kwh * rate; pout("pl-heat-output", `<strong>Energy required: ${kwh.toFixed(2)} kWh</strong><span>Estimated heat-up time: ${(hours * 60).toFixed(0)} minutes</span><span>Estimated energy cost: £${cost.toFixed(2)}</span><span>Temperature rise: ${delta.toFixed(1)}°C</span>`); });
  }
}

function installPlumbingCategoryHandler() {
  if (window.__jobPilotPlumbingCalculatorsInstalled) return;
  window.__jobPilotPlumbingCalculatorsInstalled = true;
  document.addEventListener("click", event => {
    const category = event.target.closest?.('[data-category="plumbing"]');
    if (category) { event.preventDefault(); renderPlumbingCalculators(); }
  });
}

installPlumbingCategoryHandler();
window.JobPilotPlumbingCalculators = { open: renderPlumbingCalculators, calculators: PLUMBING_CALCULATORS };
