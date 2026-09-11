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

export async function getPortalBranding() {
  const { data, error } = await supabase.rpc('get_customer_portal_branding');
  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

async function applyPortalBranding() {
  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.user) return;
    const branding = await getPortalBranding();
    const companyName = String(branding?.company_name || '').trim();
    if (!companyName) return;

    const brand = document.querySelector('.jp-portal-brand');
    if (brand) {
      const logo = String(branding?.logo_url || '').trim();
      const safeName = companyName.replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
      const safeLogo = logo.replace(/\"/g, '&quot;');
      brand.innerHTML = logo
        ? `<img src="${safeLogo}" alt="${safeName} logo"><span>${safeName}</span>`
        : `<span>${safeName}</span>`;
    }

    const subtitle = document.querySelector('#portal-root > p.jp-portal-muted');
    if (subtitle) subtitle.textContent = `Your ${companyName} customer portal`;
  } catch (error) {
    console.warn('JobPilot portal branding:', error);
  }
}

supabase.auth.onAuthStateChange(() => setTimeout(applyPortalBranding, 0));
setTimeout(applyPortalBranding, 0);

const portalRootObserver = new MutationObserver(() => setTimeout(applyPortalBranding, 0));
const portalRoot = document.getElementById('portal-root');
if (portalRoot) portalRootObserver.observe(portalRoot, { childList: true, subtree: true });

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

export async function reschedulePortalJob(jobId, customerId, scheduledDate, scheduledTime) {
  const date = String(scheduledDate || '').trim();
  const time = String(scheduledTime || '').trim();
  if (!date) throw new Error('Please choose a new appointment date.');
  if (!customerId) throw new Error('Customer portal session is invalid.');

  const { data, error } = await supabase
    .from('jobs')
    .update({ scheduled_date: date, scheduled_time: time || null })
    .eq('id', jobId)
    .eq('customer_id', customerId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
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
