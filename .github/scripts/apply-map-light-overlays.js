const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v17-light-map-module-71fdbad-20260926';
const newVersion='map-v18-light-overlays-ca52641-20260926';
const oldMarker='canonical-map-v17-light-map-module-71fdbad-20260926';
const newMarker='canonical-map-v18-light-overlays-ca52641-20260926';

const oldRender='children:[(0,U.jsx)(q.default,{}),(0,U.jsx)(X,{}),(0,U.jsx)(H.default,{}),(0,U.jsx)(N.default,{}),(0,U.jsx)(W.default,{}),(0,U.jsx)(F.default,{}),(0,U.jsx)(Q.default,{}),(0,U.jsxs)(t.Stack,';
const newRender='children:[mapFastPath?null:(0,U.jsx)(q.default,{}),mapFastPath?null:(0,U.jsx)(X,{}),mapFastPath?null:(0,U.jsx)(H.default,{}),mapFastPath?null:(0,U.jsx)(N.default,{}),mapFastPath?null:(0,U.jsx)(W.default,{}),mapFastPath?null:(0,U.jsx)(F.default,{}),mapFastPath?null:(0,U.jsx)(Q.default,{}),(0,U.jsxs)(t.Stack,';

if(!bundle.includes(newRender)){
  const count=bundle.split(oldRender).length-1;
  if(count!==1) throw new Error('root overlay render anchor count='+count);
  bundle=bundle.replace(oldRender,newRender);
}

if(!bundle.includes(newRender)) throw new Error('v18 overlay fast path missing');

fs.writeFileSync(bundlePath,bundle);

for(const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]){
  if(!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=30','/sw.js?v=31');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v30.',
    'BarLive neutral service worker v31.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'ca526413cad05c49d70b3db3cddecef252cf08ed',
    delivery:'canonical-map-v18-light-overlays',
    release:'2026-09-26-map-v18-light-overlays'
  })
);

console.log('Production v18 light overlay fast path prepared.');
