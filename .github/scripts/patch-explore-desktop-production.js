const fs = require('fs');
const path = require('path');

const siteRoot = process.argv[2];
if (!siteRoot) throw new Error('Usage: node patch-explore-desktop-production.js <site-root>');

const jsDir = path.join(siteRoot, '_expo', 'static', 'js', 'web');
const entryFiles = fs.readdirSync(jsDir).filter((name) => /^entry-.*\.js$/.test(name));
if (!entryFiles.length) throw new Error('Production entry bundle not found');

const sourceEntry = entryFiles
  .filter((name) => !name.includes('explore-fixed-20260926'))
  .map((name) => ({ name, stat: fs.statSync(path.join(jsDir, name)) }))
  .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0].name;

const sourcePath = path.join(jsDir, sourceEntry);
let code = fs.readFileSync(sourcePath, 'utf8');

// TanStack Query: maxPages=0 means unlimited. Remove the old 50-page / 1,000-venue cap
// so the nearby feed can continue for as long as the backend has rows.
const maxPagesMatches = code.match(/maxPages:50/g) || [];
if (maxPagesMatches.length > 1) {
  throw new Error('Unexpected multiple maxPages:50 occurrences: ' + maxPagesMatches.length);
}
if (maxPagesMatches.length === 1) {
  code = code.replace('maxPages:50', 'maxPages:0');
}

function moduleRange(id) {
  const marker = '},' + id + ',';
  const markerPos = code.indexOf(marker);
  if (markerPos < 0) throw new Error('Module ' + id + ' marker not found');
  const start = code.lastIndexOf('__d(function', markerPos);
  if (start < 0) throw new Error('Module ' + id + ' start not found');
  const end = code.indexOf(');', markerPos);
  if (end < 0) throw new Error('Module ' + id + ' end not found');
  return { start, end: end + 2, text: code.slice(start, end + 2) };
}

function replaceOnce(text, oldValue, newValue, label) {
  const first = text.indexOf(oldValue);
  const last = text.lastIndexOf(oldValue);
  if (first < 0 || first !== last) {
    throw new Error(label + ': expected exactly 1 match');
  }
  return text.slice(0, first) + newValue + text.slice(first + oldValue.length);
}

function replaceModule(id, mutate) {
  const range = moduleRange(id);
  const next = mutate(range.text);
  code = code.slice(0, range.start) + next + code.slice(range.end);
}

