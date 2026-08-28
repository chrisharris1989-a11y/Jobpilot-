import { supabase } from "./supabase.js";

const VAPID_PUBLIC_KEY = "BHHdZvpO9n1O9GkxaVLo7qmocYkmZQJC49wzHrJ8X78IySOrB-tnlTMfEuoKj54Mhyo3bff9LPa_Q_Vabg9c5qo";

export async function setupAdminPushNotifications(container) {
  if (!container || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary";
  button.textContent = "Enable phone notifications";
  button.style.marginTop = "12px";
  container.appendChild(button);

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      button.textContent = "Phone notifications enabled ✓";
      button.disabled = true;
      return;
    }
  } catch (error) {
    console.error("Push setup error:", error);
    button.style.display = "none";
    return;
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Enabling...";

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const json = subscription.toJSON();
      const { error } = await supabase.functions.invoke("admin-push", {
        body: {
          action: "subscribe",
          subscription: {
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
            user_agent: navigator.userAgent
          }
        }
      });

      if (error) throw error;

      button.textContent = "Phone notifications enabled ✓";
      alert("Push notifications are now enabled on this device.");
    } catch (error) {
      console.error("Push subscription error:", error);
      alert(`Could not enable notifications: ${error.message || "Unknown error"}`);
      button.disabled = false;
      button.textContent = "Enable phone notifications";
    }
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
