import { supabase } from "./supabase.js";

const ADMIN_USER_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY = "BBqcq1QrHXk03q-X8j0CibvSnHJBIZ0Z8tpuqV96Nb_a0HaUNqH6EQmNjSNbCJaCnXwpUoGfsDHytdeDYFNJtZY";
const PUSH_ENABLED_KEY = `jobpilot-push-enabled:${ADMIN_USER_ID}`;
const VAPID_VERSION_KEY = `jobpilot-vapid-version:${ADMIN_USER_ID}`;
const VAPID_VERSION = "8";

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

function base64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

function persist(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(PUSH_ENABLED_KEY, "true");
      localStorage.setItem(VAPID_VERSION_KEY, VAPID_VERSION);
    } else {
      localStorage.removeItem(PUSH_ENABLED_KEY);
      localStorage.removeItem(VAPID_VERSION_KEY);
    }
  } catch (_) {}
}

function renderPushControl() {
  if (document.getElementById("jobpilot-push-control")) return;
  const host = document.querySelector(".sidebar-bottom") || document.getElementById("pageContent") || document.body;
  const wrap = document.createElement("div");
  wrap.id = "jobpilot-push-control";
  wrap.style.cssText = "margin:8px 0;width:100%;position:relative;z-index:9999;";
  wrap.innerHTML = `<button id="jobpilot-push-button" type="button" style="display:block!important;width:100%;min-height:48px;padding:12px 16px;border:1px solid currentColor;border-radius:8px;background:transparent;font:inherit;text-align:left;cursor:pointer">🔔 Enable notifications</button>`;
  host.prepend(wrap);
  document.getElementById("jobpilot-push-button").addEventListener("click", enablePush);
}

function removePushControl() { document.getElementById("jobpilot-push-control")?.remove(); }

async function saveSubscription(subscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Incomplete push subscription returned by iPhone.");
  const { data, error } = await supabase.functions.invoke("admin-push", {
    body: { action: "subscribe", subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, user_agent: navigator.userAgent } }
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Subscription was not saved by Supabase.");
}

async function makeSubscription(registration) {
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY) });
}

async function enablePush() {
  const button = document.getElementById("jobpilot-push-button");
  if (button) { button.disabled = true; button.textContent = "Enabling notifications…"; }
  try {
    if (isIOS() && !isStandalone()) throw new Error("Open JobPilot from its Home Screen icon to enable iPhone notifications.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Push notifications are unavailable in this web app.");
    if (!("Notification" in window)) throw new Error("This iPhone does not expose the Notification API to JobPilot.");
    if (Notification.permission === "denied") throw new Error("Notifications are blocked for JobPilot in iPhone Settings.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    subscription = await makeSubscription(registration);
    await saveSubscription(subscription);
    persist(true);
    removePushControl();
    alert("Push notifications are now enabled on this iPhone.");
  } catch (error) {
    console.error("JobPilot push setup failed", error);
    persist(false);
    if (button) { button.disabled = false; button.textContent = "🔔 Enable notifications"; }
    alert("Could not enable notifications: " + (error.message || error));
  }
}

export async function setupAdminPushNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || String(user.id) !== ADMIN_USER_ID) return;
  renderPushControl();
  if (isIOS() && !isStandalone()) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && localStorage.getItem(VAPID_VERSION_KEY) !== VAPID_VERSION) {
      await subscription.unsubscribe();
      subscription = null;
      persist(false);
    }
    if ("Notification" in window && Notification.permission === "granted") {
      if (!subscription) subscription = await makeSubscription(registration);
      await saveSubscription(subscription);
      persist(true);
      removePushControl();
    }
  } catch (error) {
    console.error("JobPilot push initialisation failed", error);
    persist(false);
    renderPushControl();
  }
}

// Do not observe DOM mutations: app rendering can cause an infinite loop.
function startPushChecks() {
  [1000, 3000, 6000].forEach(ms => setTimeout(() => setupAdminPushNotifications().catch(console.error), ms));
}

window.addEventListener("load", startPushChecks);
supabase.auth.onAuthStateChange((_event, session) => { if (session?.user) startPushChecks(); });

export { startPushChecks };
