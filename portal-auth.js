import { supabase } from './supabase.js';

const PIN_FUNCTION_URL = 'https://qxoynttvipducubmczwl.supabase.co/functions/v1/customer-portal-pin';
const PORTAL_URL = `${window.location.origin}/portal/`;
const esc = value => String(value ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

async function callPin(action, payload = {}) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const response = await fetch(PIN_FUNCTION_URL, { method: 'POST', headers, body: JSON.stringify({ action, ...payload, redirect_to: PORTAL_URL }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not process portal PIN.');
  return result;
}

function showEmailLogin(root, email = '') {
  root.innerHTML = `<div class="jp-portal-card" style="max-width:460px;margin:60px auto"><h1>Customer Portal</h1><p class="jp-portal-muted">Sign in with the secure link sent to your email.</p><form id="portal-login-email"><label>Email<br><input id="portal-email-fallback" type="email" required value="${esc(email)}" style="width:100%;padding:12px;margin:6px 0 14px;box-sizing:border-box"></label><button class="jp-portal-button">Send sign-in link</button></form><p id="portal-msg-fallback" class="jp-portal-muted"></p><button id="portal-pin-back" type="button" class="jp-portal-button secondary" style="margin-top:8px">Back to PIN sign in</button></div>`;
  document.getElementById('portal-login-email').onsubmit = async event => {
    event.preventDefault();
    const email = document.getElementById('portal-email-fallback').value.trim();
    const msg = document.getElementById('portal-msg-fallback');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: PORTAL_URL } });
    msg.textContent = error ? error.message : 'Check your email for your secure JobPilot sign-in link.';
  };
  document.getElementById('portal-pin-back').onclick = () => installPinLogin(root, email);
}

function installPinLogin(root, email = '') {
  const form = document.getElementById('portal-login');
  if (!form || form.dataset.pinReady === 'true') return;
  form.dataset.pinReady = 'true';
  root.innerHTML = `<div class="jp-portal-card" style="max-width:460px;margin:60px auto"><h1>Customer Portal</h1><p class="jp-portal-muted">Sign in with your email address and 4-digit PIN.</p><form id="portal-pin-login"><label>Email<br><input id="portal-pin-email" type="email" required value="${esc(email)}" autocomplete="email" style="width:100%;padding:12px;margin:6px 0 14px;box-sizing:border-box"></label><label>4-digit PIN<br><input id="portal-pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="current-password" required style="width:100%;padding:12px;margin:6px 0 14px;box-sizing:border-box;letter-spacing:8px;text-align:center;font-size:20px"></label><button id="portal-pin-submit" class="jp-portal-button">Sign in</button></form><p id="portal-pin-msg" class="jp-portal-muted"></p><button id="portal-email-link" type="button" class="jp-portal-button secondary">Use email sign-in link instead</button></div>`;
  document.getElementById('portal-pin-login').onsubmit = async event => {
    event.preventDefault();
    const button = document.getElementById('portal-pin-submit');
    const msg = document.getElementById('portal-pin-msg');
    const emailValue = document.getElementById('portal-pin-email').value.trim();
    const pin = document.getElementById('portal-pin').value.trim();
    button.disabled = true; button.textContent = 'Signing in…'; msg.textContent = '';
    try {
      const result = await callPin('login', { email: emailValue, pin });
      if (!result.action_link) throw new Error('Could not create the portal session.');
      window.location.href = result.action_link;
    } catch (error) {
      msg.textContent = error.message || 'Could not sign in.';
      button.disabled = false; button.textContent = 'Sign in';
    }
  };
  document.getElementById('portal-email-link').onclick = () => showEmailLogin(root, document.getElementById('portal-pin-email').value.trim());
}

async function ensurePinAfterInvitation() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.user) return;
  const result = await callPin('status');
  if (!result.account || result.account.pin_set_at) return;
  if (document.getElementById('portal-pin-setup')) return;
  const overlay = document.createElement('div');
  overlay.id = 'portal-pin-setup';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999';
  overlay.innerHTML = `<div class="jp-portal-card" style="width:min(460px,100%);box-sizing:border-box"><h2>Set your portal PIN</h2><p class="jp-portal-muted">Create a 4-digit PIN so you can sign back in without requesting another email link.</p><form id="portal-pin-setup-form"><label>4-digit PIN<br><input id="portal-new-pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" required style="width:100%;padding:12px;margin:6px 0 14px;box-sizing:border-box;letter-spacing:8px;text-align:center;font-size:20px"></label><label>Confirm PIN<br><input id="portal-new-pin-confirm" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" required style="width:100%;padding:12px;margin:6px 0 14px;box-sizing:border-box;letter-spacing:8px;text-align:center;font-size:20px"></label><button id="portal-save-pin" class="jp-portal-button">Save PIN</button></form><p id="portal-pin-setup-msg" class="jp-portal-muted"></p></div>`;
  document.body.appendChild(overlay);
  document.getElementById('portal-pin-setup-form').onsubmit = async event => {
    event.preventDefault();
    const pin = document.getElementById('portal-new-pin').value.trim();
    const confirmPin = document.getElementById('portal-new-pin-confirm').value.trim();
    const button = document.getElementById('portal-save-pin');
    const msg = document.getElementById('portal-pin-setup-msg');
    if (!/^\d{4}$/.test(pin)) { msg.textContent = 'PIN must be exactly 4 digits.'; return; }
    if (pin !== confirmPin) { msg.textContent = 'The PINs do not match.'; return; }
    button.disabled = true; button.textContent = 'Saving…'; msg.textContent = '';
    try { await callPin('set', { pin }); overlay.remove(); }
    catch (error) { msg.textContent = error.message || 'Could not save your PIN.'; button.disabled = false; button.textContent = 'Save PIN'; }
  };
}

const observer = new MutationObserver(() => { const root = document.getElementById('portal-root'); if (root) installPinLogin(root); });
observer.observe(document.body, { childList: true, subtree: true });
supabase.auth.onAuthStateChange(() => setTimeout(() => ensurePinAfterInvitation().catch(error => console.warn('JobPilot portal PIN setup:', error)), 250));
setTimeout(() => { const root = document.getElementById('portal-root'); if (root) installPinLogin(root); ensurePinAfterInvitation().catch(error => console.warn('JobPilot portal PIN setup:', error)); }, 300);
