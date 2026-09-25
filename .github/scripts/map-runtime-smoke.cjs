const { chromium } = require('playwright');

const URL = 'https://barliveapp.es/explorar/mapa?runtime-smoke=20260926-raceguard';
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
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    if (text.includes('[MAP_RENDER]')) {
      console.log('BROWSER:', text);
    }
  });
  page.on('pageerror', err => consoleErrors.push(String(err)));

  const started = Date.now();
  const response = await page.goto(URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  if (!response || response.status() !== 200) {
    fail('map route did not return HTTP 200', response && response.status());
  }

  await page.waitForSelector('iframe', { timeout: 30000 });
  const iframeHandle = await page.locator('iframe').first().elementHandle();
  const frame = await iframeHandle.contentFrame();
  if (!frame) fail('map iframe not available');

  await frame.waitForFunction(
    () => typeof window.__barliveTestSnapshot === 'function' &&
          window.__barliveMap &&
          window.__barliveLastDiagnostics &&
          Number(window.__barliveLastDiagnostics.total || 0) > 0,
    null,
    { timeout: 30000 }
  );

  const firstMarkersMs = Date.now() - started;
  console.log('FIRST_MARKERS_MS=' + firstMarkersMs);
  if (firstMarkersMs > 30000) {
    fail('first markers exceeded 30 seconds', firstMarkersMs);
  }

  const snapshot = async () => frame.evaluate(() => window.__barliveTestSnapshot());
  const baseline = await snapshot();
  console.log('BASELINE=' + JSON.stringify(baseline));

  if (!baseline || baseline.total <= 0 || baseline.sourceFeatures <= 0) {
    fail('baseline source has no venues', baseline);
  }
  if ((baseline.open + baseline.closed + baseline.unknown) !== baseline.total) {
    fail('state totals do not add up', baseline);
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
    const sourceFeatures = map.querySourceFeatures('barlive-venues') || [];
    const ids = sourceFeatures
      .map(f => String((f.properties && (f.properties.venueId || f.properties.id)) || f.id || ''))
      .filter(Boolean);
    return {
      hasCanonical: !!map.getSource('barlive-venues'),
      forbiddenPresent: forbidden.filter(id => !!map.getSource(id) || !!map.getLayer(id)),
      sourceFeatureCount: ids.length,
      uniqueIdCount: new Set(ids).size,
      colorExpression: map.getPaintProperty('barlive-venues-circle', 'circle-color')
    };
  });
  console.log('ARCHITECTURE=' + JSON.stringify(markerArchitecture));
  if (!markerArchitecture.hasCanonical) fail('canonical venue source missing');
  if (markerArchitecture.forbiddenPresent.length) {
    fail('legacy renderer/source present', markerArchitecture.forbiddenPresent);
  }
  if (markerArchitecture.sourceFeatureCount !== markerArchitecture.uniqueIdCount) {
    fail('duplicate venue ids detected in canonical source', markerArchitecture);
  }

  await frame.evaluate(() => window.setStateFilter('no_cerrados'));
  await frame.waitForTimeout(350);
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
  await frame.waitForTimeout(350);
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

  const beforeMoveGeneration = Number(restored.requestGeneration || 0);
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
    { timeout: 30000 }
  );
  const barcelona = await snapshot();
  console.log('BARCELONA=' + JSON.stringify(barcelona));

  for (const zoom of [11, 15, 12, 14]) {
    const previous = await frame.evaluate(() => Number(window.__barliveLastDiagnostics?.requestGeneration || 0));
    await frame.evaluate(z => window.__barliveMap.jumpTo({ zoom: z }), zoom);
    await frame.waitForTimeout(500);
    const current = await snapshot();
    console.log('ZOOM_' + zoom + '=' + JSON.stringify(current));
    if (!current || current.total <= 0 || current.sourceFeatures <= 0) {
      fail('markers disappeared after zoom ' + zoom, current);
    }
    if (Number(current.requestGeneration || 0) < previous) {
      fail('request generation moved backwards after zoom', { previous, current });
    }
  }

  const finalState = await frame.evaluate(() => {
    const d = window.__barliveTestSnapshot();
    const features = window.__barliveMap.querySourceFeatures('barlive-venues') || [];
    const ids = features
      .map(f => String((f.properties && (f.properties.venueId || f.properties.id)) || f.id || ''))
      .filter(Boolean);
    return {
      diagnostics: d,
      ids: ids.length,
      uniqueIds: new Set(ids).size,
      hasSource: !!window.__barliveMap.getSource('barlive-venues')
    };
  });
  console.log('FINAL=' + JSON.stringify(finalState));

  if (!finalState.hasSource || finalState.ids !== finalState.uniqueIds) {
    fail('canonical source unstable after movement/zoom', finalState);
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
