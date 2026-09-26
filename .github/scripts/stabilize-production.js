
const fs = require('fs');
const cp = require('child_process');

function replaceOnce(text, oldText, newText, label) {
  if (text.includes(newText)) return text;
  const count = text.split(oldText).length - 1;
  if (count !== 1) throw new Error(label + ': expected exactly 1 old signature, found ' + count);
  return text.replace(oldText, newText);
}

function removeBlock(content, marker, close) {
  let start = content.indexOf(marker);
  while (start >= 0) {
    const end = content.indexOf(close, start);
    if (end < 0) break;
    content = content.slice(0, start) + content.slice(end + close.length);
    start = content.indexOf(marker);
  }
  return content;
}

const bundlePath = cp.execSync("find _expo/static/js/web -maxdepth 1 -type f -name 'entry-*.js' | head -n 1", { encoding: 'utf8' }).trim();
if (!bundlePath) throw new Error('Production bundle not found');

let code = fs.readFileSync(bundlePath, 'utf8');

const oldResponsive = '_e.useResponsiveLayout=function(t=""){const{width:e,height:h}=(0,s.default)(),u=e<o.mobile,c=e>=o.mobile&&e<o.tablet,W=e>=o.tablet&&e<o.compactDesktop,p=e>=o.compactDesktop&&e<o.desktop,P=e>=o.desktop,x=!u,f=p||P,b=x?f?244:78:0,k=n(t),v=l(t),_=P&&k.rightPanel&&!v;return{width:e,height:h,isWeb:!0,isMobile:u,isTablet:c,isCompactDesktop:W,isDesktop:p,isLargeDesktop:P,showSidebar:x&&!v,sidebarExpanded:f,sidebarWidth:b,showRightPanel:_,rightPanelWidth:_?320:0,contentMaxWidth:k.maxWidth,contentGutters:u?0:k.gutters,hideChrome:v}}';
const newResponsive = '_e.useResponsiveLayout=function(t=""){const{width:e,height:h}=(0,s.default)(),R=e/Math.max(h,1),D=e>=1280&&h>=650&&R>=1.45,u=!D,c=!D&&e>=768&&e<1024,W=!D&&e>=1024,p=D&&e<1720,P=D&&e>=1720,x=D,f=D&&e>=1600,b=x?f?244:78:0,k=n(t),v=l(t),_=P&&k.rightPanel&&!v;return{width:e,height:h,isWeb:!0,isMobile:u,isTablet:c,isCompactDesktop:W,isDesktop:p,isLargeDesktop:P,showSidebar:x&&!v,sidebarExpanded:f,sidebarWidth:b,showRightPanel:_,rightPanelWidth:_?320:0,contentMaxWidth:k.maxWidth,contentGutters:u?0:k.gutters,hideChrome:v}}';
code = replaceOnce(code, oldResponsive, newResponsive, 'responsive layout');

code = replaceOnce(
  code,
  "}];return('propietario'===T||w||O)&&e.push",
  "}];L||e.splice(0,e.length,...e.filter(e=>['explorar','mapa','eventos','social'].includes(e.key)));return('propietario'===T||w||O)&&e.push",
  'guest sidebar'
);

code = replaceOnce(
  code,
  'children:[(0,F.jsxs)(s.default,{style:[j.navItem,!e&&j.navItemCompact],onPress:()=>k.push(\'/(tabs)/perfil/configuracion\'),activeOpacity:.72,children:[(0,F.jsx)(h.Ionicons,{name:"menu-outline",size:25,color:"#334155"}),e&&(0,F.jsx)(l.default,{style:j.navLabel,children:"M\\xe1s"})]}),e&&L?',
  'children:[L?(0,F.jsxs)(s.default,{style:[j.navItem,!e&&j.navItemCompact],onPress:()=>k.push(\'/(tabs)/perfil/configuracion\'),activeOpacity:.72,children:[(0,F.jsx)(h.Ionicons,{name:"menu-outline",size:25,color:"#334155"}),e&&(0,F.jsx)(l.default,{style:j.navLabel,children:"M\\xe1s"})]}):null,e&&L?',
  'guest More shortcut'
);

