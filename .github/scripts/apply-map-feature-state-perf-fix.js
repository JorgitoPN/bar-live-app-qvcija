const fs = require('fs');

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

const oldVersion = 'map-v6-decoration-perf-a9ee082-20260926';
const newVersion = 'map-v7-warm-cache-6a3c353-20260926';
const oldMarker = 'canonical-map-v6-decoration-perf-a9ee082-20260926';
const newMarker = 'canonical-map-v7-warm-cache-6a3c353-20260926';

function replaceOnce(source, oldText, newText, label) {
  if (source.includes(newText)) return source;
  if (!source.includes(oldText)) {
    throw new Error(label + ' anchor missing');
  }
  return source.replace(oldText, newText);
}

bundle = replaceOnce(
  bundle,
  `function advancedVisibleExpression() {
  return ["boolean",["feature-state","advancedVisible"],true];
}`,
  `function advancedVisibleExpression() {
  // When advanced filters are inactive, ignore any stale feature-state from a
  // previous filter session instead of rewriting every venue back to true.
  if (!advancedFilterActive) return true;
  return ["boolean",["feature-state","advancedVisible"],true];
}`,
  'advancedVisibleExpression'
);

bundle = replaceOnce(
  bundle,
  `function applyAdvancedFeatureState() {
  activeVenueById.forEach(function(_venue,id) {
    var visible =
      !advancedFilterActive ||
      !!(advancedAllowedIds && advancedAllowedIds.has(id));
    setVenueFeatureState(id,{advancedVisible:visible});
  });
}`,
  `function applyAdvancedFeatureState() {
  // Default map browsing must never enqueue one feature-state mutation per
  // venue. Missing advancedVisible already means visible.
  if (!advancedFilterActive) return;

  activeVenueById.forEach(function(_venue,id) {
    var visible=!!(advancedAllowedIds && advancedAllowedIds.has(id));
    setVenueFeatureState(id,{advancedVisible:visible});
  });
}`,
  'applyAdvancedFeatureState'
);

bundle = replaceOnce(
  bundle,
  `function applyEventFeatureState() {
  activeVenueById.forEach(function(_venue,id) {
    var eventState =
      liveIds.has(id) ? "live" :
      upcomingIds.has(id) ? "upcoming" :
      "none";
    setVenueFeatureState(id,{eventState:eventState});
  });
}`,
  `function applyEventFeatureState() {
  // Only decorated venues need feature-state. Writing "none" to every venue
  // creates thousands of unnecessary MapLibre mutations after each setData().
  liveIds.forEach(function(id) {
    if (activeVenueById.has(id)) {
      setVenueFeatureState(id,{eventState:"live"});
    }
  });
  upcomingIds.forEach(function(id) {
    if (!liveIds.has(id) && activeVenueById.has(id)) {
      setVenueFeatureState(id,{eventState:"upcoming"});
    }
  });
}`,
  'applyEventFeatureState'
);

bundle = replaceOnce(
  bundle,
  `function applyPromoFeatureState() {
  activeVenueById.forEach(function(_venue,id) {
    setVenueFeatureState(id,{hasPromo:promoIds.has(id)});
  });
}`,
  `function applyPromoFeatureState() {
  // Same rule as events: touch only venues that actually have a promotion.
  promoIds.forEach(function(id) {
    if (activeVenueById.has(id)) {
      setVenueFeatureState(id,{hasPromo:true});
    }
  });
}`,
  'applyPromoFeatureState'
);

bundle = replaceOnce(
  bundle,
  `window.setLiveEvents=function(live,upcoming){
  liveIds=new Set((live||[]).map(String));
  upcomingIds=new Set((upcoming||[]).map(String));
  applyEventFeatureState();
};`,
  `window.setLiveEvents=function(live,upcoming){
  var previousIds=new Set();
  liveIds.forEach(function(id){previousIds.add(id);});
  upcomingIds.forEach(function(id){previousIds.add(id);});

  liveIds=new Set((live||[]).map(String));
  upcomingIds=new Set((upcoming||[]).map(String));

  previousIds.forEach(function(id) {
    if (!liveIds.has(id) && !upcomingIds.has(id)) {
      setVenueFeatureState(id,{eventState:"none"});
    }
  });

  applyEventFeatureState();
};`,
  'setLiveEvents'
);

