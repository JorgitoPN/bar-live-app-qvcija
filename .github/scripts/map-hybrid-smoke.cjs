const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: 40.4168, longitude: -3.7038 },
    permissions: ['geolocation'],
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  try {
    const manifestResponse = await context.request.get(
      'https://barlive-api.onrender.com/api/map/national-snapshot-manifest.json',
      { timeout: 30000 }
    );
    console.log('MAP_CDN_MANIFEST_HTTP=' + manifestResponse.status());
    console.log('MAP_CDN_MANIFEST=' + await manifestResponse.text());
  } catch (error) {
    console.log('MAP_CDN_MANIFEST_ERROR=' + String(error && error.message || error));
  }

  const requests = {
    hybridTiles: [],
    nationalSnapshot: [],
    localesRest: [],
    viewportStatic: [],
  };

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/map/tiles/')) requests.hybridTiles.push(url);
    if (url.includes('/map-data/national-venues-v1.json')) requests.nationalSnapshot.push(url);
    if (url.includes('supabase.co/rest/v1/locales')) requests.localesRest.push(url);
    if (url.includes('/map-data/viewport-z9-v1/')) requests.viewportStatic.push(url);
  });

  page.on('console', msg => {
    const text = msg.text();
    if (
      text.includes('[MAP_RENDER][RENDERER]') ||
      text.includes('[MAP_RENDER][HYBRID_') ||
      text.includes('[MAP_RENDER][COMMIT]') ||
      text.includes('[MAP_RENDER][VIEWPORT_')
    ) {
      console.log('BROWSER:', text);
    }
  });

  const response = await page.goto(
    'https://barliveapp.es/explorar/mapa?lat=40.4168&lng=-3.7038&hybrid-smoke=20260926-v21',
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
    () => window.__barliveMap &&
      window.__barliveMap.getSource('barlive-hybrid-venues') &&
      window.__barliveMap.getSource('barlive-venues'),
    null,
    { timeout: 30000 }
  );

  // Ignore requests produced by the close-zoom startup. We are measuring the
  // national hybrid transition from this point onward.
  Object.keys(requests).forEach(key => requests[key].length = 0);

  const nationalStarted = Date.now();
  await frame.evaluate(() => {
    window.__barliveMap.jumpTo({ center: [-3.5, 39.8], zoom: 5.35 });
  });

  await frame.waitForFunction(
    () => window.__barliveLastDiagnostics &&
      window.__barliveLastDiagnostics.rendererMode === 'hybrid' &&
      window.__barliveLastDiagnostics.hybridTileFailed === false &&
      Number(window.__barliveMap.getZoom()) < 6,
    null,
    { timeout: 12000 }
  );

  await frame.waitForFunction(
    () => {
      try {
        const features = window.__barliveMap.querySourceFeatures(
          'barlive-hybrid-venues',
          { sourceLayer: 'locales' }
        );
        return Array.isArray(features) && features.length > 0;
      } catch (_) {
        return false;
      }
    },
    null,
    { timeout: 30000 }
  );

  await frame.waitForTimeout(350);

  const national = await frame.evaluate(() => {
    const map = window.__barliveMap;
    const features = map.querySourceFeatures(
      'barlive-hybrid-venues',
      { sourceLayer: 'locales' }
    ) || [];
    const ids = [];
    const states = { abierto: 0, cerrado: 0, sin_info: 0, other: 0 };
    for (const feature of features) {
      const props = feature.properties || {};
      const id = String(props.id || feature.id || '');
      if (id) ids.push(id);
      const state = String(props.estado || 'sin_info');
      if (Object.prototype.hasOwnProperty.call(states, state)) states[state] += 1;
      else states.other += 1;
    }
    return {
      zoom: map.getZoom(),
      diagnostics: window.__barliveLastDiagnostics,
      hybridVisibility: map.getLayoutProperty('barlive-hybrid-venues-circle', 'visibility'),
      canonicalVisibility: map.getLayoutProperty('barlive-venues-circle', 'visibility'),
      rawFeatures: features.length,
      uniqueIds: new Set(ids).size,
      states,
    };
  });

  const nationalMs = Date.now() - nationalStarted;
  console.log('HYBRID_NATIONAL_MS=' + nationalMs);
  console.log('HYBRID_NATIONAL=' + JSON.stringify(national));
  console.log('HYBRID_NETWORK=' + JSON.stringify({
    tileRequests: requests.hybridTiles.length,
    nationalSnapshotRequests: requests.nationalSnapshot.length,
    localesRestRequests: requests.localesRest.length,
  }));

  if (national.diagnostics?.rendererMode !== 'hybrid') {
    throw new Error('national renderer is not hybrid');
  }
  if (national.hybridVisibility === 'none') {
    throw new Error('hybrid layer hidden at national zoom');
  }
  if (national.canonicalVisibility !== 'none') {
    throw new Error('canonical layer overlaps hybrid at national zoom');
  }
  if (national.uniqueIds <= 0) {
    throw new Error('hybrid source has no venue ids');
  }
  if (requests.hybridTiles.length <= 0) {
    throw new Error('national hybrid path did not request vector tiles');
  }
  if (requests.nationalSnapshot.length !== 0) {
    throw new Error('120k national snapshot was downloaded on hybrid path');
  }
  if (requests.localesRest.length !== 0) {
    throw new Error('Supabase locales REST was called on national hybrid path');
  }

  // Todos / Abiertos must be an immediate style filter, not a new dataset.
  const tileRequestsBeforeFilter = requests.hybridTiles.length;
  await frame.evaluate(() => window.setStateFilter('no_cerrados'));
  await frame.waitForTimeout(150);
  const openFilter = await frame.evaluate(() => ({
    filter: window.__barliveMap.getFilter('barlive-hybrid-venues-circle'),
    diagnostics: window.__barliveLastDiagnostics,
  }));
  console.log('HYBRID_OPEN_FILTER=' + JSON.stringify(openFilter));
  if (!JSON.stringify(openFilter.filter).includes('abierto')) {
    throw new Error('hybrid Abiertos filter does not target estado=abierto');
  }
  if (requests.nationalSnapshot.length !== 0 || requests.localesRest.length !== 0) {
    throw new Error('filter switch caused a data/API fetch');
  }

  await frame.evaluate(() => window.setStateFilter('todos'));
  await frame.waitForTimeout(100);
  if (requests.hybridTiles.length !== tileRequestsBeforeFilter) {
    // A browser may finish an already-started map tile while we toggle the
    // filter, but setStateFilter itself must not intentionally request data.
    console.log(
      'FILTER_TILE_REQUEST_DELTA=' +
      (requests.hybridTiles.length - tileRequestsBeforeFilter)
    );
  }

  // Zoom in: exact close renderer replaces the image-like tile renderer.
  const localStarted = Date.now();
  await frame.evaluate(() => {
    window.__barliveMap.jumpTo({ center: [-3.7038, 40.4168], zoom: 13 });
  });

  await frame.waitForFunction(
    () => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        d.rendererMode === 'canonical' &&
        Number(d.sourceFeatures || 0) > 0 &&
        Number(d.sourceFeatures || 0) < 20000 &&
        Number(d.datasetGeneration || 0) === Number(d.requestGeneration || 0) &&
        Number(window.__barliveMap.getZoom()) >= 12.5;
    },
    null,
    { timeout: 45000 }
  );

  const local = await frame.evaluate(() => ({
    diagnostics: window.__barliveLastDiagnostics,
    hybridVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-hybrid-venues-circle','visibility'
    ),
    canonicalVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-venues-circle','visibility'
    ),
  }));
  console.log('HYBRID_TO_LOCAL_MS=' + (Date.now() - localStarted));
  console.log('HYBRID_LOCAL=' + JSON.stringify(local));

  if (local.hybridVisibility !== 'none') {
    throw new Error('hybrid layer overlaps canonical at close zoom');
  }
  if (local.canonicalVisibility === 'none') {
    throw new Error('canonical layer is hidden after close-zoom commit');
  }

  // Zoom back out: switch must be immediate and must not resurrect the 120k
  // GeoJSON national snapshot.
  const snapshotBeforeReturn = requests.nationalSnapshot.length;
  const restBeforeReturn = requests.localesRest.length;
  const returnStarted = Date.now();

  await frame.evaluate(() => {
    window.__barliveMap.jumpTo({ center: [-3.5, 39.8], zoom: 5.35 });
  });

  await frame.waitForFunction(
    () => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        d.rendererMode === 'hybrid' &&
        d.hybridTileFailed === false &&
        Number(window.__barliveMap.getZoom()) < 6;
    },
    null,
    { timeout: 15000 }
  );
  await frame.waitForTimeout(250);

  const returned = await frame.evaluate(() => ({
    diagnostics: window.__barliveLastDiagnostics,
    hybridVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-hybrid-venues-circle','visibility'
    ),
    canonicalVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-venues-circle','visibility'
    ),
  }));

  console.log('LOCAL_TO_HYBRID_MS=' + (Date.now() - returnStarted));
  console.log('HYBRID_RETURN=' + JSON.stringify(returned));

  if (returned.hybridVisibility === 'none' || returned.canonicalVisibility !== 'none') {
    throw new Error('renderer handoff back to hybrid is not exclusive');
  }
  if (requests.nationalSnapshot.length !== snapshotBeforeReturn) {
    throw new Error('national GeoJSON snapshot returned after zooming out');
  }
  if (requests.localesRest.length !== restBeforeReturn) {
    throw new Error('Supabase locales REST returned after zooming out');
  }

  console.log('HYBRID_MAP_SMOKE_OK');
  await browser.close();
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
// production-cache-bust-retest: v21-20260926
