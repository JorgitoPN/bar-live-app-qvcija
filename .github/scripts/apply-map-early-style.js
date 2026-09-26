const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v14-exact-prewarm-d2a11bc-20260926';
const newVersion='map-v15-early-style-11fa1d5-20260926';
const oldMarker='canonical-map-v14-exact-prewarm-d2a11bc-20260926';
const newMarker='canonical-map-v15-early-style-11fa1d5-20260926';

function replaceOnce(oldText,newText,label){
  if(bundle.includes(newText)) return;
  const count=bundle.split(oldText).length-1;
  if(count!==1) throw new Error(label+' anchor count='+count);
  bundle=bundle.replace(oldText,newText);
}

replaceOnce(
`var viewportTileManifest = null;
var viewportTileCache = new Map();
var lastNationalStateRefreshAt = 0;`,
`var viewportTileManifest = null;
var viewportTileCache = new Map();
var startupPrewarmPromise = null;
var lastNationalStateRefreshAt = 0;`,
'startup prewarm var'
);

replaceOnce(
`  if (\${a}>=VIEWPORT_TILE_MIN_MAP_ZOOM) {
    try {
      var startupBounds=getCurrentBounds();
      if (startupBounds) {
        void prewarmStaticViewportTiles(
          paddedBounds(startupBounds)
        );
      }
    } catch (_) {}
  }`,
`  if (\${a}>=VIEWPORT_TILE_MIN_MAP_ZOOM) {
    try {
      var startupBounds=getCurrentBounds();
      if (startupBounds) {
        startupPrewarmPromise=prewarmStaticViewportTiles(
          paddedBounds(startupBounds)
        );
      }
    } catch (_) {
      startupPrewarmPromise=null;
    }
  }`,
'startup prewarm promise'
);

replaceOnce(
`  function bootstrapCanonicalMap(trigger) {
    if (didBootstrapCanonicalMap) return;
    if (!map || !map.isStyleLoaded()) return;

    didBootstrapCanonicalMap=true;`,
`  function bootstrapCanonicalMap(trigger) {
    if (didBootstrapCanonicalMap) return;

    if (!map || !(map.style && map.style._loaded)) return;

    didBootstrapCanonicalMap=true;`,
'early style guard'
);

replaceOnce(
`    // Start BarLive data as soon as the style object is ready. We do not wait
    // for all OpenFreeMap base tiles/glyphs to finish before painting markers.
    requestCanonicalViewport(
      true,
      warmRestored ? "style-cache-reconcile" : "style-ready"
    );

    refreshTimer=setInterval(function(){`,
`    var startCanonicalRequest=function() {
      requestCanonicalViewport(
        true,
        warmRestored ? "early-cache-reconcile" : "early-style-ready"
      );
    };

    if (startupPrewarmPromise) {
      var pendingPrewarm=startupPrewarmPromise;
      startupPrewarmPromise=null;
      Promise.resolve(pendingPrewarm).then(
        startCanonicalRequest,
        startCanonicalRequest
      );
    } else {
      startCanonicalRequest();
    }

    refreshTimer=setInterval(function(){`,
'early canonical request'
);

replaceOnce(
`  map.on("style.load",function(){
    bootstrapCanonicalMap("style.load");
  });

  // Defensive fallback for MapLibre/browser variants where style.load may
  // already have fired before the listener is attached.
  map.on("load",function(){
    bootstrapCanonicalMap("load");
  });

  if (map.isStyleLoaded()) {
    bootstrapCanonicalMap("sync");
  }`,
`  bootstrapCanonicalMap("internal-ready");

  map.on("styledata",function(){
    bootstrapCanonicalMap("styledata");
  });

  map.on("style.load",function(){
    bootstrapCanonicalMap("style.load");
  });

  map.on("load",function(){
    bootstrapCanonicalMap("load");
  });`,
'early bootstrap listeners'
);

for(const marker of [
  'startupPrewarmPromise',
  'map.style && map.style._loaded',
  'bootstrapCanonicalMap("internal-ready")',
  'early-style-ready'
]){
  if(!bundle.includes(marker)) throw new Error('missing v15 marker '+marker);
}

fs.writeFileSync(bundlePath,bundle);

for(const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]){
  if(!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=27','/sw.js?v=28');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v27.',
    'BarLive neutral service worker v28.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'11fa1d57a908006083e4e891ceac6c95f835c198',
    delivery:'canonical-map-v15-early-style',
    release:'2026-09-26-map-v15-early-style'
  })
);

console.log('Production v15 early-style bootstrap prepared.');
