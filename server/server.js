import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Boom from '@hapi/boom';
import axios from 'axios';

import { logger } from './lib/logger.js';
import { asyncHandler, requestContextMiddleware, errorHandlerMiddleware } from './lib/middleware.js';
import {
  getGithubHeaders,
  parseGitHubUrl,
  fetchRepoMetadata,
  fetchReadme,
  fetchFileTree,
  fetchSourceFiles
} from './lib/github.js';
import {
  getPromptTemplate,
  queryGemini,
  sanitizeAnalysis
} from './lib/llm.js';
import {
  cities
} from './lib/geoip.js';
import {
  fallbackPublicRepos
} from './lib/globe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(requestContextMiddleware);
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), port: PORT });
});

// Main Analyze Endpoint
app.post('/api/analyze', asyncHandler(async (req, res, next) => {
  const { url } = req.body;
  if (!url) {
    throw Boom.badRequest('GitHub repository URL is required.');
  }

  const repoDetails = parseGitHubUrl(url);
  if (!repoDetails) {
    throw Boom.badRequest('Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repo');
  }

  const { owner, repo } = repoDetails;
  const headers = getGithubHeaders();

  logger.info(`Starting analysis for repository ${owner}/${repo}...`);

  const repoMeta = await fetchRepoMetadata(owner, repo, headers);
  const readmeContent = await fetchReadme(owner, repo, headers);
  const fileTreeStr = await fetchFileTree(owner, repo, repoMeta.default_branch, headers);
  const sourceFilesStr = await fetchSourceFiles(owner, repo, repoMeta.default_branch, headers);

  const contextData = {
    repoName: `${owner}/${repo}`,
    description: repoMeta.description || 'No description provided.',
    languages: repoMeta.language || 'Unknown',
    fileTree: fileTreeStr,
    readme: readmeContent,
    sourceFiles: sourceFilesStr
  };

  logger.info(`Querying Gemini to analyze repo ${owner}/${repo} (consolidated request)...`);

  const consolidatedAnalysis = await queryGemini(getPromptTemplate('consolidated-analysis.txt', contextData));
  const cleanAnalysis = sanitizeAnalysis(consolidatedAnalysis);

  const responsePayload = {
    repository: {
      name: repoMeta.name,
      fullName: repoMeta.full_name,
      owner: repoMeta.owner.login,
      ownerAvatar: repoMeta.owner.avatar_url,
      description: repoMeta.description,
      stars: repoMeta.stargazers_count,
      forks: repoMeta.forks_count,
      languagesUrl: repoMeta.languages_url,
      htmlUrl: repoMeta.html_url,
      primaryLanguage: repoMeta.language
    },
    analysis: cleanAnalysis
  };

  logger.info(`Analysis complete for ${owner}/${repo}!`);
  res.json(responsePayload);
}));

