// BarLive compiled production service worker v11 - 2026-09-25.
// Serves the real Barlive-2 bundle and applies only transport-level production fixes.
const APP_BUNDLE_PATH='/_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
const BUNDLE_CACHE='barlive-compiled-bundle-v11';
const STATE_RESPONSE_CACHE='barlive-marker-state-v11';
const STATE_RESPONSE_KEY='/__barlive/state-overlay-v11';
const STATE_FALLBACK_MAX_AGE_MS=10*60*1000;
const SUPABASE_ORIGIN='https://embntaqwlwmgazvrglaf.supabase.co';
const STATE_OVERLAY_PATH='/functions/v1/map-state-overlay';
const BRAND_SVG='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22168%22 height=%2248%22 viewBox=%220 0 168 48%22%3E%3Crect x=%220%22 y=%224%22 width=%2240%22 height=%2240%22 rx=%2212%22 fill=%22%23641B73%22/%3E%3Ctext x=%2220%22 y=%2231%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-size=%2223%22 font-weight=%22900%22 fill=%22white%22%3EB%3C/text%3E%3Ctext x=%2252%22 y=%2231%22 font-family=%22Arial,sans-serif%22 font-size=%2224%22 font-weight=%22800%22 fill=%22%23641B73%22%3EBarLive%3C/text%3E%3C/svg%3E';

self.addEventListener('install',()=>self.skipWaiting());

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>!([BUNDLE_CACHE,STATE_RESPONSE_CACHE].includes(k))&&(k.startsWith('workbox-precache')||k.startsWith('barlive-'))).map(k=>caches.delete(k)));
  await self.clients.claim();
  const windows=await self.clients.matchAll({type:'window'});
  await Promise.all(windows.map(client=>client.navigate(client.url)));
})()));

