// =====================================================
// JOBPILOT DATA LOADER
// =====================================================
// Section 3 extracted from the original app.js.
// Loads the user's customers, jobs, quotes and invoices.
// =====================================================

import { supabase } from "../supabase.js";


// =====================================================
// CUSTOMERS
// =====================================================

export async function loadCustomers() {
  const { data, error } =
    await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Customers:", error);
    return [];
  }

  return data || [];
}


// =====================================================
// JOBS
// =====================================================

export async function loadJobs() {
  const { data, error } =
    await supabase
      .from("jobs")
      .select("*")
      .order("scheduled_date", {
        ascending: true,
        nullsFirst: false
      });

  if (error) {
    console.error("Jobs:", error);
    return [];
  }

  return data || [];
}


// =====================================================
// QUOTES
// =====================================================

export async function loadQuotes() {
  const { data, error } =
    await supabase
      .from("quotes")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Quotes:", error);
    return [];
  }

  return data || [];
}


// =====================================================
// INVOICES
// =====================================================

export async function loadInvoices() {
  const { data, error } =
    await supabase
      .from("invoices")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Invoices:", error);
    return [];
  }

  return data || [];
}


// =====================================================
// LOAD ALL APP DATA
// =====================================================

export async function loadAppData() {
  const [customers, jobs, quotes, invoices] =
    await Promise.all([
      loadCustomers(),
      loadJobs(),
      loadQuotes(),
      loadInvoices()
    ]);

  return {
    customers,
    jobs,
    quotes,
    invoices
  };
}
