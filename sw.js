// BarLive compiled production service worker v5 - 2026-09-25.
// Serves the real Barlive-2 bundle and applies only transport-level production fixes.
const APP_BUNDLE_PATH='/_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
const BUNDLE_CACHE='barlive-compiled-bundle-v5';
const SUPABASE_ORIGIN='https://embntaqwlwmgazvrglaf.supabase.co';
const STATE_OVERLAY_PATH='/functions/v1/map-state-overlay';
const BRAND_SVG='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22168%22 height=%2248%22 viewBox=%220 0 168 48%22%3E%3Crect x=%220%22 y=%224%22 width=%2240%22 height=%2240%22 rx=%2212%22 fill=%22%23641B73%22/%3E%3Ctext x=%2220%22 y=%2231%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-size=%2223%22 font-weight=%22900%22 fill=%22white%22%3EB%3C/text%3E%3Ctext x=%2252%22 y=%2231%22 font-family=%22Arial,sans-serif%22 font-size=%2224%22 font-weight=%22800%22 fill=%22%23641B73%22%3EBarLive%3C/text%3E%3C/svg%3E';

self.addEventListener('install',()=>self.skipWaiting());

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==BUNDLE_CACHE&&(k.startsWith('workbox-precache')||k.startsWith('barlive-'))).map(k=>caches.delete(k)));
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

async function freshStateOverlay(originalRequest){
  try{
    const originalUrl=new URL(originalRequest.url);
    originalUrl.searchParams.set('slot',String(Math.floor(Date.now()/60000)));
    return await fetch(originalUrl.toString(),{
      headers:{Accept:'application/json'},
      cache:'no-store'
    });
  }catch(_){
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
