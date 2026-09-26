const { chromium } = require('playwright');

(async () => {
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({
    geolocation:{latitude:40.4168,longitude:-3.7038},
    permissions:['geolocation'],
    viewport:{width:1440,height:1000}
  });
  const page=await context.newPage();
  const started=Date.now();

  page.on('console',msg=>{
    const text=msg.text();
    if(text.includes('[MAP_RENDER]')) console.log('BROWSER:',text);
  });

  await page.goto(
    'https://barliveapp.es/explorar/mapa?lat=40.4168&lng=-3.7038&style-events-profile=20260926-v14',
    {waitUntil:'domcontentloaded',timeout:60000}
  );
  console.log('OUTER_DOM_MS='+(Date.now()-started));

  await page.waitForSelector('iframe',{timeout:30000});
  const iframe=await page.locator('iframe').first().elementHandle();
  const frame=await iframe.contentFrame();
  if(!frame) throw new Error('iframe missing');
  console.log('IFRAME_MS='+(Date.now()-started));

  await frame.waitForFunction(()=>window.__barliveMap,{timeout:30000});
  console.log('MAP_OBJECT_MS='+(Date.now()-started));

  const probe=await frame.evaluate(()=>{
    const map=window.__barliveMap;
    const result={
      internalLoaded:!!(map.style&&map.style._loaded),
      styleLoaded:map.isStyleLoaded(),
      loaded:map.loaded(),
      addSource:false,
      addLayer:false,
      error:null
    };
    try{
      map.addSource('__barlive_style_probe__',{
        type:'geojson',
        data:{type:'FeatureCollection',features:[]}
      });
      result.addSource=!!map.getSource('__barlive_style_probe__');
      map.addLayer({
        id:'__barlive_style_probe_layer__',
        type:'circle',
        source:'__barlive_style_probe__',
        paint:{'circle-radius':1,'circle-color':'#000000'}
      });
      result.addLayer=!!map.getLayer('__barlive_style_probe_layer__');
      if(map.getLayer('__barlive_style_probe_layer__')) map.removeLayer('__barlive_style_probe_layer__');
      if(map.getSource('__barlive_style_probe__')) map.removeSource('__barlive_style_probe__');
    }catch(err){
      result.error=String(err&&err.message||err);
      try{if(map.getLayer('__barlive_style_probe_layer__')) map.removeLayer('__barlive_style_probe_layer__');}catch(_){}
      try{if(map.getSource('__barlive_style_probe__')) map.removeSource('__barlive_style_probe__');}catch(_){}
    }
    return result;
  });
  console.log('EARLY_STYLE_PROBE='+JSON.stringify(probe));

  const marks=await frame.evaluate(async()=>{
    const map=window.__barliveMap;
    const t0=performance.now();
    const out=[];
    const mark=(name,extra={})=>out.push({name,ms:performance.now()-t0,...extra});

    mark('attach',{
      styleLoaded:map.isStyleLoaded(),
      loaded:map.loaded(),
      internalLoaded:!!(map.style&&map.style._loaded)
    });

    ['styledata','styledataloading','sourcedata','sourcedataloading','load','idle','render'].forEach(name=>{
      map.on(name,()=>{
        if(out.filter(x=>x.name===name).length<3){
          mark(name,{
            styleLoaded:map.isStyleLoaded(),
            loaded:map.loaded(),
            internalLoaded:!!(map.style&&map.style._loaded)
          });
        }
      });
    });

    let seenInternal=false,seenStyle=false,seenLoaded=false;
    const poll=setInterval(()=>{
      const internal=!!(map.style&&map.style._loaded);
      const styleLoaded=map.isStyleLoaded();
      const loaded=map.loaded();
      if(internal&&!seenInternal){seenInternal=true;mark('internal-style-loaded');}
      if(styleLoaded&&!seenStyle){seenStyle=true;mark('isStyleLoaded-true');}
      if(loaded&&!seenLoaded){seenLoaded=true;mark('map-loaded-true');}
    },10);

    await new Promise(resolve=>setTimeout(resolve,2500));
    clearInterval(poll);
    return out;
  });

  console.log('STYLE_EVENT_MARKS='+JSON.stringify(marks));

  await frame.waitForFunction(()=>{
    const d=window.__barliveLastDiagnostics;
    return d && Number(d.sourceFeatures||0)>0;
  },null,{timeout:30000});
  console.log('DATA_VISIBLE_MS='+(Date.now()-started));

  console.log('STYLE_EVENTS_PROFILE_OK');
  await browser.close();
})().catch(err=>{
  console.error(err&&err.stack||err);
  process.exit(1);
});
