// BarLive 2026-09-25: retire the previous application's offline shell.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('workbox-precache') || k === 'barlive-static-assets-v1').map(k => caches.delete(k)));
  await self.clients.claim();
  const windows = await self.clients.matchAll({type:'window'});
  await Promise.all(windows.map(client => client.navigate(client.url)));
})()));
// No fetch handler: all requests use the network and normal HTTP caching.
