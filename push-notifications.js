import { supabase } from "./supabase.js";

const ADMIN_USER_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY = "BBqcq1QrHXk03q-X8j0CibvSnHJBIZ0Z8tpuqV96Nb_a0HaUNqH6EQmNjSNbCJaCnXwpUoGfsDHytdeDYFNJtZY";
const PUSH_ENABLED_KEY = `jobpilot-push-enabled:${ADMIN_USER_ID}`;
const VAPID_VERSION_KEY = `jobpilot-vapid-version:${ADMIN_USER_ID}`;
const VAPID_VERSION = "4";

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

function base64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

function setPushState(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(PUSH_ENABLED_KEY, "true");
      localStorage.setItem(VAPID_VERSION_KEY, VAPID_VERSION);
    } else {
      localStorage.removeItem(PUSH_ENABLED_KEY);
      localStorage.removeItem(VAPID_VERSION_KEY);
    }
  } catch (e) {
    console.warn("Push state persistence failed", e);
  }
}

function ensurePushButton() {
  let button = document.getElementById("jobpilot-push-button");
  if (button) return button;

  const host = document.createElement("div");
  host.id = "jobpilot-push-control";
  host.style.cssText = "margin:16px 0;width:100%;";

  button = document.createElement("button");
  button.id = "jobpilot-push-button";
  button.type = "button";
  button.className = "button primary";
  button.textContent = "🔔 Enable iPhone notifications";
  button.style.cssText = "width:100%;min-height:48px;font-size:16px;";
  host.appendChild(button);

  const settings = document.getElementById("pageContent");
  if (settings) settings.prepend(host);
  else document.body.appendChild(host);

  button.addEventListener("click", enablePush);
  return button;
}

function removePushButton() {
  document.getElementById("jobpilot-push-control")?.remove();
}

async function saveSubscription(subscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("The iPhone did not return a complete push subscription.");
  }

  const { data, error } = await supabase.functions.invoke("admin-push", {
    body: {
      action: "subscribe",
      subscription: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        user_agent: navigator.userAgent,
      },
    },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Supabase did not save the subscription.");
}

async function createSubscription(registration) {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

async function enablePush() {
  const button = document.getElementById("jobpilot-push-button");
  if (button) {
    button.disabled = true;
    button.textContent = "Enabling notifications…";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted. Check iPhone Settings → Notifications → JobPilot.");
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) await subscription.unsubscribe();
    subscription = await createSubscription(registration);
    await saveSubscription(subscription);

    setPushState(true);
    removePushButton();
    alert("Push notifications are enabled on this iPhone.");
  } catch (error) {
    console.error("JobPilot push setup failed:", error);
    setPushState(false);
    if (button) {
      button.disabled = false;
      button.textContent = "🔔 Enable iPhone notifications";
    }
    alert("Notifications could not be enabled: " + (error.message || error));
  }
}

async function setupPush() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || String(user.id) !== ADMIN_USER_ID) return;

  if (isIOS() && !isStandalone()) {
    console.info("JobPilot push: iOS is not running as an installed Home Screen app.");
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    console.warn("JobPilot push: required browser APIs are unavailable.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription && localStorage.getItem(VAPID_VERSION_KEY) !== VAPID_VERSION) {
      await subscription.unsubscribe();
      subscription = null;
      setPushState(false);
    }

    if (Notification.permission === "granted") {
      if (!subscription) subscription = await createSubscription(registration);
      await saveSubscription(subscription);
      setPushState(true);
      removePushButton();
      return;
    }

    if (Notification.permission === "default") {
      ensurePushButton();
      return;
    }

    // Permission denied: don't pretend the device is subscribed.
    setPushState(false);
    removePushButton();
  } catch (error) {
    console.error("JobPilot push initialisation failed:", error);
    setPushState(false);
    ensurePushButton();
  }
}

// Run after the app has rendered, and retry after authentication/rendering settles.
function boot() {
  setTimeout(() => setupPush().catch(console.error), 500);
  setTimeout(() => setupPush().catch(console.error), 2500);
}

window.addEventListener("load", boot);
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) setTimeout(() => setupPush().catch(console.error), 500);
});

export { setupPush };