function patchCurrentSourceDelta(code){
  // UI/navigation: source-equivalent changes after production commit 3f7bcc98.
  code=code.replace(/label:'Momentos',route:'\/\(tabs\)\/social'/g,"label:'Social',route:'/(tabs)/social'");
  code=code.replace("Inicia sesi\\xf3n para ver tus mensajes","Para ver tus mensajes debes iniciar sesi\\xf3n");

  // Keep the main map attribution compact instead of a permanent banner.
  const attributionNeedle='attributionControl: true';
  let first=code.indexOf(attributionNeedle);
  let second=first>=0?code.indexOf(attributionNeedle,first+attributionNeedle.length):-1;
  if(second>=0){
    code=code.slice(0,second)+'attributionControl: false'+code.slice(second+attributionNeedle.length);
    const baseMarker='var baseStyleFallbackApplied = false;';
    const basePos=code.indexOf(baseMarker,second);
    if(basePos>=0&&!code.includes('Compact attribution unavailable')){
      const compact="try {\\n  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');\\n} catch (attributionError) {\\n  console.warn('MAPA Compact attribution unavailable:', attributionError);\\n}\\n\\n";
      code=code.slice(0,basePos)+compact+code.slice(basePos);
    }
  }

  // Production must never download/process the Spain-wide state overlay on
  // first paint. Replace the compiled loader with a viewport-only REST query.
  // Static geometry remains instant; once geolocation moves the map to z>=9,
  // only the visible/padded area is fetched and coloured.
  const overlayAnchor='window.loadRealtimeMarkerOverlay = function()';
  const overlayPos=code.indexOf(overlayAnchor);
  if(overlayPos>=0){
    const firstCall='window.loadRealtimeMarkerOverlay();';
    const firstCallPos=code.indexOf(firstCall,overlayPos);
    if(firstCallPos>overlayPos){
      const viewportLoader=[
        "window.realtimeOverlayAbortController = null;",
        "window.realtimeOverlayMoveTimer = null;",
        "window.realtimeOverlayRetryTimer = null;",
        "window.realtimeOverlayRetryAttempt = 0;",
        "window.realtimeOverlayReady = false;",
        "window.realtimeOverlayAuthoritative = false;",
        "window.realtimeOverlayCoverage = null;",
        "window.realtimeOverlayRequestSeq = 0;",
        "window.realtimeOverlayCacheKey = 'barlive-map-realtime-viewport-v11';",
        "window.setBarliveLayerVisibility = function(id, visible) {",
        "  if (!map.getLayer(id)) return;",
        "  var target = visible ? 'visible' : 'none';",
        "  if (map.getLayoutProperty(id, 'visibility') !== target) map.setLayoutProperty(id, 'visibility', target);",
        "};",
        "window.applyRealtimeAuthority = function(active) {",
        "  window.realtimeOverlayAuthoritative = !!active;",
        "  var realtimeIds = ['barlive-realtime-markers','barlive-realtime-icons'];",
        "  var competingIds = [",
        "    'barlive-static-markers','barlive-static-icons','barlive-static-labels',",
        "    'barlive-emergency-markers',",
        "    'barlive-tile-markers','barlive-tile-icons','barlive-tile-labels',",
        "    'locales-live-halo','locales-upcoming-halo','locales-promo-halo',",
        "    'locales-layer','locales-icons','locales-labels'",
        "  ];",
        "  realtimeIds.forEach(function(id) { window.setBarliveLayerVisibility(id, !!active); });",
        "  if (active) {",
        "    competingIds.forEach(function(id) { window.setBarliveLayerVisibility(id, false); });",
        "  } else {",
        "    if (typeof window.updateVenueLayerVisibility === 'function') {",
        "      try { window.__barliveCallingOriginalVisibility = true; window.__barliveOriginalUpdateVisibility(); } catch (_) {} finally { window.__barliveCallingOriginalVisibility = false; }",
        "    }",
        "    realtimeIds.forEach(function(id) { window.setBarliveLayerVisibility(id, false); });",
        "  }",
        "};",
        "if (!window.__barliveOriginalUpdateVisibility && typeof window.updateVenueLayerVisibility === 'function') {",
        "  window.__barliveOriginalUpdateVisibility = window.updateVenueLayerVisibility;",
        "  window.updateVenueLayerVisibility = function() {",
        "    if (!window.__barliveCallingOriginalVisibility) window.__barliveOriginalUpdateVisibility.apply(this, arguments);",
        "    if (window.realtimeOverlayAuthoritative) window.applyRealtimeAuthority(true);",
        "  };",
        "}",
        "window.applyRealtimeFilters = function() {",
        "  var category = (window.filtros && window.filtros.cat) || 'todas';",
        "  if (category === 'cafe') category = 'cafeteria';",
        "  var expression = ['all'];",
        "  if (category !== 'todas') expression.push(['==', ['get', 'tipo'], category]);",
        "  if (window.filtros && window.filtros.estado === 'no_cerrados') expression.push(['==', ['get', 'estado'], 'abierto']);",
        "  ['barlive-realtime-markers','barlive-realtime-icons'].forEach(function(id) { if (map.getLayer(id)) map.setFilter(id, expression); });",
        "};",
        "if (!window.__barliveOriginalApplyVectorFilters && typeof window.applyVectorTileFilters === 'function') {",
        "  window.__barliveOriginalApplyVectorFilters = window.applyVectorTileFilters;",
        "  window.applyVectorTileFilters = function() {",
        "    window.__barliveOriginalApplyVectorFilters.apply(this, arguments);",
        "    window.applyRealtimeFilters();",
        "    if (window.realtimeOverlayAuthoritative) window.applyRealtimeAuthority(true);",
        "  };",
        "}",
        "window.realtimeBoundsContain = function(coverage, bounds) {",
        "  if (!coverage || !bounds) return false;",
        "  var e = 0.00001;",
        "  return Number(bounds.getSouth()) >= Number(coverage.south)-e && Number(bounds.getWest()) >= Number(coverage.west)-e && Number(bounds.getNorth()) <= Number(coverage.north)+e && Number(bounds.getEast()) <= Number(coverage.east)+e;",
        "};",
        "window.buildRealtimeFeatures = function(rows) {",
        "  if (!Array.isArray(rows)) return [];",
        "  var seen = {};",
        "  return rows.map(function(row) {",
        "    if (!row || typeof row !== 'object') return null;",
        "    var lat = Number(row.latitud);",
        "    var lon = Number(row.longitud);",
        "    var id = String(row.local_id || '');",
        "    if (!id || seen[id] || !isFinite(lat) || !isFinite(lon)) return null;",
        "    seen[id] = true;",
        "    var rawState = row.estado;",
        "    var normalizedState = String(rawState == null ? '' : rawState).trim().toLowerCase();",
        "    var numericState = Number(rawState);",
        "    var estado = normalizedState === 'abierto' || numericState === 1 ? 'abierto' : normalizedState === 'cerrado' || numericState === 2 ? 'cerrado' : 'sin_info';",
        "    return { type:'Feature', id:id, geometry:{type:'Point',coordinates:[lon,lat]}, properties:{id:id,tipo:String(row.tipo||'bar'),destacado:row.destacado===true||Number(row.destacado||0)===1,estado:estado} };",
        "  }).filter(Boolean);",
        "};",
        "window.commitRealtimeViewport = function(rows, coverage, sourceLabel) {",
        "  var features = window.buildRealtimeFeatures(rows);",
        "  if (!features.length) return false;",
        "  var source = map.getSource('barlive-realtime-overlay');",
        "  if (!source) return false;",
        "  source.setData({type:'FeatureCollection',features:features});",
        "  window.realtimeOverlayCoverage = coverage || null;",
        "  window.realtimeOverlayReady = true;",
        "  window.realtimeOverlayRetryAttempt = 0;",
        "  window.applyRealtimeFilters();",
        "  window.applyRealtimeAuthority(true);",
        "  try { localStorage.setItem(window.realtimeOverlayCacheKey, JSON.stringify({savedAt:Date.now(),coverage:coverage||null,rows:rows})); } catch (_) {}",
        "  try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'map_realtime_overlay_ready',count:features.length,source:sourceLabel||'network',mode:'single-authority-v11'})); } catch (_) {}",
        "  return true;",
        "};",
        "window.restoreRealtimeViewportCache = function() {",
        "  try {",
        "    var raw = localStorage.getItem(window.realtimeOverlayCacheKey);",
        "    if (!raw) return false;",
        "    var payload = JSON.parse(raw);",
        "    if (!payload || !Array.isArray(payload.rows) || !payload.rows.length || !payload.coverage || Date.now()-Number(payload.savedAt||0)>600000) return false;",
        "    if (!window.realtimeBoundsContain(payload.coverage,map.getBounds())) return false;",
        "    return window.commitRealtimeViewport(payload.rows,payload.coverage,'local-cache');",
        "  } catch (_) { return false; }",
        "};",
        "window.scheduleRealtimeOverlayRetry = function() {",
        "  if (window.realtimeOverlayRetryTimer) return;",
        "  var delays=[250,600,1200,2500,5000,10000,15000];",
        "  var attempt=Math.min(6,Number(window.realtimeOverlayRetryAttempt||0));",
        "  var delay=delays[attempt]||15000;",
        "  window.realtimeOverlayRetryAttempt=attempt+1;",
        "  window.realtimeOverlayRetryTimer=setTimeout(function(){window.realtimeOverlayRetryTimer=null;window.loadRealtimeMarkerOverlay(true);},delay);",
        "};",
        "window.loadRealtimeMarkerOverlay = function(force) {",
        "  var zoom = Number(map.getZoom() || 0);",
        "  if (zoom < 9) { window.applyRealtimeAuthority(false); return; }",
        "  var bounds = map.getBounds();",
        "  if (!force && window.realtimeOverlayReady && window.realtimeBoundsContain(window.realtimeOverlayCoverage,bounds)) { window.applyRealtimeAuthority(true); return; }",
        "  if (!window.realtimeOverlayReady) window.restoreRealtimeViewportCache();",
        "  if (!window.realtimeBoundsContain(window.realtimeOverlayCoverage,bounds)) window.applyRealtimeAuthority(false);",
        "  var south=Number(bounds.getSouth()),west=Number(bounds.getWest()),north=Number(bounds.getNorth()),east=Number(bounds.getEast());",
        "  var latPad=Math.max(0.02,(north-south)*0.55),lonPad=Math.max(0.02,(east-west)*0.55);",
        "  south=Math.max(27.45,south-latPad); north=Math.min(44.25,north+latPad); west=Math.max(-18.25,west-lonPad); east=Math.min(4.55,east+lonPad);",
        "  var coverage={south:south,west:west,north:north,east:east};",
        "  var query='"+SUPABASE_ORIGIN+"/rest/v1/map_marker_state_cache?select=local_id,latitud,longitud,tipo,destacado,estado' +",
        "    '&latitud=gte.'+encodeURIComponent(south.toFixed(6))+'&latitud=lte.'+encodeURIComponent(north.toFixed(6))+'&longitud=gte.'+encodeURIComponent(west.toFixed(6))+'&longitud=lte.'+encodeURIComponent(east.toFixed(6))+'&limit=10000';",
        "  if (window.realtimeOverlayAbortController) { try { window.realtimeOverlayAbortController.abort(); } catch (_) {} }",
        "  var controller=new AbortController(); window.realtimeOverlayAbortController=controller;",
        "  var seq=++window.realtimeOverlayRequestSeq; var startedAt=Date.now();",
        "  fetch(query,{headers:{Accept:'application/json',apikey:'"+SUPABASE_PUBLIC_KEY+"',Authorization:'Bearer "+SUPABASE_ANON_JWT+"'},cache:'no-store',signal:controller.signal})",
        "    .then(function(response){if(!response.ok)throw new Error('HTTP '+response.status);return response.json();})",
        "    .then(function(rows){",
        "      if(controller.signal.aborted||seq!==window.realtimeOverlayRequestSeq)return;",
        "      if(!Array.isArray(rows))throw new Error('Viewport state payload is not an array');",
        "      if(!rows.length){",
        "        var staticCount=0; try { staticCount=(map.querySourceFeatures('barlive-static-tiles',{sourceLayer:'locales'})||[]).length; } catch (_) {}",
        "        if(staticCount>0)throw new Error('State cache empty while static markers exist');",
        "        return;",
        "      }",
        "      if(window.commitRealtimeViewport(rows,coverage,'network')){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'map_realtime_overlay_timing',milliseconds:Date.now()-startedAt,count:rows.length}));}catch(_){}}",
        "    })",
        "    .catch(function(error){",
        "      if(error&&error.name==='AbortError')return;",
        "      console.warn('MAPA viewport state failed',error);",
        "      if(!window.realtimeOverlayReady)window.applyRealtimeAuthority(false);",
        "      window.scheduleRealtimeOverlayRetry();",
        "    });",
        "};",
        "window.scheduleRealtimeMarkerOverlay = function(){",
        "  if(window.realtimeOverlayMoveTimer)clearTimeout(window.realtimeOverlayMoveTimer);",
        "  window.realtimeOverlayMoveTimer=setTimeout(function(){window.realtimeOverlayMoveTimer=null;window.loadRealtimeMarkerOverlay(false);},75);",
        "};",
        "map.on('moveend',window.scheduleRealtimeMarkerOverlay);",
        "map.on('zoomend',window.scheduleRealtimeMarkerOverlay);",
        ""
      ].join('\\n');
      code=code.slice(0,overlayPos)+viewportLoader+code.slice(firstCallPos);
    }
  }

  // Unknown state must stay grey. Only known open/closed states paint the realtime overlay.
  const oldState="estado: Number(row[5] || 0) === 1 ? 'abierto' : 'cerrado'";
  let statePos=-1;
  while((statePos=code.indexOf(oldState,statePos+1))>=0){
    const precursor="if (!isFinite(lat) || !isFinite(lon)) return null;\\n            return {";
    const prePos=code.lastIndexOf(precursor,statePos);
    if(prePos>=0){
      const block="if (!isFinite(lat) || !isFinite(lon)) return null;\\n            var rawState = row[5];\\n            var normalizedState = String(rawState == null ? '' : rawState).trim().toLowerCase();\\n            var numericState = Number(rawState);\\n            var estado = normalizedState === 'abierto' || numericState === 1 ? 'abierto' : normalizedState === 'cerrado' || numericState === 2 ? 'cerrado' : 'sin_info';\\n            if (estado === 'sin_info') return null;\\n            return {";
      code=code.slice(0,prePos)+block+code.slice(prePos+precursor.length);
      statePos=code.indexOf(oldState,prePos);
    }
    if(statePos>=0){
      code=code.slice(0,statePos)+'estado: estado'+code.slice(statePos+oldState.length);
    }
  }
  return code;
}

