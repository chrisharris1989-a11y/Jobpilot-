import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function basicAuth(username: string, password: string) {
  return "Basic " + btoa(unescape(encodeURIComponent(`${username}:${password}`)));
}

function localName(node: Element) {
  return node.localName || node.nodeName.split(":").pop() || "";
}

function all(root: Document | Element, name: string) {
  return Array.from(root.getElementsByTagName("*")).filter((e) => localName(e) === name);
}

function first(root: Element, name: string) {
  for (const e of Array.from(root.getElementsByTagName("*"))) {
    if (localName(e) === name) return e.textContent?.trim() || null;
  }
  return null;
}

function absolute(base: string, value: string) {
  return new URL(value, base).toString();
}

async function caldav(url: string, method: string, auth: string, body?: string, depth?: string) {
  const headers: Record<string, string> = {
    Authorization: auth,
    Accept: "application/xml, text/xml, text/calendar, */*",
  };
  if (depth !== undefined) headers.Depth = depth;
  if (body) headers["Content-Type"] = "application/xml; charset=utf-8";

  const response = await fetch(url, { method, headers, body });
  const text = await response.text();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Apple rejected the credentials. Use your Apple Account email and an app-specific password.");
    }
    throw new Error(`Apple Calendar returned HTTP ${response.status}.`);
  }
  return text;
}

function parseDate(value?: string) {
  if (!value) return null;
  const x = value.trim().split(":").pop()!;
  if (/^\d{8}$/.test(x)) {
    return { date: `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}`, time: null };
  }
  const match = x.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  return match
    ? { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` }
    : null;
}

function unescapeIcs(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcs(ics: string) {
  const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events: any[] = [];
  let current: any = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      const start = parseDate(current?.DTSTART);
      const end = parseDate(current?.DTEND);
      if (start) {
        events.push({
          title: current.SUMMARY || "Imported calendar job",
          description: current.DESCRIPTION || "",
          location: current.LOCATION || "",
          date: start.date,
          time: start.time,
          endDate: end?.date || null,
          endTime: end?.time || null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    for (const key of ["SUMMARY", "DESCRIPTION", "LOCATION", "DTSTART", "DTEND"]) {
      if (line.startsWith(`${key}:`) || line.startsWith(`${key};`)) {
        current[key] = unescapeIcs(line.slice(line.indexOf(":") + 1));
        break;
      }
    }
  }
  return events;
}

async function listCalendars(auth: string) {
  const root = "https://caldav.icloud.com/";
  const principalXml = await caldav(
    root,
    "PROPFIND",
    auth,
    `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/><d:principal-URL/></d:prop></d:propfind>`,
    "0",
  );
  const principalDoc = new DOMParser().parseFromString(principalXml, "application/xml");
  if (!principalDoc) throw new Error("Invalid response from Apple.");

  const principalHref = all(principalDoc, "response")
    .map((response) => first(response, "href"))
    .find(Boolean);
  if (!principalHref) throw new Error("Could not discover your iCloud calendar principal.");

  const principalUrl = absolute(root, principalHref);
  const homeXml = await caldav(
    principalUrl,
    "PROPFIND",
    auth,
    `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`,
    "0",
  );
  const homeDoc = new DOMParser().parseFromString(homeXml, "application/xml");
  if (!homeDoc) throw new Error("Invalid principal response from Apple.");

  const homeHref = first(homeDoc.documentElement, "href");
  if (!homeHref) throw new Error("Could not discover your iCloud calendar home.");

  const homeUrl = absolute(principalUrl, homeHref);
  const calendarsXml = await caldav(
    homeUrl,
    "PROPFIND",
    auth,
    `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>`,
    "1",
  );
  const calendarsDoc = new DOMParser().parseFromString(calendarsXml, "application/xml");
  if (!calendarsDoc) throw new Error("Invalid calendar-home response from Apple.");

  return all(calendarsDoc, "response")
    .map((response) => {
      const calendarHref = first(response, "href");
      const isCalendar = Array.from(response.getElementsByTagName("*")).some((e) => localName(e) === "calendar");
      return calendarHref && isCalendar
        ? { id: absolute(homeUrl, calendarHref), name: first(response, "displayname") || "Apple Calendar" }
        : null;
    })
    .filter(Boolean);
}

async function fetchEvents(calendarUrl: string, auth: string, from: string, to: string) {
  const body = `<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${from}" end="${to}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;
  const reportXml = await caldav(calendarUrl, "REPORT", auth, body, "1");
  const reportDoc = new DOMParser().parseFromString(reportXml, "application/xml");
  if (!reportDoc) throw new Error("Invalid calendar report from Apple.");

  const events: any[] = [];
  for (const calendarData of all(reportDoc, "calendar-data")) {
    events.push(...parseIcs(calendarData.textContent || ""));
  }
  return events;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !authorization?.startsWith("Bearer ")) {
      return json({ error: "Authentication required." }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Authentication required." }, 401);

    const body = await request.json();
    const appleId = String(body?.appleId || "").trim();
    const appSpecificPassword = String(body?.appSpecificPassword || "").trim();
    if (!appleId || !appSpecificPassword) {
      return json({ error: "Apple Account email and app-specific password are required." }, 400);
    }

    const appleAuth = basicAuth(appleId, appSpecificPassword);

    if (body.action === "list_calendars") {
      return json({ calendars: await listCalendars(appleAuth) });
    }

    if (body.action === "fetch_events") {
      const calendarUrl = String(body.calendarUrl || "");
      if (!calendarUrl.startsWith("https://caldav.icloud.com/")) {
        return json({ error: "Invalid Apple calendar URL." }, 400);
      }
      if (!body.from || !body.to) return json({ error: "A date range is required." }, 400);
      return json({ events: await fetchEvents(calendarUrl, appleAuth, String(body.from), String(body.to)) });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("apple-caldav-import", error);
    return json({ error: error instanceof Error ? error.message : "Apple Calendar import failed." }, 500);
  }
});
