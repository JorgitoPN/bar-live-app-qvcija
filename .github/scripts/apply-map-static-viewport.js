const fs=require('fs');

const bundlePath='_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle=fs.readFileSync(bundlePath,'utf8');

const oldVersion='map-v11-style-bootstrap-1cb6aa7-20260926';
const newVersion='map-v12-static-viewport-90eed08-20260926';
const oldMarker='canonical-map-v11-style-bootstrap-1cb6aa7-20260926';
const newMarker='canonical-map-v12-static-viewport-90eed08-20260926';

function replaceOnce(oldText,newText,label){
  if(bundle.includes(newText)) return;
  const count=bundle.split(oldText).length-1;
  if(count!==1) throw new Error(label+' anchor count='+count);
  bundle=bundle.replace(oldText,newText);
}

replaceOnce(
`var NATIONAL_SNAPSHOT_URL = "https://barliveapp.es/map-data/national-venues-v1.json";
var NATIONAL_SNAPSHOT_MAX_ZOOM = 7;`,
`var NATIONAL_SNAPSHOT_URL = "https://barliveapp.es/map-data/national-venues-v1.json";
var NATIONAL_SNAPSHOT_MAX_ZOOM = 7;
var VIEWPORT_TILE_ROOT = "https://barliveapp.es/map-data/viewport-z9-v1";
var VIEWPORT_TILE_Z = 9;
var VIEWPORT_TILE_MIN_MAP_ZOOM = 10;
var VIEWPORT_TILE_MAX_REQUESTS = 36;`,
'national constants'
);

replaceOnce(
`var activeDatasetMode = "none";
var nationalSnapshotCompact = null;
var lastNationalStateRefreshAt = 0;`,
`var activeDatasetMode = "none";
var nationalSnapshotCompact = null;
var viewportTileManifest = null;
var viewportTileCache = new Map();
var lastNationalStateRefreshAt = 0;`,
'tile state'
);

const insertAnchor=`async function fetchNationalVenueRows(bounds,generation,controller) {`;
const staticFns=`function lonToTileX(lon,z) {
  var n=Math.pow(2,z);
  return Math.floor((Number(lon)+180)/360*n);
}

function latToTileY(lat,z) {
  var n=Math.pow(2,z);
  var clipped=Math.max(-85.05112878,Math.min(85.05112878,Number(lat)));
  var rad=clipped*Math.PI/180;
  return Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n);
}

function rememberViewportTile(key,rows) {
  if (viewportTileCache.has(key)) viewportTileCache.delete(key);
  viewportTileCache.set(key,rows);

  while (viewportTileCache.size>24) {
    var oldest=viewportTileCache.keys().next().value;
    viewportTileCache.delete(oldest);
  }
}

async function getViewportTileManifest(controller) {
  if (viewportTileManifest) return viewportTileManifest;

  var response=await fetch(VIEWPORT_TILE_ROOT+"/manifest.json",{
    method:"GET",
    cache:"no-cache",
    signal:controller.signal,
    headers:{Accept:"application/json"}
  });

  if (!response.ok) {
    throw new Error("viewport tile manifest HTTP "+response.status);
  }

  var manifest=await response.json();
  if (
    !manifest ||
    Number(manifest.v)!==1 ||
    Number(manifest.z)!==VIEWPORT_TILE_Z ||
    !manifest.tiles ||
    typeof manifest.tiles!=="object"
  ) {
    throw new Error("invalid viewport tile manifest");
  }

  viewportTileManifest=manifest;
  return manifest;
}

function viewportTileKeys(bounds,manifest) {
  var minX=Math.min(
    lonToTileX(bounds.west,VIEWPORT_TILE_Z),
    lonToTileX(bounds.east,VIEWPORT_TILE_Z)
  );
  var maxX=Math.max(
    lonToTileX(bounds.west,VIEWPORT_TILE_Z),
    lonToTileX(bounds.east,VIEWPORT_TILE_Z)
  );
  var minY=Math.min(
    latToTileY(bounds.north,VIEWPORT_TILE_Z),
    latToTileY(bounds.south,VIEWPORT_TILE_Z)
  );
  var maxY=Math.max(
    latToTileY(bounds.north,VIEWPORT_TILE_Z),
    latToTileY(bounds.south,VIEWPORT_TILE_Z)
  );

  var keys=[];
  for (var x=minX;x<=maxX;x+=1) {
    for (var y=minY;y<=maxY;y+=1) {
      var key=x+"/"+y;
      if (manifest.tiles[key]) keys.push(key);
    }
  }
  return keys;
}

async function fetchStaticViewportRows(bounds,generation,controller) {
  var started=Date.now();
  var manifest=await getViewportTileManifest(controller);

  if (
    controller.signal.aborted ||
    generation!==requestGeneration
  ) return null;

  var keys=viewportTileKeys(bounds,manifest);
  if (keys.length>VIEWPORT_TILE_MAX_REQUESTS) {
    throw new Error(
      "viewport tile request count exceeds "+VIEWPORT_TILE_MAX_REQUESTS+
      ": "+keys.length
    );
  }

  var cacheHits=0;
  var version=String(manifest.sourceSnapshotSha256||"").slice(0,12);

  var pages=await Promise.all(keys.map(async function(key) {
    if (viewportTileCache.has(key)) {
      cacheHits+=1;
      return viewportTileCache.get(key);
    }

    var parts=key.split("/");
    var response=await fetch(
      VIEWPORT_TILE_ROOT+"/"+parts[0]+"/"+parts[1]+".json?v="+encodeURIComponent(version),
      {
        method:"GET",
        cache:"force-cache",
        signal:controller.signal,
        headers:{Accept:"application/json"}
      }
    );

    if (!response.ok) {
      throw new Error(
        "viewport tile HTTP "+response.status+" key="+key
      );
    }

    var payload=await response.json();
    if (!payload || !Array.isArray(payload.rows)) {
      throw new Error("invalid viewport tile payload key="+key);
    }

    rememberViewportTile(key,payload.rows);
    return payload.rows;
  }));

  if (
    controller.signal.aborted ||
    generation!==requestGeneration
  ) return null;

  var byId=new Map();
  pages.forEach(function(rows) {
    (Array.isArray(rows)?rows:[]).forEach(function(item) {
      if (!Array.isArray(item) || item.length<8) return;

      var id=String(item[0]||"");
      var lat=Number(item[1]);
      var lng=Number(item[2]);
      if (
        !id ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat<bounds.south ||
        lat>bounds.north ||
        lng<bounds.west ||
        lng>bounds.east
      ) return;

      var category=NATIONAL_CATEGORY_BY_CODE[Number(item[3])];
      if (!category) return;

      byId.set(id,{
        id:id,
        latitud:lat,
        longitud:lng,
        barlive_type:category,
        destacado:Number(item[4]||0)===1,
        horarios_completos:item[5] == null ? null : item[5],
        google_business_status:item[6] == null ? null : item[6],
        osm_opening_hours:item[7] == null ? null : item[7]
      });
    });
  });

  var rows=Array.from(byId.values());

  console.log(
    "[MAP_RENDER][VIEWPORT_STATIC_FETCH] generation="+generation+
    " tiles="+keys.length+
    " cacheHits="+cacheHits+
    " rows="+rows.length+
    " elapsedMs="+(Date.now()-started)
  );

  return rows;
}

`;

