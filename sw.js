self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(payload.title || "JobPilot", {
    body: payload.body || "You have a new JobPilot notification.",
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    data: { url: payload.url || "/" },
    tag: payload.tag || "jobpilot-notification",
    renotify: true
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list => {
    for (const client of list) {
      if ("focus" in client) { client.focus(); if ("navigate" in client) client.navigate(url); return; }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
