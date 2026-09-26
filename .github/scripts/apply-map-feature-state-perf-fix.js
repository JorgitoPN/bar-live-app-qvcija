const fs = require('fs');

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

const oldVersion = 'map-v5-zoom-perf-5a49816-20260926';
const newVersion = 'map-v6-decoration-perf-a9ee082-20260926';
const oldMarker = 'canonical-map-v5-zoom-perf-5a49816-20260926';
const newMarker = 'canonical-map-v6-decoration-perf-a9ee082-20260926';

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
  html = html.replaceAll('/sw.js?v=18', '/sw.js?v=19');
  fs.writeFileSync(pagePath, html);
}

if (fs.existsSync('sw.js')) {
  let sw = fs.readFileSync('sw.js', 'utf8');
  sw = sw.replace(
    'BarLive neutral service worker v18.',
    'BarLive neutral service worker v19.'
  );
  fs.writeFileSync('sw.js', sw);
}

console.log('Production feature-state performance patch prepared.');
