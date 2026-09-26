const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v10-root-fastpath-576998f-20260926';
const newVersion='map-v11-style-bootstrap-1cb6aa7-20260926';
const oldMarker='canonical-map-v10-root-fastpath-576998f-20260926';
const newMarker='canonical-map-v11-style-bootstrap-1cb6aa7-20260926';

const oldBlock=`  map.on("load",function(){
    try {
      registerCategoryIcons();
    } catch (error) {
      console.warn("[MAP_RENDER][ICON_WARNING]",error);
    }

    addVenueSourceAndLayers();
    setupMapEvents();

    // Cache is only a warm-start input to the SAME canonical source.
    // On direct refresh (national fallback shell), restore the last real
    // viewport first so markers and schedule colours paint immediately.
    var warmRestored=restoreViewportCache(true);

    // Network reconciliation writes to that exact source as one atomic commit.
    requestCanonicalViewport(true,warmRestored ? "load-cache-reconcile" : "load");

    refreshTimer=setInterval(function(){
      refreshCanonicalStates();
    },60000);

    post("map_ready",{
      engine:"barlive-single-geojson-catalogue-v2"
    });

    scheduleDiagnostics("load");
  });`;

const oldBlockLocation=`  map.on("load",function(){
    try {
      registerCategoryIcons();
    } catch (error) {
      console.warn("[MAP_RENDER][ICON_WARNING]",error);
    }

    addVenueSourceAndLayers();
    setupMapEvents();

    // Cache is only a warm-start input to the SAME canonical source.
    // On direct refresh (national fallback shell), restore the last real
    // viewport first so markers and schedule colours paint immediately.
    var warmRestored=restoreViewportCache(false);

    // Network reconciliation writes to that exact source as one atomic commit.
    requestCanonicalViewport(true,warmRestored ? "load-cache-reconcile" : "load");

    refreshTimer=setInterval(function(){
      refreshCanonicalStates();
    },60000);

    post("map_ready",{
      engine:"barlive-single-geojson-catalogue-v2"
    });

    scheduleDiagnostics("load");
  });`;

function replacement(warmLiteral){
  return `  var didBootstrapCanonicalMap=false;

  function bootstrapCanonicalMap(trigger) {
    if (didBootstrapCanonicalMap) return;
    if (!map || !map.isStyleLoaded()) return;

    didBootstrapCanonicalMap=true;

    try {
      registerCategoryIcons();
    } catch (error) {
      console.warn("[MAP_RENDER][ICON_WARNING]",error);
    }

    addVenueSourceAndLayers();
    setupMapEvents();

    // Cache is only a warm-start input to the SAME canonical source.
    // On direct refresh (national fallback shell), restore the last real
    // viewport first so markers and schedule colours paint immediately.
    var warmRestored=restoreViewportCache(${warmLiteral});

    // Start BarLive data as soon as the style object is ready. We do not wait
    // for all OpenFreeMap base tiles/glyphs to finish before painting markers.
    requestCanonicalViewport(
      true,
      warmRestored ? "style-cache-reconcile" : "style-ready"
    );

    refreshTimer=setInterval(function(){
      refreshCanonicalStates();
    },60000);

    console.log(
      "[MAP_RENDER][BOOTSTRAP] event="+String(trigger||"unknown")+
      " zoom="+map.getZoom().toFixed(2)
    );

    post("map_ready",{
      engine:"barlive-single-geojson-catalogue-v2"
    });

    scheduleDiagnostics("bootstrap-"+String(trigger||"unknown"));
  }

  map.on("style.load",function(){
    bootstrapCanonicalMap("style.load");
  });

  map.on("load",function(){
    bootstrapCanonicalMap("load");
  });

  if (map.isStyleLoaded()) {
    bootstrapCanonicalMap("sync");
  }`;
}

let changed=0;
if(bundle.includes(oldBlock)){
  bundle=bundle.replace(oldBlock,replacement('true'));
  changed++;
}
if(bundle.includes(oldBlockLocation)){
  bundle=bundle.replace(oldBlockLocation,replacement('false'));
  changed++;
}
if(changed===0 && !bundle.includes('[MAP_RENDER][BOOTSTRAP]')){
  throw new Error('style bootstrap anchor missing');
}

if(!bundle.includes('[MAP_RENDER][BOOTSTRAP]')) throw new Error('bootstrap diagnostic missing');
if(!bundle.includes('map.on("style.load"')) throw new Error('style.load listener missing');
if(!bundle.includes('warmRestored ? "style-cache-reconcile" : "style-ready"')) throw new Error('style-ready request missing');

fs.writeFileSync(bundlePath,bundle);

for(const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]){
  if(!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=23','/sw.js?v=24');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v23.',
    'BarLive neutral service worker v24.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'1cb6aa794cb74bcc5497bf9343dd74366e25eb62',
    delivery:'canonical-map-v11-style-bootstrap',
    release:'2026-09-26-map-v11-style-bootstrap'
  })
);

console.log('Production v11 style bootstrap prepared.');