replaceModule(1252, (desktop) => {
  desktop = replaceOnce(
    desktop,
    "const Q=(0,x.useRouter)(),[U,J]=(0,t.useState)([]),[K,Y]=(0,t.useState)(!0),[Z,$]=(0,t.useState)(!1);",
    "const Q=(0,x.useRouter)(),[U,J]=(0,t.useState)([]),[K,Y]=(0,t.useState)(!0),[Z,$]=(0,t.useState)(null),[tt,nt]=(0,t.useState)(0),rt=(0,t.useRef)(null),it=(0,t.useRef)(!1);",
    'desktop state'
  );

  desktop = replaceOnce(
    desktop,
    "te=(0,t.useMemo)(()=>e.filter(e=>e?.id&&e.id!==ee?.id).slice(0,Z?12:3),[e,ee?.id,Z]),oe=w(ee),re=e=>{e?.id&&Q.push('/detalle/local?id='+e.id)},ie=e=>{const t=e?.latitud??e?.coordenadas?.lat,o=e?.longitud??e?.coordenadas?.lng;t&&o?Q.push({pathname:'/(tabs)/explorar/mapa',params:{lat:String(t),lng:String(o)}}):O()};return",
    "te=(0,t.useMemo)(()=>Array.from(new Map(e.filter(e=>e?.id).map(e=>[String(e.id),e])).values()),[e]),oe=w(ee),re=e=>{e?.id&&Q.push('/detalle/local?id='+e.id)},ie=e=>{e?.id&&($(e),nt(t=>t+1))},se=(0,t.useCallback)(e=>{const n=e?.nativeEvent||{},a=Number(n?.contentOffset?.y||0),o=Number(n?.layoutMeasurement?.height||0),l=Number(n?.contentSize?.height||0);try{window.sessionStorage.setItem('barlive:explore:nearby-scroll',String(a))}catch(e){}const s=l-(a+o),c=Math.max(560,1.35*o);l>0&&s<=c&&G&&!q&&X?.()},[G,q,X]);(0,t.useEffect)(()=>{if(it.current||!te.length)return;let e=0;try{e=Number(window.sessionStorage.getItem('barlive:explore:nearby-scroll')||0)}catch(e){}if(Number.isFinite(e)&&e>0)setTimeout(()=>{rt.current?.scrollTo?.({y:e,animated:!1}),it.current=!0},80);else it.current=!0},[te.length]);return",
    'desktop data/actions'
  );

  desktop = replaceOnce(
    desktop,
    "(0,C.jsx)(s.default,{style:R.bodyScroll,contentContainerStyle:R.bodyContent,showsVerticalScrollIndicator:!0,children:",
    "(0,C.jsx)(y.default,{style:R.bodyContent,children:",
    'desktop outer fixed body'
  );

  const headerToggleStart = desktop.indexOf("(0,C.jsx)(h.default,{onPress:()=>$(e=>!e),activeOpacity:.75,children:(0,C.jsx)(u.default,{style:R.sectionLink,children:Z?");
  if (headerToggleStart < 0) throw new Error('nearby header toggle start not found');
  const headerToggleEnd = desktop.indexOf("})})", headerToggleStart);
  if (headerToggleEnd < 0) throw new Error('nearby header toggle end not found');
  desktop =
    desktop.slice(0, headerToggleStart) +
    "(0,C.jsx)(u.default,{style:R.sectionLink,children:'Desplázate para ver más'})" +
    desktop.slice(headerToggleEnd + 4);

  const listStart = desktop.indexOf("V&&0===e.length?");
  const listEnd = desktop.indexOf("]}),(0,C.jsxs)(y.default,{style:R.rightColumn", listStart);
  if (listStart < 0 || listEnd < 0) throw new Error('Desktop nearby list boundaries not found');

  const listReplacement = '(0,C.jsxs)(s.default,{ref:rt,style:R.nearbyScroll,contentContainerStyle:R.nearbyScrollContent,showsVerticalScrollIndicator:!0,scrollEventThrottle:32,onScroll:se,children:[V&&0===e.length?(0,C.jsxs)(y.default,{style:R.loadingBlock,children:[(0,C.jsx)(o.default,{color:"#14B8A6"}),(0,C.jsx)(u.default,{style:R.loadingText,children:"Cargando locales cercanos..."})]}):(0,C.jsx)(y.default,{style:R.nearbyGrid,children:te.map(e=>{const t=w(e),o=I(e),n=(e?.barlive_types||[e?.barlive_type]).filter(Boolean).slice(0,3);return(0,C.jsxs)(l.default,{style:[R.venueCard,Z?.id===e.id&&R.venueCardSelected],onPress:()=>ie(e),children:[(0,C.jsxs)(y.default,{style:R.venueImageWrap,children:[t?(0,C.jsx)(a.default,{source:{uri:t},style:R.venueImage,resizeMode:"cover"}):(0,C.jsx)(A,{}),(0,C.jsx)(h.default,{style:R.venueHeart,onPress:a=>{a?.stopPropagation?.(),re(e)},activeOpacity:.78,children:(0,C.jsx)(b.IconSymbol,{ios_icon_name:"heart",android_material_icon_name:"favorite_border",size:20,color:"#FFFFFF"})})]}),(0,C.jsxs)(y.default,{style:R.venueBody,children:[(0,C.jsxs)(y.default,{style:R.venueTypePill,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:"fork.knife",android_material_icon_name:"restaurant",size:12,color:"#0F766E"}),(0,C.jsx)(u.default,{style:R.venueTypePillText,children:T(e)})]}),(0,C.jsx)(u.default,{style:R.venueName,numberOfLines:1,children:e.nombre}),(0,C.jsxs)(y.default,{style:R.venueMetaRow,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:"location.fill",android_material_icon_name:"location_on",size:13,color:"#64748B"}),(0,C.jsx)(u.default,{style:R.venueMeta,numberOfLines:1,children:B(e)||e.direccion||"Cerca de ti"})]}),(0,C.jsx)(u.default,{style:R.venueDescription,numberOfLines:2,children:e.descripcion||"Descubre su ambiente, sus eventos y todo lo que ofrece este local."}),n.length?(0,C.jsx)(y.default,{style:R.tagRow,children:n.map(e=>(0,C.jsx)(y.default,{style:R.smallTag,children:(0,C.jsx)(u.default,{style:R.smallTagText,children:String(e).replace(/_/g," ")})},String(e)))}):null,(0,C.jsxs)(h.default,{style:R.directionsButton,onPress:a=>{a?.stopPropagation?.(),re(e)},activeOpacity:.8,children:[(0,C.jsxs)(y.default,{style:R.directionLabelWrap,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:"arrow.right",android_material_icon_name:"arrow_forward",size:15,color:"#FFFFFF"}),(0,C.jsx)(u.default,{style:R.directionsText,children:"Ver local"})]}),null!==o?(0,C.jsx)(u.default,{style:R.distanceText,children:z(o)}):null]})]})]},e.id)})}),q?(0,C.jsx)(y.default,{style:R.listFooterLoading,children:(0,C.jsx)(o.default,{color:"#0F766E",size:"small"})}):null]})';

  desktop = desktop.slice(0, listStart) + listReplacement + desktop.slice(listEnd);

  desktop = replaceOnce(
    desktop,
    "(0,C.jsx)(y.default,{style:R.mapPreview,children:(0,C.jsx)(v.default,{center:N,selectedCategory:j,onVenuePress:e=>Q.push('/detalle/local?id='+e)})})",
    "(0,C.jsx)(y.default,{style:R.mapPreview,children:(0,C.jsx)(v.default,{embedded:!0,embeddedCenter:{lat:N.latitude,lng:N.longitude},selectedVenue:Z,selectionToken:tt})})",
    'canonical minimap render'
  );

  desktop = replaceOnce(
    desktop,
    "root:{flex:1,width:'100%',minWidth:0,backgroundColor:'#F5F7F6'}",
    "root:{flex:1,width:'100%',minWidth:0,minHeight:0,overflow:'hidden',backgroundColor:'#F5F7F6'}",
    'root style'
  );

  desktop = replaceOnce(
    desktop,
    "bodyScroll:{flex:1},bodyContent:{padding:16,paddingBottom:32},desktopGrid:{flexDirection:'row',alignItems:'flex-start',gap:16},leftColumn:{flex:2.08,minWidth:0},rightColumn:{flex:.92,minWidth:330,maxWidth:440,gap:14}",
    "bodyScroll:{flex:1},bodyContent:{flex:1,minHeight:0,padding:16,paddingBottom:16},desktopGrid:{flex:1,minHeight:0,flexDirection:'row',alignItems:'stretch',gap:16},leftColumn:{flex:2.08,minWidth:0,minHeight:0},rightColumn:{flex:.92,minWidth:330,maxWidth:440,minHeight:0,gap:14,overflow:'hidden'}",
    'desktop layout styles'
  );

  desktop = replaceOnce(
    desktop,
    "nearbyHeader:{marginTop:16},nearbyGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},venueCard:{flex:1,minWidth:210,backgroundColor:'#FFFFFF'",
    "nearbyHeader:{marginTop:16,flexShrink:0},nearbyScroll:{flex:1,minHeight:0},nearbyScrollContent:{paddingBottom:12},nearbyGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'flex-start'},venueCard:{width:'32%',flexGrow:0,flexShrink:0,minWidth:210,backgroundColor:'#FFFFFF'",
    'nearby scroll/grid styles'
  );

  desktop = replaceOnce(
    desktop,
    "venueImageWrap:{height:118",
    "venueCardSelected:{borderColor:'#14B8A6',shadowOpacity:.09},venueImageWrap:{height:118",
    'selected venue style'
  );

  desktop = replaceOnce(
    desktop,
    "loadMoreButton:{alignSelf:'center',marginTop:14,minHeight:40,paddingHorizontal:18,borderRadius:20,borderWidth:1,borderColor:'#BCE8E2',backgroundColor:'#EAF8F6',flexDirection:'row',alignItems:'center',gap:8},loadMoreText:{color:'#0F766E',fontSize:12,fontWeight:'850'}",
    "listFooterLoading:{minHeight:52,alignItems:'center',justifyContent:'center'},loadMoreButton:{display:'none'},loadMoreText:{color:'#0F766E',fontSize:12,fontWeight:'850'}",
    'list footer style'
  );

  desktop = replaceOnce(desktop, ",1253,6]);", ",1259,6]);", 'desktop map dependency');
  return desktop;
});

