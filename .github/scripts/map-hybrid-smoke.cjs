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

  // The strict renderer may legitimately have very few known states in a
  // viewport when BarLive has no user-visible schedule for most venues.
  // Give the small schedule-state pass enough time to settle without requiring
  // a minimum number of open/closed venues.
  await frame.waitForTimeout(1800);

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
      scheduleAudit: features.reduce((acc, feature) => {
        const props = feature?.properties || {};
        const sid = Number(props.s ?? feature?.id);
        let state = 'unknown';
        if (Number.isFinite(sid)) {
          try {
            state = String(map.getFeatureState({
              source:'barlive-hybrid-venues',
              sourceLayer:'locales',
              id:sid
            })?.markerState || 'unknown');
          } catch (_) {}
        }
        const h = props.h != null && String(props.h).trim() !== '' &&
          String(props.h).trim() !== '{}' && String(props.h).trim() !== '[]';
        const o = props.o != null && String(props.o).trim() !== '';
        if (state === 'open') {
          acc.open += 1;
          if (!h && !o) acc.openWithoutAnySchedule += 1;
          else if (!h && o) acc.openFromOsmOnly += 1;
          else if (h) acc.openWithBarLiveSchedule += 1;
        }
        return acc;
      }, {
        open:0,
        openWithoutAnySchedule:0,
        openFromOsmOnly:0,
        openWithBarLiveSchedule:0
      }),
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

  // Regression: clicking a coloured marker must use the full live venue row for
  // the popup and preserve the rich pre-hybrid popup design/information.
  const popupTarget = await frame.evaluate(() => {
    const map = window.__barliveMap;
    const features = map.querySourceFeatures(
      'barlive-hybrid-venues',
      { sourceLayer: 'locales' }
    ) || [];

    for (const feature of features) {
      const props = feature?.properties || {};
      const id = String(props.i || '');
      const sid = Number(props.s ?? feature?.id);
      const coords = feature?.geometry?.coordinates;
      if (!id || !Number.isFinite(sid) || !Array.isArray(coords)) continue;

      let state = 'unknown';
      try {
        state = String(map.getFeatureState({
          source:'barlive-hybrid-venues',
          sourceLayer:'locales',
          id:sid
        })?.markerState || 'unknown');
      } catch (_) {}

      if (state !== 'open' && state !== 'closed') continue;

      return {
        id,
        state,
        coordinates: {
          lng:Number(coords[0]),
          lat:Number(coords[1])
        }
      };
    }
    return null;
  });

  if (!popupTarget) {
    throw new Error('No real coloured venue available for popup regression');
  }

  await frame.evaluate((target) => {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type:'map_popup_request',
      id:target.id,
      markerState:target.state,
      coordinates:target.coordinates
    }));
  }, popupTarget);

  await frame.waitForSelector('.custom-popup .popup-info', { timeout: 12000 });
  await frame.waitForSelector('.custom-popup .popup-btn', { timeout: 12000 });

  const popupAudit = await frame.evaluate(() => {
    const popup = document.querySelector('.custom-popup');
    const title = popup?.querySelector('.popup-title')?.textContent?.trim() || '';
    const category = popup?.querySelector('.popup-category')?.textContent?.trim() || '';
    const button = popup?.querySelector('.popup-btn')?.textContent?.trim() || '';
    const text = popup?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const info = !!popup?.querySelector('.popup-info');
    const richImageClass =
      !!popup?.querySelector('.popup-img') ||
      !popup?.querySelector('img');
    return { title, category, button, text, info, richImageClass };
  });

  console.log('V24_POPUP_TARGET=' + JSON.stringify(popupTarget));
  console.log('V24_POPUP_AUDIT=' + JSON.stringify(popupAudit));

  if (!popupAudit.info || !popupAudit.title || !popupAudit.category) {
    throw new Error('Rich popup structure/information was not restored');
  }
  if (!/Ver detalles/i.test(popupAudit.button)) {
    throw new Error('Restored popup detail button is missing');
  }
  if (/Sin información de horario/i.test(popupAudit.text)) {
    throw new Error(
      'Popup says no schedule for a marker whose live map state is ' +
      popupTarget.state
    );
  }
  if (!popupAudit.richImageClass) {
    throw new Error('Popup image does not use restored rich popup class');
  }

  const openPopupTarget = await frame.evaluate(() => {
    const map = window.__barliveMap;
    const features = map.querySourceFeatures(
      'barlive-hybrid-venues',
      { sourceLayer: 'locales' }
    ) || [];

    for (const feature of features) {
      const props = feature?.properties || {};
      const id = String(props.i || '');
      const sid = Number(props.s ?? feature?.id);
      const coords = feature?.geometry?.coordinates;
      if (!id || !Number.isFinite(sid) || !Array.isArray(coords)) continue;

      let state = 'unknown';
      try {
        state = String(map.getFeatureState({
          source:'barlive-hybrid-venues',
          sourceLayer:'locales',
          id:sid
        })?.markerState || 'unknown');
      } catch (_) {}

      if (state !== 'open') continue;
      return {
        id,
        state,
        coordinates:{lng:Number(coords[0]),lat:Number(coords[1])}
      };
    }
    return null;
  });

  if (!openPopupTarget) {
    throw new Error('No real open venue available for popup regression');
  }

  await frame.evaluate((target) => {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type:'map_popup_request',
      id:target.id,
      markerState:target.state,
      coordinates:target.coordinates
    }));
  }, openPopupTarget);

  await frame.waitForFunction(
    (targetId) => {
      const popup = document.querySelector('.custom-popup');
      const text = popup?.textContent || '';
      return /Abierto/i.test(text) && !/Sin información de horario/i.test(text);
    },
    openPopupTarget.id,
    { timeout: 12000 }
  );

  const openPopupAudit = await frame.evaluate(() => {
    const popup=document.querySelector('.custom-popup');
    return {
      text:popup?.textContent?.replace(/\s+/g,' ').trim()||'',
      title:popup?.querySelector('.popup-title')?.textContent?.trim()||'',
      button:popup?.querySelector('.popup-btn')?.textContent?.trim()||''
    };
  });

  console.log('V24_OPEN_POPUP_TARGET=' + JSON.stringify(openPopupTarget));
  console.log('V24_OPEN_POPUP_AUDIT=' + JSON.stringify(openPopupAudit));

  if (!/Abierto/i.test(openPopupAudit.text)) {
    throw new Error('Open marker popup does not report open schedule');
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
  await frame.waitForTimeout(500);
  const openFilter = await frame.evaluate(() => {
    const map = window.__barliveMap;
    const features = map.querySourceFeatures(
      'barlive-hybrid-venues',
      { sourceLayer: 'locales' }
    ) || [];

    let open = 0;
    let openWithoutAnySchedule = 0;
    let openFromOsmOnly = 0;
    let openWithBarLiveSchedule = 0;
    let unscheduledMarkedOpen = 0;

    for (const feature of features) {
      const props = feature?.properties || {};
      const sid = Number(props.s ?? feature?.id);
      let state = 'unknown';
      if (Number.isFinite(sid)) {
        try {
          state = String(map.getFeatureState({
            source:'barlive-hybrid-venues',
            sourceLayer:'locales',
            id:sid
          })?.markerState || 'unknown');
        } catch (_) {}
      }

      const hText = props.h == null ? '' : String(props.h).trim();
      const oText = props.o == null ? '' : String(props.o).trim();
      const hasBarLiveSchedule =
        hText !== '' && hText !== '{}' && hText !== '[]';
      const hasOsmSchedule = oText !== '';

      if (state === 'open') {
        open += 1;
        if (!hasBarLiveSchedule && !hasOsmSchedule) {
          openWithoutAnySchedule += 1;
          unscheduledMarkedOpen += 1;
        } else if (!hasBarLiveSchedule && hasOsmSchedule) {
          openFromOsmOnly += 1;
        } else {
          openWithBarLiveSchedule += 1;
        }
      }
    }

    return {
      circleOpacity: map.getPaintProperty(
        'barlive-hybrid-venues-circle','circle-opacity'
      ),
      circleStrokeOpacity: map.getPaintProperty(
        'barlive-hybrid-venues-circle','circle-stroke-opacity'
      ),
      iconOpacity: map.getPaintProperty(
        'barlive-hybrid-venues-icon','icon-opacity'
      ),
      stateAudit: {
        open,
        openWithoutAnySchedule,
        openFromOsmOnly,
        openWithBarLiveSchedule,
        unscheduledMarkedOpen,
      }
    };
  });
  console.log('V23_OPEN_FILTER=' + JSON.stringify(openFilter));

  if (
    JSON.stringify(openFilter.circleOpacity) !==
    JSON.stringify(openFilter.circleStrokeOpacity)
  ) {
    throw new Error('Open-only stroke visibility differs from marker fill visibility');
  }
  if (openFilter.stateAudit.unscheduledMarkedOpen !== 0) {
    throw new Error(
      'Open-only contains venues without schedule data: ' +
      openFilter.stateAudit.unscheduledMarkedOpen
    );
  }
  if (openFilter.stateAudit.openFromOsmOnly !== 0) {
    throw new Error(
      'Open-only still trusts OSM-only hours while BarLive has no visible schedule: ' +
      openFilter.stateAudit.openFromOsmOnly
    );
  }

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

  // Public-cost regression: normal Explore and Venue Detail browsing must
  // never reach billable Google Places/Street View API endpoints.
  const paidGoogleRequests = [];
  const isPaidGoogleUrl = (url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();
      if (host === 'places.googleapis.com') return true;
      return host === 'maps.googleapis.com' &&
        (path.startsWith('/maps/api/place/') || path.startsWith('/maps/api/streetview'));
    } catch (_) {
      return false;
    }
  };

  const explorePage = await context.newPage();
  explorePage.on('request', req => {
    if (isPaidGoogleUrl(req.url())) paidGoogleRequests.push(req.url());
  });
  await explorePage.goto(
    'https://barliveapp.es/explorar?google-cost-smoke=20260926',
    { waitUntil:'domcontentloaded', timeout:60000 }
  );
  await explorePage.waitForTimeout(2500);
  const exploreGuard = await explorePage.evaluate(() =>
    typeof window.__barliveGooglePaidApiBlocked === 'function'
  );

  const detailPage = await context.newPage();
  detailPage.on('request', req => {
    if (isPaidGoogleUrl(req.url())) paidGoogleRequests.push(req.url());
  });
  await detailPage.goto(
    'https://barliveapp.es/detalle/local?id=' +
      encodeURIComponent(openPopupTarget.id) +
      '&google-cost-smoke=20260926',
    { waitUntil:'domcontentloaded', timeout:60000 }
  );
  await detailPage.waitForTimeout(3000);
  const detailGuard = await detailPage.evaluate(() =>
    typeof window.__barliveGooglePaidApiBlocked === 'function'
  );

  console.log('PUBLIC_GOOGLE_COST_GUARD=' + JSON.stringify({
    exploreGuard,
    detailGuard,
    paidGoogleRequestCount: paidGoogleRequests.length,
    paidGoogleRequests,
  }));

  if (!exploreGuard || !detailGuard) {
    throw new Error('Public Google paid-API browser guard is missing');
  }
  if (paidGoogleRequests.length !== 0) {
    throw new Error(
      'Public Explore/Detail made paid Google requests: ' +
      JSON.stringify(paidGoogleRequests)
    );
  }

  console.log('PUBLIC_GOOGLE_COST_SMOKE_OK');
  console.log('HYBRID_MAP_V23_SMOKE_OK');
  await browser.close();
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
