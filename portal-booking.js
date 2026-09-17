import { supabase } from './supabase.js';

const BOOKING_BASE = '/book/?slug=';
let bookingAdded = false;

async function addPortalBookingButton() {
  if (bookingAdded) return;
  const root = document.getElementById('portal-root');
  if (!root) return;
  const heading = root.querySelector('h1');
  const subtitle = root.querySelector('p.jp-portal-muted');
  if (!heading || !subtitle) return;

  try {
    const { data, error } = await supabase.rpc('get_customer_portal_booking_link');
    if (error) throw error;
    const booking = Array.isArray(data) ? data[0] : data;
    const slug = String(booking?.slug || '').trim();
    if (!booking?.enabled || !slug) return;

    const card = document.createElement('section');
    card.className = 'jp-portal-card jp-portal-booking-card';
    card.style.cssText = 'margin:16px 0;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap';
    card.innerHTML = '<div><h2 style="margin:0 0 6px">Need another appointment?</h2><p class="jp-portal-muted" style="margin:0">Choose a service and book a convenient date and time.</p></div>' +
      '<a class="jp-portal-button" href="' + BOOKING_BASE + encodeURIComponent(slug) + '">Book a Job</a>';

    subtitle.insertAdjacentElement('afterend', card);
    bookingAdded = true;
  } catch (error) {
    console.warn('JobPilot portal booking:', error);
  }
}

const observer = new MutationObserver(() => setTimeout(addPortalBookingButton, 0));
const root = document.getElementById('portal-root');
if (root) observer.observe(root, { childList: true, subtree: true });
setTimeout(addPortalBookingButton, 0);
