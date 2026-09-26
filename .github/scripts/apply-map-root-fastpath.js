const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v9-national-stable-995dd7f-20260926';
const newVersion='map-v10-root-fastpath-576998f-20260926';
const oldMarker='canonical-map-v9-national-stable-995dd7f-20260926';
const newMarker='canonical-map-v10-root-fastpath-576998f-20260926';

const oldStart='function Y(){const e=(0,R.useAuthStore)(e=>e.isInitializing),L=(0,R.useAuthStore)(e=>e.initialLoadingProgress),[O,B]=(0,v.useState)(!0);';
const newStart="function Y(){const mapPath=(0,t.usePathname)(),mapFastPath=!!mapPath&&('/explorar/mapa'===mapPath||mapPath.endsWith('/explorar/mapa')),e=(0,R.useAuthStore)(e=>e.isInitializing),L=(0,R.useAuthStore)(e=>e.initialLoadingProgress),[O,B]=(0,v.useState)(!0);";

if(!bundle.includes(newStart)){
  const count=bundle.split(oldStart).length-1;
  if(count!==1) throw new Error('root function anchor count='+count);
  bundle=bundle.replace(oldStart,newStart);
}

const oldReturn='return O?(0,U.jsx)(G.default,{progress:L}):';
const newReturn='return O&&!mapFastPath?(0,U.jsx)(G.default,{progress:L}):';
if(!bundle.includes(newReturn)){
  const count=bundle.split(oldReturn).length-1;
  if(count!==1) throw new Error('root loading return anchor count='+count);
  bundle=bundle.replace(oldReturn,newReturn);
}

if(!bundle.includes("mapFastPath=!!mapPath&&('/explorar/mapa'===mapPath||mapPath.endsWith('/explorar/mapa'))")){
  throw new Error('map fast path missing');
}
if(!bundle.includes('return O&&!mapFastPath?')){
  throw new Error('map splash bypass missing');
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
  html=html.replaceAll('/sw.js?v=22','/sw.js?v=23');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v22.',
    'BarLive neutral service worker v23.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'576998f4f4a20d18221f1b443c50908d216635cb',
    delivery:'canonical-map-v10-root-fastpath',
    release:'2026-09-26-map-v10-root-fastpath'
  })
);

console.log('Production v10 map root fast path prepared.');
