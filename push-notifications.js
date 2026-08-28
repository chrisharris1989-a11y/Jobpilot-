import { supabase } from "./supabase.js";

const ADMIN_USER_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY = "BHHdZvpO9n1O9GkxaVLo7qmocYkmZQJC49wzHrJ8X78IySOrB-tnlTMfEuoKj54Mhyo3bff9LPa_Q_Vabg9c5qo";

function isIOS() { return /iPhone|iPad|iPod/i.test(navigator.userAgent); }
function isStandalone() { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }

export async function setupAdminPushNotifications(container = document.body) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID || !container) return;
  if (document.getElementById("jobpilotPushButton") || document.getElementById("jobpilotIosPushHelp")) return;

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    if (isIOS() && !isStandalone()) {
      const help = document.createElement("div");
      help.id = "jobpilotIosPushHelp";
      help.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;padding:16px;border-radius:14px;background:#111;color:#fff;font:16px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);";
      help.innerHTML = `<strong>🔔 Enable iPhone notifications</strong><br><br>Tap <strong>Share</strong> in Safari, choose <strong>Add to Home Screen</strong>, then open JobPilot from your Home Screen. The notification button will appear there.`;
      container.appendChild(help);
    }
    return;
  }

  const button = document.createElement("button");
  button.id = "jobpilotPushButton";
  button.type = "button";
  button.className = "button secondary";
  button.textContent = isIOS() ? "🔔 Enable iPhone notifications" : "🔔 Enable phone notifications";
  button.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,.18);";
  container.appendChild(button);

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    let existing = await registration.pushManager.getSubscription();
    if (existing) { await saveSubscription(existing); button.textContent = "🔔 Notifications enabled ✓"; button.disabled = true; return; }
  } catch (error) { console.warn("Push service worker setup failed:", error); }

  button.addEventListener("click", async () => {
    button.disabled = true; button.textContent = "Enabling notifications...";
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      await saveSubscription(subscription);
      button.textContent = "🔔 Notifications enabled ✓";
      alert("Push notifications are now enabled on this device.");
    } catch (error) {
      console.error("Push subscription error:", error);
      alert(`Could not enable notifications: ${error.message || "Unknown error"}`);
      button.disabled = false; button.textContent = isIOS() ? "🔔 Enable iPhone notifications" : "🔔 Enable phone notifications";
    }
  });
}

async function saveSubscription(subscription) {
  const json = subscription.toJSON();
  const { data, error } = await supabase.functions.invoke("admin-push", { body: { action: "subscribe", subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }, user_agent: navigator.userAgent } });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "The device subscription was not saved.");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const rawData = atob((base64String + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

window.addEventListener("load", () => setTimeout(() => setupAdminPushNotifications().catch(console.warn), 1000));