const publicGuestTabs = "[{name:'eventos',route:'/(tabs)/eventos',icon:'calendar',label:'Eventos'},{name:'explorar',route:'/(tabs)/explorar',icon:'sparkles',label:'Explorar'},{name:'social',route:'/(tabs)/social',icon:'person.2.fill',label:'Social'}]";
code = replaceOnce(
  code,
  "const A=(()=>{const t=u.ADMIN_EMAILS.includes(e?.email||'')",
  "const A=(()=>{if(!e)return " + publicGuestTabs + ";const t=u.ADMIN_EMAILS.includes(e?.email||'')",
  'guest tabs module 1103'
);
code = replaceOnce(
  code,
  "const T=(()=>{const n=u.ADMIN_EMAILS.includes(e?.email||'')",
  "const T=(()=>{if(!e)return " + publicGuestTabs + ";const n=u.ADMIN_EMAILS.includes(e?.email||'')",
  'guest tabs module 1104'
);

code = code.replace(/label:'Momentos'/g, "label:'Social'");
if (!code.includes('__BARLIVE_STABLE_WEB_V43__')) {
  code += '\n;globalThis.__BARLIVE_STABLE_WEB_V43__="2026-09-26";\n';
}
fs.writeFileSync(bundlePath, code);

const desktopStyle = [
  '<style id="barlive-stable-web-v43">',
  '#barlive-header-backdrop-v43{display:none}',
  '@media (min-width:768px){html,body,#root{background:#F4F7F6!important}body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}*{scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.32) transparent}*::-webkit-scrollbar{width:8px;height:8px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:rgba(100,116,139,.26);border-radius:999px}}',
  '@media (max-width:767px),(orientation:portrait){html,body,#root{background:#fff!important}}',
  '</style>'
].join('');

const resetScript = [
  '<script id="barlive-cache-reset-v43">',
  '(function(){if(!(\'serviceWorker\' in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}).catch(function(){});if(\'caches\' in window){caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k.indexOf(\'barlive-\')===0||k.indexOf(\'workbox\')===0}).map(function(k){return caches.delete(k)}))}).catch(function(){})}})();',
  '</script>'
].join('');

const routeGuard = [
  '<script id="barlive-route-guard-v43">',
  '(function(){"use strict";function p(r){if(!r)return null;try{return JSON.parse(r)}catch(_){return null}}function u(v){if(!v)return null;if(v.access_token&&v.user)return v;if(v.currentSession&&v.currentSession.access_token)return v.currentSession;if(v.session&&v.session.access_token)return v.session;if(v.data&&v.data.session&&v.data.session.access_token)return v.data.session;return null}function ok(s){if(!s||!s.access_token)return false;var e=Number(s.expires_at||0);return !e||e*1000>Date.now()-30000}function a(){var ss=[];try{ss.push(localStorage)}catch(_){}try{ss.push(sessionStorage)}catch(_){}for(var n=0;n<ss.length;n++){var st=ss[n];if(!st)continue;try{var d=u(p(st.getItem("user_session_v8.0")));if(ok(d))return true}catch(_){}try{for(var i=0;i<st.length;i++){var k=String(st.key(i)||""),lk=k.toLowerCase();if(lk.indexOf("auth-token")===-1&&lk.indexOf("supabase.auth")===-1)continue;var s=u(p(st.getItem(k)));if(ok(s))return true}}catch(_){}}return false}function path(raw){try{return new URL(String(raw||location.href),location.href).pathname.replace(/^\\/\\(tabs\\)/,"")||"/"}catch(_){return location.pathname||"/"}}function priv(raw){var x=path(raw);if(x.indexOf("/auth")===0||x.indexOf("/legal")===0||x==="/access-denied")return false;if(x==="/perfil/usuario"||x.indexOf("/perfil/usuario/")===0||x==="/perfil/local"||x.indexOf("/perfil/local/")===0)return false;return x==="/perfil"||x.indexOf("/perfil/")===0||x==="/favoritos"||x.indexOf("/favoritos/")===0||x==="/chat"||x.indexOf("/chat/")===0||x==="/crear"||x.indexOf("/crear/")===0||x==="/editar"||x.indexOf("/editar/")===0||x==="/solicitudes"||x.indexOf("/solicitudes/")===0||x==="/gestion"||x.indexOf("/gestion/")===0||x==="/admin"||x.indexOf("/admin/")===0}function en(){if(!a()&&priv(location.href)){location.replace("/auth/login?returnTo="+encodeURIComponent(path(location.href)));return true}return false}if(!en()){addEventListener("popstate",en);document.addEventListener("click",function(ev){if(a())return;var q=ev.target&&ev.target.closest?ev.target.closest("a"):null,h=q&&q.getAttribute("href");if(h&&priv(h)){ev.preventDefault();ev.stopPropagation();location.assign("/auth/login?returnTo="+encodeURIComponent(path(h)))}} ,true)}})();',
  '</script>'
].join('');

