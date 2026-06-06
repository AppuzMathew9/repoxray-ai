import test from 'node:test';
import assert from 'node:assert';
import Boom from '@hapi/boom';
import { errorHandlerMiddleware } from '../lib/middleware.js';

test('Global Error Handler Middleware', async (t) => {
  await t.test('should format Boom error into standardized response payload', () => {
    let statusSet, jsonSet;
    const res = {
      status(code) {
        statusSet = code;
        return this;
      },
      json(payload) {
        jsonSet = payload;
        return this;
      }
    };
    const err = Boom.notFound('Missing Resource');
    
    errorHandlerMiddleware(err, {}, res, () => {});
    
    assert.strictEqual(statusSet, 404);
    assert.strictEqual(jsonSet.statusCode, 404);
    assert.strictEqual(jsonSet.message, 'Missing Resource');
  });
});
