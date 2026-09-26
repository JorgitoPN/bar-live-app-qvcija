const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const geojsonvt = require('geojson-vt');
const vtpbf = require('vt-pbf');

const MIN_ZOOM = 4;
const MAX_ZOOM = 9;
const UUID_FROM_ZOOM = 8;
const EXTENT = 4096;
const BOUNDS = [-18.25, 27.45, 4.60, 44.25]; // west,south,east,north
const SNAPSHOT = path.join(process.cwd(), 'map-data', 'national-venues-v1.json');
const SNAPSHOT_META = path.join(process.cwd(), 'map-data', 'national-venues-v1.meta.json');
const ROOT = path.join(process.cwd(), 'map-data', 'hybrid-mvt-v1');
const MANIFEST = path.join(ROOT, 'manifest.json');

const CATEGORY_BY_CODE = ['bar','restaurante','cafeteria','pub','discoteca','cocteleria'];

function tileXY(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor((lon + 180) / 360 * n);
  const clipped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = clipped * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n);
  return [x, y];
}

function compactScalar(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  try {
    return JSON.stringify(value);
  } catch (_) {
    return '';
  }
}

function makeFeature(row, sid, includeUuid) {
  if (!Array.isArray(row) || row.length < 8) return null;
  const id = String(row[0] || '');
  const lat = Number(row[1]);
  const lon = Number(row[2]);
  const categoryCode = Number(row[3]);
  if (
    !id ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    !CATEGORY_BY_CODE[categoryCode]
  ) return null;

  const properties = {
    // Stable within this snapshot. MapLibre promotes this compact integer as
    // feature id, so realtime colours can be calculated locally without UUID
    // feature-state lookups.
    s: sid,
    t: categoryCode,
    d: Number(row[4] || 0) === 1 ? 1 : 0,
  };

  if (includeUuid) properties.i = id;

  const h = compactScalar(row[5]);
  const b = compactScalar(row[6]);
  const o = compactScalar(row[7]);
  if (h) properties.h = h;
  if (b) properties.b = b;
  if (o) properties.o = o;

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties,
  };
}

function emptyTile(z, x, y) {
  return {
    features: [],
    numPoints: 0,
    numSimplified: 0,
    numFeatures: 0,
    source: null,
    x,
    y,
    z,
    transformed: true,
  };
}

function buildIndex(features, maxZoom) {
  return geojsonvt(
    { type: 'FeatureCollection', features },
    {
      maxZoom,
      indexMaxZoom: maxZoom,
      indexMaxPoints: 0,
      tolerance: 0,
      extent: EXTENT,
      buffer: 0,
      lineMetrics: false,
      promoteId: null,
      generateId: false,
    }
  );
}

(function main() {
  const started = Date.now();
  const payload = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const meta = JSON.parse(fs.readFileSync(SNAPSHOT_META, 'utf8'));
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  if (rows.length < 100000) {
    throw new Error('National snapshot unexpectedly small: ' + rows.length);
  }

  const lowFeatures = [];
  const highFeatures = [];
  let knownScheduleRows = 0;

  rows.forEach((row, index) => {
    const sid = index + 1;
    const low = makeFeature(row, sid, false);
    const high = makeFeature(row, sid, true);
    if (!low || !high) return;
    lowFeatures.push(low);
    highFeatures.push(high);
    if (low.properties.h || low.properties.b || low.properties.o) {
      knownScheduleRows += 1;
    }
  });

  const lowIndex = buildIndex(lowFeatures, UUID_FROM_ZOOM - 1);
  const highIndex = buildIndex(highFeatures, MAX_ZOOM);

  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(ROOT, { recursive: true });

  let tileCount = 0;
  let nonEmptyTiles = 0;
  let totalBytes = 0;
  let maxTile = { key: '', bytes: 0, features: 0 };
  const perZoom = {};

  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z += 1) {
    const [minX, maxY] = tileXY(BOUNDS[0], BOUNDS[1], z);
    const [maxX, minY] = tileXY(BOUNDS[2], BOUNDS[3], z);
    const zoomStats = { tiles: 0, nonEmpty: 0, bytes: 0, features: 0 };

    for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x += 1) {
      const dir = path.join(ROOT, String(z), String(x));
      fs.mkdirSync(dir, { recursive: true });

      for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y += 1) {
        const index = z < UUID_FROM_ZOOM ? lowIndex : highIndex;
        const tile = index.getTile(z, x, y) || emptyTile(z, x, y);
        const featureCount = Array.isArray(tile.features) ? tile.features.length : 0;
        const buffer = vtpbf.fromGeojsonVt({ locales: tile });
        fs.writeFileSync(path.join(dir, y + '.pbf'), buffer);

        const bytes = buffer.length;
        tileCount += 1;
        totalBytes += bytes;
        zoomStats.tiles += 1;
        zoomStats.bytes += bytes;
        zoomStats.features += featureCount;
        if (featureCount > 0) {
          nonEmptyTiles += 1;
          zoomStats.nonEmpty += 1;
        }
        if (bytes > maxTile.bytes) {
          maxTile = { key: z + '/' + x + '/' + y, bytes, features: featureCount };
        }
      }
    }
    perZoom[z] = zoomStats;
  }

  const manifest = {
    v: 1,
    format: 'mvt',
    sourceSnapshotSha256: meta.sha256,
    sourceCount: meta.count,
    rows: rows.length,
    indexedRows: highFeatures.length,
    knownScheduleRows,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    uuidFromZoom: UUID_FROM_ZOOM,
    bounds: BOUNDS,
    tileCount,
    nonEmptyTiles,
    totalBytes,
    maxTile,
    perZoom,
    // This is same-origin static CDN data. No Render/Supabase request is part
    // of marker navigation.
    tileTemplate:
      '/map-data/hybrid-mvt-v1/{z}/{x}/{y}.pbf?v=' +
      String(meta.sha256 || '').slice(0, 16),
  };

  const manifestText = JSON.stringify(manifest);
  fs.writeFileSync(MANIFEST, manifestText);

  const hash = crypto
    .createHash('sha256')
    .update(manifestText)
    .digest('hex');

  console.log('HYBRID_MVT_BUILD=' + JSON.stringify({
    ...manifest,
    manifestSha256: hash,
    elapsedMs: Date.now() - started,
  }));
})();