async function servePatchedBundle(request){
  const cache=await caches.open(BUNDLE_CACHE);
  const hit=await cache.match(request);
  if(hit)return hit;

  const response=await fetch(request,{cache:'no-store'});
  if(!response.ok)return response;

  let code=await response.text();
  code=patchCurrentSourceDelta(code);
  code=code.replace(/cache: 'default'/g,"cache: 'no-store'");
  code=code.replace("src:A.BARLIVE_LOGO_DATA_URI,alt:'BarLive'","src:"+JSON.stringify(BRAND_SVG)+",alt:'BarLive'");

  const headers=new Headers(response.headers);
  headers.set('Content-Type','application/javascript; charset=utf-8');
  headers.set('Cache-Control','public, max-age=31536000, immutable');
  const patched=new Response(code,{status:200,statusText:'OK',headers});
  await cache.put(request,patched.clone());
  return patched;
}

const SUPABASE_PUBLIC_KEY='sb_publishable_ffrXoLqKentwGrBXq3ZTDg_WxsX2y_2';
const SUPABASE_ANON_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI';
const STATE_CACHE_URL=SUPABASE_ORIGIN+'/rest/v1/map_marker_state_cache?select=local_id,latitud,longitud,tipo,destacado,estado';

function compactKnownStateRows(rows){
  if(!Array.isArray(rows))return [];
  return rows.map(row=>{
    if(Array.isArray(row)){
      if(row.length<6)return null;
      const raw=row[5];
      const text=String(raw==null?'':raw).trim().toLowerCase();
      const numeric=Number(raw);
      const state=text==='abierto'||numeric===1?1:text==='cerrado'||numeric===2?2:0;
      if(!state)return null;
      return [row[0],row[1],row[2],row[3]||'bar',Number(row[4]||0)===1?1:0,state];
    }
    if(!row||typeof row!=='object')return null;
    const raw=row.estado!=null?row.estado:row.estado_actual;
    const text=String(raw==null?'':raw).trim().toLowerCase();
    const numeric=Number(raw);
    const state=text==='abierto'||numeric===1?1:text==='cerrado'||numeric===2?2:0;
    const lat=Number(row.latitud!=null?row.latitud:row.lat);
    const lon=Number(row.longitud!=null?row.longitud:(row.lng!=null?row.lng:row.lon));
    const id=row.local_id||row.id;
    if(!id||!Number.isFinite(lat)||!Number.isFinite(lon)||!state)return null;
    return [id,lat,lon,row.tipo||row.barlive_type||'bar',row.destacado===true||Number(row.destacado||0)===1?1:0,state];
  }).filter(Boolean);
}

