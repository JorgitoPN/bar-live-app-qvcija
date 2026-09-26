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
    "(0,C.jsxs)(y.default,{style:R.mapPreview,children:[(0,C.jsx)(v.default,{embedded:!0,embeddedCenter:{lat:N.latitude,lng:N.longitude},selectedVenue:Z,selectionToken:tt}),Z?(0,C.jsx)(y.default,{pointerEvents:'box-none',style:{position:'absolute',top:10,left:10,right:10,zIndex:50,alignItems:'center'},children:(0,C.jsxs)(y.default,{style:{width:248,maxWidth:'90%',minHeight:58,borderRadius:11,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E2E8F0',paddingHorizontal:9,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8,shadowColor:'#0F172A',shadowOffset:{width:0,height:3},shadowOpacity:.16,shadowRadius:9},children:[(0,C.jsxs)(y.default,{style:{flex:1,minWidth:0},children:[(0,C.jsx)(u.default,{style:{color:'#0F172A',fontSize:12,lineHeight:15,fontWeight:'900'},numberOfLines:1,children:Z.nombre||'Local'}),(0,C.jsxs)(y.default,{style:{marginTop:4,flexDirection:'row',alignItems:'center',gap:3,minWidth:0},children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:'location.fill',android_material_icon_name:'location_on',size:11,color:'#64748B'}),(0,C.jsx)(u.default,{style:{flex:1,minWidth:0,color:'#64748B',fontSize:9.5,lineHeight:12,fontWeight:'600'},numberOfLines:1,children:B(Z)||Z.direccion||'Ubicación seleccionada'})]})]}),(0,C.jsxs)(h.default,{style:{height:30,borderRadius:8,backgroundColor:'#14B8A6',paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,flexShrink:0},onPress:e=>{e?.stopPropagation?.(),re(Z)},activeOpacity:.82,children:[(0,C.jsx)(u.default,{style:{color:'#FFFFFF',fontSize:10,fontWeight:'850'},children:'Ver local'}),(0,C.jsx)(b.IconSymbol,{ios_icon_name:'arrow.right',android_material_icon_name:'arrow_forward',size:12,color:'#FFFFFF'})]})]})}):null]})",
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

  // Full desktop Explore redesign based on the approved visual reference.
  // Keep the existing data flow, infinite scroll, map selection and event queries,
  // but replace the legacy card grid/layout with the new two-pane workspace.
  {
    const returnStart = desktop.indexOf("return(0,C.jsxs)(y.default,{style:R.root,children:[");
    const displayIndex = desktop.indexOf("}A.displayName='EmptyImage';const R=", returnStart);
    if (returnStart < 0 || displayIndex < 0) throw new Error('desktop redesigned return boundaries not found');
    desktop = desktop.slice(0, returnStart) + "return(0,C.jsxs)(y.default,{style:R.root,children:[\n(0,C.jsxs)(y.default,{style:R.topHeader,children:[\n(0,C.jsxs)(y.default,{style:R.headerMainRow,children:[\n(0,C.jsxs)(y.default,{style:R.pageIdentity,children:[(0,C.jsx)(u.default,{style:R.pageTitle,children:\"Explorar\"}),(0,C.jsx)(u.default,{style:R.pageSubtitle,children:\"Descubre bares, restaurantes y locales cerca de ti\"})]}),\n(0,C.jsxs)(y.default,{style:R.searchBox,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"magnifyingglass\",android_material_icon_name:\"search\",size:19,color:\"#64748B\"}),(0,C.jsx)(f.default,{value:E,onChangeText:H,placeholder:\"Buscar bares, restaurantes, pubs...\",placeholderTextColor:\"#94A3B8\",style:R.searchInput}),E?(0,C.jsx)(h.default,{onPress:()=>H(\"\"),style:R.searchClear,children:(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"xmark.circle.fill\",android_material_icon_name:\"cancel\",size:18,color:\"#94A3B8\"})}):null]}),\n(0,C.jsxs)(h.default,{style:R.locationSelector,onPress:O,activeOpacity:.8,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"location.fill\",android_material_icon_name:\"location_on\",size:18,color:\"#4F638C\"}),(0,C.jsx)(u.default,{style:R.locationSelectorText,numberOfLines:1,children:\"Cerca de ti\"}),(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"chevron.down\",android_material_icon_name:\"expand_more\",size:15,color:\"#4F638C\"})]}),\n(0,C.jsxs)(h.default,{style:[R.filtersPrimary,P&&R.filtersPrimaryActive],onPress:M,activeOpacity:.82,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"slider.horizontal.3\",android_material_icon_name:\"tune\",size:18,color:\"#FFFFFF\"}),(0,C.jsx)(u.default,{style:R.filtersPrimaryText,children:\"Filtros\"}),P?(0,C.jsx)(y.default,{style:R.filtersBadge}):null]}),\n(0,C.jsxs)(h.default,{style:R.profileCompact,onPress:()=>Q.push(\"/perfil\"),activeOpacity:.8,children:[(0,C.jsx)(y.default,{style:R.profileAvatar,children:(0,C.jsx)(u.default,{style:R.profileAvatarText,children:\"B\"})}),(0,C.jsxs)(y.default,{style:R.profileTextWrap,children:[(0,C.jsx)(u.default,{style:R.profileName,numberOfLines:1,children:\"Mi perfil\"}),(0,C.jsx)(u.default,{style:R.profileHandle,numberOfLines:1,children:\"Cuenta BarLive\"})]}),(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"chevron.down\",android_material_icon_name:\"expand_more\",size:15,color:\"#4F638C\"})]})\n]}),\n(0,C.jsx)(s.default,{horizontal:!0,showsHorizontalScrollIndicator:!1,style:R.categoryScroll,contentContainerStyle:R.categoryContent,children:c.map(e=>{const t=\"todas\"===e.id&&!j||j===e.id;return(0,C.jsxs)(l.default,{onPress:()=>L(e.id),style:[R.categoryChip,t&&R.categoryChipActive],children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:e.iosIcon,android_material_icon_name:e.androidIcon,size:18,color:t?\"#FFFFFF\":\"#13B7C7\"}),(0,C.jsx)(u.default,{style:[R.categoryText,t&&R.categoryTextActive],children:e.nombre})]},e.id)})})\n]}),\n(0,C.jsxs)(y.default,{style:R.workspace,children:[\n(0,C.jsxs)(y.default,{style:R.leftPane,children:[\n(0,C.jsx)(y.default,{style:R.featuredCard,children:oe?(0,C.jsx)(n.default,{source:{uri:oe},style:R.featuredImage,imageStyle:R.featuredImageRadius,children:(0,C.jsxs)(p.LinearGradient,{colors:[\"rgba(5,12,26,0.88)\",\"rgba(5,12,26,0.48)\",\"rgba(5,12,26,0.02)\"],start:{x:0,y:.5},end:{x:1,y:.5},style:R.featuredOverlay,children:[(0,C.jsxs)(y.default,{style:R.featuredContent,children:[(0,C.jsxs)(y.default,{style:R.featuredBadge,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"star.fill\",android_material_icon_name:\"star\",size:11,color:\"#FFFFFF\"}),(0,C.jsx)(u.default,{style:R.featuredBadgeText,children:\"Local destacado\"})]}),(0,C.jsx)(u.default,{style:R.featuredName,numberOfLines:2,children:ee?.nombre||\"Descubre BarLive\"}),(0,C.jsx)(u.default,{style:R.featuredDescription,numberOfLines:2,children:ee?.descripcion||\"Descubre un local único, su ambiente y todo lo que está pasando cerca de ti.\"})]}),(0,C.jsxs)(h.default,{style:R.featuredButton,onPress:()=>re(ee),activeOpacity:.85,children:[(0,C.jsx)(u.default,{style:R.featuredButtonText,children:\"Ver local\"}),(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"arrow.right\",android_material_icon_name:\"arrow_forward\",size:15,color:\"#0F766E\"})]})]})}):(0,C.jsxs)(p.LinearGradient,{colors:[\"#10233F\",\"#164E63\"],style:R.featuredFallback,children:[(0,C.jsxs)(y.default,{style:R.featuredContent,children:[(0,C.jsxs)(y.default,{style:R.featuredBadge,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"star.fill\",android_material_icon_name:\"star\",size:11,color:\"#FFFFFF\"}),(0,C.jsx)(u.default,{style:R.featuredBadgeText,children:\"Local destacado\"})]}),(0,C.jsx)(u.default,{style:R.featuredName,numberOfLines:2,children:ee?.nombre||\"Descubre BarLive\"}),(0,C.jsx)(u.default,{style:R.featuredDescription,numberOfLines:2,children:ee?.direccion||\"Encuentra nuevos locales y experiencias cerca de ti.\"})]}),(0,C.jsxs)(h.default,{style:R.featuredButton,onPress:()=>re(ee),activeOpacity:.85,children:[(0,C.jsx)(u.default,{style:R.featuredButtonText,children:\"Ver local\"}),(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"arrow.right\",android_material_icon_name:\"arrow_forward\",size:15,color:\"#0F766E\"})]})]})}),\n(0,C.jsxs)(y.default,{style:R.nearbyHeader,children:[(0,C.jsxs)(y.default,{children:[(0,C.jsx)(u.default,{style:R.nearbyTitle,children:\"Locales cerca de ti\"}),(0,C.jsx)(u.default,{style:R.nearbySubtitle,children:\"Descubre lugares increíbles, guarda tus favoritos y vive nuevas experiencias.\"})]}),(0,C.jsxs)(h.default,{style:R.sortButton,activeOpacity:.8,children:[(0,C.jsx)(u.default,{style:R.sortButtonText,children:\"Más relevantes\"}),(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"chevron.down\",android_material_icon_name:\"expand_more\",size:14,color:\"#526384\"})]})]}),\n(0,C.jsxs)(s.default,{ref:rt,style:R.nearbyScroll,contentContainerStyle:R.nearbyScrollContent,showsVerticalScrollIndicator:!1,scrollEventThrottle:32,onScroll:se,children:[\nV&&0===e.length?(0,C.jsxs)(y.default,{style:R.loadingBlock,children:[(0,C.jsx)(o.default,{color:\"#14B8A6\"}),(0,C.jsx)(u.default,{style:R.loadingText,children:\"Cargando locales cercanos...\"})]}):te.map(e=>{const t=w(e),o=I(e),a=Number(e?.rating??e?.valoracion_media??e?.puntuacion_media??e?.google_rating??0),n=Number(e?.reviews_count??e?.numero_resenas??e?.total_resenas??e?.user_ratings_total??0),s=e?.esta_abierto??e?.is_open_now;return(0,C.jsxs)(l.default,{onPress:()=>ie(e),style:[R.venueRowCard,Z?.id===e.id&&R.venueRowCardSelected],children:[\n(0,C.jsxs)(y.default,{style:R.venueThumbWrap,children:[t?(0,C.jsx)(a.default,{source:{uri:t},style:R.venueThumb,resizeMode:\"cover\"}):(0,C.jsx)(A,{}),null!=s?(0,C.jsxs)(y.default,{style:[R.statusBadge,s?R.statusBadgeOpen:R.statusBadgeClosed],children:[(0,C.jsx)(y.default,{style:[R.statusDot,s?R.statusDotOpen:R.statusDotClosed]}),(0,C.jsx)(u.default,{style:[R.statusBadgeText,s?R.statusBadgeTextOpen:R.statusBadgeTextClosed],children:s?\"Abierto ahora\":\"Cerrado\"})]}):null]}),\n(0,C.jsxs)(y.default,{style:R.venueRowContent,children:[(0,C.jsxs)(y.default,{style:R.venueRowTop,children:[(0,C.jsx)(u.default,{style:R.venueRowName,numberOfLines:1,children:e.nombre}),null!==o?(0,C.jsxs)(y.default,{style:R.distanceTop,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"location.fill\",android_material_icon_name:\"location_on\",size:11,color:\"#5C6F97\"}),(0,C.jsx)(u.default,{style:R.distanceTopText,children:z(o)})]}):null]}),(0,C.jsxs)(y.default,{style:R.venueQuickMeta,children:[Number.isFinite(a)&&a>0?(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"star.fill\",android_material_icon_name:\"star\",size:12,color:\"#64789D\"}),(0,C.jsx)(u.default,{style:R.ratingText,children:a.toFixed(1)+(Number.isFinite(n)&&n>0?\" (\"+Math.round(n)+\")\":\"\")})]}):null,(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"location.fill\",android_material_icon_name:\"location_on\",size:11,color:\"#64789D\"}),(0,C.jsx)(u.default,{style:R.cityText,numberOfLines:1,children:B(e)||e.direccion||\"Cerca de ti\"})]}),(0,C.jsx)(y.default,{style:R.venueTypeBadge,children:(0,C.jsx)(u.default,{style:R.venueTypeBadgeText,children:T(e)})}),(0,C.jsx)(u.default,{style:R.venueRowDescription,numberOfLines:2,children:e.descripcion||\"Descubre su ambiente, sus eventos y todo lo que ofrece este local.\"})]}),\n(0,C.jsxs)(y.default,{style:R.venueRowActions,children:[(0,C.jsx)(h.default,{style:R.venueHeartLight,onPress:a=>{a?.stopPropagation?.()},activeOpacity:.78,children:(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"heart\",android_material_icon_name:\"favorite_border\",size:18,color:\"#61739A\"})}),(0,C.jsx)(h.default,{style:R.venueOpenButton,onPress:a=>{a?.stopPropagation?.(),re(e)},activeOpacity:.82,children:(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"arrow.right\",android_material_icon_name:\"arrow_forward\",size:16,color:\"#0E9F9A\"})})]})\n]},e.id)}),q?(0,C.jsx)(y.default,{style:R.listFooterLoading,children:(0,C.jsx)(o.default,{color:\"#0F766E\",size:\"small\"})}):null\n]})\n]}),\n(0,C.jsxs)(y.default,{style:R.rightPane,children:[\n(0,C.jsx)(y.default,{style:R.mapCard,children:(0,C.jsxs)(y.default,{style:R.mapPreview,children:[\n(0,C.jsx)(v.default,{embedded:!0,embeddedCenter:{lat:N.latitude,lng:N.longitude},selectedVenue:Z,selectionToken:tt}),\n(0,C.jsxs)(y.default,{pointerEvents:\"none\",style:R.mapInfoPill,children:[(0,C.jsx)(y.default,{style:R.mapInfoIcon,children:(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"location.fill\",android_material_icon_name:\"location_on\",size:17,color:\"#14B8A6\"})}),(0,C.jsxs)(y.default,{style:R.mapInfoTextWrap,children:[(0,C.jsx)(u.default,{style:R.mapInfoTitle,children:\"Mostrando locales cerca de ti\"}),(0,C.jsx)(u.default,{style:R.mapInfoSubtitle,children:te.length+(1===te.length?\" local encontrado\":\" locales encontrados\")})]})]}),\nZ?(0,C.jsx)(y.default,{pointerEvents:\"box-none\",style:R.mapSelectionOverlay,children:(0,C.jsxs)(y.default,{style:R.mapSelectionCard,children:[(0,C.jsxs)(y.default,{style:R.mapSelectionInfo,children:[(0,C.jsx)(u.default,{style:R.mapSelectionTitle,numberOfLines:1,children:Z.nombre||\"Local\"}),(0,C.jsx)(u.default,{style:R.mapSelectionMeta,numberOfLines:1,children:B(Z)||Z.direccion||\"Ubicación seleccionada\"})]}),(0,C.jsxs)(h.default,{style:R.mapSelectionButton,onPress:e=>{e?.stopPropagation?.(),re(Z)},activeOpacity:.82,children:[(0,C.jsx)(u.default,{style:R.mapSelectionButtonText,children:\"Ver local\"}),(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"arrow.right\",android_material_icon_name:\"arrow_forward\",size:12,color:\"#FFFFFF\"})]})]})}):null,\n(0,C.jsxs)(h.default,{style:R.mapListButton,onPress:O,activeOpacity:.82,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"list.bullet\",android_material_icon_name:\"list\",size:18,color:\"#0F172A\"}),(0,C.jsx)(u.default,{style:R.mapListButtonText,children:\"Mapa completo\"})]})\n]})}),\n(0,C.jsxs)(y.default,{style:R.eventsPanel,children:[(0,C.jsxs)(y.default,{style:R.eventsHeader,children:[(0,C.jsxs)(y.default,{children:[(0,C.jsxs)(y.default,{style:R.eventsTitleRow,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"calendar\",android_material_icon_name:\"event\",size:22,color:\"#14B8A6\"}),(0,C.jsx)(u.default,{style:R.eventsTitle,children:\"Eventos activos y próximos\"})]}),(0,C.jsx)(u.default,{style:R.eventsSubtitle,children:\"Conciertos, sesiones, fiestas y planes cerca de ti.\"})]}),(0,C.jsx)(h.default,{onPress:()=>Q.push(\"/(tabs)/eventos\"),activeOpacity:.76,children:(0,C.jsx)(u.default,{style:R.eventsLink,children:\"Ver todos los eventos  →\"})})]}),\nK?(0,C.jsx)(y.default,{style:R.eventsLoading,children:(0,C.jsx)(o.default,{color:\"#14B8A6\"})}):U.length?(0,C.jsx)(y.default,{style:R.eventsGrid,children:U.slice(0,3).map(e=>{const t=W(e);return(0,C.jsxs)(h.default,{style:R.eventCard,onPress:()=>Q.push(\"/detalle/evento?id=\"+e.id),activeOpacity:.8,children:[(0,C.jsx)(a.default,{source:{uri:e.imagen_url||S},style:R.eventCardImage,resizeMode:\"cover\"}),(0,C.jsxs)(y.default,{style:R.eventCardBody,children:[(0,C.jsxs)(y.default,{style:R.eventCardTopLine,children:[(0,C.jsx)(u.default,{style:R.eventCardDate,children:k(e)}),(0,C.jsx)(y.default,{style:[R.eventStatusSmall,{backgroundColor:t.background}],children:(0,C.jsx)(u.default,{style:[R.eventStatusSmallText,{color:t.color}],children:t.label})})]}),(0,C.jsx)(u.default,{style:R.eventCardTitle,numberOfLines:1,children:e.titulo}),(0,C.jsx)(u.default,{style:R.eventCardMeta,numberOfLines:1,children:(e.local_nombre||\"Local\")+(e.local_ciudad?\" · \"+e.local_ciudad:\"\")})]})]},e.id)})}):(0,C.jsxs)(h.default,{style:R.emptyEvents,onPress:()=>Q.push(\"/(tabs)/eventos\"),activeOpacity:.82,children:[(0,C.jsx)(b.IconSymbol,{ios_icon_name:\"calendar.badge.plus\",android_material_icon_name:\"event\",size:26,color:\"#14B8A6\"}),(0,C.jsx)(u.default,{style:R.emptyEventsTitle,children:\"Descubre los próximos eventos\"}),(0,C.jsx)(u.default,{style:R.emptyEventsText,children:\"Consulta los planes que tienes cerca.\"})]})\n]})\n]})\n]})\n]})" + desktop.slice(displayIndex);

    const styleStart = desktop.indexOf("const R=c.default.create({");
    const styleEnd = desktop.lastIndexOf("})},1252,[");
    if (styleStart < 0 || styleEnd < 0 || styleEnd <= styleStart) throw new Error('desktop redesigned style boundaries not found');
    desktop = desktop.slice(0, styleStart) + "const R=c.default.create({root:{flex:1,width:\"100%\",minWidth:0,minHeight:0,overflow:\"hidden\",backgroundColor:\"#F7FAF9\"},topHeader:{backgroundColor:\"#FFFFFF\",paddingHorizontal:20,paddingTop:12,paddingBottom:12,borderBottomWidth:1,borderBottomColor:\"#E8EEF2\",shadowColor:\"#0F172A\",shadowOffset:{width:0,height:2},shadowOpacity:.025,shadowRadius:10,zIndex:20},headerMainRow:{minHeight:54,flexDirection:\"row\",alignItems:\"center\",gap:12},pageIdentity:{width:285,minWidth:240,paddingRight:6},pageTitle:{color:\"#122348\",fontSize:26,lineHeight:29,fontWeight:\"950\",letterSpacing:-.8},pageSubtitle:{color:\"#71809E\",fontSize:10.5,fontWeight:\"600\",marginTop:1},searchBox:{flex:1,height:44,minWidth:260,borderRadius:10,borderWidth:1,borderColor:\"#E4EAF0\",backgroundColor:\"#FFFFFF\",flexDirection:\"row\",alignItems:\"center\",paddingHorizontal:13,gap:9,shadowColor:\"#0F172A\",shadowOffset:{width:0,height:2},shadowOpacity:.03,shadowRadius:8},searchInput:{flex:1,color:\"#17233F\",fontSize:12},searchClear:{padding:4},locationSelector:{width:200,height:44,borderRadius:10,borderWidth:1,borderColor:\"#E4EAF0\",backgroundColor:\"#FFFFFF\",paddingHorizontal:13,flexDirection:\"row\",alignItems:\"center\",gap:7},locationSelectorText:{flex:1,color:\"#26385E\",fontSize:11,fontWeight:\"800\"},filtersPrimary:{height:44,minWidth:112,borderRadius:10,backgroundColor:\"#12B8B0\",paddingHorizontal:18,flexDirection:\"row\",alignItems:\"center\",justifyContent:\"center\",gap:8,position:\"relative\"},filtersPrimaryActive:{backgroundColor:\"#0FA69F\"},filtersPrimaryText:{color:\"#FFFFFF\",fontSize:11,fontWeight:\"900\"},filtersBadge:{position:\"absolute\",right:8,top:7,width:6,height:6,borderRadius:3,backgroundColor:\"#FDE047\"},profileCompact:{height:44,minWidth:176,paddingLeft:12,borderLeftWidth:1,borderLeftColor:\"#E4EAF0\",flexDirection:\"row\",alignItems:\"center\",gap:8},profileAvatar:{width:38,height:38,borderRadius:19,backgroundColor:\"#E6FAF6\",alignItems:\"center\",justifyContent:\"center\"},profileAvatarText:{color:\"#0EA5A8\",fontSize:15,fontWeight:\"900\"},profileTextWrap:{flex:1,minWidth:0},profileName:{color:\"#132345\",fontSize:10.5,fontWeight:\"900\"},profileHandle:{color:\"#8190AB\",fontSize:9,marginTop:1},categoryScroll:{marginTop:9},categoryContent:{gap:10,paddingRight:6,alignItems:\"center\"},categoryChip:{height:42,minWidth:118,borderRadius:10,borderWidth:1,borderColor:\"#E7EDF2\",backgroundColor:\"#FFFFFF\",paddingHorizontal:17,flexDirection:\"row\",alignItems:\"center\",justifyContent:\"center\",gap:8},categoryChipActive:{backgroundColor:\"#11B7AF\",borderColor:\"#11B7AF\"},categoryText:{color:\"#203458\",fontSize:10.5,fontWeight:\"850\"},categoryTextActive:{color:\"#FFFFFF\"},workspace:{flex:1,minHeight:0,flexDirection:\"row\",gap:16,paddingHorizontal:20,paddingTop:14,paddingBottom:16},leftPane:{width:\"42%\",minWidth:390,minHeight:0},rightPane:{flex:1,minWidth:0,minHeight:0,gap:14},featuredCard:{height:174,borderRadius:13,overflow:\"hidden\",backgroundColor:\"#14243B\",shadowColor:\"#0F172A\",shadowOffset:{width:0,height:4},shadowOpacity:.08,shadowRadius:14},featuredImage:{flex:1},featuredImageRadius:{borderRadius:13},featuredOverlay:{flex:1,padding:16,flexDirection:\"row\",alignItems:\"flex-end\",justifyContent:\"space-between\",gap:16},featuredFallback:{flex:1,padding:16,flexDirection:\"row\",alignItems:\"flex-end\",justifyContent:\"space-between\"},featuredContent:{flex:1,minWidth:0,maxWidth:\"68%\",alignSelf:\"stretch\",justifyContent:\"center\"},featuredBadge:{alignSelf:\"flex-start\",borderRadius:7,backgroundColor:\"#7C3AED\",paddingHorizontal:9,paddingVertical:5,flexDirection:\"row\",alignItems:\"center\",gap:5,marginBottom:7},featuredBadgeText:{color:\"#FFFFFF\",fontSize:9.5,fontWeight:\"850\"},featuredName:{color:\"#FFFFFF\",fontSize:25,lineHeight:27,fontWeight:\"950\",letterSpacing:-.6},featuredDescription:{color:\"rgba(255,255,255,0.92)\",fontSize:11,lineHeight:15,marginTop:5},featuredButton:{height:38,minWidth:112,borderRadius:9,backgroundColor:\"#FFFFFF\",paddingHorizontal:14,flexDirection:\"row\",alignItems:\"center\",justifyContent:\"center\",gap:7},featuredButtonText:{color:\"#0F766E\",fontSize:10.5,fontWeight:\"900\"},nearbyHeader:{flexShrink:0,minHeight:64,paddingTop:13,paddingBottom:9,paddingHorizontal:1,flexDirection:\"row\",alignItems:\"center\",justifyContent:\"space-between\",gap:12},nearbyTitle:{color:\"#14244A\",fontSize:18,lineHeight:21,fontWeight:\"950\",letterSpacing:-.35},nearbySubtitle:{color:\"#8190AB\",fontSize:9.5,marginTop:2},sortButton:{height:34,minWidth:118,borderRadius:9,borderWidth:1,borderColor:\"#E2E8F0\",backgroundColor:\"#FFFFFF\",paddingHorizontal:10,flexDirection:\"row\",alignItems:\"center\",justifyContent:\"center\",gap:7},sortButtonText:{color:\"#526384\",fontSize:9.5,fontWeight:\"800\"},nearbyScroll:{flex:1,minHeight:0},nearbyScrollContent:{paddingBottom:18,gap:10},loadingBlock:{minHeight:180,borderRadius:13,borderWidth:1,borderColor:\"#E5EAF0\",backgroundColor:\"#FFFFFF\",alignItems:\"center\",justifyContent:\"center\",gap:9},loadingText:{color:\"#71809E\",fontSize:11,fontWeight:\"650\"},venueRowCard:{minHeight:112,borderRadius:12,borderWidth:1,borderColor:\"#E6EBF0\",backgroundColor:\"#FFFFFF\",flexDirection:\"row\",overflow:\"hidden\",shadowColor:\"#0F172A\",shadowOffset:{width:0,height:2},shadowOpacity:.025,shadowRadius:8},venueRowCardSelected:{borderColor:\"#16B8B0\",shadowOpacity:.08},venueThumbWrap:{width:142,minHeight:112,position:\"relative\",backgroundColor:\"#EFF6F5\"},venueThumb:{width:\"100%\",height:\"100%\"},emptyImage:{flex:1,alignItems:\"center\",justifyContent:\"center\"},statusBadge:{position:\"absolute\",top:8,left:8,minHeight:22,maxWidth:120,borderRadius:999,paddingHorizontal:8,flexDirection:\"row\",alignItems:\"center\",gap:5,borderWidth:1},statusBadgeOpen:{backgroundColor:\"rgba(225,249,241,0.94)\",borderColor:\"rgba(130,220,190,0.75)\"},statusBadgeClosed:{backgroundColor:\"rgba(255,238,238,0.94)\",borderColor:\"rgba(244,167,167,0.8)\"},statusDot:{width:5,height:5,borderRadius:3},statusDotOpen:{backgroundColor:\"#22B573\"},statusDotClosed:{backgroundColor:\"#EF4444\"},statusBadgeText:{flexShrink:1,fontSize:8.5,fontWeight:\"850\"},statusBadgeTextOpen:{color:\"#148B61\"},statusBadgeTextClosed:{color:\"#C43D3D\"},venueRowContent:{flex:1,minWidth:0,paddingHorizontal:13,paddingVertical:10},venueRowTop:{flexDirection:\"row\",alignItems:\"center\",gap:10},venueRowName:{flex:1,minWidth:0,color:\"#14244A\",fontSize:14,lineHeight:17,fontWeight:\"950\"},distanceTop:{flexDirection:\"row\",alignItems:\"center\",gap:3},distanceTopText:{color:\"#5C6F97\",fontSize:9.5,fontWeight:\"800\"},venueQuickMeta:{minHeight:18,marginTop:3,flexDirection:\"row\",alignItems:\"center\",gap:4,minWidth:0},ratingText:{color:\"#64789D\",fontSize:9.5,fontWeight:\"750\",marginRight:3},cityText:{flex:1,minWidth:0,color:\"#7485A4\",fontSize:9.5},venueTypeBadge:{alignSelf:\"flex-start\",minHeight:21,borderRadius:999,backgroundColor:\"#E6F8F5\",paddingHorizontal:7,justifyContent:\"center\",marginTop:5},venueTypeBadgeText:{color:\"#0F8F88\",fontSize:8.5,fontWeight:\"800\"},venueRowDescription:{color:\"#71809E\",fontSize:9.5,lineHeight:13,marginTop:5},venueRowActions:{width:48,paddingVertical:9,paddingRight:9,alignItems:\"center\",justifyContent:\"space-between\"},venueHeartLight:{width:32,height:32,borderRadius:16,borderWidth:1,borderColor:\"#E3E8EF\",backgroundColor:\"#FFFFFF\",alignItems:\"center\",justifyContent:\"center\"},venueOpenButton:{width:32,height:32,borderRadius:16,backgroundColor:\"#E5FAF6\",alignItems:\"center\",justifyContent:\"center\"},listFooterLoading:{minHeight:44,alignItems:\"center\",justifyContent:\"center\"},mapCard:{flex:1,minHeight:340,borderRadius:14,overflow:\"hidden\",backgroundColor:\"#EAF6F3\",borderWidth:1,borderColor:\"#E2E8F0\"},mapPreview:{flex:1,minHeight:0,position:\"relative\",overflow:\"hidden\"},mapInfoPill:{position:\"absolute\",top:14,left:14,minWidth:245,maxWidth:\"55%\",minHeight:50,borderRadius:11,backgroundColor:\"rgba(255,255,255,0.95)\",borderWidth:1,borderColor:\"rgba(226,232,240,0.95)\",paddingHorizontal:10,paddingVertical:8,flexDirection:\"row\",alignItems:\"center\",gap:8,zIndex:30,shadowColor:\"#0F172A\",shadowOffset:{width:0,height:3},shadowOpacity:.08,shadowRadius:8},mapInfoIcon:{width:32,height:32,borderRadius:16,backgroundColor:\"#E5FAF6\",alignItems:\"center\",justifyContent:\"center\"},mapInfoTextWrap:{flex:1,minWidth:0},mapInfoTitle:{color:\"#152647\",fontSize:11,fontWeight:\"900\"},mapInfoSubtitle:{color:\"#8090AB\",fontSize:9,marginTop:1},mapSelectionOverlay:{position:\"absolute\",top:76,right:14,zIndex:45},mapSelectionCard:{width:238,minHeight:58,borderRadius:11,backgroundColor:\"#FFFFFF\",borderWidth:1,borderColor:\"#E2E8F0\",paddingHorizontal:9,paddingVertical:8,flexDirection:\"row\",alignItems:\"center\",gap:8,shadowColor:\"#0F172A\",shadowOffset:{width:0,height:3},shadowOpacity:.14,shadowRadius:9},mapSelectionInfo:{flex:1,minWidth:0},mapSelectionTitle:{color:\"#152647\",fontSize:11.5,fontWeight:\"900\"},mapSelectionMeta:{color:\"#7B8AA6\",fontSize:9,marginTop:2},mapSelectionButton:{height:30,borderRadius:8,backgroundColor:\"#14B8A6\",paddingHorizontal:8,flexDirection:\"row\",alignItems:\"center\",justifyContent:\"center\",gap:4},mapSelectionButtonText:{color:\"#FFFFFF\",fontSize:9.5,fontWeight:\"850\"},mapListButton:{position:\"absolute\",left:14,bottom:14,height:38,borderRadius:9,backgroundColor:\"rgba(255,255,255,0.96)\",borderWidth:1,borderColor:\"#E2E8F0\",paddingHorizontal:12,flexDirection:\"row\",alignItems:\"center\",gap:6,shadowColor:\"#0F172A\",shadowOffset:{width:0,height:2},shadowOpacity:.08,shadowRadius:7},mapListButtonText:{color:\"#182842\",fontSize:10,fontWeight:\"850\"},eventsPanel:{height:220,borderRadius:14,borderWidth:1,borderColor:\"#E3E9EE\",backgroundColor:\"#FFFFFF\",padding:13},eventsHeader:{minHeight:42,flexDirection:\"row\",alignItems:\"flex-start\",justifyContent:\"space-between\",gap:12},eventsTitleRow:{flexDirection:\"row\",alignItems:\"center\",gap:7},eventsTitle:{color:\"#152647\",fontSize:16,fontWeight:\"950\"},eventsSubtitle:{color:\"#8190AB\",fontSize:9.5,marginTop:2,marginLeft:29},eventsLink:{color:\"#0EA5A8\",fontSize:9.5,fontWeight:\"850\",marginTop:2},eventsGrid:{flex:1,minHeight:0,flexDirection:\"row\",gap:10,marginTop:9},eventCard:{flex:1,minWidth:0,borderRadius:11,borderWidth:1,borderColor:\"#E6EBF0\",backgroundColor:\"#FFFFFF\",overflow:\"hidden\"},eventCardImage:{width:\"100%\",height:78,backgroundColor:\"#EDF2F5\"},eventCardBody:{flex:1,paddingHorizontal:9,paddingVertical:7},eventCardTopLine:{flexDirection:\"row\",alignItems:\"center\",justifyContent:\"space-between\",gap:5},eventCardDate:{color:\"#51617E\",fontSize:8.5,fontWeight:\"800\"},eventStatusSmall:{borderRadius:999,paddingHorizontal:6,paddingVertical:2},eventStatusSmallText:{fontSize:7.5,fontWeight:\"850\"},eventCardTitle:{color:\"#14244A\",fontSize:10.5,fontWeight:\"900\",marginTop:5},eventCardMeta:{color:\"#8190AB\",fontSize:8.5,marginTop:2},eventsLoading:{flex:1,minHeight:120,alignItems:\"center\",justifyContent:\"center\"},emptyEvents:{flex:1,minHeight:120,borderRadius:10,backgroundColor:\"#F1FAF8\",alignItems:\"center\",justifyContent:\"center\",padding:18},emptyEventsTitle:{color:\"#14244A\",fontSize:13,fontWeight:\"900\",marginTop:7},emptyEventsText:{color:\"#8190AB\",fontSize:9.5,marginTop:3}})" + desktop.slice(styleEnd + 2);
  }

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

  const selectionEffect = '(0,l.useEffect)(()=>{if(!e0||!a0?.id||!s.current||!ve)return;const e1=Number(a0?.latitud??a0?.coordenadas?.lat),n1=Number(a0?.longitud??a0?.coordenadas?.lng);if(!Number.isFinite(e1)||!Number.isFinite(n1))return;s.current.injectJavaScript("(function(){try{if(window.currentPopup){try{window.currentPopup.remove()}catch(_){}window.currentPopup=null}if(typeof window.flyToLocation===\\\"function\\\")window.flyToLocation("+e1+","+n1+",16)}catch(error){console.error(\\\"[ExploreMiniMap] selection error\\\",error)}})();true;")},[e0,a0?.id,a0?.latitud,a0?.longitud,a0?.coordenadas?.lat,a0?.coordenadas?.lng,t0,le]);(0,l.useEffect)(()=>{if(!e0||!s.current||!ve)return;s.current.injectJavaScript("(function(){try{document.querySelectorAll(\\\".maplibregl-ctrl-attrib\\\").forEach(function(el){try{el.remove()}catch(_){}});var existing=document.querySelector(\\\".barlive-mini-attribution\\\");if(!existing){var el=document.createElement(\\\"div\\\");el.className=\\\"barlive-mini-attribution\\\";el.setAttribute(\\\"aria-label\\\",\\\"Atribución del mapa\\\");el.textContent=\\\"OpenFreeMap · © OpenMapTiles · © OpenStreetMap\\\";el.style.cssText=\\\"position:absolute;left:6px;bottom:4px;z-index:6;font-size:6px;line-height:8px;font-weight:500;letter-spacing:0;white-space:nowrap;background:transparent;border:0;box-shadow:none;padding:0;margin:0;color:#475569;opacity:.32;pointer-events:none;\\\";var mapEl=document.getElementById(\\\"map\\\");if(mapEl)mapEl.appendChild(el)}}catch(error){console.error(\\\"[ExploreMiniMap] attribution error\\\",error)}})();true;")},[e0,le]);const Re=';

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
for (const needle of ['Explorar','Locales cerca de ti','Más relevantes','Mostrando locales cerca de ti','Eventos activos y próximos','nearbyScroll','selectedVenue:Z','embedded:!0']) {
  if (!desktopCheck.includes(needle)) throw new Error('Missing desktop signature: ' + needle);
}
for (const needle of ['ExploreMiniMap','embeddedRoot','selectedVenue:a0','currentPopup.remove','barlive-mini-attribution','OpenMapTiles']) {
  if (!mapCheck.includes(needle)) throw new Error('Missing map signature: ' + needle);
}

const stamp = 'explore-fixed-20260926-6';
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
