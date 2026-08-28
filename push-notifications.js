import { supabase } from "./supabase.js";

const ADMIN_USER_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY = "BHHdZvpO9n1O9GkxaVLo7qmocYkmZQJC49wzHrJ8X78IySOrB-tnlTMfEuoKj54Mhyo3bff9LPa_Q_Vabg9c5qo";

export async function setupAdminPushNotifications(container = document.body) {
  if (!container || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) return;
  if (document.getElementById("jobpilotPushButton")) return;

  const button = document.createElement("button");
  button.id = "jobpilotPushButton";
  button.type = "button";
  button.className = "button secondary";
  button.textContent = Notification.permission === "granted" ? "Enable phone notifications" : "🔔 Enable phone notifications";
  button.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,.18);";
  container.appendChild(button);

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await saveSubscription(existing);
      button.textContent = "🔔 Notifications enabled ✓";
      button.disabled = true;
      return;
    }
  } catch (error) {
    console.warn("Push service worker setup failed:", error);
    button.remove();
    return;
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Enabling notifications...";
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      await saveSubscription(subscription);
      button.textContent = "🔔 Notifications enabled ✓";
      alert("Push notifications are now enabled on this device.");
    } catch (error) {
      console.error("Push subscription error:", error);
      alert(`Could not enable notifications: ${error.message || "Unknown error"}`);
      button.disabled = false;
      button.textContent = "🔔 Enable phone notifications";
    }
  });
}

async function saveSubscription(subscription) {
  const json = subscription.toJSON();
  const { error } = await supabase.functions.invoke("admin-push", {
    body: {
      action: "subscribe",
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth }
      },
      user_agent: navigator.userAgent
    }
  });
  if (error) throw error;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

window.addEventListener("load", () => {
  setupAdminPushNotifications().catch(error => console.warn("JobPilot push setup skipped:", error));
});
