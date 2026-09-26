const fs = require('fs');

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

const oldVersion = 'map-v6-decoration-perf-a9ee082-20260926';
const newVersion = 'map-v7-warm-cache-6a3c353-20260926';
const oldMarker = 'canonical-map-v6-decoration-perf-a9ee082-20260926';
const newMarker = 'canonical-map-v7-warm-cache-6a3c353-20260926';

function replaceOnce(source, oldText, newText, label) {
  if (source.includes(newText)) return source;
  if (!source.includes(oldText)) throw new Error(label + ' anchor missing');
  return source.replace(oldText, newText);
}

bundle = replaceOnce(
  bundle,
  `function persistViewportCache(rows,coverage) {
  if (!Array.isArray(rows) || rows.length > 12000) return;
  try {
    localStorage.setItem(
      DATA_CACHE_KEY,
      JSON.stringify({
        savedAt:Date.now(),
        coverage:coverage,
        rows:rows
      })
    );
  } catch (_) {}
}`,
  `function persistViewportCache(rows,coverage) {
  if (!Array.isArray(rows) || rows.length > 12000) return;
  try {
    var center=map ? map.getCenter() : null;
    localStorage.setItem(
      DATA_CACHE_KEY,
      JSON.stringify({
        savedAt:Date.now(),
        coverage:coverage,
        view:center && map ? {
          lng:Number(center.lng),
          lat:Number(center.lat),
          zoom:Number(map.getZoom())
        } : null,
        rows:rows
      })
    );
  } catch (_) {}
}`,
  'persistViewportCache'
);

bundle = replaceOnce(
  bundle,
  `function restoreViewportCache() {
  try {
    var raw=localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return false;

    var payload=JSON.parse(raw);
    if (
      !payload ||
      !Array.isArray(payload.rows) ||
      !payload.rows.length ||
      !payload.coverage ||
      Date.now()-Number(payload.savedAt||0) > DATA_CACHE_MAX_AGE
    ) return false;

    var current=getCurrentBounds();
    if (!boundsContain(payload.coverage,current)) return false;

    var generation=requestGeneration;
    return commitVenueRows(
      payload.rows,
      payload.coverage,
      generation,
      "local-cache"
    );
  } catch (_) {
    return false;
  }
}`,
  `function restoreViewportCache(recenter) {
  try {
    var raw=localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return false;

    var payload=JSON.parse(raw);
    if (
      !payload ||
      !Array.isArray(payload.rows) ||
      !payload.rows.length ||
      !payload.coverage ||
      Date.now()-Number(payload.savedAt||0) > DATA_CACHE_MAX_AGE
    ) return false;

    if (
      recenter === true &&
      payload.view &&
      Number.isFinite(Number(payload.view.lng)) &&
      Number.isFinite(Number(payload.view.lat)) &&
      Number.isFinite(Number(payload.view.zoom))
    ) {
      map.jumpTo({
        center:[Number(payload.view.lng),Number(payload.view.lat)],
        zoom:Math.max(4,Math.min(20,Number(payload.view.zoom)))
      });
    }

    var current=getCurrentBounds();
    if (!boundsContain(payload.coverage,current)) return false;

    var realtime=applyRealtimeScheduleStates(payload.rows);
    var generation=requestGeneration;

    var restored=commitVenueRows(
      realtime.rows,
      payload.coverage,
      generation,
      "local-cache"
    );

    if (restored) {
      console.log(
        "[MAP_RENDER][CACHE_RESTORE] generation="+generation+
        " total="+realtime.rows.length+
        " knownStates="+realtime.knownStates
      );
    }

    return restored;
  } catch (_) {
    return false;
  }
}`,
  'restoreViewportCache'
);

bundle = replaceOnce(
  bundle,
  `    // Cache is only a warm-start input to the SAME canonical source.
    // Network reconciliation writes to that exact source as one atomic commit.
    restoreViewportCache();
    requestCanonicalViewport(true,"load");`,
  `    // Cache is only a warm-start input to the SAME canonical source.
    // On direct refresh (national fallback shell), restore the last real
    // viewport first so markers and schedule colours paint immediately.
    var warmRestored=restoreViewportCache(true);

    // Network reconciliation writes to that exact source as one atomic commit.
    requestCanonicalViewport(true,warmRestored ? "load-cache-reconcile" : "load");`,
  'warm cache init'
);

if (!bundle.includes('[MAP_RENDER][CACHE_RESTORE]')) {
  throw new Error('cache restore diagnostic missing');
}
if (!bundle.includes('view:center && map ?')) {
  throw new Error('cached viewport metadata missing');
}

fs.writeFileSync(bundlePath, bundle);

for (const pagePath of [
  'index.html',
  '404.html',
  'explorar/index.html',
  'explorar/mapa/index.html',
  'detalle/local/index.html'
]) {
  if (!fs.existsSync(pagePath)) continue;
  let html = fs.readFileSync(pagePath, 'utf8');
  html = html.replaceAll(oldMarker, newMarker);
  html = html.replaceAll(oldVersion, newVersion);
  html = html.replaceAll('/sw.js?v=19', '/sw.js?v=20');
  fs.writeFileSync(pagePath, html);
}

if (fs.existsSync('sw.js')) {
  let sw = fs.readFileSync('sw.js', 'utf8');
  sw = sw.replace(
    'BarLive neutral service worker v19.',
    'BarLive neutral service worker v20.'
  );
  fs.writeFileSync('sw.js', sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'6a3c353b04c62cdf5cd90188e5cf72d9cc46772f',
    delivery:'canonical-map-v7-warm-cache',
    release:'2026-09-26-map-v7-warm-cache'
  })
);

console.log('Production warm-cache patch prepared.');
