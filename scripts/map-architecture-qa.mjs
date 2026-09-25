import fs from 'node:fs';
import { chromium } from 'playwright';

const URL = 'https://barliveapp.es/explorar/mapa?lat=40.4168&lng=-3.7038';
const results = [];
const failures = [];

function record(name, ok, details = {}) {
  const row = { name, ok, ...details };
  results.push(row);
  if (!ok) failures.push(row);
  console.log('[QA]', ok ? 'PASS' : 'FAIL', name, JSON.stringify(details));
}

async function findMapFrame(page, timeout = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      try {
        const ready = await frame.evaluate(() =>
          !!window.__barliveMap &&
          typeof window.__barliveTestSnapshot === 'function' &&
          typeof window.__barliveIdentity === 'function'
        );
        if (ready) return frame;
      } catch {}
    }
    await page.waitForTimeout(250);
  }
  throw new Error('BarLive map iframe did not expose the single-source diagnostics');
}

async function waitForMapData(frame, timeout = 60000) {
  await frame.waitForFunction(() => {
    const snap = window.__barliveTestSnapshot && window.__barliveTestSnapshot();
    return snap && snap.total > 0 && snap.knownStates > 0;
  }, null, { timeout });
  return frame.evaluate(() => window.__barliveTestSnapshot());
}

async function waitIdle(frame, action) {
  await frame.evaluate(async (payload) => {
    const map = window.__barliveMap;
    await new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      map.once('idle', finish);
      if (payload.kind === 'jump') {
        map.jumpTo(payload.options);
      } else if (payload.kind === 'pan') {
        map.panBy(payload.offset, { duration: payload.duration || 0 });
      }
      setTimeout(finish, 8000);
    });
  }, action);
  await frame.waitForTimeout(120);
}

async function geometryStats(frame) {
  return frame.evaluate(() => {
    const map = window.__barliveMap;
    const source = map.querySourceFeatures('barlive-venues', { sourceLayer: 'locales' }) || [];
    const sourceIds = [];
    const sourceSeen = new Set();
    for (const f of source) {
      const id = String(f?.properties?.id || f?.id || '');
      if (id && !sourceSeen.has(id)) {
        sourceSeen.add(id);
        sourceIds.push(id);
      }
    }
    sourceIds.sort();

    let hash = 2166136261;
    for (const id of sourceIds) {
      for (let i = 0; i < id.length; i++) {
        hash ^= id.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
    }

    const rendered = map.queryRenderedFeatures(undefined, {
      layers: ['barlive-venues-circle']
    }) || [];
    const renderedIds = rendered
      .map(f => String(f?.properties?.id || f?.id || ''))
      .filter(Boolean);
    const uniqueRendered = new Set(renderedIds);

    const duplicateCounts = {};
    for (const id of renderedIds) duplicateCounts[id] = (duplicateCounts[id] || 0) + 1;
    const duplicateIds = Object.entries(duplicateCounts)
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));

    return {
      sourceUnique: sourceIds.length,
      sourceHash: String(hash >>> 0),
      renderedRaw: renderedIds.length,
      renderedUnique: uniqueRendered.size,
      duplicateIds
    };
  });
}