async function stateJsonResponse(rows,source){
  const response=new Response(JSON.stringify({rows,source}),{
    status:200,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-BarLive-State-Saved-At':String(Date.now())
    }
  });
  try{
    const cache=await caches.open(STATE_RESPONSE_CACHE);
    await cache.put(new Request(self.location.origin+STATE_RESPONSE_KEY),response.clone());
  }catch(_){}
  return response;
}

async function rememberedStateResponse(){
  try{
    const cache=await caches.open(STATE_RESPONSE_CACHE);
    const response=await cache.match(new Request(self.location.origin+STATE_RESPONSE_KEY));
    if(!response)return null;
    const savedAt=Number(response.headers.get('X-BarLive-State-Saved-At')||0);
    if(!savedAt||Date.now()-savedAt>STATE_FALLBACK_MAX_AGE_MS)return null;
    const payload=await response.clone().json();
    const rows=compactKnownStateRows(payload&&payload.rows);
    if(!rows.length)return null;
    return new Response(JSON.stringify({rows,source:'recent-good-cache'}),{
      status:200,
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store'
      }
    });
  }catch(_){
    return null;
  }
}

function stateAuthHeaders(){
  return {
    Accept:'application/json',
    apikey:SUPABASE_PUBLIC_KEY,
    Authorization:'Bearer '+SUPABASE_ANON_JWT
  };
}