replaceModule(1259, (mapModule) => {
  mapModule = replaceOnce(
    mapModule,
    "function J(){const e=(0,p.useRouter)()",
    "function J({embedded:e0=!1,embeddedCenter:n0=null,selectedVenue:a0=null,selectionToken:t0=0}={}){const e=(0,p.useRouter)()",
    'canonical map props'
  );

  mapModule = replaceOnce(
    mapModule,
    "ne=(0,p.useLocalSearchParams)(),ae=(0,l.useMemo)(()=>{const e=Array.isArray(ne.lat)?ne.lat[0]:ne.lat,n=Array.isArray(ne.lng)?ne.lng[0]:ne.lng,a=Number(e),t=Number(n);return Number.isFinite(a)&&Number.isFinite(t)&&a>=-85&&a<=85&&t>=-180&&t<=180?{lat:a,lng:t}:null},[ne.lat,ne.lng]),",
    "ne=(0,p.useLocalSearchParams)(),ae=(0,l.useMemo)(()=>{const r0=Number(n0?.lat??n0?.latitude),o0=Number(n0?.lng??n0?.longitude);if(e0&&Number.isFinite(r0)&&Number.isFinite(o0)&&r0>=-85&&r0<=85&&o0>=-180&&o0<=180)return{lat:r0,lng:o0};const e=Array.isArray(ne.lat)?ne.lat[0]:ne.lat,n=Array.isArray(ne.lng)?ne.lng[0]:ne.lng,a=Number(e),t=Number(n);return Number.isFinite(a)&&Number.isFinite(t)&&a>=-85&&a<=85&&t>=-180&&t<=180?{lat:a,lng:t}:null},[e0,n0?.lat,n0?.latitude,n0?.lng,n0?.longitude,ne.lat,ne.lng]),",
    'embedded launch center'
  );

  const selectionEffect = '(0,l.useEffect)(()=>{if(!e0||!a0?.id||!s.current||!ve)return;const e1=Number(a0?.latitud??a0?.coordenadas?.lat),n1=Number(a0?.longitud??a0?.coordenadas?.lng);if(!Number.isFinite(e1)||!Number.isFinite(n1))return;const t1=JSON.stringify(a0).replace(/</g,"\\u003c").replace(/\\u2028/g,"\\u2028").replace(/\\u2029/g,"\\u2029"),i1=JSON.stringify({lng:n1,lat:e1});s.current.injectJavaScript("(function(){try{if(typeof window.flyToLocation===\\\"function\\\")window.flyToLocation("+e1+","+n1+",16);setTimeout(function(){if(typeof window.showPopupFromNative===\\\"function\\\")window.showPopupFromNative("+t1+","+i1+");function compactMiniPopup(){try{var content=document.querySelector(\\\".maplibregl-popup-content\\\");if(!content)return;content.style.width=\\\"236px\\\";content.style.minWidth=\\\"236px\\\";content.style.maxWidth=\\\"236px\\\";content.style.borderRadius=\\\"10px\\\";var img=content.querySelector(\\\".popup-img\\\");if(img){img.style.height=\\\"82px\\\";img.style.minHeight=\\\"82px\\\";img.style.maxHeight=\\\"82px\\\"}var info=content.querySelector(\\\".popup-info\\\");if(info)info.style.padding=\\\"8px\\\";var title=content.querySelector(\\\".popup-title\\\");if(title){title.style.fontSize=\\\"14px\\\";title.style.marginBottom=\\\"5px\\\";title.style.whiteSpace=\\\"nowrap\\\";title.style.overflow=\\\"hidden\\\";title.style.textOverflow=\\\"ellipsis\\\"}var rating=content.querySelector(\\\".popup-rating\\\");if(rating){rating.style.fontSize=\\\"11px\\\";rating.style.marginBottom=\\\"6px\\\"}var category=content.querySelector(\\\".popup-category\\\");if(category){category.style.fontSize=\\\"10px\\\";category.style.marginBottom=\\\"5px\\\"}var button=content.querySelector(\\\".popup-btn\\\");if(button){button.style.padding=\\\"7px\\\";button.style.fontSize=\\\"11px\\\"}content.querySelectorAll(\\\".popup-banner\\\").forEach(function(el){el.style.padding=\\\"5px 8px\\\";el.style.fontSize=\\\"10px\\\"});content.querySelectorAll(\\\"[style*=\\\\\\\"font-size:12px\\\\\\\"]\\\").forEach(function(el){el.style.fontSize=\\\"10.5px\\\";el.style.marginBottom=\\\"5px\\\"});if(window.currentPopup&&typeof window.currentPopup.setOffset===\\\"function\\\")window.currentPopup.setOffset(10);requestAnimationFrame(function(){try{var popup=window.currentPopup&&window.currentPopup.getElement?window.currentPopup.getElement():document.querySelector(\\\".maplibregl-popup\\\");var mapEl=document.getElementById(\\\"map\\\");var mapObj=window.currentPopup&&window.currentPopup._map;if(!popup||!mapEl||!mapObj||typeof mapObj.panBy!==\\\"function\\\")return;var pr=popup.getBoundingClientRect(),mr=mapEl.getBoundingClientRect(),dx=pr.left+pr.width/2-(mr.left+mr.width/2),dy=pr.top+pr.height/2-(mr.top+mr.height/2);if(Math.abs(dx)>2||Math.abs(dy)>2)mapObj.panBy([dx,dy],{duration:180})}catch(_){}})}catch(_){}}compactMiniPopup();setTimeout(compactMiniPopup,140)},180)}catch(error){console.error(\\\"[ExploreMiniMap] selection error\\\",error)}})();true;")},[e0,a0?.id,a0?.latitud,a0?.longitud,a0?.coordenadas?.lat,a0?.coordenadas?.lng,t0,le]);const Re=';

  mapModule = replaceOnce(
    mapModule,
    "const Re=(0,l.useCallback)(()=>{",
    selectionEffect + "(0,l.useCallback)(()=>{",
    'selected venue effect'
  );

  mapModule = replaceOnce(
    mapModule,
    "Ee=(0,l.useMemo)(()=>40,[]),Ve=(0,l.useMemo)(()=>20,[]),Ie=(0,l.useMemo)(()=>56,[]),ze=(0,l.useMemo)(()=>24,[]);return(0,_.jsxs)(h.default,{style:u.commonStyles.container,children:[",
    "Ee=(0,l.useMemo)(()=>40,[]),Ve=(0,l.useMemo)(()=>20,[]),Ie=(0,l.useMemo)(()=>56,[]),ze=(0,l.useMemo)(()=>24,[]);if(e0)return(0,_.jsx)(h.default,{style:[u.commonStyles.container,U.embeddedRoot],children:(0,_.jsxs)(h.default,{style:U.mapContainer,children:[(0,_.jsx)(m.default,{ref:s,html:Le,onMessage:_e,style:[U.webview,!(ve||de)&&U.webviewWarming]}),!(ve||de)&&(0,_.jsx)(h.default,{pointerEvents:'none',style:U.mapWarmupOverlay,children:(0,_.jsx)(M.default,{size:'small',color:u.colors.primary})})]})});return(0,_.jsxs)(h.default,{style:u.commonStyles.container,children:[",
    'embedded canonical map return'
  );

  mapModule = replaceOnce(
    mapModule,
    "const U=A.default.create({webviewWarming:",
    "const U=A.default.create({embeddedRoot:{width:'100%',height:'100%',minWidth:0,minHeight:0,overflow:'hidden'},webviewWarming:",
    'embedded map style'
  );

  return mapModule;
});

