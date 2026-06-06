import test, { mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import Boom from '@hapi/boom';

import { parseGitHubUrl, fetchRepoMetadata, fetchReadme, fetchFileTree, fetchSourceFiles } from '../lib/github.js';
import { getPromptTemplate, sanitizeAnalysis, safeJsonParse } from '../lib/llm.js';
import { geocodeLocation } from '../lib/globe.js';
import { errorHandlerMiddleware } from '../lib/middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('parseGitHubUrl', async (t) => {
  await t.test('should parse standard GitHub URLs', () => {
    const res = parseGitHubUrl('https://github.com/facebook/react');
    assert.deepStrictEqual(res, { owner: 'facebook', repo: 'react' });
  });

  await t.test('should handle trailing slashes', () => {
    const res = parseGitHubUrl('https://github.com/vuejs/core/');
    assert.deepStrictEqual(res, { owner: 'vuejs', repo: 'core' });
  });

  await t.test('should parse subpaths correctly', () => {
    const res = parseGitHubUrl('https://github.com/AppuzMathew9/Tropic-Treasure-Portfolio/blob/main/src');
    assert.deepStrictEqual(res, { owner: 'AppuzMathew9', repo: 'Tropic-Treasure-Portfolio' });
  });

  await t.test('should return null for non-GitHub URLs', () => {
    const res = parseGitHubUrl('https://gitlab.com/owner/repo');
    assert.strictEqual(res, null);
  });

  await t.test('should return null for invalid inputs', () => {
    assert.strictEqual(parseGitHubUrl('not-a-url'), null);
    assert.strictEqual(parseGitHubUrl(''), null);
  });
});

test('getPromptTemplate', async (t) => {
  const testFilename = 'test-temp-prompt.txt';
  const promptsDir = path.join(__dirname, '..', 'prompts');
  const tempFilePath = path.join(promptsDir, testFilename);

  // Setup temp prompt file
  fs.writeFileSync(tempFilePath, 'Welcome to {{project}} created by {{author}}!', 'utf-8');

  t.after(() => {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      // ignore
    }
  });

  await t.test('should load and interpolate values correctly', () => {
    const data = { project: 'RepoXray AI', author: 'AppuzMathew9' };
    const result = getPromptTemplate(testFilename, data);
    assert.strictEqual(result, 'Welcome to RepoXray AI created by AppuzMathew9!');
  });

  await t.test('should read from in-memory cache on subsequent requests', () => {
    fs.writeFileSync(tempFilePath, 'Modified: Welcome to {{project}}!', 'utf-8');
    const result = getPromptTemplate(testFilename, { project: 'CachedRepo' });
    assert.strictEqual(result, 'Welcome to CachedRepo created by {{author}}!');
  });
});

test('safeJsonParse', async (t) => {
  await t.test('should parse clean JSON', () => {
    const obj = safeJsonParse('{"status":"ok","count":42}');
    assert.deepStrictEqual(obj, { status: 'ok', count: 42 });
  });

  await t.test('should parse JSON wrapped in code block markdown fences', () => {
    const wrapped = `\`\`\`json
{"foo": "bar"}
\`\`\`;`;
    const obj = safeJsonParse(wrapped);
    assert.deepStrictEqual(obj, { foo: 'bar' });
  });

  await t.test('should throw error for completely invalid JSON', () => {
    assert.throws(() => {
      safeJsonParse('invalid json');
    });
  });
});

test('sanitizeAnalysis', async (t) => {
  await t.test('should apply fallback defaults for empty or undefined fields', () => {
    const sanitized = sanitizeAnalysis({});
    assert.strictEqual(typeof sanitized.engineeringReview.engineeringScore, 'number');
    assert.ok(sanitized.engineeringReview.engineeringScore >= 0);
  });

  await t.test('should preserve valid subscores and clamp values between 0 and 100', () => {
    const raw = {
      engineeringReview: {
        engineeringScore: 150,
        subscores: {
          architecture: -20,
          maintainability: 85
        }
      }
    };
    const sanitized = sanitizeAnalysis(raw);
    assert.strictEqual(sanitized.engineeringReview.engineeringScore, 100);
    assert.strictEqual(sanitized.engineeringReview.subscores.maintainability, 85);
  });
});

test('Globe Geocoding Utility', async (t) => {
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
});

test('GitHub API Wrapper Utilities', async (t) => {
  t.afterEach(() => {
    mock.restoreAll();
  });

  await t.test('fetchRepoMetadata should retrieve data from axios success response', async () => {
    const dummyData = { name: 'demo-project', default_branch: 'main', stargazers_count: 15 };
    mock.method(axios, 'get', async () => ({ data: dummyData }));

    const res = await fetchRepoMetadata('dummy-owner', 'dummy-repo', {});
    assert.deepStrictEqual(res, dummyData);
  });

  await t.test('fetchRepoMetadata should raise Boom 404 on API resource absent', async () => {
    mock.method(axios, 'get', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404 };
      throw error;
    });

    await assert.rejects(
      async () => await fetchRepoMetadata('dummy-owner', 'dummy-repo', {}),
      (err) => err.isBoom && err.output.statusCode === 404
    );
  });

  await t.test('fetchReadme should fall back to standard message on Axios failure', async () => {
    mock.method(axios, 'get', async () => {
      throw new Error('Timeout');
    });

    const res = await fetchReadme('dummy-owner', 'dummy-repo', {});
    assert.strictEqual(res, 'No README file found in the repository root.');
  });
});

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