async function freshStateOverlay(originalRequest){
  let edgeError=null;

  try{
    const originalUrl=new URL(originalRequest.url);
    originalUrl.searchParams.set('slot',String(Math.floor(Date.now()/60000)));
    const edgeResponse=await fetch(originalUrl.toString(),{
      headers:stateAuthHeaders(),
      cache:'no-store'
    });

    if(edgeResponse.ok){
      try{
        const edgePayload=await edgeResponse.clone().json();
        const edgeRows=Array.isArray(edgePayload)
          ? edgePayload
          : (edgePayload&&Array.isArray(edgePayload.rows)?edgePayload.rows:[]);
        const compact=compactKnownStateRows(edgeRows);
        if(compact.length)return stateJsonResponse(compact,'edge-overlay');
        edgeError=new Error('edge overlay returned no known states');
      }catch(parseError){
        edgeError=parseError;
      }
    }else{
      edgeError=new Error('edge overlay HTTP '+edgeResponse.status);
    }
  }catch(error){
    edgeError=error;
  }

  try{
    const cacheResponse=await fetch(STATE_CACHE_URL,{
      headers:stateAuthHeaders(),
      cache:'no-store'
    });
    if(!cacheResponse.ok)throw new Error('state cache HTTP '+cacheResponse.status);
    const cacheRows=compactKnownStateRows(await cacheResponse.json());
    if(!cacheRows.length)throw new Error('state cache returned no known states');
    return stateJsonResponse(cacheRows,'rest-cache');
  }catch(cacheError){
    console.warn('[BarLive SW] marker state unavailable',edgeError,cacheError);
    const remembered=await rememberedStateResponse();
    if(remembered)return remembered;
    return fetch(originalRequest);
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  try{
    const url=new URL(event.request.url);
    if(url.origin===self.location.origin&&url.pathname===APP_BUNDLE_PATH){
      event.respondWith(servePatchedBundle(event.request));
      return;
    }
    if(url.origin===SUPABASE_ORIGIN&&url.pathname===STATE_OVERLAY_PATH){
      event.respondWith(freshStateOverlay(event.request));
    }
  }catch(_){}
});
