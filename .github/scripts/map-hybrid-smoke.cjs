const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: 40.4168, longitude: -3.7038 },
    permissions: ['geolocation'],
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  const requests = {
    hybridTiles: [],
    nationalSnapshot: [],
    localesRest: [],
    markerLocalesRest: [],
    viewportStatic: [],
    googlePlaces: [],
  };

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/map-data/hybrid-mvt-v1/') && url.includes('.pbf')) {
      requests.hybridTiles.push(url);
    }
    if (url.includes('/map-data/national-venues-v1.json')) {
      requests.nationalSnapshot.push(url);
    }
    if (url.includes('supabase.co/rest/v1/locales')) {
      requests.localesRest.push(url);
      const decoded = decodeURIComponent(url);
      if (
        decoded.includes('latitud') &&
        decoded.includes('longitud') &&
        (
          decoded.includes('horarios_completos') ||
          decoded.includes('osm_opening_hours') ||
          decoded.includes('barlive_type')
        )
      ) {
        requests.markerLocalesRest.push(url);
      }
    }
    if (url.includes('/map-data/viewport-z9-v1/')) {
      requests.viewportStatic.push(url);
    }
    if (
      /maps\.googleapis\.com|places\.googleapis\.com|maps\.google\.com/i.test(url)
    ) {
      requests.googlePlaces.push(url);
    }
  });

  page.on('console', msg => {
    const text = msg.text();
    if (
      text.includes('[MAP_RENDER][RENDERER]') ||
      text.includes('[MAP_RENDER][HYBRID_') ||
      text.includes('[MAP_RENDER][VIEWPORT_') ||
      text.includes('[MAP_RENDER][BOOTSTRAP]')
    ) {
      console.log('BROWSER:', text);
    }
  });

  const started = Date.now();
  const response = await page.goto(
    'https://barliveapp.es/explorar/mapa?lat=40.4168&lng=-3.7038&hybrid-smoke=20260926-v23',
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
      window.__barliveMap.getLayer('barlive-hybrid-venues-circle') &&
      window.__barliveMap.getLayer('barlive-hybrid-venues-icon'),
    null,
    { timeout: 30000 }
  );

  await frame.waitForFunction(
    () => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        d.rendererMode === 'hybrid' &&
        d.hybridTileFailed === false &&
        Number(window.__barliveMap?.getZoom?.() || 0) >= 12.5;
    },
    null,
    { timeout: 15000 }
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

  await frame.waitForTimeout(250);

  const local = await frame.evaluate(() => {
    const map = window.__barliveMap;
    const features = map.querySourceFeatures(
      'barlive-hybrid-venues',
      { sourceLayer: 'locales' }
    ) || [];
    const ids = features
      .map(f => String(f?.properties?.i || ''))
      .filter(Boolean);

    return {
      zoom: map.getZoom(),
      diagnostics: window.__barliveLastDiagnostics,
      hybridVisibility: map.getLayoutProperty(
        'barlive-hybrid-venues-circle','visibility'
      ),
      hybridIconVisibility: map.getLayoutProperty(
        'barlive-hybrid-venues-icon','visibility'
      ),
      canonicalVisibility: map.getLayoutProperty(
        'barlive-venues-circle','visibility'
      ),
      sourceFeatures: features.length,
      uuidFeatures: ids.length,
      uniqueUuids: new Set(ids).size,
    };
  });

  console.log('V23_LOCAL_START_MS=' + (Date.now() - started));
  console.log('V23_LOCAL=' + JSON.stringify(local));
  console.log('V23_NETWORK_START=' + JSON.stringify({
    hybridTileRequests: requests.hybridTiles.length,
    viewportStaticRequests: requests.viewportStatic.length,
    nationalSnapshotRequests: requests.nationalSnapshot.length,
    localesRestRequests: requests.localesRest.length,
    markerLocalesRestRequests: requests.markerLocalesRest.length,
    googlePlacesRequests: requests.googlePlaces.length,
  }));
  console.log('V23_LOCALES_REST_URLS=' + JSON.stringify(requests.localesRest));
  console.log('V23_MARKER_REST_URLS=' + JSON.stringify(requests.markerLocalesRest));

  if (local.diagnostics?.rendererMode !== 'hybrid') {
    throw new Error('street zoom is not using hybrid renderer');
  }
  if (local.hybridVisibility === 'none') {
    throw new Error('hybrid circle hidden at street zoom');
  }
  if (local.hybridIconVisibility === 'none') {
    throw new Error('hybrid category glyph hidden at street zoom');
  }
  if (local.canonicalVisibility !== 'none') {
    throw new Error('canonical GeoJSON overlaps street hybrid renderer');
  }
  if (local.sourceFeatures <= 0 || local.uniqueUuids <= 0) {
    throw new Error('street overzoom has no interactive MVT venues');
  }
  if (
    requests.viewportStatic.length !== 0 ||
    requests.nationalSnapshot.length !== 0 ||
    requests.markerLocalesRest.length !== 0
  ) {
    throw new Error('street startup used legacy marker data path');
  }
  if (requests.googlePlaces.length !== 0) {
    throw new Error('street startup made a Google Maps/Places request');
  }
  if (requests.hybridTiles.length <= 0) {
    throw new Error('street startup requested no static MVT tiles');
  }

  const beforeNational = {
    tiles: requests.hybridTiles.length,
    viewport: requests.viewportStatic.length,
    national: requests.nationalSnapshot.length,
    rest: requests.markerLocalesRest.length,
    googlePlaces: requests.googlePlaces.length,
  };

  const nationalStarted = Date.now();
  await frame.evaluate(() => {
    window.__barliveMap.jumpTo({ center: [-3.5, 39.8], zoom: 5.35 });
  });

  await frame.waitForFunction(
    () => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        d.rendererMode === 'hybrid' &&
        d.hybridTileFailed === false &&
        Number(window.__barliveMap?.getZoom?.() || 0) < 6;
    },
    null,
    { timeout: 12000 }
  );
  await frame.waitForTimeout(250);

  const national = await frame.evaluate(() => ({
    diagnostics: window.__barliveLastDiagnostics,
    hybridVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-hybrid-venues-circle','visibility'
    ),
    canonicalVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-venues-circle','visibility'
    ),
  }));

  console.log('V23_NATIONAL_MS=' + (Date.now() - nationalStarted));
  console.log('V23_NATIONAL=' + JSON.stringify(national));
  console.log('V23_NETWORK_NATIONAL=' + JSON.stringify({
    hybridTileRequests: requests.hybridTiles.length,
    viewportStaticRequests: requests.viewportStatic.length,
    nationalSnapshotRequests: requests.nationalSnapshot.length,
    localesRestRequests: requests.localesRest.length,
    markerLocalesRestRequests: requests.markerLocalesRest.length,
    googlePlacesRequests: requests.googlePlaces.length,
    viewportStaticUrls: requests.viewportStatic,
    nationalSnapshotUrls: requests.nationalSnapshot,
    localesRestUrls: requests.localesRest,
    markerLocalesRestUrls: requests.markerLocalesRest,
  }));

  if (national.diagnostics?.rendererMode !== 'hybrid') {
    throw new Error('national zoom left hybrid renderer');
  }
  if (national.hybridVisibility === 'none' || national.canonicalVisibility !== 'none') {
    throw new Error('national renderer handoff is not exclusive');
  }
  if (
    requests.viewportStatic.length !== beforeNational.viewport ||
    requests.nationalSnapshot.length !== beforeNational.national ||
    requests.markerLocalesRest.length !== beforeNational.rest
  ) {
    throw new Error('national transition used legacy marker data path');
  }
  if (requests.googlePlaces.length !== beforeNational.googlePlaces) {
    throw new Error('national transition made a Google Maps/Places request');
  }

  const tileCountBeforeFilter = requests.hybridTiles.length;
  await frame.evaluate(() => window.setStateFilter('no_cerrados'));
  await frame.waitForTimeout(150);
  const openFilter = await frame.evaluate(() => ({
    circleOpacity: window.__barliveMap.getPaintProperty(
      'barlive-hybrid-venues-circle','circle-opacity'
    ),
    iconOpacity: window.__barliveMap.getPaintProperty(
      'barlive-hybrid-venues-icon','icon-opacity'
    ),
  }));
  console.log('V23_OPEN_FILTER=' + JSON.stringify(openFilter));

  await frame.evaluate(() => window.setStateFilter('todos'));
  await frame.waitForTimeout(100);

  if (
    requests.viewportStatic.length !== 0 ||
    requests.nationalSnapshot.length !== 0 ||
    requests.markerLocalesRest.length !== 0
  ) {
    throw new Error('Todos/Abiertos triggered legacy marker requests');
  }
  if (requests.googlePlaces.length !== 0) {
    throw new Error('Todos/Abiertos triggered a Google Maps/Places request');
  }
  if (requests.hybridTiles.length !== tileCountBeforeFilter) {
    console.log(
      'V23_FILTER_TILE_REQUEST_DELTA=' +
      (requests.hybridTiles.length - tileCountBeforeFilter)
    );
  }

  const localReturnStarted = Date.now();
  await frame.evaluate(() => {
    window.__barliveMap.jumpTo({ center: [-3.7038, 40.4168], zoom: 13 });
  });

  await frame.waitForFunction(
    () => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        d.rendererMode === 'hybrid' &&
        d.hybridTileFailed === false &&
        Number(window.__barliveMap?.getZoom?.() || 0) >= 12.5;
    },
    null,
    { timeout: 12000 }
  );
  await frame.waitForTimeout(250);

  const returned = await frame.evaluate(() => ({
    diagnostics: window.__barliveLastDiagnostics,
    hybridVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-hybrid-venues-circle','visibility'
    ),
    hybridIconVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-hybrid-venues-icon','visibility'
    ),
    canonicalVisibility: window.__barliveMap.getLayoutProperty(
      'barlive-venues-circle','visibility'
    ),
  }));

  console.log('V23_RETURN_LOCAL_MS=' + (Date.now() - localReturnStarted));
  console.log('V23_RETURN_LOCAL=' + JSON.stringify(returned));
  console.log('V23_NETWORK_FINAL=' + JSON.stringify({
    hybridTileRequests: requests.hybridTiles.length,
    viewportStaticRequests: requests.viewportStatic.length,
    nationalSnapshotRequests: requests.nationalSnapshot.length,
    localesRestRequests: requests.localesRest.length,
    markerLocalesRestRequests: requests.markerLocalesRest.length,
    googlePlacesRequests: requests.googlePlaces.length,
  }));

  if (
    returned.diagnostics?.rendererMode !== 'hybrid' ||
    returned.hybridVisibility === 'none' ||
    returned.hybridIconVisibility === 'none' ||
    returned.canonicalVisibility !== 'none'
  ) {
    throw new Error('return to street zoom is not all-hybrid');
  }
  if (
    requests.viewportStatic.length !== 0 ||
    requests.nationalSnapshot.length !== 0 ||
    requests.markerLocalesRest.length !== 0
  ) {
    throw new Error('normal browse made a legacy marker request');
  }
  if (requests.googlePlaces.length !== 0) {
    throw new Error('normal browse made a Google Maps/Places request');
  }

  console.log('HYBRID_MAP_V23_SMOKE_OK');
  await browser.close();
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
