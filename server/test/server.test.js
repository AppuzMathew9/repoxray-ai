import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { parseGitHubUrl } from '../lib/github.js';
import { getPromptTemplate, sanitizeAnalysis, safeJsonParse } from '../lib/llm.js';

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
    // Modify file on disk to see if cache is used
    fs.writeFileSync(tempFilePath, 'Modified: Welcome to {{project}}!', 'utf-8');
    const result = getPromptTemplate(testFilename, { project: 'CachedRepo' });
    // Should still use cached version
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
\`\`\``;
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
    assert.ok(Array.isArray(sanitized.engineeringReview.strengths));
    assert.ok(sanitized.engineeringReview.strengths.length > 0);
  });

  await t.test('should preserve valid subscores and clamp values between 0 and 100', () => {
    const raw = {
      engineeringReview: {
        engineeringScore: 150, // should clamp to 100
        subscores: {
          architecture: -20, // should clamp/default
          maintainability: 85
        }
      }
    };
    const sanitized = sanitizeAnalysis(raw);
    assert.strictEqual(sanitized.engineeringReview.engineeringScore, 100);
    assert.strictEqual(sanitized.engineeringReview.subscores.maintainability, 85);
  });
});
