const fs = require('fs');

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

const oldVersion = 'map-v7-warm-cache-6a3c353-20260926';
const newVersion = 'map-v8-national-static-4c27282-20260926';
const oldMarker = 'canonical-map-v7-warm-cache-6a3c353-20260926';
const newMarker = 'canonical-map-v8-national-static-4c27282-20260926';

function replaceOnce(source, oldText, newText, label) {
  if (source.includes(newText)) return source;
  if (!source.includes(oldText)) throw new Error(label + ' anchor missing');
  return source.replace(oldText, newText);
}

bundle = replaceOnce(
  bundle,
  `var VENUE_DATA_URL = "https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/locales";
var DATA_APIKEY = "sb_publishable_ffrXoLqKentwGrBXq3ZTDg_WxsX2y_2";`,
  `var VENUE_DATA_URL = "https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/locales";
var NATIONAL_SNAPSHOT_URL = "https://barliveapp.es/map-data/national-venues-v1.json";
var NATIONAL_SNAPSHOT_MAX_ZOOM = 7;
var NATIONAL_COVERAGE = {
  south:27.45,
  west:-18.25,
  north:44.25,
  east:4.60
};
var NATIONAL_CATEGORY_BY_CODE = [
  "bar",
  "restaurante",
  "cafeteria",
  "pub",
  "discoteca",
  "cocteleria"
];
var DATA_APIKEY = "sb_publishable_ffrXoLqKentwGrBXq3ZTDg_WxsX2y_2";`,
  'national constants'
);

bundle = replaceOnce(
  bundle,
  `var activeCoverage = null;
var activeDatasetGeneration = 0;
var requestGeneration = 0;`,
  `var activeCoverage = null;
var activeDatasetGeneration = 0;
var activeDatasetMode = "none";
var nationalSnapshotCompact = null;
var lastNationalStateRefreshAt = 0;
var requestGeneration = 0;`,
  'dataset mode vars'
);

bundle = replaceOnce(
  bundle,
  `function countRenderedVenueIds() {
  if (!map || !map.getLayer(VENUE_LAYER)) return 0;
  var rendered=[];`,
  `function countRenderedVenueIds() {
  if (!map || !map.getLayer(VENUE_LAYER)) return 0;

  if (activeVenueById.size > 20000 || map.getZoom() < 9) return -1;

  var rendered=[];`,
  'rendered diagnostic guard'
);

bundle = replaceOnce(
  bundle,
  `  activeRows=Array.isArray(rows) ? rows : [];
  activeVenueById=normalized.byId;
  activeCoverage=coverage;
  activeDatasetGeneration=generation;

  source.setData(normalized.collection);`,
  `  activeRows=Array.isArray(rows) ? rows : [];
  activeVenueById=normalized.byId;
  activeCoverage=coverage;
  activeDatasetGeneration=generation;

  if (sourceLabel === "national-static") {
    activeDatasetMode="national-static";
    lastNationalStateRefreshAt=Date.now();
  } else if (sourceLabel === "network" || sourceLabel === "local-cache") {
    activeDatasetMode="viewport";
  }

  source.setData(normalized.collection);`,
  'commit dataset mode'
);

