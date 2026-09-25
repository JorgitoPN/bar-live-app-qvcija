const fs = require('fs');

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

if (
  bundle.includes('viewportRequestInFlight') &&
  bundle.includes('[MAP_RENDER][STATE_REFRESH_SKIPPED]')
) {
  console.log('Race guard already present; bundle patch is idempotent.');
} else {
  const replacements = [
    [
      `var requestGeneration = 0;
var requestAbortController = null;
var requestTimer = null;`,
      `var requestGeneration = 0;
var requestAbortController = null;
var viewportRequestInFlight = false;
var requestTimer = null;`
    ],
    [
      `async function refreshCanonicalStates() {
  if (
    !map ||
    !map.getSource(VENUE_SOURCE) ||
    !activeCoverage ||
    !Array.isArray(activeRows) ||
    !activeRows.length
  ) return;

  var coverage=activeCoverage;`,
      `async function refreshCanonicalStates() {
  if (
    !map ||
    !map.getSource(VENUE_SOURCE) ||
    !activeCoverage ||
    !Array.isArray(activeRows) ||
    !activeRows.length
  ) return;

  // Never let the periodic state refresh cancel a viewport request. A viewport
  // change has higher priority because it changes which venues must exist.
  if (viewportRequestInFlight) {
    console.log(
      "[MAP_RENDER][STATE_REFRESH_SKIPPED] reason=viewport-in-flight"+
      " generation="+requestGeneration
    );
    return;
  }

  var coverage=activeCoverage;`
    ],
    [
      `    console.warn(
      "[MAP_RENDER][STATE_REFRESH_ERROR] generation="+generation,
      String(error && error.message || error)
    );
  }
}

async function requestCanonicalViewport(force,reason) {`,
      `    console.warn(
      "[MAP_RENDER][STATE_REFRESH_ERROR] generation="+generation,
      String(error && error.message || error)
    );
  } finally {
    if (requestAbortController === controller) {
      requestAbortController=null;
    }
  }
}

async function requestCanonicalViewport(force,reason) {`
    ],
    [
      `  var controller=new AbortController();
  requestAbortController=controller;

  console.log(
    "[MAP_RENDER][VIEWPORT_REQUEST] generation="+generation+`,
      `  var controller=new AbortController();
  requestAbortController=controller;
  viewportRequestInFlight=true;

  console.log(
    "[MAP_RENDER][VIEWPORT_REQUEST] generation="+generation+`
    ],
    [
      `    // Keep the previous committed FeatureCollection untouched. No fallback
    // renderer is activated and no grey replacement dataset is created.
  }
}

function scheduleCanonicalViewport(reason) {`,
      `    // Keep the previous committed FeatureCollection untouched. No fallback
    // renderer is activated and no grey replacement dataset is created.
  } finally {
    if (requestAbortController === controller) {
      requestAbortController=null;
      viewportRequestInFlight=false;
    }
  }
}

function scheduleCanonicalViewport(reason) {`
    ]
  ];

  for (const [from, to] of replacements) {
    const parts = bundle.split(from);
    if (parts.length !== 2) {
      throw new Error('Unexpected bundle shape for race-fix anchor');
    }
    bundle = parts.join(to);
  }

  if (
    !bundle.includes('viewportRequestInFlight') ||
    !bundle.includes('[MAP_RENDER][STATE_REFRESH_SKIPPED]')
  ) {
    throw new Error('Race guard markers missing after patch');
  }

  fs.writeFileSync(bundlePath, bundle);
}

const oldVersion = 'map-v2-a0ffd7e-20260926';
const newVersion = 'map-v2-raceguard-6cae568-20260926';
const oldMarker = 'canonical-map-v2-a0ffd7e-20260926';
const newMarker = 'canonical-map-v2-raceguard-6cae568-20260926';

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
  html = html.replaceAll('/sw.js?v=14', '/sw.js?v=15');
  fs.writeFileSync(pagePath, html);
}

if (fs.existsSync('sw.js')) {
  let sw = fs.readFileSync('sw.js', 'utf8');
  sw = sw.replace(
    'BarLive neutral service worker v14.',
    'BarLive neutral service worker v15.'
  );
  fs.writeFileSync('sw.js', sw);
}

console.log('Production bundle race guard prepared.');
