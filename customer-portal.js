import { supabase } from './supabase.js';
import './portal-auth.js';

const QUOTE_ACTION_URL = 'https://qxoynttvipducubmczwl.supabase.co/functions/v1/customer-quote-action';

export async function getCustomerPortalSession() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase.from('customer_portal_accounts').select('id, customer_id, company_id, status, customers:customer_id(id, name, email, phone, address_line1, address_line2, city, postcode)').eq('user_id', session.user.id).eq('status', 'active').maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getPortalDashboard(customerId) {
  const [jobs, quotes, invoices] = await Promise.all([
    supabase.from('jobs').select('*').eq('customer_id', customerId).order('scheduled_date', { ascending: true }),
    supabase.from('quotes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
  ]);
  if (jobs.error) throw jobs.error;
  if (quotes.error) throw quotes.error;
  if (invoices.error) throw invoices.error;
  return { jobs: jobs.data || [], quotes: quotes.data || [], invoices: invoices.data || [] };
}

async function quoteAction(quoteId, action) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your portal session has expired. Please sign in again.');
  const response = await fetch(QUOTE_ACTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ quote_id: quoteId, action, origin: window.location.origin })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not complete quote action.');
  return result;
}

export async function acceptPortalQuote(quoteId) { return quoteAction(quoteId, 'accept'); }
export async function declinePortalQuote(quoteId) { return quoteAction(quoteId, 'decline'); }
export async function payPortalQuote(quoteId) { return quoteAction(quoteId, 'pay'); }

export async function updatePortalCustomer(customerId, updates) {
  const allowed = {};
  for (const key of ['name', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'postcode']) {
    if (updates[key] !== undefined) allowed[key] = updates[key];
  }
  const { data, error } = await supabase.from('customers').update(allowed).eq('id', customerId).select('*').single();
  if (error) throw error;
  return data;
}
