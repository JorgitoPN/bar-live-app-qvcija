const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v19-overlay-revert-70d112c-20260926';
const newVersion='map-v20-deferred-hydration-4ffb54f-20260926';
const oldMarker='canonical-map-v19-overlay-revert-70d112c-20260926';
const newMarker='canonical-map-v20-deferred-hydration-4ffb54f-20260926';

const startNeedle="(0,v.useEffect)(()=>{performance.now();C.PerformanceTracker.start('app_initialization');const e=P.default.runAfterInteractions(()=>{";
const endNeedle="});return()=>{e.cancel()}},[]),(0,v.useEffect)(()=>{},[])";

if(!bundle.includes('mapFastPath?t=setTimeout(o,2500):o()')){
  const start=bundle.indexOf(startNeedle);
  if(start<0) throw new Error('hydration effect start missing');

  const bodyStart=start+startNeedle.length;
  const end=bundle.indexOf(endNeedle,bodyStart);
  if(end<0) throw new Error('hydration effect end missing');

  const callbackBody=bundle.slice(bodyStart,end);

  const replacement=
    "(0,v.useEffect)(()=>{let e=null,t=null;const o=()=>{performance.now();C.PerformanceTracker.start('app_initialization'),e=P.default.runAfterInteractions(()=>{"+
    callbackBody+
    "})};return mapFastPath?t=setTimeout(o,2500):o(),()=>{t&&clearTimeout(t),e?.cancel()}},[mapFastPath]),(0,v.useEffect)(()=>{},[])";

  bundle=bundle.slice(0,start)+replacement+bundle.slice(end+endNeedle.length);
}

if(!bundle.includes('mapFastPath?t=setTimeout(o,2500):o()')){
  throw new Error('v20 deferred hydration marker missing');
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
  html=html.replaceAll('/sw.js?v=32','/sw.js?v=33');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v32.',
    'BarLive neutral service worker v33.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'4ffb54f88e0addd62778766bfea96a8d206c7cff',
    delivery:'canonical-map-v20-deferred-hydration',
    release:'2026-09-26-map-v20-deferred-hydration'
  })
);

console.log('Production v20 deferred hydration prepared.');
