#!/usr/bin/env node
/**
 * Import an OS NGD GB Address CSV export into public.uk_address_lookup.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/import-os-gb-address.mjs /path/to/address.csv
 *
 * The importer deliberately accepts the current OS NGD CSV as well as common
 * AddressBase-style column names. It only loads current address records that
 * have a postcode and a usable address label.
 *
 * Do not run this against customer data. This table is a global reference
 * dataset and is independent of customer imports.
 */

import fs from "node:fs";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const batchSize = Number(process.env.BATCH_SIZE || 1000);

if (!filePath || !supabaseUrl || !supabaseKey) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/import-os-gb-address.mjs <csv>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function normalizePostcode(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function first(row, names) {
  for (const name of names) {
    const value = row[name];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return null;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function mapRow(headers, values) {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

  const uprn = clean(first(row, ["UPRN", "uprn", "UPRN_REFERENCE"]));
  const postcode = normalizePostcode(first(row, ["POSTCODE", "postcode", "Postcode"]));
  const addressLine1 = clean(first(row, [
    "SINGLE_LINE_ADDRESS",
    "singleLineAddress",
    "ADDRESS_LINE_1",
    "addressLine1",
    "BUILDING_NUMBER",
    "buildingNumber"
  ]));
  const addressLine2 = clean(first(row, [
    "ADDRESS_LINE_2",
    "addressLine2",
    "SUB_BUILDING_NAME",
    "subBuildingName",
    "BUILDING_NAME",
    "buildingName",
    "THOROUGHFARE",
    "thoroughfare"
  ]));
  const city = clean(first(row, ["POST_TOWN", "postTown", "TOWN", "town", "CITY", "city"]));
  const region = clean(first(row, ["LOCAL_AUTHORITY", "localAuthority", "COUNTY", "county", "REGION", "region"]));
  const latitude = Number(first(row, ["LATITUDE", "latitude", "LAT"]));
  const longitude = Number(first(row, ["LONGITUDE", "longitude", "LON"]));

  if (!postcode || !addressLine1) return null;

  const displayAddress = addressLine1 === postcode
    ? [addressLine2, city, region, postcode].filter(Boolean).join(", ")
    : [addressLine1, addressLine2, city, region, postcode].filter(Boolean).join(", ");

  return {
    uprn,
    postcode,
    address_line1: addressLine1,
    address_line2: addressLine2,
    city,
    region,
    country_code: "GB",
    search_text: displayAddress.toUpperCase(),
    display_address: displayAddress,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null
  };
}

async function flush(rows) {
  if (!rows.length) return 0;
  const { error } = await supabase
    .from("uk_address_lookup")
    .upsert(rows, { onConflict: "uprn" });
  if (error) throw error;
  return rows.length;
}

const stream = fs.createReadStream(filePath, { encoding: "utf8" });
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

let headers = null;
let batch = [];
let processed = 0;
let imported = 0;

for await (const line of rl) {
  if (!line.trim()) continue;
  const values = parseCsvLine(line);
  if (!headers) {
    headers = values.map(value => value.trim().replace(/^\uFEFF/, ""));
    continue;
  }

  processed += 1;
  const row = mapRow(headers, values);
  if (!row) continue;
  batch.push(row);

  if (batch.length >= batchSize) {
    imported += await flush(batch);
    batch = [];
    console.log(`Processed ${processed.toLocaleString()} rows; imported ${imported.toLocaleString()}.`);
  }
}

imported += await flush(batch);
console.log(`Finished. Processed ${processed.toLocaleString()} rows; imported/upserted ${imported.toLocaleString()} rows.`);