bundle = replaceOnce(
  bundle,
  `window.setActivePromos=function(promos){
  promoIds=new Set(Object.keys(promos||{}).map(String));
  applyPromoFeatureState();
};`,
  `window.setActivePromos=function(promos){
  var previousIds=new Set(promoIds);
  promoIds=new Set(Object.keys(promos||{}).map(String));

  previousIds.forEach(function(id) {
    if (!promoIds.has(id)) {
      setVenueFeatureState(id,{hasPromo:false});
    }
  });

  applyPromoFeatureState();
};`,
  'setActivePromos'
);

bundle = replaceOnce(
  bundle,
  `function applyFilters() {
  if (!map) return;
  var filter = datasetFilterExpression();

  [VENUE_LAYER,ICON_LAYER,LIVE_LAYER,UPCOMING_LAYER,PROMO_LAYER].forEach(function(id) {
    if (map.getLayer(id)) map.setFilter(id, filter);
  });

  var advancedVisible = advancedVisibleExpression();`,
  `function decoratedFilterExpression(baseFilter,ids) {
  var values=Array.from(ids||[]);
  if (!values.length) {
    return ["all",baseFilter,["==",["get","venueId"],"__barlive_no_match__"]];
  }
  return [
    "all",
    baseFilter,
    ["in",["get","venueId"],["literal",values]]
  ];
}

function applyFilters() {
  if (!map) return;
  var filter = datasetFilterExpression();

  if (map.getLayer(VENUE_LAYER)) map.setFilter(VENUE_LAYER,filter);
  if (map.getLayer(ICON_LAYER)) map.setFilter(ICON_LAYER,filter);
  if (map.getLayer(LIVE_LAYER)) {
    map.setFilter(LIVE_LAYER,decoratedFilterExpression(filter,liveIds));
  }
  if (map.getLayer(UPCOMING_LAYER)) {
    map.setFilter(UPCOMING_LAYER,decoratedFilterExpression(filter,upcomingIds));
  }
  if (map.getLayer(PROMO_LAYER)) {
    map.setFilter(PROMO_LAYER,decoratedFilterExpression(filter,promoIds));
  }

  var advancedVisible = advancedVisibleExpression();`,
  'decorated layer filters'
);

bundle = replaceOnce(
  bundle,
  `  applyEventFeatureState();
};`,
  `  applyEventFeatureState();
  applyFilters();
};`,
  'setLiveEvents applyFilters'
);

bundle = replaceOnce(
  bundle,
  `  applyPromoFeatureState();
};`,
  `  applyPromoFeatureState();
  applyFilters();
};`,
  'setActivePromos applyFilters'
);

bundle = replaceOnce(
  bundle,
  `  map.addLayer({
    id:ICON_LAYER,
    type:"symbol",
    source:VENUE_SOURCE,
    minzoom:10.5,
    layout:{`,
  `  map.addLayer({
    id:ICON_LAYER,
    type:"symbol",
    source:VENUE_SOURCE,
    // At medium/far zoom every venue remains visible as its coloured circle.
    // Rendering thousands of category glyphs before they are legible adds a
    // large symbol-layout cost, so the inner glyph starts at z13.
    minzoom:13,
    layout:{`,
  'ICON_LAYER minzoom'
);

bundle = replaceOnce(
  bundle,
  `      "icon-size":[
        "interpolate",["linear"],["zoom"],
        10.5,0.42,
        13,0.50,
        16,0.58,
        20,0.62
      ],`,
  `      "icon-size":[
        "interpolate",["linear"],["zoom"],
        13,0.50,
        16,0.58,
        20,0.62
      ],`,
  'ICON_LAYER icon-size'
);

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
  'persist viewport cache view'
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
  'restore viewport cache'
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

if (!bundle.includes('if (!advancedFilterActive) return;')) {
  throw new Error('advanced feature-state guard missing after patch');
}
if (!bundle.includes('liveIds.forEach(function(id)')) {
  throw new Error('sparse event state patch missing');
}
if (!bundle.includes('promoIds.forEach(function(id)')) {
  throw new Error('sparse promo state patch missing');
}
if (!bundle.includes('minzoom:13')) {
  throw new Error('category glyph zoom guard missing');
}
if (!bundle.includes('decoratedFilterExpression')) {
  throw new Error('decorative layer filter guard missing');
}
if (!bundle.includes('[MAP_RENDER][CACHE_RESTORE]')) {
  throw new Error('warm cache restore marker missing');
}
if (!bundle.includes('view:center && map ?')) {
  throw new Error('viewport cache view missing');
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

if (fs.existsSync('version.json')) {
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
}

console.log('Production warm-cache performance patch prepared.');
