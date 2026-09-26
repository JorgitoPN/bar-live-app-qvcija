const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: 40.4168, longitude: -3.7038 },
    permissions: ['geolocation'],
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  let sawNationalStatic = false;
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[MAP_RENDER][NATIONAL_STATIC_FETCH]') || text.includes('[MAP_RENDER][NATIONAL_STATIC_MEMORY]')) {
      sawNationalStatic = true;
    }
    if (text.includes('[MAP_RENDER]')) console.log('BROWSER:', text);
  });

  const response = await page.goto(
    'https://barliveapp.es/explorar/mapa?national-zoom-smoke=20260926-v16',
    { waitUntil: 'domcontentloaded', timeout: 60000 }
  );
  if (!response || response.status() !== 200) {
    throw new Error('route HTTP=' + (response && response.status()));
  }

  await page.waitForSelector('iframe', { timeout: 30000 });
  const iframe = await page.locator('iframe').first().elementHandle();
  const frame = await iframe.contentFrame();
  if (!frame) throw new Error('map iframe missing');

  await frame.waitForFunction(
    () => window.__barliveLastDiagnostics &&
      Number(window.__barliveLastDiagnostics.total || 0) > 0 &&
      Number(window.__barliveLastDiagnostics.sourceFeatures || 0) > 0,
    null,
    { timeout: 45000 }
  );

  const before = await frame.evaluate(() => window.__barliveTestSnapshot());
  console.log('LOCAL_BASELINE=' + JSON.stringify(before));

  const started = Date.now();
  const previousGeneration = Number(before.requestGeneration || 0);

  await frame.evaluate(() => {
    window.__barliveMap.jumpTo({
      center: [-3.5, 39.8],
      zoom: 5.35
    });
  });

  await frame.waitForFunction(
    previous => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        Number(d.requestGeneration || 0) > previous &&
        Number(d.datasetGeneration || 0) === Number(d.requestGeneration || 0) &&
        Number(d.sourceFeatures || 0) > 50000;
    },
    previousGeneration,
    { timeout: 150000 }
  );

  const elapsed = Date.now() - started;
  const national = await frame.evaluate(() => {
    const snap = window.__barliveTestSnapshot();
    const map = window.__barliveMap;
    const bounds = map.getBounds();
    const source = map.getSource('barlive-venues');
    let raw = source && source._data;
    if ((!raw || typeof raw !== 'object') && source && typeof source.serialize === 'function') {
      try { raw = source.serialize()?.data; } catch (_) {}
    }
    const features = raw?.type === 'FeatureCollection' && Array.isArray(raw.features)
      ? raw.features
      : [];
    let minLng=Infinity,maxLng=-Infinity,minLat=Infinity,maxLat=-Infinity;
    for (const f of features) {
      const c=f?.geometry?.coordinates;
      if (!Array.isArray(c)) continue;
      minLng=Math.min(minLng,Number(c[0]));
      maxLng=Math.max(maxLng,Number(c[0]));
      minLat=Math.min(minLat,Number(c[1]));
      maxLat=Math.max(maxLat,Number(c[1]));
    }
    return {
      snap,
      mapBounds:{
        west:bounds.getWest(),south:bounds.getSouth(),
        east:bounds.getEast(),north:bounds.getNorth()
      },
      featureExtent:{
        minLng:Number.isFinite(minLng)?minLng:null,
        maxLng:Number.isFinite(maxLng)?maxLng:null,
        minLat:Number.isFinite(minLat)?minLat:null,
        maxLat:Number.isFinite(maxLat)?maxLat:null
      }
    };
  });

  console.log('NATIONAL_LOAD_MS=' + elapsed);
  console.log('NATIONAL=' + JSON.stringify(national));

  if (!sawNationalStatic) throw new Error('national zoom did not use static snapshot');
  if (elapsed > 15000) throw new Error('national static zoom exceeded 15s: '+elapsed);
  if (Number(national.snap?.sourceFeatures || 0) < 100000) {
    throw new Error('national source incomplete: '+JSON.stringify(national.snap));
  }

  console.log('NATIONAL_ZOOM_SMOKE_OK');
  await browser.close();
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
