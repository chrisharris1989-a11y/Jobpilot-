self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  try {
    const registrations = await self.registration.scope ? [self.registration] : [];
    await Promise.all(registrations.map(r => r.unregister()));
  } catch (_) {}
  try {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  } catch (_) {}
})()));
