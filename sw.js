// BarLive production bridge 2026-09-25 v2.
// Retire old offline shells and transparently serve the complete map marker state.
const STATE_TABLE_PATH = '/rest/v1/map_marker_state_cache';
const SUPABASE_ORIGIN = 'https://embntaqwlwmgazvrglaf.supabase.co';
const STATE_OVERLAY_URL = SUPABASE_ORIGIN + '/functions/v1/map-state-overlay';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(key => key.startsWith('workbox-precache') || key === 'barlive-static-assets-v1')
      .map(key => caches.delete(key))
  );
  await self.clients.claim();
  const windows = await self.clients.matchAll({ type: 'window' });
  await Promise.all(windows.map(client => client.navigate(client.url)));
})()));

async function fetchCompleteMarkerState(originalRequest) {
  try {
    const response = await fetch(STATE_OVERLAY_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('overlay HTTP ' + response.status);

    const payload = await response.json();
    const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
    if (!rows.length) throw new Error('overlay returned no rows');

    const normalized = rows.map(row => {
      if (!Array.isArray(row) || row.length < 6) return null;

      const rawState = row[5];
      const textState = String(rawState == null ? '' : rawState).trim().toLowerCase();
      const numericState = Number(rawState);
      const estado =
        textState === 'abierto' || numericState === 1
          ? 'abierto'
          : textState === 'cerrado' || numericState === 2
            ? 'cerrado'
            : 'sin_info';

      return {
        local_id: row[0],
        latitud: row[1],
        longitud: row[2],
        tipo: row[3] || 'bar',
        destacado: Number(row[4] || 0) === 1,
        estado,
      };
    }).filter(Boolean);

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return fetch(originalRequest);
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  try {
    const url = new URL(event.request.url);
    if (url.origin === SUPABASE_ORIGIN && url.pathname === STATE_TABLE_PATH) {
      event.respondWith(fetchCompleteMarkerState(event.request));
    }
  } catch (_) {}
});
