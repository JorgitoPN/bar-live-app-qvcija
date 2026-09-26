const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v13-prefetch-5d7a65b-20260926';
const newVersion='map-v14-exact-prewarm-d2a11bc-20260926';
const oldMarker='canonical-map-v13-prefetch-5d7a65b-20260926';
const newMarker='canonical-map-v14-exact-prewarm-d2a11bc-20260926';

function replaceOnce(oldText,newText,label){
  if(bundle.includes(newText)) return;
  const count=bundle.split(oldText).length-1;
  if(count!==1) throw new Error(label+' anchor count='+count);
  bundle=bundle.replace(oldText,newText);
}

const headStart=`<script>
(function(){
  try {
    var initialZoom=${a};
    if (initialZoom<10) return;

    var root="https://barliveapp.es/map-data/viewport-z9-v1";`;
const start=bundle.indexOf(headStart);
if(start<0) throw new Error('v13 compiled head prefetch start missing');

const headEnd=`})();
</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.css"/>`;
const end=bundle.indexOf(headEnd,start);
if(end<0) throw new Error('v13 compiled head prefetch end missing');

bundle=
  bundle.slice(0,start)+
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.css"/>'+
  bundle.slice(end+headEnd.length);

replaceOnce(
`  map.on("styledata",function(){
    bootstrapCanonicalMap("styledata");
  });

  map.on("load",function(){`,
`  map.on("load",function(){`,
'remove styledata'
);

const helperAnchor=`async function fetchStaticViewportRows(bounds,generation,controller) {`;
const helper=`async function prewarmStaticViewportTiles(bounds) {
  if (!bounds) return;

  var started=Date.now();

  try {
    var response=await fetch(VIEWPORT_TILE_ROOT+"/manifest.json",{
      method:"GET",
      cache:"no-cache",
      headers:{Accept:"application/json"}
    });
    if (!response.ok) return;

    var manifest=await response.json();
    if (
      !manifest ||
      Number(manifest.v)!==1 ||
      Number(manifest.z)!==VIEWPORT_TILE_Z ||
      !manifest.tiles ||
      typeof manifest.tiles!=="object"
    ) return;

    viewportTileManifest=manifest;

    var keys=viewportTileKeys(bounds,manifest);
    if (!keys.length || keys.length>VIEWPORT_TILE_MAX_REQUESTS) return;

    var version=String(manifest.sourceSnapshotSha256||"").slice(0,12);

    await Promise.allSettled(keys.map(async function(key) {
      if (viewportTileCache.has(key)) return;

      var parts=key.split("/");
      var tileResponse=await fetch(
        VIEWPORT_TILE_ROOT+"/"+parts[0]+"/"+parts[1]+".json?v="+encodeURIComponent(version),
        {
          method:"GET",
          cache:"force-cache",
          headers:{Accept:"application/json"}
        }
      );

      if (!tileResponse.ok) return;

      var payload=await tileResponse.json();
      if (!payload || !Array.isArray(payload.rows)) return;

      rememberViewportTile(key,payload.rows);
    }));

    console.log(
      "[MAP_RENDER][VIEWPORT_STATIC_PREWARM]"+
      " tiles="+keys.length+
      " cached="+viewportTileCache.size+
      " elapsedMs="+(Date.now()-started)
    );
  } catch (_) {}
}

`;

if(!bundle.includes('[MAP_RENDER][VIEWPORT_STATIC_PREWARM]')){
  const count=bundle.split(helperAnchor).length-1;
  if(count!==1) throw new Error('prewarm helper anchor count='+count);
  bundle=bundle.replace(helperAnchor,helper+helperAnchor);
}

replaceOnce(
`  window.__barliveMap=map;
  map.on("error",handleMapError);

  try {`,
`  window.__barliveMap=map;
  map.on("error",handleMapError);

  if (${a}>=VIEWPORT_TILE_MIN_MAP_ZOOM) {
    try {
      var startupBounds=getCurrentBounds();
      if (startupBounds) {
        void prewarmStaticViewportTiles(
          paddedBounds(startupBounds)
        );
      }
    } catch (_) {}
  }

  try {`,
'startup exact prewarm'
);

for(const marker of [
  '[MAP_RENDER][VIEWPORT_STATIC_PREWARM]',
  'prewarmStaticViewportTiles',
  'void prewarmStaticViewportTiles'
]){
  if(!bundle.includes(marker)) throw new Error('missing v14 marker '+marker);
}
if(bundle.includes('bootstrapCanonicalMap("styledata")')){
  throw new Error('styledata listener still present');
}
if(bundle.includes('var initialZoom='+'$'+'{a};')){
  throw new Error('broad v13 prefetch still present');
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
  html=html.replaceAll('/sw.js?v=26','/sw.js?v=27');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v26.',
    'BarLive neutral service worker v27.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'d2a11bcabcd31775dfdc03ddb31e7dfe085cbbfa',
    delivery:'canonical-map-v14-exact-prewarm',
    release:'2026-09-26-map-v14-exact-prewarm'
  })
);

console.log('Production v14 exact viewport prewarm prepared.');