if(!bundle.includes('[MAP_RENDER][VIEWPORT_STATIC_FETCH]')){
  const count=bundle.split(insertAnchor).length-1;
  if(count!==1) throw new Error('static function insertion anchor count='+count);
  bundle=bundle.replace(insertAnchor,staticFns+insertAnchor);
}

replaceOnce(
`async function fetchCanonicalRows(bounds,generation,controller,useNationalSnapshot) {
  var venueRows=useNationalSnapshot
    ? await fetchNationalVenueRows(
        bounds,
        generation,
        controller
      )
    : await fetchPagedRows(
        bounds,
        generation,
        controller,
        buildVenueDataUrl,
        "catalogue",
        DATA_PAGE_BATCH
      );

  if (!venueRows) return null;

  var realtime=applyRealtimeScheduleStates(venueRows);

  console.log(
    "[MAP_RENDER][SCHEDULE_STATE] generation="+generation+
    " mode="+(useNationalSnapshot ? "national" : "viewport")+
    " catalogue="+venueRows.length+
    " knownStates="+realtime.knownStates+
    " barlive="+realtime.barliveStates+
    " osm="+realtime.osmStates+
    " business="+realtime.businessStates+
    " merged="+realtime.rows.length
  );

  return realtime.rows;
}`,
`async function fetchCanonicalRows(
  bounds,
  generation,
  controller,
  useNationalSnapshot,
  useStaticViewport
) {
  var venueRows=null;
  var mode="viewport-rest";

  if (useNationalSnapshot) {
    venueRows=await fetchNationalVenueRows(
      bounds,
      generation,
      controller
    );
    mode="national";
  } else if (useStaticViewport) {
    try {
      venueRows=await fetchStaticViewportRows(
        bounds,
        generation,
        controller
      );
      mode="viewport-static";
    } catch (error) {
      if (error && error.name==="AbortError") throw error;

      console.warn(
        "[MAP_RENDER][VIEWPORT_STATIC_FALLBACK] generation="+generation,
        String(error && error.message || error)
      );

      venueRows=await fetchPagedRows(
        bounds,
        generation,
        controller,
        buildVenueDataUrl,
        "catalogue-static-fallback",
        DATA_PAGE_BATCH
      );
      mode="viewport-rest-fallback";
    }
  } else {
    venueRows=await fetchPagedRows(
      bounds,
      generation,
      controller,
      buildVenueDataUrl,
      "catalogue",
      DATA_PAGE_BATCH
    );
  }

  if (!venueRows) return null;

  var realtime=applyRealtimeScheduleStates(venueRows);

  console.log(
    "[MAP_RENDER][SCHEDULE_STATE] generation="+generation+
    " mode="+mode+
    " catalogue="+venueRows.length+
    " knownStates="+realtime.knownStates+
    " barlive="+realtime.barliveStates+
    " osm="+realtime.osmStates+
    " business="+realtime.businessStates+
    " merged="+realtime.rows.length
  );

  return {
    rows:realtime.rows,
    mode:mode
  };
}`,
'fetchCanonicalRows'
);

