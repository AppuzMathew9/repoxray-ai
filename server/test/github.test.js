import test, { mock } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import { 
  parseGitHubUrl, 
  fetchRepoMetadata, 
  fetchReadme, 
  apiCache, 
  getCached, 
  setCached, 
  clearCache, 
  getGithubHeaders 
} from '../lib/github.js';

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

test('GitHub API Wrapper Utilities', async (t) => {
  t.afterEach(() => {
    mock.restoreAll();
  });

  await t.test('fetchRepoMetadata should retrieve data from axios success response', async () => {
    const dummyData = { name: 'demo-project', default_branch: 'main', stargazers_count: 15 };
    mock.method(axios, 'get', async () => ({ data: dummyData }));

    const res = await fetchRepoMetadata('dummy-owner-1', 'dummy-repo-1', {});
    assert.deepStrictEqual(res, dummyData);
  });

  await t.test('fetchRepoMetadata should raise Boom 404 on API resource absent', async () => {
    mock.method(axios, 'get', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404 };
      throw error;
    });

    await assert.rejects(
      async () => await fetchRepoMetadata('dummy-owner-2', 'dummy-repo-2', {}),
      (err) => err.isBoom && err.output.statusCode === 404
    );
  });

  await t.test('fetchReadme should fall back to standard message on Axios failure', async () => {
    mock.method(axios, 'get', async () => {
      throw new Error('Timeout');
    });

    const res = await fetchReadme('dummy-owner-3', 'dummy-repo-3', {});
    assert.strictEqual(res, 'No README file found in the repository root.');
  });
});

test('GitHub Caching Layer Implementation', async (t) => {
  t.beforeEach(() => {
    clearCache();
  });

  await t.test('should set and get cache items', () => {
    setCached('test-key', 'some-data');
    const data = getCached('test-key');
    assert.strictEqual(data, 'some-data');
  });

  await t.test('should return null for non-existent items', () => {
    const data = getCached('non-existent');
    assert.strictEqual(data, null);
  });

  await t.test('should evict expired cache entries and return null', () => {
    setCached('expired-key', 'expired-data');
    
    // Manually tweak timestamp to simulate expiration (older than 5 minutes)
    const entry = apiCache.get('expired-key');
    if (entry) {
      entry.timestamp = Date.now() - (6 * 60 * 1000); // 6 mins ago
    }
    
    const data = getCached('expired-key');
    assert.strictEqual(data, null);
    assert.strictEqual(apiCache.has('expired-key'), false); // evicted
  });

  await t.test('should clear all cache items', () => {
    setCached('key1', 'val1');
    setCached('key2', 'val2');
    clearCache();
    assert.strictEqual(apiCache.size, 0);
  });
});

test('getGithubHeaders helper', async (t) => {
  await t.test('should build headers with authorization token if present', () => {
    const prevToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'secret-test-token';
    try {
      const headers = getGithubHeaders();
      assert.strictEqual(headers.Authorization, 'token secret-test-token');
    } finally {
      process.env.GITHUB_TOKEN = prevToken;
    }
  });

  await t.test('should not include authorization header if token is absent', () => {
    const prevToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      const headers = getGithubHeaders();
      assert.strictEqual(headers.Authorization, undefined);
    } finally {
      process.env.GITHUB_TOKEN = prevToken;
    }
  });
});