// Generate Professional README Endpoint
app.post('/api/generate-readme', asyncHandler(async (req, res, next) => {
  const { url } = req.body;
  if (!url) {
    throw Boom.badRequest('GitHub repository URL is required.');
  }

  const repoDetails = parseGitHubUrl(url);
  if (!repoDetails) {
    throw Boom.badRequest('Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repo');
  }

  const { owner, repo } = repoDetails;
  const headers = getGithubHeaders();

  logger.info(`Generating professional README for ${owner}/${repo}...`);
  
  const repoMeta = await fetchRepoMetadata(owner, repo, headers);

  const prompt = `You are an expert technical writer and developer advocate. Write a comprehensive, modern, production-grade README.md file in markdown format for the GitHub repository: "${owner}/${repo}".
Description: ${repoMeta.description || 'No description provided.'}
Primary Language: ${repoMeta.language || 'Unknown'}

Your generated README.md MUST include the following structured sections with the EXACT headings specified below:
1. # ${repoMeta.name} (Include a short, punchy, professional description)
2. ## 🎯 Project Overview (Provide details on features and capabilities)
3. ## 🚀 Installation Guide (Provide clean, step-by-step setup and installation commands)
4. ## 🎮 Usage Instructions (Explain how to run the project with clear examples)
5. ## 📸 Screenshots (Add placeholders for UI screenshots or diagrams)
6. ## 🏗️ Architecture Diagram (Describe code layouts and system flow)
7. ## 🔌 API Documentation (Document key HTTP endpoints or code APIs)
8. ## 🤝 Contribution Guidelines (Provide details on how to contribute)
9. ## 📄 License (State the MIT license or appropriate terms)

Make it extremely polished, readable, and ready to be pushed to GitHub. Return ONLY the raw markdown text. Do not wrap the response in a JSON object or markdown code block.`;

  let readmeMarkdown = '';
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      logger.info('Generating README via Groq...');
      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          timeout: 20000
        }
      );
      readmeMarkdown = groqResponse.data.choices[0].message.content.trim();
    } catch (err) {
      logger.warn(`Groq README generation failed: ${err.message}`);
    }
  }

  if (!readmeMarkdown) {
    const hfKey = process.env.HUGGING_FACE_API;
    if (hfKey) {
      const hfModels = [
        'meta-llama/Llama-3.2-3B-Instruct',
        'meta-llama/Meta-Llama-3-8B-Instruct',
        'mistralai/Mistral-7B-Instruct-v0.3',
        'microsoft/Phi-3-mini-4k-instruct'
      ];
      for (const hfModel of hfModels) {
        try {
          logger.info(`Generating README via Hugging Face (${hfModel})...`);
          const response = await axios.post(
            'https://api-inference.huggingface.co/v1/chat/completions',
            {
              model: hfModel,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 4096,
            },
            {
              headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
              timeout: 25000
            }
          );
          if (response.data?.choices?.[0]?.message?.content) {
            readmeMarkdown = response.data.choices[0].message.content.trim();
            break;
          }
        } catch (err) {
          logger.warn(`Hugging Face LLM (${hfModel}) failed for README: ${err.message}`);
        }
      }
    }
  }

  if (!readmeMarkdown) {
    const localEndpoints = [
      { name: 'LM Studio', url: 'http://localhost:1234/v1/chat/completions', model: 'local-model' },
      { name: 'Ollama (Llama 3)', url: 'http://localhost:11434/v1/chat/completions', model: 'llama3' },
      { name: 'Ollama (Mistral)', url: 'http://localhost:11434/v1/chat/completions', model: 'mistral' },
      { name: 'Ollama (Phi-3)', url: 'http://localhost:11434/v1/chat/completions', model: 'phi3' },
      { name: 'vLLM', url: 'http://localhost:8000/v1/chat/completions', model: 'local-model' }
    ];
    for (const local of localEndpoints) {
      try {
        logger.info(`Generating README via Local LLM (${local.name}) on ${local.url}...`);
        const response = await axios.post(
          local.url,
          { model: local.model, messages: [{ role: 'user', content: prompt }], max_tokens: 4096 },
          { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
        );
        if (response.data?.choices?.[0]?.message?.content) {
          readmeMarkdown = response.data.choices[0].message.content.trim();
          break;
        }
      } catch (err) {
        logger.info(`Local LLM (${local.name}) failed for README: ${err.message}`);
      }
    }
  }

  if (!readmeMarkdown) {
    readmeMarkdown = `# ${repoMeta.name}\n\n${repoMeta.description || 'No description provided.'}\n\n## ✨ Features\n- Interactive platform analytics\n- Real-time diagnostics\n\n## 🛠️ Tech Stack\n- ${repoMeta.language || 'JavaScript'}\n\n## 🚀 Installation\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\``;
  }

  if (readmeMarkdown.startsWith('```markdown')) {
    readmeMarkdown = readmeMarkdown.substring(11);
  } else if (readmeMarkdown.startsWith('```')) {
    readmeMarkdown = readmeMarkdown.substring(3);
  }
  if (readmeMarkdown.endsWith('```')) {
    readmeMarkdown = readmeMarkdown.substring(0, readmeMarkdown.length - 3);
  }
  readmeMarkdown = readmeMarkdown.trim();

  // Post-process to guarantee all standard headings are present
  const requiredHeadings = [
    { key: '🎯 Project Overview', heading: '## 🎯 Project Overview', fallback: '\n\n## 🎯 Project Overview\nAn interactive repository intelligence platform to audit and improve code quality.' },
    { key: '🚀 Installation Guide', heading: '## 🚀 Installation Guide', fallback: '\n\n## 🚀 Installation Guide\n```bash\nnpm install\nnpm run build\nnpm start\n```' },
    { key: '🎮 Usage Instructions', heading: '## 🎮 Usage Instructions', fallback: '\n\n## 🎮 Usage Instructions\nRun the development server and scan any public GitHub repository to audit it.' },
    { key: '📸 Screenshots', heading: '## 📸 Screenshots', fallback: '\n\n## 📸 Screenshots\n![Dashboard](docs/screenshot.png)' },
    { key: '🏗️ Architecture Diagram', heading: '## 🏗️ Architecture Diagram', fallback: '\n\n## 🏗️ Architecture Diagram\nReact Frontend -> Express Backend -> Gemini/HuggingFace API.' },
    { key: '🔌 API Documentation', heading: '## 🔌 API Documentation', fallback: '\n\n## 🔌 API Documentation\nGET /api/health - Check server health status\nPOST /api/analyze - Scan a repository' },
    { key: '🤝 Contribution Guidelines', heading: '## 🤝 Contribution Guidelines', fallback: '\n\n## 🤝 Contribution Guidelines\nPlease open pull requests or report bugs in the issues tracker.' },
    { key: '📄 License', heading: '## 📄 License', fallback: '\n\n## 📄 License\nMIT License' }
  ];

  for (const h of requiredHeadings) {
    if (!readmeMarkdown.includes(h.key) && !readmeMarkdown.includes(h.heading)) {
      readmeMarkdown += h.fallback;
    }
  }

  res.json({ readme: readmeMarkdown });
}));

