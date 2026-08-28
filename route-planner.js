import { supabase } from "./supabase.js";

const POSTCODE_API = "https://api.postcodes.io/postcodes";
const OSRM_TABLE_API = "https://router.project-osrm.org/table/v1/driving";
const MAX_EXACT_STOPS = 9;

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalisePostcode(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function customerForJob(job, customers) {
  return customers.find(customer => String(customer.id) === String(job.customer_id)) || null;
}

function formatMoney(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function formatMinutes(minutes) {
  const rounded = Math.max(0, Math.round(Number(minutes || 0)));
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function formatDistance(metres) {
  const miles = Number(metres || 0) / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} miles` : `${Math.round(miles)} miles`;
}

async function geocodePostcodes(postcodes) {
  const unique = [...new Set(postcodes.map(normalisePostcode).filter(Boolean))];
  if (!unique.length) return new Map();

  const response = await fetch(POSTCODE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcodes: unique })
  });

  if (!response.ok) throw new Error("The postcode service could not be reached.");

  const payload = await response.json();
  const map = new Map();

  for (const item of payload.result || []) {
    if (item?.result && item.query) {
      map.set(normalisePostcode(item.query), {
        lat: Number(item.result.latitude),
        lon: Number(item.result.longitude)
      });
    }
  }

  return map;
}

async function getRoadMatrix(points) {
  const coordinates = points.map(point => `${point.lon},${point.lat}`).join(";");
  const response = await fetch(`${OSRM_TABLE_API}/${coordinates}?annotations=distance,duration`);

  if (!response.ok) throw new Error("The road-routing service could not be reached.");

  const payload = await response.json();
  if (!Array.isArray(payload.distances) || !Array.isArray(payload.durations)) {
    throw new Error("The road-routing service returned an incomplete route.");
  }

  return { distances: payload.distances, durations: payload.durations };
}

function fixedOrderIsValid(order, jobs) {
  const timed = order
    .map(index => jobs[index])
    .filter(job => job.scheduled_time)
    .map(job => job.id);

  const expected = jobs
    .filter(job => job.scheduled_time)
    .slice()
    .sort((a, b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time)))
    .map(job => job.id);

  return timed.every((id, index) => id === expected[index]);
}

function routeCost(order, distances, startIndex = null) {
  let total = 0;

  if (startIndex !== null && order.length) {
    total += Number(distances[startIndex]?.[order[0]] || 0);
  }

  for (let i = 1; i < order.length; i++) {
    total += Number(distances[order[i - 1]]?.[order[i]] || 0);
  }

  return total;
}

function permutations(values) {
  if (values.length <= 1) return [values];

  const result = [];
  for (let i = 0; i < values.length; i++) {
    const rest = values.slice(0, i).concat(values.slice(i + 1));
    for (const tail of permutations(rest)) {
      result.push([values[i], ...tail]);
    }
  }

  return result;
}

function optimiseRoute(jobs, matrix, startIndex) {
  const indexes = jobs.map((_, index) => index);

  if (indexes.length <= MAX_EXACT_STOPS) {
    let best = indexes.slice();
    let bestCost = Infinity;

    for (const candidate of permutations(indexes)) {
      if (!fixedOrderIsValid(candidate, jobs)) continue;

      const cost = routeCost(candidate, matrix.distances, startIndex);
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
      }
    }

    return best;
  }

  const remaining = new Set(indexes);
  const result = [];
  let current = startIndex !== null ? startIndex : indexes[0];

  if (remaining.has(current)) {
    result.push(current);
    remaining.delete(current);
  }

  while (remaining.size) {
    const next = [...remaining].sort((a, b) =>
      Number(matrix.distances[current]?.[a] || Infinity) -
      Number(matrix.distances[current]?.[b] || Infinity)
    )[0];

    result.push(next);
    remaining.delete(next);
    current = next;
  }

  const expected = jobs
    .map((job, index) => ({ job, index }))
    .filter(item => item.job.scheduled_time)
    .sort((a, b) => String(a.job.scheduled_time).localeCompare(String(b.job.scheduled_time)))
    .map(item => item.index);

  const timedSet = new Set(expected);
  const timedInResult = result.filter(index => timedSet.has(index));

  if (timedInResult.length && timedInResult.join(",") !== expected.join(",")) {
    const flexible = result.filter(index => !timedSet.has(index));
    return [...expected, ...flexible];
  }

  return result;
}

// Google Maps URLs opened on mobile browsers support up to three waypoints.
// For longer JobPilot routes we therefore split the recommended route into
// separate legs. Each leg contains at most five stops: origin + 3 waypoints + destination.
function googleRouteLegs(stops, startPoint = null) {
  if (!stops.length) return [];

  const legs = [];
  let origin = startPoint?.postcode || stops[0].postcode;
  let index = 0;

  while (index < stops.length) {
    const legStops = stops.slice(index, Math.min(index + 5, stops.length));
    if (!legStops.length) break;

    const destination = legStops[legStops.length - 1].postcode;
    const waypointStops = legStops.slice(0, -1);

    const params = new URLSearchParams();
    params.set("api", "1");
    params.set("origin", origin);
    params.set("destination", destination);
    params.set("travelmode", "driving");

    if (waypointStops.length) {
      params.set("waypoints", waypointStops.map(stop => stop.postcode).join("|"));
    }

    legs.push({
      from: index + 1,
      to: index + legStops.length,
      url: `https://www.google.com/maps/dir/?${params.toString()}`
    });

    origin = destination;

    if (legStops.length === 1) break;
    index += legStops.length - 1;
  }

  return legs;
}

