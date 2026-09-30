(function(){
  "use strict";
  if(window.__BARLIVE_MOBILE_TOUCH_SCROLL_V85__)return;
  window.__BARLIVE_MOBILE_TOUCH_SCROLL_V85__=true;

  var mq=window.matchMedia&&window.matchMedia("(hover: none), (pointer: coarse)");
  if(!mq||!mq.matches)return;

  function ensureStyle(){
    var id="barlive-mobile-touch-scroll-v85-style";
    if(document.getElementById(id))return;
    var style=document.createElement("style");
    style.id=id;
    style.textContent=[
      '@media (hover: none), (pointer: coarse){',
      '[data-testid="barlive-content-frame"]{touch-action:manipulation!important;-webkit-overflow-scrolling:touch;overscroll-behavior-y:auto}',
      '[data-testid="barlive-content-frame"] button,[data-testid="barlive-content-frame"] a,[data-testid="barlive-content-frame"] [role="button"],[data-testid="barlive-content-frame"] [tabindex="0"]{touch-action:manipulation!important}',
      '[data-testid="barlive-content-frame"] [style*="overflow-y: auto"],[data-testid="barlive-content-frame"] [style*="overflow-y: scroll"],[data-testid="barlive-content-frame"] [style*="overflow: auto"],[data-testid="barlive-content-frame"] [style*="overflow: scroll"]{-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain}',
      '[data-testid="barlive-content-frame"] iframe,[data-testid="barlive-content-frame"] canvas,[data-testid="barlive-content-frame"] video,[data-testid="barlive-content-frame"] [role="slider"],[data-testid="barlive-content-frame"] input[type="range"],[data-testid="barlive-content-frame"] [data-testid*="map"]{touch-action:auto!important}',
      '}'
    ].join("");
    (document.head||document.documentElement).appendChild(style);
  }

  function getFrame(){
    return document.querySelector('[data-testid="barlive-content-frame"]');
  }
  function excluded(target){
    return !!(target&&target.closest&&target.closest([
      "iframe","canvas","video","input","textarea","select",
      '[contenteditable="true"]','[role="slider"]','[data-testid*="map"]',
      ".maplibregl-map",".leaflet-container"
    ].join(",")));
  }
  function nativeScrollableY(el){
    if(!el||!el.getBoundingClientRect)return false;
    var cs=getComputedStyle(el),oy=cs.overflowY;
    return (oy==="auto"||oy==="scroll")&&el.scrollHeight>el.clientHeight+6;
  }
  function fallbackScrollableY(el,frame){
    if(nativeScrollableY(el))return true;
    return el===frame&&el.scrollHeight>el.clientHeight+6;
  }
  function nearest(target,frame){
    var node=target,depth=0,stop=frame&&frame.parentElement;
    while(node&&node!==stop&&depth<18){
      if(nativeScrollableY(node))return node;
      node=node.parentElement;depth++;
    }
    return null;
  }
  function visible(el){
    if(!el||el.getAttribute("aria-hidden")==="true")return false;
    var cs=getComputedStyle(el);
    if(cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity||"1")<=.01)return false;
    var r=el.getBoundingClientRect();
    return r.width>1&&r.height>60&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
  }
  function fallback(target,frame){
    if(!frame||nearest(target,frame))return null;
    var candidates=[frame].concat([].slice.call(frame.querySelectorAll("div,main,section,article")));
    var best=null,bestScore=-Infinity;
    for(var i=0;i<candidates.length;i++){
      var el=candidates[i];
      if(!fallbackScrollableY(el,frame)||!visible(el))continue;
      if(el.closest&&el.closest('[data-testid*="map"],.maplibregl-map,.leaflet-container'))continue;
      var r=el.getBoundingClientRect();
      var vh=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);
      var vw=Math.min(r.right,innerWidth)-Math.max(r.left,0);
      var range=el.scrollHeight-el.clientHeight;
      var score=Math.max(0,vh)*Math.max(0,vw)+Math.min(range,5000)*20;
      if(score>bestScore){best=el;bestScore=score}
    }
    return best;
  }

  var scroller=null,startX=0,startY=0,lastY=0,axis=null;
  function reset(){scroller=null;startX=0;startY=0;lastY=0;axis=null}

  function onStart(e){
    if(!e.touches||e.touches.length!==1){reset();return}
    var target=e.target,frame=getFrame();
    if(!frame||!(target instanceof HTMLElement)||excluded(target)){reset();return}
    var t=e.touches[0];
    startX=t.clientX;startY=t.clientY;lastY=t.clientY;axis=null;
    scroller=fallback(target,frame);
  }
  function onMove(e){
    if(!scroller||!e.touches||e.touches.length!==1)return;
    var t=e.touches[0],dx=t.clientX-startX,dyTotal=t.clientY-startY;
    if(!axis&&(Math.abs(dx)>6||Math.abs(dyTotal)>6))axis=Math.abs(dyTotal)>=Math.abs(dx)?"y":"x";
    if(axis==="x"){scroller=null;return}
    if(axis!=="y")return;
    var dy=t.clientY-lastY;
    if(Math.abs(dy)<.5)return;
    var max=scroller.scrollHeight-scroller.clientHeight;
    var next=Math.max(0,Math.min(max,scroller.scrollTop-dy));
    if(Math.abs(next-scroller.scrollTop)<.5){lastY=t.clientY;return}
    e.preventDefault();
    scroller.scrollTop=next;
    lastY=t.clientY;
  }

  ensureStyle();
  document.addEventListener("touchstart",onStart,{capture:true,passive:true});
  document.addEventListener("touchmove",onMove,{capture:true,passive:false});
  document.addEventListener("touchend",reset,{capture:true,passive:true});
  document.addEventListener("touchcancel",reset,{capture:true,passive:true});
})();