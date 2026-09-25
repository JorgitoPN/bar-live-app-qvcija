// QA deployed bundle: a0ffd7e7678e6b984ef4b7a76380d4246c95f20f
// QA target: deployed canonical GeoJSON venue runtime.
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
  throw new Error('BarLive map iframe did not expose canonical diagnostics');
}

async function readSnapshot(frame) {
  return frame.evaluate(() => {
    const snap = window.__barliveTestSnapshot ? window.__barliveTestSnapshot() : null;
    let loaded = false;
    let sourceType = null;
    try {
      loaded = !!window.__barliveMap?.loaded();
      sourceType = window.__barliveMap?.getStyle()?.sources?.['barlive-venues']?.type || null;
    } catch {}
    return { snap, loaded, sourceType };
  });
}

async function waitForSettledMapData(frame, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    try {
      last = await readSnapshot(frame);
      const snap = last?.snap || {};
      if (
        last.loaded &&
        last.sourceType === 'geojson' &&
        Number(snap.sourceFeatures || 0) > 0 &&
        Number(snap.total || 0) > 0 &&
        Number(snap.requestGeneration) === Number(snap.datasetGeneration)
      ) {
        return { ready: true, ...last };
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return { ready: false, ...last };
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
      if (payload.kind === 'jump') map.jumpTo(payload.options);
      else if (payload.kind === 'pan') map.panBy(payload.offset, { duration: payload.duration || 0 });
      setTimeout(finish, 8000);
    });
  }, action);
  await frame.waitForTimeout(150);
}

async function geometryStats(frame) {
  return frame.evaluate(() => {
    const map = window.__barliveMap;
    let source = [];
    try { source = map.querySourceFeatures('barlive-venues') || []; } catch {}

    const byId = new Map();
    for (const f of source) {
      const id = String(f?.properties?.venueId || f?.properties?.id || f?.id || '');
      const c = f?.geometry?.coordinates;
      if (!id || !Array.isArray(c) || byId.has(id)) continue;
      byId.set(id, {
        markerState: String(f?.properties?.markerState || 'unknown'),
        lng: Number(c[0]),
        lat: Number(c[1])
      });
    }

    const rows = [...byId.entries()].sort((a,b) => a[0].localeCompare(b[0]));
    let hash = 2166136261;
    for (const [id, data] of rows) {
      const token = id + ':' + data.lng.toFixed(6) + ':' + data.lat.toFixed(6) + ':' + data.markerState;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
    }

    let rendered = [];
    try {
      rendered = map.queryRenderedFeatures(undefined, { layers: ['barlive-venues-circle'] }) || [];
    } catch {}

    const renderedIds = rendered
      .map(f => String(f?.properties?.venueId || f?.properties?.id || f?.id || ''))
      .filter(Boolean);
    const counts = {};
    for (const id of renderedIds) counts[id] = (counts[id] || 0) + 1;
    const duplicateIds = Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));

    return {
      sourceUnique: rows.length,
      sourceHash: String(hash >>> 0),
      renderedRaw: renderedIds.length,
      renderedUnique: new Set(renderedIds).size,
      duplicateIds,
      stateCounts: rows.reduce((acc,[,v]) => {
        acc[v.markerState] = (acc[v.markerState] || 0) + 1;
        return acc;
      }, {})
    };
  });
}

async function findSourceStateCandidate(frame, wantedState) {
  return frame.evaluate((state) => {
    const map = window.__barliveMap;
    const rows = map.querySourceFeatures('barlive-venues') || [];
    const seen = new Set();
    for (const f of rows) {
      const id = String(f?.properties?.venueId || f?.properties?.id || f?.id || '');
      const markerState = String(f?.properties?.markerState || 'unknown');
      const coords = f?.geometry?.coordinates;
      if (!id || seen.has(id) || markerState !== state || !Array.isArray(coords)) continue;
      seen.add(id);
      return { id, markerState, lng:Number(coords[0]), lat:Number(coords[1]) };
    }
    return null;
  }, wantedState);
}

