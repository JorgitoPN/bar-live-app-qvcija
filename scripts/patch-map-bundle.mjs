import fs from 'node:fs';

const bundlePath = '_expo/static/js/web/entry-4861ff6021ef28fe62f6df13f1490bc8.js';
const templatePath = 'scripts/barlive-single-source-map-template.html';

let bundle = fs.readFileSync(bundlePath, 'utf8');

const template = fs.readFileSync(templatePath, 'utf8');

// Security invariant: the production web bundle must never read a Google
// Places/Street View API key from Expo config. Paid Google calls are allowed
// only through the owner-authenticated BarLive backend.
const googleClientKeyExpr = "c=s.default?.expoConfig?.extra?.googlePlacesApiKey||''";
if (bundle.includes(googleClientKeyExpr)) {
  bundle = bundle.replace(googleClientKeyExpr, "c=''");
}
if (bundle.includes("expoConfig?.extra?.googlePlacesApiKey")) {
  throw new Error('Client Google Places key access is still present in production bundle');
}

let cursor = -1;
let mainStart = -1;
let mainClose = -1;

while ((cursor = bundle.indexOf('<!DOCTYPE html>', cursor + 1)) >= 0) {
  const next = bundle.indexOf('<!DOCTYPE html>', cursor + 1);
  const segmentEnd = next >= 0 ? next : bundle.length;
  const segment = bundle.slice(cursor, segmentEnd);
  if (
    segment.includes('window.applyFilters = function') ||
    segment.includes('barlive-single-source-feature-state-v1') ||
    segment.includes('barlive-single-geojson-viewport-v1') ||
    segment.includes('barlive-single-geojson-catalogue-v2') ||
    segment.includes('barlive-hybrid-mvt-geojson-v1')
  ) {
    mainStart = cursor;
    mainClose = bundle.indexOf('</html>', cursor) + '</html>'.length;
    break;
  }
}

if (mainStart < 0 || mainClose < '</html>'.length) {
  throw new Error('Could not locate the compiled BarLive main-map template');
}

const openTick = mainStart - 1;
if (bundle[openTick] !== '`' || bundle[mainClose] !== '`') {
  throw new Error('Compiled main-map template boundaries are not backticks');
}

// Validate the staged template exactly as the compiled module will evaluate it.
const renderTemplate = new Function(
  'ke',
  'Fe',
  'n',
  'e',
  'a',
  'return `' + template + '`;'
);
const html = renderTemplate(320, 180, -3.7038, 40.4168, 13);
const scriptStart = html.indexOf('<script>') + '<script>'.length;
const scriptEnd = html.lastIndexOf('</script>');
if (scriptStart < '<script>'.length || scriptEnd <= scriptStart) {
  throw new Error('Single-source map script block was not found');
}
new Function(html.slice(scriptStart, scriptEnd));

bundle =
  bundle.slice(0, openTick + 1) +
  template +
  bundle.slice(mainClose);

fs.writeFileSync(bundlePath, bundle, 'utf8');
console.log('[map-build] synchronized compiled map runtime with staged single-source template');
