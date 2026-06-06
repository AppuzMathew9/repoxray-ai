import test from 'node:test';
import assert from 'node:assert';
import { geocodeLocation } from '../lib/geoip.js';

test('GeoIP Geocoding Utility', async (t) => {
  await t.test('should map known locations to exact coordinates', () => {
    const sf = geocodeLocation('San Francisco, USA');
    assert.strictEqual(sf.lat, 37.7749);
    assert.strictEqual(sf.lon, -122.4194);
    assert.strictEqual(sf.loc, 'San Francisco, USA');

    const bangalore = geocodeLocation('Bengaluru, India');
    assert.strictEqual(bangalore.lat, 12.9716);
    assert.strictEqual(bangalore.lon, 77.5946);
  });

  await t.test('should return deterministic fallback mapping for unknown string locations', () => {
    const unknown1 = geocodeLocation('Atlantis Deep Ocean City');
    const unknown2 = geocodeLocation('Atlantis Deep Ocean City');
    assert.deepStrictEqual(unknown1, unknown2);
    assert.ok(typeof unknown1.lat === 'number');
    assert.ok(typeof unknown1.lon === 'number');
  });

  await t.test('should handle null, empty or non-string inputs safely without crashing', () => {
    const emptyResult = geocodeLocation('');
    assert.strictEqual(emptyResult, null);

    const nullResult = geocodeLocation(null);
    assert.strictEqual(nullResult, null);

    const numResult = geocodeLocation(12345);
    assert.strictEqual(numResult, null);
  });
});