replaceOnce(
`  var wantsNational=map.getZoom()<=NATIONAL_SNAPSHOT_MAX_ZOOM;
  var modeMatches=wantsNational
    ? activeDatasetMode==="national-static"
    : activeDatasetMode!=="national-static";

  if (
    !force &&
    modeMatches &&
    activeCoverage &&
    activeVenueById.size &&
    boundsContain(activeCoverage,current)
  ) {`,
`  var zoom=map.getZoom();
  var wantsNational=zoom<=NATIONAL_SNAPSHOT_MAX_ZOOM;
  var wantsStaticViewport=
    !wantsNational &&
    zoom>=VIEWPORT_TILE_MIN_MAP_ZOOM;
  var desiredMode=wantsNational
    ? "national-static"
    : wantsStaticViewport
      ? "viewport-static"
      : "viewport";
  var modeMatches=activeDatasetMode===desiredMode;

  if (
    !force &&
    modeMatches &&
    activeCoverage &&
    activeVenueById.size &&
    boundsContain(activeCoverage,current)
  ) {`,
'request mode'
);

replaceOnce(
`    var rows=await fetchCanonicalRows(
      coverage,
      generation,
      controller,
      wantsNational
    );
    if (!rows) return;

    if (
      controller.signal.aborted ||
      generation !== requestGeneration
    ) {
      console.log(
        "[MAP_RENDER][STALE_RESPONSE] generation="+generation+
        " current="+requestGeneration+
        " stage=network"
      );
      return;
    }

    commitVenueRows(
      rows,
      coverage,
      generation,
      wantsNational ? "national-static" : "network"
    );`,
`    var fetched=await fetchCanonicalRows(
      coverage,
      generation,
      controller,
      wantsNational,
      wantsStaticViewport
    );
    if (!fetched || !fetched.rows) return;

    if (
      controller.signal.aborted ||
      generation !== requestGeneration
    ) {
      console.log(
        "[MAP_RENDER][STALE_RESPONSE] generation="+generation+
        " current="+requestGeneration+
        " stage=network"
      );
      return;
    }

    var sourceLabel=wantsNational
      ? "national-static"
      : fetched.mode==="viewport-static"
        ? "viewport-static"
        : "network";

    commitVenueRows(
      fetched.rows,
      coverage,
      generation,
      sourceLabel
    );`,
'request fetched rows'
);

replaceOnce(
`  if (sourceLabel === "national-static") {
    activeDatasetMode="national-static";
    lastNationalStateRefreshAt=Date.now();
  } else if (
    sourceLabel === "state-refresh-local" &&
    activeDatasetMode === "national-static"
  ) {`,
`  if (sourceLabel === "national-static") {
    activeDatasetMode="national-static";
    lastNationalStateRefreshAt=Date.now();
  } else if (sourceLabel === "viewport-static") {
    activeDatasetMode="viewport-static";
  } else if (
    sourceLabel === "state-refresh-local" &&
    activeDatasetMode === "national-static"
  ) {`,
'commit static mode'
);

for(const marker of [
  'VIEWPORT_TILE_ROOT',
  '[MAP_RENDER][VIEWPORT_STATIC_FETCH]',
  'viewport-static',
  'viewportTileCache'
]){
  if(!bundle.includes(marker)) throw new Error('missing v12 marker '+marker);
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
  html=html.replaceAll('/sw.js?v=24','/sw.js?v=25');
  fs.writeFileSync(pagePath,html);
}

if(fs.existsSync('sw.js')){
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v24.',
    'BarLive neutral service worker v25.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'90eed0874dd5effac0a952780905dac574c50629',
    delivery:'canonical-map-v12-static-viewport',
    release:'2026-09-26-map-v12-static-viewport'
  })
);

console.log('Production v12 static viewport patch prepared.');