// Globe Repositories Discovery Endpoint (500 items high-density)
app.get('/api/globe-repos', asyncHandler(async (req, res, next) => {
  const headers = getGithubHeaders();

  let ownedRepos = [];
  try {
    const response = await axios.get('https://api.github.com/user/repos?per_page=100&affiliation=owner&sort=updated', {
      headers,
      timeout: 2500
    });
    if (Array.isArray(response.data)) {
      ownedRepos = response.data.filter(repo => repo && repo.name && repo.owner && repo.owner.login && repo.html_url);
    }
  } catch (err) {
    logger.warn('Unable to fetch user repos, serving fallback coordinates.', { error: err.message });
  }

  if (ownedRepos.length === 0) {
    ownedRepos = [
      { name: "Tropic-Treasure-Portfolio", owner: { login: "AppuzMathew9" }, html_url: "https://github.com/AppuzMathew9/Tropic-Treasure-Portfolio" },
      { name: "creative-canvas-core", owner: { login: "AppuzMathew9" }, html_url: "https://github.com/AppuzMathew9/creative-canvas-core" },
      { name: "animejs-dom-effects", owner: { login: "AppuzMathew9" }, html_url: "https://github.com/AppuzMathew9/animejs-dom-effects" },
    ];
  }

  let publicRepos = [];
  try {
    const searchRes = await axios.get('https://api.github.com/search/repositories?q=stars:>100&sort=updated&per_page=100', {
      headers,
      timeout: 10000
    });
    if (searchRes.data && Array.isArray(searchRes.data.items)) {
      publicRepos = searchRes.data.items.filter(repo => repo && repo.name && repo.owner && repo.owner.login && repo.html_url);
    }
  } catch (err) {
    logger.warn(`Unable to fetch popular repositories: ${err.message}`);
  }

  if (publicRepos.length === 0) {
    publicRepos = fallbackPublicRepos;
  }

  const targetOwnerCount = 125;
  const originalOwnerLen = ownedRepos.length;
  for (let i = originalOwnerLen; i < targetOwnerCount; i++) {
    const base = ownedRepos[i % originalOwnerLen];
    ownedRepos.push({
      ...base,
      name: `${base.name}-shard-${Math.floor(i / originalOwnerLen)}`,
      html_url: `${base.html_url}/shard-${i}`,
      isVariation: true
    });
  }

  const publicTargetCount = 375;
  const originalPublicLen = publicRepos.length;
  for (let i = originalPublicLen; i < publicTargetCount; i++) {
    const base = publicRepos[i % originalPublicLen];
    publicRepos.push({
      ...base,
      name: `${base.name}-${Math.floor(i / originalPublicLen) + 1}`,
      isVariation: true
    });
  }

  const combinedRepos = [...ownedRepos.slice(0, 125), ...publicRepos.slice(0, 375)];

  const mappedPoints = combinedRepos.map((repo, index) => {
    let hash = 0;
    const key = repo.name + (repo.owner?.login || 'fallback') + index;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }

    const isOwner = ownedRepos.some(r => r.html_url === repo.html_url) || repo.owner?.login === 'AppuzMathew9';

    let lat, lon, loc;
    if (isOwner) {
      const scatterLat = 9.4981 + ((Math.abs(hash) % 40) - 20) / 250;
      const scatterLon = 76.3388 + ((Math.abs(hash >> 2) % 40) - 20) / 250;
      lat = scatterLat;
      lon = scatterLon;
      loc = "Owner Repository (Alappuzha, India)";
    } else {
      let city;
      const publicIndex = index - 125;
      if (publicIndex >= 0 && publicIndex < cities.length) {
        city = cities[publicIndex];
      } else {
        const cityIndex = Math.abs(hash) % cities.length;
        city = cities[cityIndex];
      }
      lat = city.lat + ((Math.abs(hash) % 40) - 20) / 100;
      lon = city.lon + ((Math.abs(hash >> 2) % 40) - 20) / 100;
      loc = `${city.name}, ${city.country}`;
    }

    return {
      name: repo.name,
      owner: repo.owner?.login || 'github',
      url: repo.html_url,
      lat: lat,
      lon: lon,
      loc: loc,
      isOwner: isOwner
    };
  });

  res.json(mappedPoints);
}));

// Serve static assets in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandlerMiddleware);

// Only start the server if this file is run directly
const isMain = () => {
  try {
    if (!process.argv[1]) return false;
    const mainPath = fs.realpathSync(process.argv[1]);
    const modulePath = fs.realpathSync(fileURLToPath(import.meta.url));
    return mainPath === modulePath;
  } catch (e) {
    return false;
  }
};

if (isMain()) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;
