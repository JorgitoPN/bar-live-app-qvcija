// BarLive neutral service worker v24.
// Marker/data/rendering logic lives exclusively in the application bundle.
// This worker only retires obsolete runtime-patch caches during migration.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('barlive-') || key.startsWith('workbox-precache'))
        .map(key => caches.delete(key))
    );

    await self.clients.claim();

    // One automatic migration reload for already-open BarLive tabs. No user
    // Ctrl+F5 is required, and no response or map request is modified here.
    const clients = await self.clients.matchAll({ type: 'window' });
    await Promise.all(
      clients.map(client => {
        try {
          return client.navigate(client.url);
        } catch (_) {
          return Promise.resolve();
        }
      })
    );
  })());
});
