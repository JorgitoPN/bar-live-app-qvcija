const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v15-early-style-11fa1d5-20260926';
const newVersion='map-v16-lazy-tabs-cd9df5d-20260926';
const oldMarker='canonical-map-v15-early-style-11fa1d5-20260926';
const newMarker='canonical-map-v16-lazy-tabs-cd9df5d-20260926';

const needle="screenOptions:{headerShown:!1,tabBarStyle:{display:'none'},lazy:!1}";
const needleIndex=bundle.indexOf(needle);
if(needleIndex<0) throw new Error('tabs module lazy anchor missing');

const moduleStart=bundle.lastIndexOf('__d(function',needleIndex);
const moduleEnd=bundle.indexOf('},1095,[',needleIndex);
if(moduleStart<0||moduleEnd<0) throw new Error('tabs module boundary missing');

const end=moduleEnd+8;
const moduleText=bundle.slice(moduleStart,end);
const lazyCount=(moduleText.match(/lazy:!1/g)||[]).length;
if(lazyCount<2) throw new Error('unexpected tabs lazy count='+lazyCount);

const updatedModule=moduleText.replace(/lazy:!1/g,'lazy:!0');
if((updatedModule.match(/lazy:!1/g)||[]).length!==0){
  throw new Error('lazy false remained in tabs module');
}
if((updatedModule.match(/lazy:!0/g)||[]).length!==lazyCount){
  throw new Error('lazy true count mismatch');
}

bundle=bundle.slice(0,moduleStart)+updatedModule+bundle.slice(end);

fs.writeFileSync(bundlePath,bundle);

for(const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]){
  if(!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=28','/sw.js?v=29');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v28.',
    'BarLive neutral service worker v29.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'cd9df5d630ad1a3d6969dd5764b2a4cea79fe8b0',
    delivery:'canonical-map-v16-lazy-tabs',
    release:'2026-09-26-map-v16-lazy-tabs'
  })
);

console.log('Production v16 lazy tabs prepared; changed flags='+lazyCount);
