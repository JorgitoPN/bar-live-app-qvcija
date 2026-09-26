const { chromium } = require('playwright');

(async () => {
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({
    geolocation:{latitude:40.4168,longitude:-3.7038},
    permissions:['geolocation'],
    viewport:{width:1440,height:1000}
  });
  const page=await context.newPage();

  const navStart=Date.now();
  const relevant=[];
  page.on('requestfinished', req => {
    const url=req.url();
    if (!/jsdelivr|openfreemap|barliveapp\.es\/(?:_expo|map-data)|fonts|sprite|glyph|tiles/i.test(url)) return;
    try {
      const t=req.timing();
      relevant.push({
        url,
        resourceType:req.resourceType(),
        startMs:Math.round(t.startTime-navStart),
        dnsMs:Math.round((t.domainLookupEnd||0)-(t.domainLookupStart||0)),
        connectMs:Math.round((t.connectEnd||0)-(t.connectStart||0)),
        sslMs:Math.round((t.connectEnd||0)-(t.secureConnectionStart||0)),
        ttfbMs:Math.round((t.responseStart||0)-(t.requestStart||0)),
        totalMs:Math.round((t.responseEnd||0)-(t.startTime||0))
      });
    } catch (_) {}
  });

  page.on('console',msg=>{
    const text=msg.text();
    if(text.includes('[MAP_RENDER]')) console.log('BROWSER:',text);
  });

  const response=await page.goto(
    'https://barliveapp.es/explorar/mapa?lat=40.4168&lng=-3.7038&startup-profile=20260926-v13-location',
    {waitUntil:'domcontentloaded',timeout:60000}
  );
  console.log('OUTER_DOMCONTENTLOADED_MS='+(Date.now()-navStart));
  if(!response||response.status()!==200) throw new Error('HTTP '+(response&&response.status()));

  await page.waitForSelector('iframe',{timeout:30000});
  const iframeHandle=await page.locator('iframe').first().elementHandle();
  const frame=await iframeHandle.contentFrame();
  if(!frame) throw new Error('iframe missing');
  console.log('IFRAME_AVAILABLE_MS='+(Date.now()-navStart));

  await frame.waitForFunction(()=>window.__barliveMap,{timeout:30000});
  const mapCreatedMs=Date.now()-navStart;
  console.log('MAP_OBJECT_MS='+mapCreatedMs);

  await frame.waitForFunction(()=>{
    const d=window.__barliveLastDiagnostics;
    return d&&Number(d.datasetGeneration||0)===Number(d.requestGeneration||0)&&Number(d.sourceFeatures||0)>0&&Number(d.sourceFeatures||0)<20000;
  },null,{timeout:45000});
  console.log('LOCAL_DATASET_READY_MS='+(Date.now()-navStart));

  const iframeResources=await frame.evaluate(()=>performance.getEntriesByType('resource').map(e=>({
    name:e.name,startTime:e.startTime,duration:e.duration,
    transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize,
    initiatorType:e.initiatorType
  })).filter(e=>/jsdelivr|openfreemap|barliveapp\.es\/map-data|supabase/i.test(e.name)));
  console.log('IFRAME_RESOURCES='+JSON.stringify(iframeResources));
  console.log('NETWORK_RELEVANT='+JSON.stringify(relevant));

  const nav=await page.evaluate(()=>performance.getEntriesByType('navigation').map(n=>({
    domContentLoadedEventEnd:n.domContentLoadedEventEnd,
    loadEventEnd:n.loadEventEnd,
    responseStart:n.responseStart,
    responseEnd:n.responseEnd,
    transferSize:n.transferSize,
    encodedBodySize:n.encodedBodySize,
    decodedBodySize:n.decodedBodySize
  })));
  console.log('OUTER_NAV='+JSON.stringify(nav));

  console.log('STARTUP_PROFILE_OK');
  await browser.close();
})().catch(err=>{
  console.error(err&&err.stack||err);
  process.exit(1);
});
