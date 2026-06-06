import test from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import app from '../server.js';

test('Express API Integration Tests', async (t) => {
  let server;
  let baseUrl;

  t.before(() => {
    return new Promise((resolve) => {
      // Bind to port 0 to dynamically assign an open port
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  t.after(() => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  await t.test('GET /api/health should return ok status', async () => {
    const res = await axios.get(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.ok(res.data.timestamp);
  });

  await t.test('GET /api/globe-repos should return list of repos with coordinates', async () => {
    const res = await axios.get(`${baseUrl}/api/globe-repos`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
    
    // Check repository item shape
    const item = res.data[0];
    assert.ok(item.name);
    assert.ok(item.owner);
    assert.ok(typeof item.lat === 'number');
    assert.ok(typeof item.lon === 'number');
    assert.ok(item.loc);
  });
});
