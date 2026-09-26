const fs = require('fs');

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

const oldVersion = 'map-v8-national-static-4c27282-20260926';
const newVersion = 'map-v9-national-stable-995dd7f-20260926';
const oldMarker = 'canonical-map-v8-national-static-4c27282-20260926';
const newMarker = 'canonical-map-v9-national-stable-995dd7f-20260926';

function replaceOnce(source, oldText, newText, label) {
  if (source.includes(newText)) return source;
  if (!source.includes(oldText)) throw new Error(label + ' anchor missing');
  return source.replace(oldText, newText);
}

bundle = replaceOnce(
  bundle,
  `  if (sourceLabel === "national-static") {
    activeDatasetMode="national-static";
    lastNationalStateRefreshAt=Date.now();
  } else if (sourceLabel === "network" || sourceLabel === "local-cache") {
    activeDatasetMode="viewport";
  }

  source.setData(normalized.collection);`,
  `  if (sourceLabel === "national-static") {
    activeDatasetMode="national-static";
    lastNationalStateRefreshAt=Date.now();
  } else if (
    sourceLabel === "state-refresh-local" &&
    activeDatasetMode === "national-static"
  ) {
    lastNationalStateRefreshAt=Date.now();
  } else if (sourceLabel === "network" || sourceLabel === "local-cache") {
    activeDatasetMode="viewport";
  }

  source.setData(normalized.collection);`,
  'national refresh timestamp'
);

if (!bundle.includes('sourceLabel === "state-refresh-local"') ||
    !bundle.includes('activeDatasetMode === "national-static"')) {
  throw new Error('national refresh throttle patch missing');
}

fs.writeFileSync(bundlePath,bundle);

for (const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]) {
  if (!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=21','/sw.js?v=22');
  fs.writeFileSync(pagePath,html);
}

if (fs.existsSync('sw.js')) {
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v21.',
    'BarLive neutral service worker v22.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'995dd7f07d4d298d8aebcb6782a64fda533b33f3',
    delivery:'canonical-map-v9-national-stable',
    release:'2026-09-26-map-v9-national-stable'
  })
);

console.log('Production v9 national stability patch prepared.');