function setHeader(title, subtitle) {
  const titleElement = document.getElementById("pageTitle");
  const subtitleElement = document.getElementById("pageSubtitle");
  if (titleElement) titleElement.textContent = title;
  if (subtitleElement) subtitleElement.textContent = subtitle;
}

function renderBackButton(content) {
  const button = content.querySelector("[data-route-back]");
  if (button) {
    button.addEventListener("click", () => {
      const dashboard = document.querySelector('.nav-item[data-page="dashboard"]');
      if (dashboard) dashboard.click();
    });
  }
}

export async function openTodayRoute() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  setHeader("Today's Route", "Plan the most efficient order for today's work.");

  content.innerHTML = `
    <div class="page-actions">
      <div>
        <h2>🚐 Today's Route</h2>
        <p>Calculating the best driving order from your customers' postcodes…</p>
      </div>
    </div>
    <div class="panel"><p>Calculating route…</p></div>
  `;

  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("You are not signed in.");

    const today = getTodayDate();

    const [
      { data: jobs, error: jobsError },
      { data: customers, error: customersError }
    ] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, customer_id, title, scheduled_date, scheduled_time, status, price, notes")
        .eq("user_id", user.id)
        .eq("scheduled_date", today),
      supabase
        .from("customers")
        .select("id, name, address_line1, address_line2, city, postcode")
        .eq("user_id", user.id)
    ]);

    if (jobsError) throw jobsError;
    if (customersError) throw customersError;

    const activeJobs = (jobs || []).filter(
      job => String(job.status || "").toLowerCase() !== "cancelled"
    );

    if (!activeJobs.length) {
      content.innerHTML = `
        <div class="page-actions">
          <div>
            <h2>🚐 Today's Route</h2>
            <p>No active jobs are scheduled for today.</p>
          </div>
        </div>
        <div class="panel">
          <h3>No jobs to route</h3>
          <p class="muted">Add a job for today and JobPilot will build the route automatically.</p>
          <button class="button secondary" data-route-back>← Back to Dashboard</button>
        </div>`;
      renderBackButton(content);
      return;
    }

    const enriched = activeJobs.map(job => {
      const customer = customerForJob(job, customers || []);
      return {
        ...job,
        customer,
        postcode: normalisePostcode(customer?.postcode),
        address: [
          customer?.address_line1,
          customer?.address_line2,
          customer?.city,
          customer?.postcode
        ].filter(Boolean).join(", ")
      };
    });

    const missing = enriched.filter(job => !job.postcode);
    const geocoded = await geocodePostcodes(enriched.map(job => job.postcode));
    const routable = enriched.filter(job => geocoded.has(job.postcode));
    const unrouteable = enriched.filter(job => !geocoded.has(job.postcode));

    if (!routable.length) {
      throw new Error("None of today's jobs has a valid UK postcode that can be routed.");
    }

    const points = routable.map(job => geocoded.get(job.postcode));
    let startPoint = null;
    let startLabel = "First scheduled job";

    const settings = JSON.parse(
      localStorage.getItem("jobpilot_settings") || "{}"
    );

    const businessPostcode = normalisePostcode(settings.postcode);

    if (businessPostcode) {
      const businessGeo = (
        await geocodePostcodes([businessPostcode])
      ).get(businessPostcode);

      if (businessGeo) {
        startPoint = {
          ...businessGeo,
          postcode: businessPostcode
        };
        startLabel = `Business base · ${businessPostcode}`;
      }
    }

    const matrixPoints = startPoint
      ? [startPoint, ...points]
      : points;

    const matrix = await getRoadMatrix(matrixPoints);

    const jobMatrix = startPoint
      ? {
          distances: matrix.distances
            .slice(1)
            .map(row => row.slice(1)),
          durations: matrix.durations
            .slice(1)
            .map(row => row.slice(1))
        }
      : matrix;

    let startJobIndex = null;

    if (!startPoint) {
      const timedIndexes = routable
        .map((job, index) => ({ job, index }))
        .filter(item => item.job.scheduled_time)
        .sort((a, b) =>
          String(a.job.scheduled_time).localeCompare(
            String(b.job.scheduled_time)
          )
        );

      startJobIndex = timedIndexes[0]?.index ?? 0;
    }

    const order = optimiseRoute(
      routable,
      jobMatrix,
      startJobIndex
    );

    const orderedJobs = order.map(index => routable[index]);

    let totalDistance = 0;
    let totalDuration = 0;

    if (startPoint) {
      const first = order[0];
      totalDistance += Number(
        matrix.distances[0]?.[first + 1] || 0
      );
      totalDuration += Number(
        matrix.durations[0]?.[first + 1] || 0
      );

      for (let i = 1; i < order.length; i++) {
        totalDistance += Number(
          jobMatrix.distances[order[i - 1]]?.[order[i]] || 0
        );
        totalDuration += Number(
          jobMatrix.durations[order[i - 1]]?.[order[i]] || 0
        );
      }
    } else {
      for (let i = 1; i < order.length; i++) {
        totalDistance += Number(
          jobMatrix.distances[order[i - 1]]?.[order[i]] || 0
        );
        totalDuration += Number(
          jobMatrix.durations[order[i - 1]]?.[order[i]] || 0
        );
      }
    }

    const totalValue = activeJobs.reduce(
      (sum, job) => sum + Number(job.price || 0),
      0
    );

    const routeLegs = googleRouteLegs(
      orderedJobs,
      startPoint
    );

    const mapsButton = routeLegs.length === 1
      ? `<a class="button primary" href="${routeLegs[0].url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-flex;align-items:center;">🧭 Open in Maps</a>`
      : `<button class="button primary" type="button" data-open-first-map>🧭 Open in Maps</button>`;

    content.innerHTML = `
      <div class="page-actions">
        <div>
          <h2>🚐 Today's Route</h2>
          <p>${escapeHtml(today)} · ${orderedJobs.length} routable jobs</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="button secondary" data-route-back>← Dashboard</button>
          ${mapsButton}
        </div>
      </div>

      <div class="stats" style="margin-bottom:20px;">
        <div class="stat-card"><div class="stat-icon">📍</div><div><span>Stops</span><strong>${activeJobs.length}</strong></div></div>
        <div class="stat-card"><div class="stat-icon">🛣️</div><div><span>Driving distance</span><strong>${formatDistance(totalDistance)}</strong></div></div>
        <div class="stat-card"><div class="stat-icon">⏱️</div><div><span>Driving time</span><strong>${formatMinutes(totalDuration / 60)}</strong></div></div>
        <div class="stat-card"><div class="stat-icon">💷</div><div><span>Job value</span><strong>${formatMoney(totalValue)}</strong></div></div>
      </div>

      ${routeLegs.length > 1 ? `
        <div class="panel" style="margin-bottom:20px;">
          <h3>🧭 Maps route</h3>
          <p class="muted">You're on iPhone, and Google Maps limits a Maps URL to three intermediate stops. JobPilot has split this route into ${routeLegs.length} driving legs so every stop is included.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
            ${routeLegs.map((leg, index) => `
              <a class="button secondary" href="${leg.url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                Leg ${index + 1}: stops ${leg.from}–${leg.to}
              </a>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Recommended order</h2>
            <p>Route calculated from postcode road distances${escapeHtml(startPoint ? ` · ${startLabel}` : " · starting with the earliest timed job")}</p>
          </div>
        </div>

        ${orderedJobs.map((job, position) => `
          <div class="job-row" style="align-items:flex-start;">
            <div style="display:flex;gap:12px;min-width:0;">
              <div style="width:34px;height:34px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;">${position + 1}</div>
              <div>
                <strong>${escapeHtml(job.customer?.name || job.title || "Customer")}</strong>
                <div class="muted" style="margin-top:4px;">${escapeHtml(job.title || "Job")}${job.scheduled_time ? ` · ${escapeHtml(String(job.scheduled_time).slice(0, 5))}` : ""}</div>
                <div class="muted" style="margin-top:4px;">📍 ${escapeHtml(job.address || job.postcode)}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <strong>${formatMoney(job.price)}</strong>
              <a class="button secondary" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.postcode)}&travelmode=driving" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">Navigate</a>
            </div>
          </div>
        `).join("")}
      </div>

      ${missing.length || unrouteable.length ? `
        <div class="panel" style="margin-top:20px;border-color:#fed7aa;background:#fffbeb;">
          <h3>⚠️ ${missing.length + unrouteable.length} job${missing.length + unrouteable.length === 1 ? "" : "s"} not included in the route</h3>
          <p class="muted">These jobs need a valid UK postcode before JobPilot can calculate their driving position.</p>
          ${[...new Map([...missing, ...unrouteable].map(job => [job.id, job])).values()].map(job => `
            <div style="margin-top:8px;"><strong>${escapeHtml(job.customer?.name || job.title || "Job")}</strong> · ${escapeHtml(job.postcode || "No postcode")}</div>
          `).join("")}
        </div>
      ` : ""}
    `;

    const firstMapButton = content.querySelector("[data-open-first-map]");
    if (firstMapButton && routeLegs[0]) {
      firstMapButton.addEventListener("click", () => {
        window.open(routeLegs[0].url, "_blank", "noopener,noreferrer");
      });
    }

    renderBackButton(content);
  } catch (error) {
    console.error("Today's route:", error);

    content.innerHTML = `
      <div class="page-actions">
        <div>
          <h2>🚐 Today's Route</h2>
          <p>We couldn't calculate the route.</p>
        </div>
      </div>
      <div class="panel">
        <h3>Route calculation failed</h3>
        <p class="muted">${escapeHtml(error.message || "Please check the customer postcodes and try again.")}</p>
        <button class="button secondary" data-route-back>← Back to Dashboard</button>
      </div>`;

    renderBackButton(content);
  }
}