const headerScript = [
  '<script id="barlive-header-span-v43">',
  '(function(){"use strict";var bg=null,rail=null,header=null,obs=null,q=false;function desk(){return innerWidth>=1280&&innerHeight>=650&&(innerWidth/Math.max(innerHeight,1))>=1.45}function r(e){try{return e.getBoundingClientRect()}catch(_){return null}}function rgb(v){var m=String(v||"").match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/i);return m?[+m[1],+m[2],+m[3]]:null}function bh(e){var x=r(e);if(!x||x.width<360||x.height<36||x.height>300||x.top<-40||x.top>160)return false;var s;try{s=getComputedStyle(e)}catch(_){return false}var bi=String(s.backgroundImage||"").toLowerCase();if(bi.indexOf("linear-gradient")!==-1)return true;var c=rgb(s.backgroundColor);return !!(c&&c[1]>110&&c[2]>90&&c[0]<110&&c[1]>c[0]*1.15)}function fh(){var a=document.querySelectorAll("header,div"),b=null,bs=-1;for(var i=0;i<a.length;i++){var e=a[i];if(!bh(e))continue;var x=r(e),sc=x.width-Math.abs(x.top)*8;if(sc>bs){bs=sc;b=e}}return b}function left(hr){var a=document.querySelectorAll("nav,aside,div"),e=0;for(var i=0;i<a.length;i++){var x=r(a[i]);if(!x)continue;if(x.left>4||x.height<innerHeight*.72||x.width<55||x.width>330||x.right>hr.left+16)continue;e=Math.max(e,x.right)}return e}function fr(hr){var a=document.querySelectorAll("div,span");for(var i=0;i<a.length;i++){if(String(a[i].textContent||"").trim().toLowerCase()!=="atajos")continue;var p=a[i];for(var d=0;d<7&&p;d++,p=p.parentElement){var x=r(p);if(x&&x.width>=180&&x.width<=440&&x.height>innerHeight*.45&&x.left>hr.right+20)return p}}return null}function clear(){if(bg)bg.style.display="none";if(header){var op=header.getAttribute("data-bl43-pos"),oz=header.getAttribute("data-bl43-z");if(op!==null){if(op)header.style.position=op;else header.style.removeProperty("position");header.removeAttribute("data-bl43-pos")}if(oz!==null){if(oz)header.style.zIndex=oz;else header.style.removeProperty("z-index");header.removeAttribute("data-bl43-z")}header=null}if(rail){var pt=rail.getAttribute("data-bl43-pt");if(pt!==null){if(pt)rail.style.paddingTop=pt;else rail.style.removeProperty("padding-top");rail.removeAttribute("data-bl43-pt")}rail=null}}function app(){clear();if(!desk())return;var h=fh();if(!h)return;var hr=r(h),s=getComputedStyle(h),l=left(hr);if(!bg){bg=document.createElement("div");bg.id="barlive-header-backdrop-v43";bg.setAttribute("aria-hidden","true");document.body.appendChild(bg)}bg.style.display="block";bg.style.position="fixed";bg.style.pointerEvents="none";bg.style.left=Math.max(0,l)+"px";bg.style.right="0";bg.style.top=Math.max(0,hr.top)+"px";bg.style.height=Math.max(1,hr.height)+"px";bg.style.zIndex="40";bg.style.backgroundColor=s.backgroundColor;bg.style.backgroundImage=s.backgroundImage;bg.style.backgroundSize=s.backgroundSize;bg.style.backgroundPosition=s.backgroundPosition;bg.style.boxShadow="0 1px 0 rgba(15,23,42,.06)";header=h;if(header.getAttribute("data-bl43-pos")===null)header.setAttribute("data-bl43-pos",header.style.position||"");if(header.getAttribute("data-bl43-z")===null)header.setAttribute("data-bl43-z",header.style.zIndex||"");if(getComputedStyle(header).position==="static")header.style.position="relative";header.style.zIndex="41";rail=fr(hr);if(rail){if(rail.getAttribute("data-bl43-pt")===null)rail.setAttribute("data-bl43-pt",rail.style.paddingTop||"");rail.style.paddingTop=Math.max(parseFloat(getComputedStyle(rail).paddingTop)||0,Math.max(0,hr.bottom)+18)+"px"}}function sch(){if(q)return;q=true;requestAnimationFrame(function(){q=false;app()})}function start(){app();obs=new MutationObserver(sch);obs.observe(document.documentElement,{subtree:true,childList:true});addEventListener("resize",sch,{passive:true});addEventListener("popstate",function(){setTimeout(sch,0)});document.addEventListener("click",function(){setTimeout(sch,80)},true)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start()})();',
  '</script>'
].join('');

