const { chromium } = require('playwright');

const URL = 'https://barliveapp.es/explorar/mapa?runtime-smoke=20260926-national-stable-v9';

const fail = (message, details) => {
  console.error('RUNTIME_SMOKE_FAIL:', message, details || '');
  process.exitCode = 1;
  throw new Error(message);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: 40.4168, longitude: -3.7038 },
    permissions: ['geolocation'],
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  let cacheRestoreCount = 0;
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    if (text.includes('[MAP_RENDER][CACHE_RESTORE]')) cacheRestoreCount += 1;
    if (text.includes('[MAP_RENDER]')) console.log('BROWSER:', text);
  });
  page.on('pageerror', err => consoleErrors.push(String(err)));

  const getFrame = async () => {
    await page.waitForSelector('iframe', { timeout: 30000 });
    const iframeHandle = await page.locator('iframe').first().elementHandle();
    const nextFrame = await iframeHandle.contentFrame();
    if (!nextFrame) fail('map iframe not available');
    return nextFrame;
  };

  const waitForDataset = async (targetFrame, requireKnownState) => {
    await targetFrame.waitForFunction(
      requireKnown => {
        const d = window.__barliveLastDiagnostics;
        const known = Number(d?.open || 0) + Number(d?.closed || 0);
        return typeof window.__barliveTestSnapshot === 'function' &&
          window.__barliveMap &&
          d &&
          Number(d.total || 0) > 0 &&
          Number(d.sourceFeatures || 0) > 0 &&
          (!requireKnown || known > 0);
      },
      requireKnownState,
      { timeout: 45000 }
    );
  };

  const started = Date.now();
  const response = await page.goto(URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  if (!response || response.status() !== 200) {
    fail('map route did not return HTTP 200', response && response.status());
  }

  let frame = await getFrame();
  await waitForDataset(frame, true);

  const firstMarkersMs = Date.now() - started;
  console.log('FIRST_MARKERS_MS=' + firstMarkersMs);
  if (firstMarkersMs > 30000) {
    fail('first markers exceeded 30 seconds', firstMarkersMs);
  }

  // v8 can paint the national static snapshot before geolocation resolves.
  // Wait until the local viewport has atomically replaced that 120k dataset
  // before running source/filter/cache assertions.
  await frame.waitForFunction(
    () => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        Number(d.requestGeneration || 0) > 0 &&
        Number(d.datasetGeneration || 0) === Number(d.requestGeneration || 0) &&
        Number(d.sourceFeatures || 0) > 0 &&
        Number(d.sourceFeatures || 0) < 20000 &&
        Number(window.__barliveMap?.getZoom?.() || 0) >= 10;
    },
    null,
    { timeout: 45000 }
  );

  const snapshot = async () => frame.evaluate(() => window.__barliveTestSnapshot());

  const baseline = await snapshot();
  console.log('BASELINE=' + JSON.stringify(baseline));

  if (!baseline || baseline.total <= 0 || baseline.sourceFeatures <= 0) {
    fail('baseline source has no venues', baseline);
  }
  if ((baseline.open + baseline.closed + baseline.unknown) !== baseline.total) {
    fail('state totals do not add up', baseline);
  }
  if ((baseline.open + baseline.closed) <= 0) {
    fail('schedule-derived states are all unknown', baseline);
  }

  const markerArchitecture = await frame.evaluate(() => {
    const map = window.__barliveMap;
    const style = map.getStyle();
    const forbidden = [
      'barlive-realtime-overlay',
      'barlive-static-markers',
      'barlive-emergency-markers',
      'barlive-emergency-marker-canvas',
      'barlive-vector-tiles',
      'locales-source',
      'map-state-overlay'
    ];
    const source = map.getSource('barlive-venues');
    let raw = source && source._data;
    if ((!raw || typeof raw !== 'object') && source && typeof source.serialize === 'function') {
      try {
        const serialized = source.serialize();
        raw = serialized && serialized.data;
      } catch (_) {}
    }
    const features = raw && raw.type === 'FeatureCollection' && Array.isArray(raw.features)
      ? raw.features
      : null;
    const ids = features
      ? features
          .map(f => String((f.properties && (f.properties.venueId || f.properties.id)) || f.id || ''))
          .filter(Boolean)
      : null;
    return {
      hasCanonical: !!source,
      forbiddenPresent: forbidden.filter(id => !!map.getSource(id) || !!map.getLayer(id)),
      rawFeatureCount: ids ? ids.length : null,
      rawUniqueIdCount: ids ? new Set(ids).size : null,
      colorExpression: map.getPaintProperty('barlive-venues-circle', 'circle-color'),
      sourceType: style?.sources?.['barlive-venues']?.type || null
    };
  });
  console.log('ARCHITECTURE=' + JSON.stringify(markerArchitecture));

  if (!markerArchitecture.hasCanonical) fail('canonical venue source missing');
  if (markerArchitecture.sourceType !== 'geojson') {
    fail('canonical venue source is not GeoJSON', markerArchitecture);
  }
  if (markerArchitecture.forbiddenPresent.length) {
    fail('legacy renderer/source present', markerArchitecture.forbiddenPresent);
  }
  if (
    markerArchitecture.rawFeatureCount !== null &&
    markerArchitecture.rawFeatureCount !== markerArchitecture.rawUniqueIdCount
  ) {
    fail('duplicate venue ids detected in canonical FeatureCollection', markerArchitecture);
  }

  await frame.evaluate(() => window.setStateFilter('no_cerrados'));
  await frame.waitForTimeout(500);
  const openOnly = await snapshot();
  console.log('OPEN_ONLY=' + JSON.stringify(openOnly));

  if (
    openOnly.total !== baseline.total ||
    openOnly.open !== baseline.open ||
    openOnly.closed !== baseline.closed ||
    openOnly.unknown !== baseline.unknown
  ) {
    fail('Todos/Abiertos mutated source data or marker state', { baseline, openOnly });
  }
  if (openOnly.expected !== openOnly.open) {
    fail('Abiertos filter expected count does not equal open count', openOnly);
  }

  await frame.evaluate(() => window.setStateFilter('todos'));
  await frame.waitForTimeout(500);
  const restored = await snapshot();
  console.log('RESTORED=' + JSON.stringify(restored));

  if (
    restored.total !== baseline.total ||
    restored.open !== baseline.open ||
    restored.closed !== baseline.closed ||
    restored.unknown !== baseline.unknown
  ) {
    fail('returning to Todos changed canonical state totals', { baseline, restored });
  }

  const refreshStarted = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  frame = await getFrame();
  await waitForDataset(frame, true);

  const refreshMarkersMs = Date.now() - refreshStarted;
  const cachedRefresh = await snapshot();
  console.log('REFRESH_MARKERS_MS=' + refreshMarkersMs);
  console.log('REFRESH_CACHE=' + JSON.stringify(cachedRefresh));
  console.log('CACHE_RESTORE_COUNT=' + cacheRestoreCount);

  if (cacheRestoreCount <= 0) {
    fail('refresh did not restore canonical viewport cache');
  }
  if (
    cachedRefresh.total <= 0 ||
    cachedRefresh.sourceFeatures <= 0 ||
    (cachedRefresh.open + cachedRefresh.closed) <= 0
  ) {
    fail('cache refresh lost canonical venues or schedule states', cachedRefresh);
  }
  if ((cachedRefresh.open + cachedRefresh.closed + cachedRefresh.unknown) !== cachedRefresh.total) {
    fail('cache refresh state totals do not add up', cachedRefresh);
  }

  // Let the network reconciliation finish before movement tests. The cache is
  // first paint only; the same canonical source is then atomically refreshed.
  await frame.waitForFunction(
    () => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        Number(d.requestGeneration || 0) > 0 &&
        Number(d.datasetGeneration || 0) === Number(d.requestGeneration || 0);
    },
    null,
    { timeout: 45000 }
  );

  const refreshed = await snapshot();
  console.log('REFRESHED=' + JSON.stringify(refreshed));

  if (
    refreshed.total <= 0 ||
    refreshed.sourceFeatures <= 0 ||
    (refreshed.open + refreshed.closed) <= 0
  ) {
    fail('refresh reconciliation lost canonical venues or schedule states', refreshed);
  }
  if ((refreshed.open + refreshed.closed + refreshed.unknown) !== refreshed.total) {
    fail('refresh reconciliation state totals do not add up', refreshed);
  }

  const beforeMoveGeneration = Number(refreshed.requestGeneration || 0);
  await frame.evaluate(() => {
    window.__barliveMap.jumpTo({ center: [2.1734, 41.3851], zoom: 13 });
  });

  await frame.waitForFunction(
    generation => {
      const d = window.__barliveLastDiagnostics;
      return d &&
        Number(d.requestGeneration || 0) > generation &&
        Number(d.total || 0) > 0 &&
        Number(d.sourceFeatures || 0) > 0;
    },
    beforeMoveGeneration,
    { timeout: 45000 }
  );
  const barcelona = await snapshot();
  console.log('BARCELONA=' + JSON.stringify(barcelona));

  for (const zoom of [11, 15, 12, 14]) {
    const previous = await frame.evaluate(
      () => Number(window.__barliveLastDiagnostics?.requestGeneration || 0)
    );
    await frame.evaluate(z => window.__barliveMap.jumpTo({ zoom: z }), zoom);
    await frame.waitForTimeout(700);
    const currentState = await snapshot();
    console.log('ZOOM_' + zoom + '=' + JSON.stringify(currentState));
    if (!currentState || currentState.total <= 0 || currentState.sourceFeatures <= 0) {
      fail('markers disappeared after zoom ' + zoom, currentState);
    }
    if (Number(currentState.requestGeneration || 0) < previous) {
      fail('request generation moved backwards after zoom', { previous, currentState });
    }
  }

  const finalState = await frame.evaluate(() => {
    const d = window.__barliveTestSnapshot();
    const source = window.__barliveMap.getSource('barlive-venues');
    let raw = source && source._data;
    if ((!raw || typeof raw !== 'object') && source && typeof source.serialize === 'function') {
      try {
        const serialized = source.serialize();
        raw = serialized && serialized.data;
      } catch (_) {}
    }
    const features = raw && raw.type === 'FeatureCollection' && Array.isArray(raw.features)
      ? raw.features
      : null;
    const ids = features
      ? features
          .map(f => String((f.properties && (f.properties.venueId || f.properties.id)) || f.id || ''))
          .filter(Boolean)
      : null;
    return {
      diagnostics: d,
      rawFeatureCount: ids ? ids.length : null,
      rawUniqueIds: ids ? new Set(ids).size : null,
      hasSource: !!source
    };
  });
  console.log('FINAL=' + JSON.stringify(finalState));

  const measureZoomSettled = async (label, zoom) => {
    const started = Date.now();
    await frame.evaluate(async targetZoom => {
      const map = window.__barliveMap;
      await new Promise(resolve => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        map.once('idle', finish);
        map.jumpTo({ zoom: targetZoom });
        setTimeout(finish, 30000);
      });
    }, zoom);
    const elapsed = Date.now() - started;
    console.log(label + '=' + elapsed);
    return elapsed;
  };

  const iconLayerExists = await frame.evaluate(() =>
    !!window.__barliveMap.getLayer('barlive-venues-icon')
  );
  if (iconLayerExists) {
    await frame.evaluate(() => {
      window.__barliveMap.setLayoutProperty(
        'barlive-venues-icon',
        'visibility',
        'none'
      );
    });
    const noIcons12 = await measureZoomSettled('PERF_NO_ICONS_Z12_MS', 12);
    const noIcons14 = await measureZoomSettled('PERF_NO_ICONS_Z14_MS', 14);

    await frame.evaluate(() => {
      window.__barliveMap.setLayoutProperty(
        'barlive-venues-icon',
        'visibility',
        'visible'
      );
    });
    const icons12 = await measureZoomSettled('PERF_ICONS_Z12_MS', 12);
    const icons14 = await measureZoomSettled('PERF_ICONS_Z14_MS', 14);

    console.log('PERF_ICON_AB=' + JSON.stringify({
      noIcons12,
      noIcons14,
      icons12,
      icons14
    }));
  }

  if (!finalState.hasSource) {
    fail('canonical source missing after movement/zoom', finalState);
  }
  if (
    finalState.rawFeatureCount !== null &&
    finalState.rawFeatureCount !== finalState.rawUniqueIds
  ) {
    fail('canonical FeatureCollection contains duplicate venue ids', finalState);
  }

  const relevantErrors = consoleErrors.filter(text =>
    /barlive|maplibre|map_render|uncaught|typeerror|referenceerror/i.test(text)
  );
  console.log('RELEVANT_CONSOLE_ERRORS=' + JSON.stringify(relevantErrors));
  if (relevantErrors.some(text => /unknown property|uncaught|typeerror|referenceerror/i.test(text))) {
    fail('runtime console contains structural map error', relevantErrors);
  }

  console.log('RUNTIME_MAP_SMOKE_OK');
  await browser.close();
})().catch(async err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