bundle = replaceOnce(
  bundle,
  `async function fetchCanonicalRows(bounds,generation,controller) {
  var venueRows=await fetchPagedRows(
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
    " catalogue="+venueRows.length+
    " knownStates="+realtime.knownStates+
    " barlive="+realtime.barliveStates+
    " osm="+realtime.osmStates+
    " business="+realtime.businessStates+
    " merged="+realtime.rows.length
  );

  return realtime.rows;
}`,
  `function decodeNationalSnapshotRows(compactRows) {
  var decoded=[];
  (Array.isArray(compactRows)?compactRows:[]).forEach(function(item) {
    if (!Array.isArray(item) || item.length < 8) return;

    var category=NATIONAL_CATEGORY_BY_CODE[Number(item[3])];
    if (!category) return;

    decoded.push({
      id:String(item[0]||""),
      latitud:Number(item[1]),
      longitud:Number(item[2]),
      barlive_type:category,
      destacado:Number(item[4]||0)===1,
      horarios_completos:item[5] == null ? null : item[5],
      google_business_status:item[6] == null ? null : item[6],
      osm_opening_hours:item[7] == null ? null : item[7]
    });
  });
  return decoded;
}

async function fetchNationalVenueRows(bounds,generation,controller) {
  try {
    if (!nationalSnapshotCompact) {
      var started=Date.now();
      var response=await fetch(NATIONAL_SNAPSHOT_URL,{
        method:"GET",
        cache:"default",
        signal:controller.signal,
        headers:{Accept:"application/json"}
      });

      if (!response.ok) {
        throw new Error("national snapshot HTTP "+response.status);
      }

      var payload=await response.json();
      if (
        !payload ||
        Number(payload.v)!==1 ||
        !Array.isArray(payload.rows) ||
        payload.rows.length < 100000
      ) {
        throw new Error("invalid national snapshot payload");
      }

      if (
        controller.signal.aborted ||
        generation !== requestGeneration
      ) return null;

      nationalSnapshotCompact=payload.rows;

      console.log(
        "[MAP_RENDER][NATIONAL_STATIC_FETCH] generation="+generation+
        " rows="+nationalSnapshotCompact.length+
        " elapsedMs="+(Date.now()-started)
      );
    } else {
      console.log(
        "[MAP_RENDER][NATIONAL_STATIC_MEMORY] generation="+generation+
        " rows="+nationalSnapshotCompact.length
      );
    }

    return decodeNationalSnapshotRows(nationalSnapshotCompact);
  } catch (error) {
    if (error && error.name === "AbortError") throw error;

    console.warn(
      "[MAP_RENDER][NATIONAL_STATIC_FALLBACK] generation="+generation,
      String(error && error.message || error)
    );

    return fetchPagedRows(
      bounds,
      generation,
      controller,
      buildVenueDataUrl,
      "catalogue-national-fallback",
      DATA_PAGE_BATCH
    );
  }
}

async function fetchCanonicalRows(bounds,generation,controller,useNationalSnapshot) {
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
  'national fetch implementation'
);

bundle = replaceOnce(
  bundle,
  `  var coverage=activeCoverage;
  var generation=++requestGeneration;
  lastRequestReason="state-refresh-local";`,
  `  if (activeDatasetMode === "national-static") {
    var nationalAge=Date.now()-lastNationalStateRefreshAt;
    if (nationalAge < 5*60*1000) {
      console.log(
        "[MAP_RENDER][STATE_REFRESH_SKIPPED] reason=national-static-fresh"+
        " ageMs="+nationalAge
      );
      return;
    }
  }

  var coverage=activeCoverage;
  var generation=++requestGeneration;
  lastRequestReason="state-refresh-local";`,
  'national refresh throttle'
);

bundle = replaceOnce(
  bundle,
  `  var current=getCurrentBounds();
  if (!current) return;

  if (
    !force &&
    activeCoverage &&
    activeVenueById.size &&
    boundsContain(activeCoverage,current)
  ) {
    scheduleDiagnostics("coverage-hit");
    return;
  }

  var coverage=paddedBounds(current);
  var generation=++requestGeneration;`,
  `  var current=getCurrentBounds();
  if (!current) return;

  var wantsNational=map.getZoom()<=NATIONAL_SNAPSHOT_MAX_ZOOM;
  var modeMatches=wantsNational
    ? activeDatasetMode==="national-static"
    : activeDatasetMode!=="national-static";

  if (
    !force &&
    modeMatches &&
    activeCoverage &&
    activeVenueById.size &&
    boundsContain(activeCoverage,current)
  ) {
    scheduleDiagnostics("coverage-hit");
    return;
  }

  var coverage=wantsNational
    ? NATIONAL_COVERAGE
    : paddedBounds(current);
  var generation=++requestGeneration;`,
  'national request mode'
);

bundle = replaceOnce(
  bundle,
  `    var rows=await fetchCanonicalRows(coverage,generation,controller);`,
  `    var rows=await fetchCanonicalRows(
      coverage,
      generation,
      controller,
      wantsNational
    );`,
  'fetch canonical national flag'
);

bundle = replaceOnce(
  bundle,
  `    commitVenueRows(rows,coverage,generation,"network");`,
  `    commitVenueRows(
      rows,
      coverage,
      generation,
      wantsNational ? "national-static" : "network"
    );`,
  'commit national label'
);

for (const marker of [
  'NATIONAL_SNAPSHOT_URL',
  '[MAP_RENDER][NATIONAL_STATIC_FETCH]',
  'activeDatasetMode',
  'NATIONAL_SNAPSHOT_MAX_ZOOM'
]) {
  if (!bundle.includes(marker)) throw new Error('missing v8 marker '+marker);
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
  html=html.replaceAll('/sw.js?v=20','/sw.js?v=21');
  fs.writeFileSync(pagePath,html);
}

if (fs.existsSync('sw.js')) {
  let sw=fs.readFileSync('sw.js','utf8');
  sw=sw.replace(
    'BarLive neutral service worker v20.',
    'BarLive neutral service worker v21.'
  );
  fs.writeFileSync('sw.js',sw);
}

fs.writeFileSync(
  'version.json',
  JSON.stringify({
    source:'Barlive-2',
    branch:'main',
    source_commit:'4c27282637a5964728f8630799fc7fdc51fd05fe',
    delivery:'canonical-map-v8-national-static',
    release:'2026-09-26-map-v8-national-static'
  })
);

console.log('Production v8 national-static patch prepared.');