async function renderedIdentity(frame, id) {
  return frame.evaluate((venueId) => {
    const map = window.__barliveMap;
    const rows = map.queryRenderedFeatures(undefined,{layers:['barlive-venues-circle']}) || [];
    const matches = rows.filter(f =>
      String(f?.properties?.venueId || f?.properties?.id || f?.id || '') === venueId
    );
    return {
      count: matches.length,
      states: [...new Set(matches.map(f => String(f?.properties?.markerState || 'unknown')))]
    };
  }, id);
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
        const id = String(f?.properties?.venueId || f?.properties?.id || f?.id || '');
        const c = f?.geometry?.coordinates;
        if (!id || !Array.isArray(c) || seen.has(id)) return null;
        seen.add(id);
        const dx = Number(c[0]) - center.lng;
        const dy = Number(c[1]) - center.lat;
        return {
          id,
          lng: Number(c[0]),
          lat: Number(c[1]),
          markerState: String(f?.properties?.markerState || 'unknown'),
          d2: dx*dx + dy*dy
        };
      })
      .filter(Boolean)
      .sort((a,b) => a.d2 - b.d2)
      .slice(0,n);
  }, limit);
}

async function sourceContract(frame) {
  return frame.evaluate(() => {
    const map = window.__barliveMap;
    const style = map.getStyle();
    const sourceSpec = style?.sources?.['barlive-venues'] || null;
    const layers = (style?.layers || []).filter(l => l.source === 'barlive-venues');
    const circle = map.getLayer('barlive-venues-circle');
    const color = circle ? map.getPaintProperty('barlive-venues-circle','circle-color') : null;
    const colorText = JSON.stringify(color);
    return {
      sourceType: sourceSpec?.type || null,
      barliveSourceCount: Object.entries(style?.sources || {}).filter(([id]) => id === 'barlive-venues').length,
      venueLayerCount: layers.length,
      hasSourceLayer: layers.some(l => Object.prototype.hasOwnProperty.call(l, 'source-layer')),
      colorText,
      markerStateFromProperty: colorText.includes('markerState') && !colorText.includes('feature-state'),
      layerIds: layers.map(l => l.id)
    };
  });
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    geolocation: { latitude: 40.4168, longitude: -3.7038 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();
  const network = { catalogue: [], state: [], legacyTiles: [], failed: [] };
  const mapErrors = [];
  const pageErrors = [];
  const consoleTail = [];

  page.on('response', response => {
    const url = response.url();
    if (url.includes('/rest/v1/locales')) {
      network.catalogue.push({ status: response.status(), url });
    }
    if (url.includes('/rest/v1/map_marker_state_cache')) {
      network.state.push({ status: response.status(), url });
    }
    if (url.includes('/functions/v1/map-static-tile/')) {
      network.legacyTiles.push({ status: response.status(), url });
    }
  });
  page.on('requestfailed', request => {
    const url = request.url();
    if (
      url.includes('/rest/v1/locales') ||
      url.includes('/rest/v1/map_marker_state_cache') ||
      url.includes('/functions/v1/map-static-tile/') ||
      url.includes('openfreemap')
    ) {
      network.failed.push({ url, error: request.failure()?.errorText || '' });
    }
  });
  page.on('console', msg => {
    const text = msg.text();
    consoleTail.push({ type: msg.type(), text });
    if (consoleTail.length > 100) consoleTail.shift();
    if (text.includes('[MAP_RENDER][MAP_ERROR]') || text.includes('[MAP_RENDER][DATA_ERROR]')) {
      mapErrors.push(text);
    }
  });
  page.on('pageerror', error => pageErrors.push(String(error)));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let frame = await findMapFrame(page);
  let cold = await waitForSettledMapData(frame);
  let snap = cold?.snap || {};

  record('cold load reaches canonical settled data', cold.ready, {
    snapshot: snap,
    sourceType: cold?.sourceType,
    network,
    pageErrors,
    consoleTail: cold.ready ? undefined : consoleTail
  });

  const contract = await sourceContract(frame);
  record(
    'one canonical GeoJSON source owns venue markers',
    contract.sourceType === 'geojson' &&
      contract.barliveSourceCount === 1 &&
      contract.venueLayerCount >= 2 &&
      !contract.hasSourceLayer,
    contract
  );
  record(
    'marker color comes from feature markerState property',
    contract.markerStateFromProperty,
    { color: contract.colorText }
  );

  record(
    'open closed unknown partition equals viewport total',
    Number(snap.open||0) + Number(snap.closed||0) + Number(snap.unknown||0) === Number(snap.total||0) &&
      Number(snap.total||0) > 100,
    { open:snap.open, closed:snap.closed, unknown:snap.unknown, total:snap.total }
  );

  record(
    'Madrid viewport is backed by complete catalogue, not sparse state cache',
    Number(snap.total||0) > 100 &&
      Number(snap.sourceFeatures||0) >= Number(snap.total||0),
    { total:snap.total, sourceFeatures:snap.sourceFeatures, network }
  );

  let geo = await geometryStats(frame);
  record(
    'no duplicate rendered venue_id on cold load',
    geo.duplicateIds.length === 0 && geo.sourceUnique > 0,
    geo
  );

  const colorBefore = contract.colorText;
  const allBefore = snap;

  const openCandidate = await findSourceStateCandidate(frame, 'open');
  const closedCandidate = await findSourceStateCandidate(frame, 'closed');
  record(
    'real schedule-state candidates exist in canonical source',
    !!closedCandidate,
    { openCandidate, closedCandidate }
  );

  if (openCandidate) {
    await waitIdle(frame, {
      kind:'jump',
      options:{center:[openCandidate.lng,openCandidate.lat],zoom:16}
    });
    await waitForSettledMapData(frame);
    await frame.evaluate(() => window.setStateFilter('todos'));
    await frame.waitForTimeout(150);
    const openAll = await renderedIdentity(frame, openCandidate.id);
    await frame.evaluate(() => window.setStateFilter('no_cerrados'));
    await frame.waitForTimeout(150);
    const openFiltered = await renderedIdentity(frame, openCandidate.id);
    const openColor = (await sourceContract(frame)).colorText;
    record(
      'real open venue survives Abiertos without recoloring',
      openAll.count > 0 &&
        openFiltered.count > 0 &&
        openFiltered.states.length === 1 &&
        openFiltered.states[0] === 'open' &&
        openColor === colorBefore,
      {candidate:openCandidate,all:openAll,filtered:openFiltered,colorUnchanged:openColor===colorBefore}
    );
  }

  if (closedCandidate) {
    await waitIdle(frame, {
      kind:'jump',
      options:{center:[closedCandidate.lng,closedCandidate.lat],zoom:16}
    });
    await waitForSettledMapData(frame);
    await frame.evaluate(() => window.setStateFilter('todos'));
    await frame.waitForTimeout(150);
    const closedAll = await renderedIdentity(frame, closedCandidate.id);
    await frame.evaluate(() => window.setStateFilter('no_cerrados'));
    await frame.waitForTimeout(150);
    const closedFiltered = await renderedIdentity(frame, closedCandidate.id);
    const closedColor = (await sourceContract(frame)).colorText;
    record(
      'real closed venue is hidden by Abiertos without recoloring',
      closedAll.count > 0 &&
        closedAll.states.includes('closed') &&
        closedFiltered.count === 0 &&
        closedColor === colorBefore,
      {candidate:closedCandidate,all:closedAll,filtered:closedFiltered,colorUnchanged:closedColor===colorBefore}
    );
  }

  await waitIdle(frame, {kind:'jump',options:{center:[-3.7038,40.4168],zoom:13}});
  await waitForSettledMapData(frame);

  await frame.evaluate(() => window.setStateFilter('no_cerrados'));
  await frame.waitForTimeout(250);
  const openSnap = (await readSnapshot(frame)).snap || {};
  const openRenderedStates = await frame.evaluate(() => {
    const map = window.__barliveMap;
    const rows = map.queryRenderedFeatures(undefined,{layers:['barlive-venues-circle']}) || [];
    return [...new Set(rows.map(f => String(f?.properties?.markerState || 'unknown')))];
  });
  const colorOpen = (await sourceContract(frame)).colorText;
  record(
    'Abiertos is visibility-only and renders only open',
    openSnap.expected === openSnap.open &&
      colorOpen === colorBefore &&
      openRenderedStates.every(s => s === 'open'),
    {
      expected:openSnap.expected,
      open:openSnap.open,
      renderedStates:openRenderedStates,
      colorUnchanged:colorOpen === colorBefore
    }
  );

  await frame.evaluate(() => window.setStateFilter('todos'));
  await frame.waitForTimeout(250);
  const allAgain = (await readSnapshot(frame)).snap || {};
  const colorAfter = (await sourceContract(frame)).colorText;
  record(
    'Todos restores same dataset without recoloring',
    colorAfter === colorBefore &&
      Number(allAgain.sourceFeatures||0) === Number(allBefore.sourceFeatures||0) &&
      Number(allAgain.expected||0) >= Number(openSnap.expected||0),
    {
      sourceBefore:allBefore.sourceFeatures,
      sourceAfter:allAgain.sourceFeatures,
      expectedAll:allAgain.expected,
      expectedOpen:openSnap.expected,
      colorUnchanged:colorAfter === colorBefore
    }
  );

  await waitIdle(frame, { kind:'jump', options:{ center:[-3.7038,40.4168], zoom:13 } });
  await waitForSettledMapData(frame);
  const before30 = await geometryStats(frame);
  await page.waitForTimeout(30000);
  const after30 = await geometryStats(frame);
  record(
    'geometry stable after 30 seconds idle',
    before30.sourceUnique === after30.sourceUnique &&
      before30.sourceHash === after30.sourceHash &&
      after30.duplicateIds.length === 0,
    { before:before30, after:after30 }
  );

  const candidates = await closestRendered(frame, 3);
  record('identity candidates available', candidates.length > 0, { candidates });
  for (const candidate of candidates) {
    const trace = [];
    let stable = true;
    for (const zoom of [10,12,14,16]) {
      await waitIdle(frame, {
        kind:'jump',
        options:{ center:[candidate.lng,candidate.lat], zoom }
      });
      const settled = await waitForSettledMapData(frame);
      const identity = await frame.evaluate(id => window.__barliveIdentity([id])[0], candidate.id);
      if (
        !settled.ready ||
        !identity?.present ||
        identity.markerState !== candidate.markerState
      ) stable = false;
      trace.push({ zoom, settled:settled.ready, ...identity });
    }
    record('venue identity stable across zooms: '+candidate.id, stable, { trace });
  }

  await waitIdle(frame, { kind:'jump', options:{ center:[-3.7038,40.4168], zoom:12 } });
  await frame.evaluate(() => {
    const map = window.__barliveMap;
    map.jumpTo({ center:[-0.3763,39.4699], zoom:12 });
    map.jumpTo({ center:[2.1734,41.3851], zoom:12 });
    map.jumpTo({ center:[-3.7038,40.4168], zoom:12 });
  });
  await frame.waitForTimeout(1200);
  const rapid = await waitForSettledMapData(frame);
  geo = await geometryStats(frame);
  record(
    'rapid movement settles on latest generation without duplicates',
    rapid.ready &&
      geo.duplicateIds.length === 0 &&
      Number(rapid.snap?.requestGeneration) === Number(rapid.snap?.datasetGeneration),
    { snapshot:rapid.snap, geometry:geo }
  );

  record(
    'catalogue and realtime state REST requests returned HTTP 200',
    network.catalogue.some(item => item.status === 200) &&
      network.state.some(item => item.status === 200) &&
      network.catalogue.every(item => item.status === 200) &&
      network.state.every(item => item.status === 200),
    {
      catalogue:network.catalogue.slice(-20),
      state:network.state.slice(-20),
      failed:network.failed
    }
  );
  record(
    'legacy static venue tile endpoint is not used',
    network.legacyTiles.length === 0,
    { legacyTiles:network.legacyTiles }
  );
  record('no MapLibre venue pipeline errors', mapErrors.length === 0, { mapErrors, pageErrors });

  await page.reload({ waitUntil:'domcontentloaded', timeout:60000 });
  frame = await findMapFrame(page);
  const refresh = await waitForSettledMapData(frame);
  snap = refresh?.snap || {};
  record(
    'direct route refresh keeps canonical data and states',
    refresh.ready &&
      Number(snap.total||0) > 0 &&
      Number(snap.sourceFeatures||0) > 0 &&
      Number(snap.open||0)+Number(snap.closed||0)+Number(snap.unknown||0) === Number(snap.total||0),
    { ...snap, ready:refresh.ready }
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
  const mobile = await waitForSettledMapData(frame);
  const snap = mobile?.snap || {};
  const geo = await geometryStats(frame);
  const contract = await sourceContract(frame);
  record(
    'mobile web canonical GeoJSON render',
    mobile.ready &&
      contract.sourceType === 'geojson' &&
      Number(snap.total||0) > 0 &&
      geo.renderedUnique > 0 &&
      geo.duplicateIds.length === 0,
    { snapshot:snap, geometry:geo, contract, ready:mobile.ready }
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
