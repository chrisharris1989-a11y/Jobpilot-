self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "JobPilot";
  const options = {
    body: data.body || "You have a new JobPilot notification.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url || "/", feedbackId: data.feedbackId || null },
    tag: data.feedbackId ? `feedback-${data.feedbackId}` : "jobpilot-notification",
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if ("focus" in client) {
        client.navigate(target);
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(target);
  }));
});