async function closestRendered(frame, limit = 3) {
  return frame.evaluate((n) => {
    const map = window.__barliveMap;
    const center = map.getCenter();
    const features = map.queryRenderedFeatures(undefined, {
      layers: ['barlive-venues-circle']
    }) || [];
    const seen = new Set();
    return features
      .map(f => {
        const id = String(f?.properties?.id || f?.id || '');
        const c = f?.geometry?.coordinates;
        if (!id || !Array.isArray(c) || seen.has(id)) return null;
        seen.add(id);
        const dx = Number(c[0]) - center.lng;
        const dy = Number(c[1]) - center.lat;
        return { id, lng: Number(c[0]), lat: Number(c[1]), d2: dx*dx + dy*dy };
      })
      .filter(Boolean)
      .sort((a,b) => a.d2 - b.d2)
      .slice(0,n);
  }, limit);
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    geolocation: { latitude: 40.4168, longitude: -3.7038 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();
  const network = { state: [], tiles: [] };
  const mapErrors = [];

  page.on('response', response => {
    const url = response.url();
    if (url.includes('/functions/v1/map-marker-state')) network.state.push(response.status());
    if (url.includes('/functions/v1/map-static-tile/')) network.tiles.push(response.status());
  });
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[MAP_RENDER][MAP_ERROR]')) mapErrors.push(text);
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let frame = await findMapFrame(page);
  let snap = await waitForMapData(frame);

  record('cold load has venue geometry', snap.total > 0, snap);
  record('state feed loaded known states', snap.knownStates > 0, { knownStates: snap.knownStates });
  record('unknown venues are retained', snap.unknown > 0, { unknown: snap.unknown, total: snap.total });
  record(
    'state partition equals source total',
    snap.open + snap.closed + snap.unknown === snap.total,
    { open: snap.open, closed: snap.closed, unknown: snap.unknown, total: snap.total }
  );

  let geo = await geometryStats(frame);
  record('no duplicate rendered venue_id on cold load', geo.duplicateIds.length === 0, geo);

  const colorBefore = await frame.evaluate(() =>
    JSON.stringify(window.__barliveMap.getPaintProperty('barlive-venues-circle','circle-color'))
  );
  await frame.evaluate(() => window.setStateFilter('no_cerrados'));
  await frame.waitForTimeout(150);
  const openSnap = await frame.evaluate(() => window.__barliveTestSnapshot());
  const colorOpen = await frame.evaluate(() =>
    JSON.stringify(window.__barliveMap.getPaintProperty('barlive-venues-circle','circle-color'))
  );
  record(
    'Abiertos is visibility-only',
    openSnap.expected === openSnap.open && colorOpen === colorBefore,
    { expected: openSnap.expected, open: openSnap.open, colorUnchanged: colorOpen === colorBefore }
  );
  await frame.evaluate(() => window.setStateFilter('todos'));
  await frame.waitForTimeout(150);
  const allAgain = await frame.evaluate(() => window.__barliveTestSnapshot());
  const colorAfter = await frame.evaluate(() =>
    JSON.stringify(window.__barliveMap.getPaintProperty('barlive-venues-circle','circle-color'))
  );
  record(
    'Todos restores visibility without recoloring',
    colorAfter === colorBefore && allAgain.expected >= openSnap.expected,
    { expectedAll: allAgain.expected, expectedOpen: openSnap.expected, colorUnchanged: colorAfter === colorBefore }
  );

  await waitIdle(frame, { kind:'jump', options:{ center:[-3.7038,40.4168], zoom:13 } });
  const before30 = await geometryStats(frame);
  await page.waitForTimeout(30000);
  const after30 = await geometryStats(frame);
  record(
    'geometry stable after 30 seconds idle',
    before30.sourceUnique === after30.sourceUnique && before30.sourceHash === after30.sourceHash,
    { before: before30, after: after30 }
  );

  const candidates = await closestRendered(frame, 3);
  record('identity candidates available', candidates.length > 0, { candidates });
  for (const candidate of candidates) {
    let initialState = null;
    let stable = true;
    const trace = [];
    for (const zoom of [10,12,14,16]) {
      await waitIdle(frame, {
        kind:'jump',
        options:{ center:[candidate.lng,candidate.lat], zoom }
      });
      const identity = await frame.evaluate(id => window.__barliveIdentity([id])[0], candidate.id);
      if (initialState === null) initialState = identity.markerState;
      if (!identity.visible || identity.markerState !== initialState) stable = false;
      trace.push({ zoom, ...identity });
    }
    record('venue identity stable across zooms: '+candidate.id, stable, { trace });
  }

  // Rapid movement: final viewport must settle with one renderer and no duplicate IDs.
  await waitIdle(frame, { kind:'jump', options:{ center:[-3.7038,40.4168], zoom:12 } });
  await frame.evaluate(() => {
    const map = window.__barliveMap;
    map.jumpTo({ center:[-0.3763,39.4699], zoom:12 });
    map.jumpTo({ center:[2.1734,41.3851], zoom:12 });
    map.jumpTo({ center:[-3.7038,40.4168], zoom:12 });
  });
  await frame.waitForTimeout(1500);
  geo = await geometryStats(frame);
  record('rapid movement settles without duplicate venue_id', geo.duplicateIds.length === 0 && geo.sourceUnique > 0, geo);

  record(
    'state endpoint returned HTTP 200',
    network.state.includes(200),
    { statuses: network.state }
  );
  record(
    'static tile requests have no HTTP errors',
    network.tiles.length > 0 && network.tiles.every(s => s === 200),
    { sample: network.tiles.slice(0,20), count: network.tiles.length }
  );
  record('no MapLibre marker pipeline errors', mapErrors.length === 0, { mapErrors });

  // Direct route refresh.
  await page.reload({ waitUntil:'domcontentloaded', timeout:60000 });
  frame = await findMapFrame(page);
  snap = await waitForMapData(frame);
  record(
    'direct refresh keeps states and geometry',
    snap.total > 0 && snap.knownStates > 0 && snap.unknown > 0,
    snap
  );

  await context.close();
}

async function runMobileWeb(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    geolocation: { latitude: 40.4168, longitude: -3.7038 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil:'domcontentloaded', timeout:60000 });
  const frame = await findMapFrame(page);
  const snap = await waitForMapData(frame);
  const geo = await geometryStats(frame);
  record(
    'mobile web single-source render',
    snap.total > 0 && snap.unknown > 0 && geo.duplicateIds.length === 0,
    { snapshot:snap, geometry:geo }
  );
  await context.close();
}

const browser = await chromium.launch({ headless:true });
try {
  await runDesktop(browser);
  await runMobileWeb(browser);
} finally {
  await browser.close();
}

const report = {
  url: URL,
  generatedAt: new Date().toISOString(),
  passed: results.filter(r => r.ok).length,
  failed: failures.length,
  results
};
fs.writeFileSync('map-qa-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