const desktopCheck = moduleRange(1252).text;
const mapCheck = moduleRange(1259).text;
for (const needle of ['Ver local','Desplázate para ver más','nearbyScroll','selectedVenue:Z','embedded:!0']) {
  if (!desktopCheck.includes(needle)) throw new Error('Missing desktop signature: ' + needle);
}
for (const needle of ['ExploreMiniMap','embeddedRoot','selectedVenue:a0','compactMiniPopup','236px']) {
  if (!mapCheck.includes(needle)) throw new Error('Missing map signature: ' + needle);
}

const stamp = 'explore-fixed-20260926-2';
const newEntry = sourceEntry.replace(/\.js$/, '-' + stamp + '.js');
const newPath = path.join(jsDir, newEntry);
fs.writeFileSync(newPath, code, 'utf8');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git') continue;
    const current = path.join(dir, name);
    const stat = fs.statSync(current);
    if (stat.isDirectory()) out.push(...walk(current));
    else if (name.endsWith('.html')) out.push(current);
  }
  return out;
}

const sourceBase = sourceEntry.replace(/\.js$/, '');
const entryPattern = new RegExp(
  sourceBase + '(?:-explore-fixed-20260926-\\d+)?\\.js',
  'g'
);
let htmlUpdates = 0;
for (const html of walk(siteRoot)) {
  const original = fs.readFileSync(html, 'utf8');
  entryPattern.lastIndex = 0;
  if (!entryPattern.test(original)) continue;
  entryPattern.lastIndex = 0;
  const next = original.replace(entryPattern, newEntry);
  entryPattern.lastIndex = 0;
  if (next === original) continue;
  fs.writeFileSync(html, next, 'utf8');
  htmlUpdates++;
}
if (!htmlUpdates) {
  const alreadyReferenced = walk(siteRoot).some((html) => {
    try {
      return fs.readFileSync(html, 'utf8').includes(newEntry);
    } catch (_) {
      return false;
    }
  });
  if (!alreadyReferenced) {
    throw new Error('No HTML entry references were updated');
  }
}

console.log(JSON.stringify({sourceEntry,newEntry,htmlUpdates},null,2));
