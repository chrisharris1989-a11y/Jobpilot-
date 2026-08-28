import { supabase } from "./supabase.js";

const ADMIN_USER_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY = "BBqcq1QrHXk03q-X8j0CibvSnHJBIZ0Z8tpuqV96Nb_a0HaUNqH6EQmNjSNbCJaCnXwpUoGfsDHytdeDYFNJtZY";
const PUSH_ENABLED_KEY = `jobpilot-push-enabled:${ADMIN_USER_ID}`;
const VAPID_VERSION_KEY = `jobpilot-vapid-version:${ADMIN_USER_ID}`;
const VAPID_VERSION = "10";
let initialisationPromise = null;
let authListenerStarted = false;
let bodyObserverStarted = false;
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
function base64ToUint8Array(value) { const padding = "=".repeat((4 - (value.length % 4)) % 4); return Uint8Array.from(atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)); }
function persist(enabled) { try { if (enabled) { localStorage.setItem(PUSH_ENABLED_KEY, "true"); localStorage.setItem(VAPID_VERSION_KEY, VAPID_VERSION); } else { localStorage.removeItem(PUSH_ENABLED_KEY); localStorage.removeItem(VAPID_VERSION_KEY); } } catch (_) {} }
function savedEnabled() { try { return localStorage.getItem(PUSH_ENABLED_KEY) === "true"; } catch (_) { return false; } }
function renderPushControl(enabled = savedEnabled()) {
  let wrap = document.getElementById("jobpilot-push-control");
  if (!wrap) { wrap = document.createElement("div"); wrap.id = "jobpilot-push-control"; wrap.style.cssText = "position:fixed;right:16px;bottom:18px;z-index:2147483647;"; document.body.appendChild(wrap); }
  let button = document.getElementById("jobpilot-push-button");
  if (!button) { button = document.createElement("button"); button.id = "jobpilot-push-button"; button.type = "button"; wrap.appendChild(button); }
  button.textContent = enabled ? "🔔 Notifications enabled" : "🔔 Enable notifications";
  button.disabled = enabled;
  button.style.cssText = `display:block!important;width:auto;min-width:190px;min-height:44px;padding:10px 16px;border:1px solid currentColor;border-radius:12px;background:Canvas;color:CanvasText;box-shadow:0 3px 12px rgba(0,0,0,.15);font:600 14px -apple-system,BlinkMacSystemFont,sans-serif;text-align:center;cursor:${enabled ? "default" : "pointer"};`;
  if (!enabled && !button.dataset.bound) { button.dataset.bound = "true"; button.addEventListener("click", enablePush); }
}
async function saveSubscription(subscription) { const json = subscription.toJSON(); if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Incomplete push subscription returned by iPhone."); const { data, error } = await supabase.functions.invoke("admin-push", { body: { action: "subscribe", subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, user_agent: navigator.userAgent } } }); if (error) throw error; if (!data?.ok) throw new Error(data?.error || "Subscription was not saved by Supabase."); }
async function makeSubscription(registration) { return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY) }); }
async function enablePush() { const button = document.getElementById("jobpilot-push-button"); if (button) { button.disabled = true; button.textContent = "Enabling notifications…"; } try { if (isIOS() && !isStandalone()) throw new Error("Open JobPilot from its Home Screen icon to enable iPhone notifications."); if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Push notifications are unavailable in this web app."); if (Notification.permission === "denied") throw new Error("Notifications are blocked for JobPilot in iPhone Settings."); if (Notification.permission !== "granted" && await Notification.requestPermission() !== "granted") throw new Error("Notification permission was not granted."); const registration = await navigator.serviceWorker.ready; let subscription = await registration.pushManager.getSubscription(); if (subscription) await subscription.unsubscribe(); subscription = await makeSubscription(registration); await saveSubscription(subscription); persist(true); renderPushControl(true); alert("Push notifications are now enabled on this iPhone."); } catch (error) { console.error("JobPilot push setup failed", error); renderPushControl(false); alert("Could not enable notifications: " + (error.message || error)); } }
export async function setupAdminPushNotifications() { if (initialisationPromise) return initialisationPromise; initialisationPromise = (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user || String(user.id) !== ADMIN_USER_ID) return; renderPushControl(savedEnabled()); if (isIOS() && !isStandalone()) return; if (!("serviceWorker" in navigator) || !("PushManager" in window)) return; try { const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" }); await navigator.serviceWorker.ready; let subscription = await registration.pushManager.getSubscription(); if (subscription && localStorage.getItem(VAPID_VERSION_KEY) !== VAPID_VERSION) { await subscription.unsubscribe(); subscription = null; persist(false); } if ("Notification" in window && Notification.permission === "granted") { if (!subscription) subscription = await makeSubscription(registration); await saveSubscription(subscription); persist(true); renderPushControl(true); } else renderPushControl(savedEnabled()); } catch (error) { console.error("JobPilot push initialisation failed", error); renderPushControl(savedEnabled()); } })().finally(() => { initialisationPromise = null; }); return initialisationPromise; }
function watchBody() { if (bodyObserverStarted) return; bodyObserverStarted = true; const observer = new MutationObserver(() => { if (!document.getElementById("jobpilot-push-control") && document.getElementById("app")) renderPushControl(savedEnabled()); }); observer.observe(document.body, { childList: true, subtree: true }); renderPushControl(savedEnabled()); }
window.addEventListener("DOMContentLoaded", watchBody, { once: true });
window.addEventListener("load", () => setupAdminPushNotifications().catch(console.error), { once: true });
if (!authListenerStarted) { authListenerStarted = true; supabase.auth.onAuthStateChange((_event, session) => { if (session?.user) { watchBody(); setupAdminPushNotifications().catch(console.error); } }); }
export { enablePush };
