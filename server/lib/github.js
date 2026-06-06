import axios from 'axios';
import Boom from '@hapi/boom';
import { logger } from './logger.js';

// GitHub API Headers helper
const getGithubHeaders = () => {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'RepoXray-AI-Platform',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return headers;
};

// Parse owner and repo from various GitHub URL formats
function parseGitHubUrl(repoUrl) {
  try {
    if (!repoUrl || typeof repoUrl !== 'string') return null;
    const cleanUrl = repoUrl.trim().replace(/\/+$/, '');
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = cleanUrl.match(regex);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch (error) {
    return null;
  }
}

// Fetch Repository Metadata
async function fetchRepoMetadata(owner, repo, headers) {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers, timeout: 12000 });
    return response.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw Boom.notFound(`Repository not found or is private: ${owner}/${repo}`);
    }
    throw Boom.badGateway(`Failed to fetch repo metadata: ${err.message}`);
  }
}

// Fetch README Content (truncated to 8000 chars to stay within model token limits)
async function fetchReadme(owner, repo, headers) {
  try {
    const readmeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, timeout: 12000 });
    if (readmeRes.data && readmeRes.data.content) {
      const fullReadme = Buffer.from(readmeRes.data.content, 'base64').toString('utf-8');
      let content = fullReadme.slice(0, 8000);
      if (fullReadme.length > 8000) content += '\n[README truncated for token limit]';
      return content;
    }
  } catch (err) {
    logger.warn(`No README found or error fetching README for ${owner}/${repo}: ${err.message}`);
  }
  return 'No README file found in the repository root.';
}

// Fetch File Tree
async function fetchFileTree(owner, repo, defaultBranch, headers) {
  try {
    const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch || 'main'}?recursive=1`, { headers, timeout: 12000 });
    const files = treeRes.data.tree || [];
    const filteredFiles = files
      .filter(f => !f.path.includes('node_modules') && !f.path.includes('.git/') && !f.path.includes('.next/') && !f.path.includes('build/') && !f.path.includes('dist/'))
      .slice(0, 100); // Max 100 entries for context limit

    return filteredFiles.map(f => `${f.type === 'tree' ? '[Dir]' : '[File]'} ${f.path}`).join('\n');
  } catch (err) {
    logger.warn(`Failed to fetch tree structure for ${owner}/${repo}: ${err.message}`);
    return 'Unable to fetch file tree due to API restrictions.';
  }
}

// Fetch Key Source Files
async function fetchSourceFiles(owner, repo, defaultBranch, headers) {
  let sourceFilesStr = '';
  try {
    const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch || 'main'}?recursive=1`, { headers, timeout: 12000 });
    const files = treeRes.data.tree || [];
    const candidates = files.filter(f => {
      const p = f.path.toLowerCase();
      return (
        f.type === 'blob' &&
        (p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.py') || p.endsWith('.json')) &&
        !p.includes('package-lock.json') &&
        !p.includes('node_modules') &&
        (p.includes('config') || p.includes('app') || p.includes('index') || p.includes('server') || p.includes('main') || p.includes('routes'))
      );
    }).slice(0, 3); // Fetch max 3 files

    for (const file of candidates) {
      try {
        const fileRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, { headers, timeout: 12000 });
        const content = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
        sourceFilesStr += `\n--- File: ${file.path} ---\n${content.slice(0, 1500)}\n`;
      } catch (fileErr) {
        logger.warn(`Failed to fetch content for source file ${file.path}: ${fileErr.message}`);
      }
    }
  } catch (err) {
    logger.warn(`Failed to fetch sample source files for ${owner}/${repo}: ${err.message}`);
  }
  return sourceFilesStr || 'No key source files fetched.';
}

export {
  getGithubHeaders,
  parseGitHubUrl,
  fetchRepoMetadata,
  fetchReadme,
  fetchFileTree,
  fetchSourceFiles
};
