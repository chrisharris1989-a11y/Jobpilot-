import { supabase } from "./supabase.js";

const ADMIN_USER_ID = "9a89bdf0-1f17-48ec-a622-db59545e8ada";
const VAPID_PUBLIC_KEY = "BBqcq1QrHXk03q-X8j0CibvSnHJBIZ0Z8tpuqV96Nb_a0HaUNqH6EQmNjSNbCJaCnXwpUoGfsDHytdeDYFNJtZY";
const PUSH_ENABLED_KEY = `jobpilot-push-enabled:${ADMIN_USER_ID}`;
const VAPID_VERSION_KEY = `jobpilot-vapid-version:${ADMIN_USER_ID}`;
const VAPID_VERSION = "3";

const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

function base64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

function markEnabled() {
  try {
    localStorage.setItem(PUSH_ENABLED_KEY, "true");
    localStorage.setItem(VAPID_VERSION_KEY, VAPID_VERSION);
  } catch (error) {
    console.warn("Could not persist push state", error);
  }
}

function unmarkEnabled() {
  try {
    localStorage.removeItem(PUSH_ENABLED_KEY);
    localStorage.removeItem(VAPID_VERSION_KEY);
  } catch (error) {
    console.warn("Could not clear push state", error);
  }
}

function removeButton() {
  document.getElementById("jobpilot-push")?.remove();
}

function showButton() {
  let button = document.getElementById("jobpilot-push");
  if (button) return;

  button = document.createElement("button");
  button.id = "jobpilot-push";
  button.type = "button";
  button.textContent = ios()
    ? "🔔 Enable iPhone notifications"
    : "🔔 Enable phone notifications";
  button.style =
    "position:fixed;right:20px;bottom:20px;z-index:99999;padding:12px 16px;border:0;border-radius:10px;font-weight:600";
  document.body.appendChild(button);

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Enabling notifications…";

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await saveSubscription(subscription);
      markEnabled();
      removeButton();
      alert("Push notifications are now enabled on this device.");
    } catch (error) {
      console.error("Push notification setup failed", error);
      unmarkEnabled();
      button.disabled = false;
      button.textContent = ios()
        ? "🔔 Enable iPhone notifications"
        : "🔔 Enable phone notifications";
      alert("Could not enable notifications: " + (error.message || error));
    }
  });
}

async function saveSubscription(subscription) {
  const json = subscription.toJSON();
  const { data, error } = await supabase.functions.invoke("admin-push", {
    body: {
      action: "subscribe",
      subscription: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
        user_agent: navigator.userAgent,
      },
    },
  });

  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.error || "Subscription could not be saved.");
  }
}

export async function setupAdminPushNotifications() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_USER_ID) return;
  if (ios() && !standalone()) return;
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    // A subscription made with an older VAPID key must be replaced.
    if (
      subscription &&
      localStorage.getItem(VAPID_VERSION_KEY) !== VAPID_VERSION
    ) {
      await subscription.unsubscribe();
      subscription = null;
      unmarkEnabled();
    }

    if (Notification.permission === "granted") {
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await saveSubscription(subscription);
      markEnabled();
      removeButton();
      return;
    }

    if (Notification.permission === "denied") {
      removeButton();
      return;
    }

    // Permission is not granted yet: always provide the user with the
    // explicit action instead of relying on a stale localStorage flag.
    showButton();
  } catch (error) {
    console.error("Push subscription setup failed", error);
    unmarkEnabled();
    showButton();
  }
}

window.addEventListener("load", () => {
  setTimeout(() => {
    setupAdminPushNotifications().catch(console.error);
  }, 1500);
});
