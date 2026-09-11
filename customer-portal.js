import { supabase } from './supabase.js';
import './portal-auth.js';

const QUOTE_ACTION_URL = 'https://qxoynttvipducubmczwl.supabase.co/functions/v1/customer-quote-action';
let activePortalJobId = new URLSearchParams(window.location.search).get('job') || null;

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

function escPortal(v) {
  return String(v ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
}

function addReschedulePanel() {
  if (!activePortalJobId) return;
  const detail = document.querySelector('.jp-portal-detail .jp-portal-card');
  if (!detail || document.getElementById('portal-reschedule-panel')) return;

  const scheduleText = detail.querySelector('p.jp-portal-muted')?.textContent || '';
  const dateMatch = scheduleText.match(/(\d{4}-\d{2}-\d{2})/);
  const timeMatch = scheduleText.match(/·\s*(\d{1,2}:\d{2})/);
  const date = dateMatch?.[1] || '';
  const time = timeMatch?.[1] || '';

  const panel = document.createElement('div');
  panel.id = 'portal-reschedule-panel';
  panel.className = 'jp-portal-muted-box';
  panel.innerHTML = `<strong>Need to change your appointment?</strong><p class="jp-portal-muted" style="margin:6px 0 12px">Choose a new date and time and we will update your appointment request.</p><form id="portal-reschedule-form"><label style="display:block;margin-bottom:10px">New date<br><input id="portal-reschedule-date" type="date" value="${escPortal(date)}" required style="padding:10px;margin-top:5px;max-width:220px;width:100%;box-sizing:border-box"></label><label style="display:block;margin-bottom:10px">New time<br><input id="portal-reschedule-time" type="time" value="${escPortal(time)}" style="padding:10px;margin-top:5px;max-width:220px;width:100%;box-sizing:border-box"></label><button id="portal-reschedule-submit" class="jp-portal-button" type="submit">Request new appointment time</button><p id="portal-reschedule-message" class="jp-portal-muted" style="margin:10px 0 0"></p></form>`;
  detail.appendChild(panel);

  document.getElementById('portal-reschedule-form').onsubmit = async e => {
    e.preventDefault();
    const button = document.getElementById('portal-reschedule-submit');
    const message = document.getElementById('portal-reschedule-message');
    const newDate = document.getElementById('portal-reschedule-date').value;
    const newTime = document.getElementById('portal-reschedule-time').value;
    if (!newDate) return;
    if (!confirm('Change your appointment to ' + newDate + (newTime ? ' at ' + newTime : '') + '?')) return;
    button.disabled = true;
    button.textContent = 'Updating appointment...';
    message.textContent = '';
    try {
      await reschedulePortalJob(activePortalJobId, null, newDate, newTime);
      message.textContent = 'Your appointment has been updated.';
      history.replaceState({}, '', `${location.pathname}?job=${encodeURIComponent(activePortalJobId)}`);
      setTimeout(() => location.reload(), 400);
    } catch (error) {
      message.textContent = error.message || 'Could not update the appointment.';
      button.disabled = false;
      button.textContent = 'Request new appointment time';
    }
  };
}

document.addEventListener('click', event => {
  const jobButton = event.target.closest?.('[data-job]');
  if (jobButton?.dataset.job) activePortalJobId = jobButton.dataset.job;
});

const rescheduleObserver = new MutationObserver(() => setTimeout(addReschedulePanel, 0));
if (portalRoot) rescheduleObserver.observe(portalRoot, { childList: true, subtree: true });
setTimeout(addReschedulePanel, 0);

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
  if (!jobId) throw new Error('Appointment could not be identified.');

  let query = supabase.from('jobs').update({ scheduled_date: date, scheduled_time: time || null }).eq('id', jobId);
  if (customerId) query = query.eq('customer_id', customerId);

  const { data, error } = await query.select('*').single();
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
