const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v18-light-overlays-ca52641-20260926';
const newVersion='map-v19-overlay-revert-70d112c-20260926';
const oldMarker='canonical-map-v18-light-overlays-ca52641-20260926';
const newMarker='canonical-map-v19-overlay-revert-70d112c-20260926';

const oldRender='children:[mapFastPath?null:(0,U.jsx)(q.default,{}),mapFastPath?null:(0,U.jsx)(X,{}),mapFastPath?null:(0,U.jsx)(H.default,{}),mapFastPath?null:(0,U.jsx)(N.default,{}),mapFastPath?null:(0,U.jsx)(W.default,{}),mapFastPath?null:(0,U.jsx)(F.default,{}),mapFastPath?null:(0,U.jsx)(Q.default,{}),(0,U.jsxs)(t.Stack,';
const newRender='children:[(0,U.jsx)(q.default,{}),(0,U.jsx)(X,{}),(0,U.jsx)(H.default,{}),(0,U.jsx)(N.default,{}),(0,U.jsx)(W.default,{}),(0,U.jsx)(F.default,{}),(0,U.jsx)(Q.default,{}),(0,U.jsxs)(t.Stack,';

if(!bundle.includes(newRender)){
  const count=bundle.split(oldRender).length-1;
  if(count!==1) throw new Error('overlay revert anchor count='+count);
  bundle=bundle.replace(oldRender,newRender);
}

if(!bundle.includes(newRender)) throw new Error('overlay revert missing');

fs.writeFileSync(bundlePath,bundle);

for(const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]){
  if(!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=31','/sw.js?v=32');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v31.',
    'BarLive neutral service worker v32.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'70d112c81a2b830dd02318005620c9dbc61df564',
    delivery:'canonical-map-v19-overlay-revert',
    release:'2026-09-26-map-v19-overlay-revert'
  })
);

console.log('Production v19 overlay revert prepared.');
