// BarLive compiled production service worker v7 - 2026-09-25.
// Serves the real Barlive-2 bundle and applies only transport-level production fixes.
const APP_BUNDLE_PATH='/_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
const BUNDLE_CACHE='barlive-compiled-bundle-v7';
const STATE_RESPONSE_CACHE='barlive-marker-state-v7';
const STATE_RESPONSE_KEY='/__barlive/state-overlay-v7';
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
    apikey:SUPABASE_ANON_JWT,
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
