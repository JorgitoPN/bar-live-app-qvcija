const fs = require('fs');

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

const oldVersion = 'map-v2-raceguard-6cae568-20260926';
const newVersion = 'map-v3-schedules-557748d-20260926';
const oldMarker = 'canonical-map-v2-raceguard-6cae568-20260926';
const newMarker = 'canonical-map-v3-schedules-557748d-20260926';

if (!bundle.includes('applyRealtimeScheduleStates')) {
  bundle = bundle.replace(
    'var STATE_DATA_URL = "https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/map_marker_state_cache";\n',
    ''
  );

  bundle = bundle.replace(
    'var DATA_CACHE_KEY = "barlive-visible-venues-v2";',
    'var DATA_CACHE_KEY = "barlive-visible-venues-v3-schedules";'
  );

  const markerAnchor = \`function normalizeMarkerState(value) {
  var raw = String(value == null ? "" : value).trim().toLowerCase();
  var numeric = Number(value);
  if (raw === "abierto" || raw === "open" || numeric === 1) return "open";
  if (raw === "cerrado" || raw === "closed" || numeric === 2) return "closed";
  return "unknown";
}
\`;

  const helpers = String.raw\`
function madridClockParts() {
  var fallback=new Date();
  try {
    var parts=new Intl.DateTimeFormat("en-US",{
      timeZone:"Europe/Madrid",
      weekday:"short",
      hour:"2-digit",
      minute:"2-digit",
      hourCycle:"h23"
    }).formatToParts(fallback);
    var values={};
    parts.forEach(function(part) {
      if (part.type!=="literal") values[part.type]=part.value;
    });
    var dayMap={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
    var dayIndex=dayMap[String(values.weekday||"").slice(0,3)];
    var hour=Number(values.hour);
    var minute=Number(values.minute);
    if (
      Number.isFinite(dayIndex) &&
      Number.isFinite(hour) &&
      Number.isFinite(minute)
    ) {
      return {dayIndex:dayIndex,minutes:hour*60+minute};
    }
  } catch (_) {}

  var fallbackDay=(fallback.getDay()+6)%7;
  return {
    dayIndex:fallbackDay,
    minutes:fallback.getHours()*60+fallback.getMinutes()
  };
}

function normalizeScheduleDayKey(value) {
  var raw=String(value||"")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g,"")
    .replace(/\\./g,"")
    .trim()
    .toLowerCase();

  var aliases={
    lunes:0,monday:0,mon:0,mo:0,
    martes:1,tuesday:1,tue:1,tu:1,
    miercoles:2,wednesday:2,wed:2,we:2,
    jueves:3,thursday:3,thu:3,th:3,
    viernes:4,friday:4,fri:4,fr:4,
    sabado:5,saturday:5,sat:5,sa:5,
    domingo:6,sunday:6,sun:6,su:6
  };
  return Object.prototype.hasOwnProperty.call(aliases,raw)
    ? aliases[raw]
    : null;
}

function normalizeScheduleRanges(value) {
  if (Array.isArray(value)) {
    return value
      .map(function(item){return String(item==null?"":item).trim();})
      .filter(Boolean);
  }
  if (typeof value==="string") {
    var text=value.trim();
    if (!text) return [];
    if (text.indexOf(";")>=0) {
      return text.split(";").map(function(item){return item.trim();}).filter(Boolean);
    }
    if (text.indexOf(",")>=0) {
      return text.split(",").map(function(item){return item.trim();}).filter(Boolean);
    }
    return [text];
  }
  return [];
}

function parseScheduleRange(value) {
  var normalized=String(value||"")
    .trim()
    .toLowerCase()
    .replace(/–/g,"-")
    .replace(/—/g,"-");

  if (!normalized || normalized==="cerrado" || normalized==="closed" || normalized==="off") {
    return null;
  }

  if (
    normalized==="24 horas" ||
    normalized==="24h" ||
    normalized==="abierto 24 horas" ||
    normalized==="open 24 hours" ||
    normalized==="24/7" ||
    normalized==="00:00-24:00" ||
    normalized==="00:00-23:59" ||
    normalized==="00:00-00:00" ||
    normalized.indexOf("abierto 24")>=0 ||
    normalized.indexOf("open 24")>=0
  ) {
    return [0,1440];
  }

  var match=normalized.match(
    /^([0-9]{1,2}):([0-9]{2})\\s*-\\s*([0-9]{1,2}):([0-9]{2})$/
  );
  if (!match) return null;

  var openHour=Number(match[1]);
  var openMinute=Number(match[2]);
  var closeHour=Number(match[3]);
  var closeMinute=Number(match[4]);

  if (
    openHour>23 || openMinute>59 ||
    closeHour>24 || closeMinute>59 ||
    (closeHour===24 && closeMinute!==0)
  ) return null;

  var openMinutes=openHour*60+openMinute;
  var closeMinutes=closeHour===24 ? 1440 : closeHour*60+closeMinute;
  if (openMinutes===0 && closeMinutes===0) closeMinutes=1440;
  return [openMinutes,closeMinutes];
}

function emptyWeeklySchedule() {
  return [
    {known:false,ranges:[]},
    {known:false,ranges:[]},
    {known:false,ranges:[]},
    {known:false,ranges:[]},
    {known:false,ranges:[]},
    {known:false,ranges:[]},
    {known:false,ranges:[]}
  ];
}

function weeklyScheduleFromBarLive(value) {
  var hours=value;
  if (typeof hours==="string") {
    try { hours=JSON.parse(hours); }
    catch (_) { return null; }
  }
  if (!hours || typeof hours!=="object" || Array.isArray(hours)) return null;

  var days=emptyWeeklySchedule();
  var recognized=false;
  Object.keys(hours).forEach(function(key) {
    var dayIndex=normalizeScheduleDayKey(key);
    if (dayIndex===null) return;

    var ranges=normalizeScheduleRanges(hours[key]);
    if (!ranges.length) return;

    recognized=true;
    days[dayIndex].known=true;
    ranges.forEach(function(rawRange) {
      var parsed=parseScheduleRange(rawRange);
      if (parsed) days[dayIndex].ranges.push(parsed);
    });
  });
  return recognized ? days : null;
}

function expandOsmDaySpec(spec) {
  var codeToDay={Mo:0,Tu:1,We:2,Th:3,Fr:4,Sa:5,Su:6};
  var result=new Set();

  String(spec||"").split(",").forEach(function(token) {
    token=token.trim();
    if (!token) return;

    if (token.indexOf("-")>=0) {
      var parts=token.split("-").map(function(item){return item.trim();});
      var start=codeToDay[parts[0]];
      var end=codeToDay[parts[1]];
      if (start==null || end==null) return;

      var day=start;
      for (var guard=0;guard<7;guard+=1) {
        result.add(day);
        if (day===end) break;
        day=(day+1)%7;
      }
      return;
    }

    if (codeToDay[token]!=null) result.add(codeToDay[token]);
  });

  return Array.from(result);
}

function weeklyScheduleFromOsm(value) {
  var text=String(value||"").trim();
  if (!text) return null;

  if (/^24\\s*\\/\\s*7$/i.test(text)) {
    var always=emptyWeeklySchedule();
    always.forEach(function(day) {
      day.known=true;
      day.ranges=[[0,1440]];
    });
    return always;
  }

  var days=emptyWeeklySchedule();
  var recognized=false;

  text
    .replace(/–/g,"-")
    .replace(/—/g,"-")
    .split(";")
    .forEach(function(clause) {
      clause=clause.replace(/"[^"]*"/g,"").trim();
      if (!clause) return;

      var match=clause.match(
        /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\\s*[-,]\\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\\s+(.+)$/i
      );
      if (!match) return;

      var normalizedSpec=match[1].replace(/\\s+/g,"");
      normalizedSpec=normalizedSpec.replace(/mo/ig,"Mo")
        .replace(/tu/ig,"Tu")
        .replace(/we/ig,"We")
        .replace(/th/ig,"Th")
        .replace(/fr/ig,"Fr")
        .replace(/sa/ig,"Sa")
        .replace(/su/ig,"Su");

      var dayIndexes=expandOsmDaySpec(normalizedSpec);
      if (!dayIndexes.length) return;

      var rule=String(match[2]||"").trim();
      if (/^(off|closed)$/i.test(rule)) {
        recognized=true;
        dayIndexes.forEach(function(dayIndex) {
          days[dayIndex].known=true;
        });
        return;
      }

      if (/^(open|24\\s*\\/\\s*7)$/i.test(rule)) {
        recognized=true;
        dayIndexes.forEach(function(dayIndex) {
          days[dayIndex].known=true;
          days[dayIndex].ranges.push([0,1440]);
        });
        return;
      }

      var parsedRanges=[];
      var rangeRegex=/([0-9]{1,2}):([0-9]{2})\\s*-\\s*([0-9]{1,2}):([0-9]{2})/g;
      var rangeMatch;
      while ((rangeMatch=rangeRegex.exec(rule))!==null) {
        var parsed=parseScheduleRange(
          rangeMatch[1]+":"+rangeMatch[2]+"-"+rangeMatch[3]+":"+rangeMatch[4]
        );
        if (parsed) parsedRanges.push(parsed);
      }

      if (!parsedRanges.length) return;

      recognized=true;
      dayIndexes.forEach(function(dayIndex) {
        days[dayIndex].known=true;
        Array.prototype.push.apply(days[dayIndex].ranges,parsedRanges);
      });
    });

  return recognized ? days : null;
}

function markerStateFromWeeklySchedule(days,clock) {
  if (!days || !clock) return "unknown";

  var today=days[clock.dayIndex] || {known:false,ranges:[]};
  var previous=days[(clock.dayIndex+6)%7] || {known:false,ranges:[]};
  var nowMinutes=clock.minutes;

  for (var i=0;i<today.ranges.length;i+=1) {
    var current=today.ranges[i];
    var openMinutes=current[0];
    var closeMinutes=current[1];

    if (openMinutes===0 && closeMinutes===1440) return "open";
    if (
      openMinutes<closeMinutes &&
      nowMinutes>=openMinutes &&
      nowMinutes<closeMinutes
    ) return "open";
    if (
      openMinutes>closeMinutes &&
      nowMinutes>=openMinutes
    ) return "open";
  }

  for (var j=0;j<previous.ranges.length;j+=1) {
    var prior=previous.ranges[j];
    if (
      prior[0]>prior[1] &&
      nowMinutes<prior[1]
    ) return "open";
  }

  return today.known ? "closed" : "unknown";
}

function deriveRealtimeMarkerState(row,clock) {
  var businessStatus=String(
    row && (row.google_business_status || row.estado_negocio) || ""
  ).trim().toUpperCase();

  if (
    businessStatus==="CLOSED_PERMANENTLY" ||
    businessStatus==="CLOSED_TEMPORARILY"
  ) return {state:"closed",source:"business-status"};

  var barliveSchedule=weeklyScheduleFromBarLive(
    row && row.horarios_completos
  );
  var state=markerStateFromWeeklySchedule(barliveSchedule,clock);
  if (state!=="unknown") {
    return {state:state,source:"barlive-schedule"};
  }

  var osmSchedule=weeklyScheduleFromOsm(
    row && row.osm_opening_hours
  );
  state=markerStateFromWeeklySchedule(osmSchedule,clock);
  if (state!=="unknown") {
    return {state:state,source:"osm-opening-hours"};
  }

  return {state:"unknown",source:"none"};
}

function applyRealtimeScheduleStates(rows) {
  var clock=madridClockParts();
  var knownStates=0;
  var barliveStates=0;
  var osmStates=0;
  var businessStates=0;

  var merged=(Array.isArray(rows)?rows:[]).map(function(row) {
    if (!row || typeof row!=="object") return row;
    var result=deriveRealtimeMarkerState(row,clock);

    if (result.state!=="unknown") knownStates+=1;
    if (result.source==="barlive-schedule") barliveStates+=1;
    else if (result.source==="osm-opening-hours") osmStates+=1;
    else if (result.source==="business-status") businessStates+=1;

    return Object.assign({},row,{estado:result.state});
  });

  return {
    rows:merged,
    knownStates:knownStates,
    barliveStates:barliveStates,
    osmStates:osmStates,
    businessStates:businessStates
  };
}
\`;

  if (!bundle.includes(markerAnchor)) {
    throw new Error('normalizeMarkerState anchor missing');
  }
  bundle = bundle.replace(markerAnchor, markerAnchor + helpers);

  const oldSelect =
    '"?select=id,latitud,longitud,barlive_type,barlive_types,destacado" +';
  const newSelect =
    '"?select=id,latitud,longitud,barlive_type,barlive_types,destacado,horarios_completos,google_business_status,osm_opening_hours:osm_tags->>opening_hours" +';
  if (!bundle.includes(oldSelect)) throw new Error('venue select anchor missing');
  bundle = bundle.replace(oldSelect, newSelect);

  const stateUrlStart = bundle.indexOf('function buildStateDataUrl(bounds,offset) {');
  const stateUrlEnd = bundle.indexOf('\n}\n\nfunction fetchDataPage', stateUrlStart);
  if (stateUrlStart < 0 || stateUrlEnd < 0) {
    throw new Error('buildStateDataUrl block missing');
  }
  bundle =
    bundle.slice(0, stateUrlStart) +
    bundle.slice(stateUrlEnd + 3);

  const mergeStart = bundle.indexOf(
    'function mergeCatalogueWithStates(venueRows,stateRows) {'
  );
  const requestStart = bundle.indexOf(
    'async function requestCanonicalViewport(force,reason) {',
    mergeStart
  );
  if (mergeStart < 0 || requestStart < 0) {
    throw new Error('canonical state join block missing');
  }

  const replacement = String.raw\`async function fetchCanonicalRows(bounds,generation,controller) {
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
}

async function refreshCanonicalStates() {
  if (
    !map ||
    !map.getSource(VENUE_SOURCE) ||
    !activeCoverage ||
    !Array.isArray(activeRows) ||
    !activeRows.length
  ) return;

  if (viewportRequestInFlight) {
    console.log(
      "[MAP_RENDER][STATE_REFRESH_SKIPPED] reason=viewport-in-flight"+
      " generation="+requestGeneration
    );
    return;
  }

  var coverage=activeCoverage;
  var generation=++requestGeneration;
  lastRequestReason="state-refresh-local";

  var realtime=applyRealtimeScheduleStates(activeRows);

  console.log(
    "[MAP_RENDER][STATE_REFRESH_LOCAL] generation="+generation+
    " knownStates="+realtime.knownStates+
    " barlive="+realtime.barliveStates+
    " osm="+realtime.osmStates+
    " business="+realtime.businessStates
  );

  commitVenueRows(
    realtime.rows,
    coverage,
    generation,
    "state-refresh-local"
  );
}

\`;

  bundle =
    bundle.slice(0, mergeStart) +
    replacement +
    bundle.slice(requestStart);

  if (bundle.includes('map_marker_state_cache')) {
    throw new Error('sparse state cache reference still present');
  }
  if (
    !bundle.includes('applyRealtimeScheduleStates') ||
    !bundle.includes('osm_opening_hours:osm_tags->>opening_hours') ||
    !bundle.includes('[MAP_RENDER][STATE_REFRESH_LOCAL]')
  ) {
    throw new Error('schedule-state markers missing after patch');
  }

  fs.writeFileSync(bundlePath, bundle);
} else {
  console.log('Schedule-state patch already present.');
}

for (const pagePath of [
  'index.html',
  '404.html',
  'explorar/index.html',
  'explorar/mapa/index.html',
  'detalle/local/index.html'
]) {
  if (!fs.existsSync(pagePath)) continue;
  let html = fs.readFileSync(pagePath, 'utf8');
  html = html.replaceAll(oldMarker, newMarker);
  html = html.replaceAll(oldVersion, newVersion);
  html = html.replaceAll('/sw.js?v=15', '/sw.js?v=16');
  fs.writeFileSync(pagePath, html);
}

if (fs.existsSync('sw.js')) {
  let sw = fs.readFileSync('sw.js', 'utf8');
  sw = sw.replace(
    'BarLive neutral service worker v15.',
    'BarLive neutral service worker v16.'
  );
  fs.writeFileSync('sw.js', sw);
}

console.log('Production schedule-state patch prepared.');