function cleanHtml(content) {
  const ids = [
    'barlive-web-rbac-guest-guard','barlive-web-rbac-guest-guard-v2',
    'barlive-web-desktop-ui-v1','barlive-web-desktop-ui-v2','barlive-web-desktop-ui-v3','barlive-web-desktop-ui-v4','barlive-web-desktop-ui-v5',
    'barlive-stable-web-v43','barlive-cache-reset-v43','barlive-route-guard-v43','barlive-header-span-v43'
  ];
  for (const id of ids) {
    content = removeBlock(content, '<script id="' + id + '">', '</script>');
    content = removeBlock(content, '<style id="' + id + '">', '</style>');
  }
  content = content.replace(/<script>if\('serviceWorker' in navigator\)[\s\S]*?<\/script>/g, '');
  content = content.replace(/(<script src="\/_expo\/static\/js\/web\/entry-[^"?]+\.js)(?:\?[^"]*)?(" defer><\/script>)/, '$1?v=stable-web-v43-20260926$2');
  content = content.replace('</head>', desktopStyle + '\n</head>');
  content = content.replace('</body>', resetScript + '\n' + routeGuard + '\n' + headerScript + '\n</body>');
  return content;
}

for (const path of ['index.html','404.html']) {
  fs.writeFileSync(path, cleanHtml(fs.readFileSync(path,'utf8')));
}

fs.writeFileSync('sw.js', [
  '// BarLive retired service worker v43.',
  "self.addEventListener('install',()=>self.skipWaiting());",
  "self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));await self.registration.unregister();const clients=await self.clients.matchAll({type:'window'});await Promise.all(clients.map(c=>{try{return c.navigate(c.url)}catch(_){return Promise.resolve()}}))})())});"
].join('\n'));

console.log('Stabilized', bundlePath, code.length);
