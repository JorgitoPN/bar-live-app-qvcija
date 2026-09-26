const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v12-static-viewport-90eed08-20260926';
const newVersion='map-v13-prefetch-5d7a65b-20260926';
const oldMarker='canonical-map-v12-static-viewport-90eed08-20260926';
const newMarker='canonical-map-v13-prefetch-5d7a65b-20260926';

function replaceOnce(oldText,newText,label){
  if(bundle.includes(newText)) return;
  const count=bundle.split(oldText).length-1;
  if(count!==1) throw new Error(label+' anchor count='+count);
  bundle=bundle.replace(oldText,newText);
}

replaceOnce(
`<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.css"/>`,
`<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<script>
(function(){
  try {
    var initialZoom=\${initialZoom};
    if (initialZoom<10) return;

    var root="https://barliveapp.es/map-data/viewport-z9-v1";
    var z=9;
    var n=Math.pow(2,z);
    var lon=\${initialLng};
    var lat=\${initialLat};
    var x=Math.floor((lon+180)/360*n);
    var clipped=Math.max(-85.05112878,Math.min(85.05112878,lat));
    var rad=clipped*Math.PI/180;
    var y=Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n);

    fetch(root+"/manifest.json",{
      method:"GET",
      cache:"no-cache",
      headers:{Accept:"application/json"}
    })
      .then(function(response){return response.ok?response.json():null;})
      .then(function(manifest){
        if(!manifest||!manifest.tiles) return;
        var version=String(manifest.sourceSnapshotSha256||"").slice(0,12);
        var jobs=[];
        for(var dx=-1;dx<=1;dx+=1){
          for(var dy=-1;dy<=1;dy+=1){
            var tx=x+dx, ty=y+dy;
            var key=tx+"/"+ty;
            if(!manifest.tiles[key]) continue;
            jobs.push(
              fetch(
                root+"/"+tx+"/"+ty+".json?v="+encodeURIComponent(version),
                {
                  method:"GET",
                  cache:"force-cache",
                  headers:{Accept:"application/json"}
                }
              ).catch(function(){return null;})
            );
          }
        }
        return Promise.allSettled(jobs);
      })
      .catch(function(){});
  } catch (_) {}
})();
</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.css"/>`,
'prefetch head'
);

replaceOnce(
`  map.on("style.load",function(){
    bootstrapCanonicalMap("style.load");
  });

  // Defensive fallback for MapLibre/browser variants where style.load may`,
`  map.on("style.load",function(){
    bootstrapCanonicalMap("style.load");
  });

  map.on("styledata",function(){
    bootstrapCanonicalMap("styledata");
  });

  // Defensive fallback for MapLibre/browser variants where style.load may`,
'styledata listener'
);

if(!bundle.includes('Promise.allSettled(jobs)')) throw new Error('prefetch code missing');
if(!bundle.includes('bootstrapCanonicalMap("styledata")')) throw new Error('styledata bootstrap missing');

fs.writeFileSync(bundlePath,bundle);

for(const pagePath of [
  'index.html','404.html','explorar/index.html',
  'explorar/mapa/index.html','detalle/local/index.html'
]){
  if(!fs.existsSync(pagePath)) continue;
  let html=fs.readFileSync(pagePath,'utf8');
  html=html.replaceAll(oldMarker,newMarker);
  html=html.replaceAll(oldVersion,newVersion);
  html=html.replaceAll('/sw.js?v=25','/sw.js?v=26');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v25.',
    'BarLive neutral service worker v26.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'5d7a65b63feba24f1cb36eb97ecf84a99b433330',
    delivery:'canonical-map-v13-prefetch',
    release:'2026-09-26-map-v13-prefetch'
  })
);

console.log('Production v13 prefetch patch prepared.');
