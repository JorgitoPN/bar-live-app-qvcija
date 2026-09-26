const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v16-lazy-tabs-cd9df5d-20260926';
const newVersion='map-v17-light-map-module-71fdbad-20260926';
const oldMarker='canonical-map-v16-lazy-tabs-cd9df5d-20260926';
const newMarker='canonical-map-v17-light-map-module-71fdbad-20260926';

const needle='Opening advanced filters';
const needleIndex=bundle.indexOf(needle);
if(needleIndex<0) throw new Error('map filter handler missing');

const moduleStart=bundle.lastIndexOf('__d(function',needleIndex);
const moduleEnd=bundle.indexOf('\n__d(function',needleIndex);
if(moduleStart<0||moduleEnd<0) throw new Error('map module boundaries missing');

let mod=bundle.slice(moduleStart,moduleEnd);

function replaceOnce(source,oldText,newText,label){
  const count=source.split(oldText).length-1;
  if(count===1) return source.replace(oldText,newText);
  if(count===0 && newText && source.includes(newText)) return source;
  throw new Error(label+' anchor count='+count);
}

mod=replaceOnce(
  mod,
  'f=n(o[7]),y=n(o[8]),g=s(n(o[9])),h=s(n(o[10]))',
  'f=n(o[7]),y=n(o[8]),h=s(n(o[10]))',
  'advanced filter module import'
);

mod=replaceOnce(
  mod,
  ',[me,fe]=(0,l.useState)(!1),ye=(0,F.useFilterStore)',
  ',ye=(0,F.useFilterStore)',
  'advanced filter visibility state'
);

const handlerStart=mod.indexOf('xe=(0,l.useCallback)(()=>{console.log(');
const handlerEnd=mod.indexOf('Me=(0,l.useCallback)',handlerStart);
if(handlerStart<0||handlerEnd<0) throw new Error('filter handlers boundary missing');

mod=
  mod.slice(0,handlerStart)+
  "xe=(0,l.useCallback)(()=>{console.log('[MAPA] Opening advanced filters'),e.push('/explorar/filtros-avanzados')},[e]),"+
  mod.slice(handlerEnd);

mod=replaceOnce(
  mod,
  ',(0,_.jsx)(g.default,{visible:me,onClose:Se})',
  '',
  'dead advanced filter render'
);

if(mod.includes('g=s(n(o[9]))')) throw new Error('advanced filter import still executed');
if(mod.includes(',[me,fe]=(0,l.useState)(!1),ye=(0,F.useFilterStore)')) throw new Error('advanced filter visibility state anchor still present');
if(mod.includes('visible:me,onClose:Se')) throw new Error('advanced filter component render still present');
if(!mod.includes("e.push('/explorar/filtros-avanzados')")) throw new Error('direct advanced filter navigation missing');

bundle=bundle.slice(0,moduleStart)+mod+bundle.slice(moduleEnd);
fs.writeFileSync(bundlePath,bundle);

for(const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]){
  if(!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=29','/sw.js?v=30');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v29.',
    'BarLive neutral service worker v30.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'71fdbada4f9318a9e406fb208d3b0df579190c9f',
    delivery:'canonical-map-v17-light-map-module',
    release:'2026-09-26-map-v17-light-map-module'
  })
);

console.log('Production v17 light map module prepared.');
