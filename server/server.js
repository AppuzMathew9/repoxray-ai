import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;


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
    const cleanUrl = repoUrl.trim().replace(/\/+$/, '');
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = cleanUrl.match(regex);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch (error) {
    return null;
  }
}

// Helper to read prompt template files
function getPromptTemplate(filename, data) {
  const filePath = path.join(__dirname, 'prompts', filename);
  let template = fs.readFileSync(filePath, 'utf-8');
  for (const [key, value] of Object.entries(data)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return template;
}

// Helper to safely parse JSON from LLM responses
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(str.substring(start, end + 1));
      } catch (inner) {
        // ignore and throw original
      }
    }
    throw e;
  }
}

// Safely sanitize and guarantee exact JSON schema shape with fallback values
function sanitizeAnalysis(raw) {
  const data = raw || {};
  
  const cleanNum = (val, def = 70) => {
    const num = Number(val);
    return isNaN(num) ? def : Math.max(0, Math.min(100, num));
  };

  const cleanArray = (val, def = []) => {
    return Array.isArray(val) ? val.filter(item => typeof item === 'string') : def;
  };

  // 1. Engineering Review
  const rawEng = data.engineeringReview || {};
  const rawEngSubs = rawEng.subscores || {};
  const engineeringReview = {
    engineeringScore: cleanNum(rawEng.engineeringScore, 75),
    subscores: {
      architecture: cleanNum(rawEngSubs.architecture, 75),
      maintainability: cleanNum(rawEngSubs.maintainability, 75),
      scalability: cleanNum(rawEngSubs.scalability, 75),
      codeOrganization: cleanNum(rawEngSubs.codeOrganization, 75)
    },
    strengths: cleanArray(rawEng.strengths, ["Clean project structure", "Good language usage", "Modern build tools configuration"]),
    weaknesses: cleanArray(rawEng.weaknesses, ["No unit tests found", "Limited CI/CD configuration", "High coupling in entry points"]),
    recommendations: cleanArray(rawEng.recommendations, ["Introduce unit testing frameworks", "Set up github actions for automatic linting", "Decouple utility helper modules"])
  };

  // 2. Documentation Audit
  const rawDoc = data.documentationAudit || {};
  const documentationAudit = {
    documentationScore: cleanNum(rawDoc.documentationScore, 70),
    presentSections: cleanArray(rawDoc.presentSections, ["Project Overview", "Installation Guide"]),
    missingSections: cleanArray(rawDoc.missingSections, ["Contribution Guidelines", "API Documentation", "License"]),
    recommendations: cleanArray(rawDoc.recommendations, ["Add a complete API reference", "Provide licensing terms", "Provide contribution steps"])
  };

  // 3. Resume Generator
  const rawRes = data.resumeGenerator || {};
  const resumeGenerator = {
    bullets: cleanArray(rawRes.bullets, [
      "Engineered clean scalable features matching production quality metrics.",
      "Optimized modular components for code readability and ease of maintenance.",
      "Established pipeline configurations and automated test coverage runs."
    ])
  };

  // 4. Interview Prep
  const rawInt = data.interviewPrep || {};
  const rawIntQuestions = Array.isArray(rawInt.questions) ? rawInt.questions : [];
  const interviewPrep = {
    questions: rawIntQuestions.map((q, idx) => {
      const cat = q?.category || (idx === 0 ? "Technical Questions" : idx === 1 ? "Project-Specific Questions" : "Deep-Dive Follow-Up Questions");
      const diff = ["Beginner", "Intermediate", "Advanced"].includes(q?.difficulty) ? q.difficulty : "Intermediate";
      return {
        id: q?.id || `q${idx + 1}`,
        category: cat,
        question: typeof q?.question === 'string' ? q.question : "Explain the design patterns used in this codebase.",
        difficulty: diff,
        suggestedTalkingPoints: cleanArray(q?.suggestedTalkingPoints, ["Architecture pattern", "Modular components", "Optimization points"])
      };
    })
  };
  // Guarantee at least 3 questions
  if (interviewPrep.questions.length < 3) {
    const defaultQs = [
      {
        id: "q1",
        category: "Technical Questions",
        question: "Explain the architecture and separation of concerns used in this codebase.",
        difficulty: "Intermediate",
        suggestedTalkingPoints: ["Modular file layout", "Separation of client and server code", "Integration points"]
      },
      {
        id: "q2",
        category: "Project-Specific Questions",
        question: "How did you manage third-party APIs and failover flows in this system?",
        difficulty: "Advanced",
        suggestedTalkingPoints: ["Axios client fallbacks", "Cascading timeouts", "Dynamic configurations"]
      },
      {
        id: "q3",
        category: "Deep-Dive Follow-Up Questions",
        question: "What performance optimizations would you prioritize if scaling this project?",
        difficulty: "Advanced",
        suggestedTalkingPoints: ["Client-side caching", "Code splitting bundles", "Static asset CDNs"]
      }
    ];
    while (interviewPrep.questions.length < 3) {
      interviewPrep.questions.push(defaultQs[interviewPrep.questions.length]);
    }
  }

  // 5. Employability Score
  const rawEmp = data.employabilityScore || {};
  const rawEmpSubs = rawEmp.subscores || {};
  const employabilityScore = {
    overallEmployabilityScore: cleanNum(rawEmp.overallEmployabilityScore, 75),
    subscores: {
      technicalDepth: cleanNum(rawEmpSubs.technicalDepth, 75),
      documentationQuality: cleanNum(rawEmpSubs.documentationQuality, 75),
      portfolioPresentation: cleanNum(rawEmpSubs.portfolioPresentation, 75),
      projectComplexity: cleanNum(rawEmpSubs.projectComplexity, 75),
      professionalReadiness: cleanNum(rawEmpSubs.professionalReadiness, 75)
    },
    strengths: cleanArray(rawEmp.strengths, ["Strong modern styling", "Robust error management", "Interactive UX features"]),
    improvementAreas: cleanArray(rawEmp.improvementAreas, ["Incorporate test runners", "Expand API docs coverage", "Add build pipelines"])
  };

  // 6. Roadmap Generator
  const rawRoad = data.roadmapGenerator || {};
  const rawRoadTasks = Array.isArray(rawRoad.tasks) ? rawRoad.tasks : [];
  const roadmapGenerator = {
    tasks: rawRoadTasks.map((t, idx) => {
      const prio = ["High", "Medium", "Low"].includes(t?.priority) ? t.priority : "Medium";
      return {
        title: typeof t?.title === 'string' ? t.title : "Enhance repository codebase structure",
        priority: prio,
        actionableSteps: cleanArray(t?.actionableSteps, ["Review folder layout", "Extract core helpers"]),
        timeline: typeof t?.timeline === 'string' ? t.timeline : "Days 1-10",
        expectedOutcome: typeof t?.expectedOutcome === 'string' ? t.expectedOutcome : "Improved readability and structure."
      };
    })
  };
  // Guarantee at least 2 tasks
  if (roadmapGenerator.tasks.length < 2) {
    const defaultTasks = [
      {
        title: "Integrate Automated Testing Framework",
        priority: "High",
        actionableSteps: ["Install test suite packages", "Write helper test cases", "Configure package start runner"],
        timeline: "Days 1-5",
        expectedOutcome: "Robust test setup guaranteeing logic safety."
      },
      {
        title: "Refactor Module Coupling",
        priority: "Medium",
        actionableSteps: ["Create decoupled helpers", "Isolate side effects"],
        timeline: "Days 6-15",
        expectedOutcome: "Lower coupling metrics and clean file reads."
      }
    ];
    while (roadmapGenerator.tasks.length < 2) {
      roadmapGenerator.tasks.push(defaultTasks[roadmapGenerator.tasks.length]);
    }
  }

  // 7. Recruiter Snapshot
  const rawRec = data.recruiterSnapshot || {};
  const recruiterSnapshot = {
    recommendedRoles: cleanArray(rawRec.recommendedRoles, ["Fullstack Engineer", "Frontend Developer", "Backend Developer"]),
    technicalMaturity: ["Beginner", "Intermediate", "Advanced"].includes(rawRec.technicalMaturity) ? rawRec.technicalMaturity : "Intermediate",
    strongestSkills: cleanArray(rawRec.strongestSkills, ["React", "JavaScript/TypeScript", "CSS Layouts", "REST APIs"])
  };

  return {
    engineeringReview,
    documentationAudit,
    resumeGenerator,
    interviewPrep,
    employabilityScore,
    roadmapGenerator,
    recruiterSnapshot
  };
}

// Helper to query LLMs (Local and Cloud) with structured JSON output expectation
async function queryGemini(promptText, schemaText) {
  const finalPrompt = `${promptText}\n\nIMPORTANT: Return ONLY a raw JSON object. No markdown, no code fences, no extra text. Just the JSON.`;

  // 1. Groq — prioritized first as the most responsive API provider
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = [
      // Small fast model — truncate prompt heavily to stay under 6000 TPM
      { id: 'llama-3.1-8b-instant', maxChars: 5000 },
      // Large model — higher TPD limit but may be exhausted  
      { id: 'llama-3.3-70b-versatile', maxChars: 18000 },
    ];

    for (const { id: groqModel, maxChars } of groqModels) {
      try {
        const groqPrompt = finalPrompt.length > maxChars
          ? finalPrompt.slice(0, maxChars) + '\n[...content truncated for token limits. Provide best-effort JSON analysis based on above context.]'
          : finalPrompt;

        console.log(`Attempting Groq (${groqModel}, ${groqPrompt.length} chars)...`);
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: groqModel,
            messages: [{ role: 'user', content: groqPrompt }],
            response_format: { type: 'json_object' },
            max_tokens: 4096,
          },
          {
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            timeout: 60000
          }
        );
        const content = response.data.choices[0].message.content.trim();
        const cleaned = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        return JSON.parse(cleaned);
      } catch (err) {
        const errDetail = err.response?.data?.error?.message || err.message;
        console.warn(`Groq (${groqModel}) failed: ${errDetail}`);
      }
    }
    console.log('All Groq models failed. Proceeding to Hugging Face / Local LLMs...');
  }

  // 2. Hugging Face Inference API (Serverless) - Remote equivalent for local-class LLMs
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
        console.log(`Attempting Hugging Face LLM (${hfModel})...`);
        const response = await axios.post(
          'https://api-inference.huggingface.co/v1/chat/completions',
          {
            model: hfModel,
            messages: [{ role: 'user', content: finalPrompt }],
            max_tokens: 4096,
          },
          {
            headers: {
              'Authorization': `Bearer ${hfKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 25000
          }
        );
        const content = response.data.choices[0].message.content.trim();
        const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        return JSON.parse(cleaned);
      } catch (err) {
        console.warn(`Hugging Face LLM (${hfModel}) failed: ${err.message}`);
      }
    }
    console.log('All Hugging Face models failed. Proceeding to Local LLMs...');
  }

  // 3. Local LLM endpoints (LM Studio, Ollama, vLLM)
  const localEndpoints = [
    { name: 'LM Studio', url: 'http://localhost:1234/v1/chat/completions', model: 'local-model' },
    { name: 'Ollama (Llama 3)', url: 'http://localhost:11434/v1/chat/completions', model: 'llama3' },
    { name: 'Ollama (Mistral)', url: 'http://localhost:11434/v1/chat/completions', model: 'mistral' },
    { name: 'Ollama (Phi-3)', url: 'http://localhost:11434/v1/chat/completions', model: 'phi3' },
    { name: 'vLLM', url: 'http://localhost:8000/v1/chat/completions', model: 'local-model' }
  ];

  for (const local of localEndpoints) {
    try {
      console.log(`Attempting Local LLM (${local.name}) on ${local.url}...`);
      const response = await axios.post(
        local.url,
        {
          model: local.model,
          messages: [{ role: 'user', content: finalPrompt }],
          response_format: { type: 'json_object' },
          max_tokens: 4096,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 4000 // Fast timeout so we don't hang if local LLMs are not running
        }
      );
      const content = response.data.choices[0].message.content.trim();
      const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      // Quietly fall back, local server might not be running or failed
      console.log(`Local LLM (${local.name}) not available: ${err.message}`);
    }
  }

  throw new Error('All responsive LLM providers failed or were offline. Groq rate limits exceeded and local models are not running.');
}


// Main Analyze Endpoint
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'GitHub repository URL is required.' });
  }

  const repoDetails = parseGitHubUrl(url);
  if (!repoDetails) {
    return res.status(400).json({ error: 'Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repo' });
  }

  const { owner, repo } = repoDetails;
  const headers = getGithubHeaders();

  try {
    console.log(`Fetching data for ${owner}/${repo}...`);

    // 1. Fetch Repository Metadata
    let repoMeta;
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers, timeout: 12000 });
      repoMeta = response.data;
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return res.status(404).json({ error: `Repository not found or is private: ${owner}/${repo}` });
      }
      throw new Error(`Failed to fetch repo metadata: ${err.message}`);
    }

    // 2. Fetch README Content (truncated to 8000 chars to stay within model token limits)
    let readmeContent = '';
    try {
      const readmeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, timeout: 12000 });
      if (readmeRes.data.content) {
        const fullReadme = Buffer.from(readmeRes.data.content, 'base64').toString('utf-8');
        readmeContent = fullReadme.slice(0, 8000);
        if (fullReadme.length > 8000) readmeContent += '\n[README truncated for token limit]';
      }
    } catch (err) {
      console.log('No README found or error fetching README: ', err.message);
      readmeContent = 'No README file found in the repository root.';
    }

    // 3. Fetch File Tree (recurse up to 2 levels or grab direct files to avoid rate limits)
    let fileTreeStr = '';
    try {
      const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoMeta.default_branch || 'main'}?recursive=1`, { headers, timeout: 12000 });
      const files = treeRes.data.tree || [];
      // Filter out typical build artifacts, package locks, etc., and restrict count to limit size
      const filteredFiles = files
        .filter(f => !f.path.includes('node_modules') && !f.path.includes('.git/') && !f.path.includes('.next/') && !f.path.includes('build/') && !f.path.includes('dist/'))
        .slice(0, 100); // Max 100 entries for context limit

      fileTreeStr = filteredFiles.map(f => `${f.type === 'tree' ? '[Dir]' : '[File]'} ${f.path}`).join('\n');
    } catch (err) {
      console.log('Failed to fetch tree structure: ', err.message);
      fileTreeStr = 'Unable to fetch file tree due to API restrictions.';
    }

    // 4. Fetch Key Source Files (up to 3 files to build sample source code contexts like main/app files, configurations)
    let sourceFilesStr = '';
    try {
      const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoMeta.default_branch || 'main'}?recursive=1`, { headers, timeout: 12000 });
      const files = treeRes.data.tree || [];
      // Look for config, index, app, server, main files
      const candidates = files.filter(f => {
        const p = f.path.toLowerCase();
        return (
          f.type === 'blob' &&
          (p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.py') || p.endsWith('.json')) &&
          !p.includes('package-lock.json') &&
          !p.includes('node_modules') &&
          (p.includes('config') || p.includes('app') || p.includes('index') || p.includes('server') || p.includes('main') || p.includes('routes'))
        );
      }).slice(0, 3); // Fetch max 3 files to stay in context limits safely

      for (const file of candidates) {
        const fileRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, { headers, timeout: 12000 });
        const content = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
        sourceFilesStr += `\n--- File: ${file.path} ---\n${content.slice(0, 1500)}\n`; // Max 1500 chars per file
      }
    } catch (err) {
      console.log('Failed to fetch sample source files: ', err.message);
      sourceFilesStr = 'No key source files fetched.';
    }

    // 5. Build prompt templates with fetched data
    const contextData = {
      repoName: `${owner}/${repo}`,
      description: repoMeta.description || 'No description provided.',
      languages: repoMeta.language || 'Unknown',
      fileTree: fileTreeStr,
      readme: readmeContent,
      sourceFiles: sourceFilesStr
    };

    console.log('Querying Gemini to analyze repo (consolidated single request)...');

    // Run consolidated single Gemini analysis pass
    const consolidatedAnalysis = await queryGemini(getPromptTemplate('consolidated-analysis.txt', contextData));
    const cleanAnalysis = sanitizeAnalysis(consolidatedAnalysis);

    // Return structured aggregate report
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

    console.log(`Analysis complete for ${owner}/${repo}!`);
    res.json(responsePayload);

  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: `Analysis failed: ${error.message}` });
  }
});

// Generate Professional README Endpoint
app.post('/api/generate-readme', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'GitHub repository URL is required.' });
  }

  const repoDetails = parseGitHubUrl(url);
  if (!repoDetails) {
    return res.status(400).json({ error: 'Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repo' });
  }

  const { owner, repo } = repoDetails;
  const headers = getGithubHeaders();

  try {
    let readmeMarkdown = '';
    console.log(`Generating professional README for ${owner}/${repo}...`);
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers, timeout: 12000 });
    const repoMeta = response.data;

    const prompt = `You are an expert technical writer and developer advocate. Write a comprehensive, modern, production-grade README.md file in markdown format for the GitHub repository: "${owner}/${repo}".
Description: ${repoMeta.description || 'No description provided.'}
Primary Language: ${repoMeta.language || 'Unknown'}

Your generated README.md MUST include the following structured sections:
1. # ${repoMeta.name} (Include a short, punchy, professional description)
2. ## ✨ Features (Highlight 4 key capabilities using emojis)
3. ## 🛠️ Tech Stack (List primary languages, tools, and libraries)
4. ## 🏗️ Architecture (Describe structure and clean-code layouts)
5. ## 🚀 Installation (Clean, ready-to-run CLI commands)
6. ## 🎮 Usage (Provide clear examples of usage or scripts)
7. ## 🔮 Future Improvements (List planned feature upgrades)

Make it extremely polished, readable, and ready to be pushed to GitHub. Return ONLY the raw markdown text. Do not wrap the response in a JSON object or markdown code block.`;

    // 1. Try Groq (most responsive cloud API)
    const groqKey = process.env.GROQ_API_KEY;
    if (!readmeMarkdown && groqKey) {
      try {
        console.log('Generating README via Groq...');
        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }]
          },
          {
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000
          }
        );
        readmeMarkdown = groqResponse.data.choices[0].message.content.trim();
      } catch (err) {
        console.warn(`Groq README generation failed: ${err.message}`);
        console.log('Groq failed for README. Proceeding to Local LLMs...');
      }
    }

    // 2. Try Hugging Face Inference API
    const hfKey = process.env.HUGGING_FACE_API;
    if (!readmeMarkdown && hfKey) {
      const hfModels = [
        'meta-llama/Llama-3.2-3B-Instruct',
        'meta-llama/Meta-Llama-3-8B-Instruct',
        'mistralai/Mistral-7B-Instruct-v0.3',
        'microsoft/Phi-3-mini-4k-instruct'
      ];
      for (const hfModel of hfModels) {
        try {
          console.log(`Generating README via Hugging Face (${hfModel})...`);
          const response = await axios.post(
            'https://api-inference.huggingface.co/v1/chat/completions',
            {
              model: hfModel,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 4096,
            },
            {
              headers: {
                'Authorization': `Bearer ${hfKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 25000
            }
          );
          if (response.data?.choices?.[0]?.message?.content) {
            readmeMarkdown = response.data.choices[0].message.content.trim();
            break;
          }
        } catch (err) {
          console.warn(`Hugging Face LLM (${hfModel}) failed for README: ${err.message}`);
        }
      }
    }

    // 3. Try Local LLM endpoints (LM Studio, Ollama, vLLM)
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
          console.log(`Generating README via Local LLM (${local.name}) on ${local.url}...`);
          const response = await axios.post(
            local.url,
            {
              model: local.model,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 4096,
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 8000
            }
          );
          if (response.data?.choices?.[0]?.message?.content) {
            readmeMarkdown = response.data.choices[0].message.content.trim();
            break;
          }
        } catch (err) {
          console.log(`Local LLM (${local.name}) failed for README: ${err.message}`);
        }
      }
    }

    if (!readmeMarkdown) {
      readmeMarkdown = `# ${repoMeta.name}\n\n${repoMeta.description || 'No description provided.'}\n\n## ✨ Features\n- Interactive platform analytics\n- Real-time diagnostics\n\n## 🛠️ Tech Stack\n- ${repoMeta.language || 'JavaScript'}\n\n## 🚀 Installation\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\``;
    }

    // Clean markdown wrappers if returned
    if (readmeMarkdown.startsWith('```markdown')) {
      readmeMarkdown = readmeMarkdown.substring(11);
    } else if (readmeMarkdown.startsWith('```')) {
      readmeMarkdown = readmeMarkdown.substring(3);
    }
    if (readmeMarkdown.endsWith('```')) {
      readmeMarkdown = readmeMarkdown.substring(0, readmeMarkdown.length - 3);
    }
    readmeMarkdown = readmeMarkdown.trim();

    res.json({ readme: readmeMarkdown });
  } catch (error) {
    console.error('README generation error:', error.message);
    res.status(500).json({ error: `README generation failed: ${error.message}` });
  }
});

// Map location text to coordinates helper
const landLocations = [
  { lat: 37.7749, lon: -122.4194, loc: "San Francisco, USA" },
  { lat: 51.5074, lon: -0.1278, loc: "London, UK" },
  { lat: 35.6762, lon: 139.6503, loc: "Tokyo, Japan" },
  { lat: 12.9716, lon: 77.5946, loc: "Bengaluru, India" },
  { lat: 48.1351, lon: 11.5820, loc: "Munich, Germany" },
  { lat: -33.8688, lon: 151.2093, loc: "Sydney, Australia" },
  { lat: 48.8566, lon: 2.3522, loc: "Paris, France" },
  { lat: -23.5505, lon: -46.6333, loc: "Sao Paulo, Brazil" },
  { lat: 43.6532, lon: -79.3832, loc: "Toronto, Canada" },
  { lat: 39.9042, lon: 116.4074, loc: "Beijing, China" },
  { lat: -26.2041, lon: 28.0473, loc: "Johannesburg, South Africa" },
  { lat: 30.0444, lon: 31.2357, loc: "Cairo, Egypt" },
  { lat: 55.7558, lon: 37.6173, loc: "Moscow, Russia" },
  { lat: 19.4326, lon: -99.1332, loc: "Mexico City, Mexico" },
  { lat: -34.6037, lon: -58.3816, loc: "Buenos Aires, Argentina" },
  { lat: 1.3521, lon: 103.8198, loc: "Singapore" },
  { lat: 6.5244, lon: 3.3792, loc: "Lagos, Nigeria" },
  { lat: 28.6139, lon: 77.2090, loc: "New Delhi, India" },
  { lat: 40.7128, lon: -74.0060, loc: "New York, USA" }
];

const geocodeLocation = (locStr) => {
  if (!locStr) return null;
  const l = locStr.toLowerCase();
  if (l.includes('francisco') || l.includes('california') || l.includes('ca')) return { lat: 37.7749, lon: -122.4194, loc: "San Francisco, USA" };
  if (l.includes('london') || l.includes('uk') || l.includes('united kingdom')) return { lat: 51.5074, lon: -0.1278, loc: "London, UK" };
  if (l.includes('tokyo') || l.includes('japan')) return { lat: 35.6762, lon: 139.6503, loc: "Tokyo, Japan" };
  if (l.includes('india') || l.includes('bangalore') || l.includes('bengaluru')) return { lat: 12.9716, lon: 77.5946, loc: "Bengaluru, India" };
  if (l.includes('germany') || l.includes('munich') || l.includes('berlin')) return { lat: 48.1351, lon: 11.5820, loc: "Munich, Germany" };
  if (l.includes('australia') || l.includes('sydney') || l.includes('melbourne')) return { lat: -33.8688, lon: 151.2093, loc: "Sydney, Australia" };
  if (l.includes('paris') || l.includes('france')) return { lat: 48.8566, lon: 2.3522, loc: "Paris, France" };
  if (l.includes('brazil') || l.includes('sao paulo') || l.includes('rio')) return { lat: -23.5505, lon: -46.6333, loc: "Sao Paulo, Brazil" };
  if (l.includes('canada') || l.includes('toronto') || l.includes('vancouver')) return { lat: 43.6532, lon: -79.3832, loc: "Toronto, Canada" };

  // Deterministic fallback using hash code of location string to scatter points beautifully on land
  let hash = 0;
  for (let i = 0; i < locStr.length; i++) {
    hash = locStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % landLocations.length;
  const base = landLocations[idx];
  return { lat: base.lat, lon: base.lon, loc: base.loc };
};

const cities = [
  // North America
  { name: "Washington D.C.", lat: 38.9072, lon: -77.0369, country: "USA" },
  { name: "Ottawa", lat: 45.4215, lon: -75.6972, country: "Canada" },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, country: "Mexico" },
  { name: "Havana", lat: 23.1136, lon: -82.3666, country: "Cuba" },
  { name: "Guatemala City", lat: 14.6349, lon: -90.5069, country: "Guatemala" },
  { name: "San Jose", lat: 9.9281, lon: -84.0907, country: "Costa Rica" },
  { name: "Panama City", lat: 8.9824, lon: -79.5199, country: "Panama" },
  { name: "Tegucigalpa", lat: 14.0723, lon: -87.1921, country: "Honduras" },
  { name: "San Salvador", lat: 13.6929, lon: -89.2182, country: "El Salvador" },
  { name: "Managua", lat: 12.1150, lon: -86.2362, country: "Nicaragua" },
  { name: "Kingston", lat: 17.9714, lon: -76.7936, country: "Jamaica" },
  // South America
  { name: "Brasilia", lat: -15.7938, lon: -47.8828, country: "Brazil" },
  { name: "Buenos Aires", lat: -34.6037, lon: -58.3816, country: "Argentina" },
  { name: "Bogota", lat: 4.7110, lon: -74.0721, country: "Colombia" },
  { name: "Lima", lat: -12.0464, lon: -77.0428, country: "Peru" },
  { name: "Santiago", lat: -33.4489, lon: -70.6693, country: "Chile" },
  { name: "Caracas", lat: 10.4806, lon: -66.9036, country: "Venezuela" },
  { name: "Quito", lat: -0.1807, lon: -78.4678, country: "Ecuador" },
  { name: "La Paz", lat: -16.4897, lon: -68.1193, country: "Bolivia" },
  { name: "Asuncion", lat: -25.2637, lon: -57.5759, country: "Paraguay" },
  { name: "Montevideo", lat: -34.9011, lon: -56.1645, country: "Uruguay" },
  { name: "Georgetown", lat: 6.8013, lon: -58.1551, country: "Guyana" },
  { name: "Paramaribo", lat: 5.8520, lon: -55.2038, country: "Suriname" },
  // Europe
  { name: "London", lat: 51.5074, lon: -0.1278, country: "UK" },
  { name: "Paris", lat: 48.8566, lon: 2.3522, country: "France" },
  { name: "Berlin", lat: 52.5200, lon: 13.4050, country: "Germany" },
  { name: "Rome", lat: 41.9028, lon: 12.4964, country: "Italy" },
  { name: "Madrid", lat: 40.4168, lon: -3.7038, country: "Spain" },
  { name: "Kyiv", lat: 50.4501, lon: 30.5234, country: "Ukraine" },
  { name: "Warsaw", lat: 52.2297, lon: 21.0122, country: "Poland" },
  { name: "Bucharest", lat: 44.4268, lon: 26.1025, country: "Romania" },
  { name: "Amsterdam", lat: 52.3676, lon: 4.9041, country: "Netherlands" },
  { name: "Brussels", lat: 50.8503, lon: 4.3517, country: "Belgium" },
  { name: "Athens", lat: 37.9838, lon: 23.7275, country: "Greece" },
  { name: "Prague", lat: 50.0755, lon: 14.4378, country: "Czechia" },
  { name: "Lisbon", lat: 38.7223, lon: -9.1393, country: "Portugal" },
  { name: "Stockholm", lat: 59.3293, lon: 18.0686, country: "Sweden" },
  { name: "Budapest", lat: 47.4979, lon: 19.0402, country: "Hungary" },
  { name: "Minsk", lat: 53.9006, lon: 27.5590, country: "Belarus" },
  { name: "Vienna", lat: 48.2082, lon: 16.3738, country: "Austria" },
  { name: "Bern", lat: 46.9480, lon: 7.4474, country: "Switzerland" },
  { name: "Sofia", lat: 42.6977, lon: 23.3219, country: "Bulgaria" },
  { name: "Belgrade", lat: 44.7872, lon: 20.4573, country: "Serbia" },
  { name: "Copenhagen", lat: 55.6761, lon: 12.5683, country: "Denmark" },
  { name: "Helsinki", lat: 60.1699, lon: 24.9384, country: "Finland" },
  { name: "Bratislava", lat: 48.1486, lon: 17.1077, country: "Slovakia" },
  { name: "Oslo", lat: 59.9139, lon: 10.7522, country: "Norway" },
  { name: "Dublin", lat: 53.3498, lon: -6.2603, country: "Ireland" },
  { name: "Zagreb", lat: 45.8150, lon: 15.9819, country: "Croatia" },
  { name: "Tbilisi", lat: 41.7151, lon: 44.8271, country: "Georgia" },
  { name: "Chisinau", lat: 47.0105, lon: 28.8638, country: "Moldova" },
  { name: "Sarajevo", lat: 43.8563, lon: 18.4131, country: "Bosnia" },
  { name: "Tirana", lat: 41.3275, lon: 19.8187, country: "Albania" },
  { name: "Vilnius", lat: 54.6872, lon: 25.2797, country: "Lithuania" },
  { name: "Skopje", lat: 41.9973, lon: 21.4280, country: "North Macedonia" },
  { name: "Ljubljana", lat: 46.0569, lon: 14.5058, country: "Slovenia" },
  { name: "Riga", lat: 56.9496, lon: 24.1052, country: "Latvia" },
  { name: "Tallinn", lat: 59.4370, lon: 24.7536, country: "Estonia" },
  { name: "Reykjavik", lat: 64.1466, lon: -21.9426, country: "Iceland" },
  { name: "Luxembourg City", lat: 49.6116, lon: 6.1319, country: "Luxembourg" },
  // Asia
  { name: "Beijing", lat: 39.9042, lon: 116.4074, country: "China" },
  { name: "New Delhi", lat: 28.6139, lon: 77.2090, country: "India" },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456, country: "Indonesia" },
  { name: "Islamabad", lat: 33.6844, lon: 73.0479, country: "Pakistan" },
  { name: "Dhaka", lat: 23.8103, lon: 90.4125, country: "Bangladesh" },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, country: "Japan" },
  { name: "Manila", lat: 14.5995, lon: 120.9842, country: "Philippines" },
  { name: "Hanoi", lat: 21.0285, lon: 105.8542, country: "Vietnam" },
  { name: "Ankara", lat: 39.9334, lon: 32.8597, country: "Turkey" },
  { name: "Tehran", lat: 35.6892, lon: 51.3890, country: "Iran" },
  { name: "Bangkok", lat: 13.7563, lon: 100.5018, country: "Thailand" },
  { name: "Naypyidaw", lat: 19.7633, lon: 96.0785, country: "Myanmar" },
  { name: "Seoul", lat: 37.5665, lon: 126.9780, country: "South Korea" },
  { name: "Baghdad", lat: 33.3152, lon: 44.3661, country: "Iraq" },
  { name: "Kabul", lat: 34.5553, lon: 69.2075, country: "Afghanistan" },
  { name: "Riyadh", lat: 24.7136, lon: 46.6753, country: "Saudi Arabia" },
  { name: "Tashkent", lat: 41.2995, lon: 69.2401, country: "Uzbekistan" },
  { name: "Kuala Lumpur", lat: 3.1390, lon: 101.6869, country: "Malaysia" },
  { name: "Sanaa", lat: 15.3694, lon: 44.1910, country: "Yemen" },
  { name: "Kathmandu", lat: 27.7172, lon: 85.3240, country: "Nepal" },
  { name: "Colombo", lat: 6.9271, lon: 79.8612, country: "Sri Lanka" },
  { name: "Astana", lat: 51.1605, lon: 71.4272, country: "Kazakhstan" },
  { name: "Damascus", lat: 33.5138, lon: 36.2765, country: "Syria" },
  { name: "Phnom Penh", lat: 11.5564, lon: 104.9282, country: "Cambodia" },
  { name: "Amman", lat: 31.9454, lon: 35.9284, country: "Jordan" },
  { name: "Baku", lat: 40.4093, lon: 49.8671, country: "Azerbaijan" },
  { name: "Abu Dhabi", lat: 24.4539, lon: 54.3773, country: "UAE" },
  { name: "Dushanbe", lat: 38.5598, lon: 68.7870, country: "Tajikistan" },
  { name: "Jerusalem", lat: 31.7683, lon: 35.2137, country: "Israel" },
  { name: "Vientiane", lat: 17.9757, lon: 102.6331, country: "Laos" },
  { name: "Bishkek", lat: 42.8746, lon: 74.5698, country: "Kyrgyzstan" },
  { name: "Beirut", lat: 33.8938, lon: 35.5018, country: "Lebanon" },
  { name: "Singapore", lat: 1.3521, lon: 103.8198, country: "Singapore" },
  { name: "Muscat", lat: 23.5859, lon: 58.4059, country: "Oman" },
  { name: "Kuwait City", lat: 29.3759, lon: 47.9774, country: "Kuwait" },
  { name: "Ulaanbaatar", lat: 47.8864, lon: 106.9057, country: "Mongolia" },
  { name: "Yerevan", lat: 40.1792, lon: 44.4991, country: "Armenia" },
  { name: "Doha", lat: 25.2854, lon: 51.5310, country: "Qatar" },
  { name: "Manama", lat: 26.2285, lon: 50.5860, country: "Bahrain" },
  { name: "Thimphu", lat: 27.4728, lon: 89.6373, country: "Bhutan" },
  { name: "Male", lat: 4.1755, lon: 73.5093, country: "Maldives" },
  { name: "Bandar Seri Begawan", lat: 4.8903, lon: 114.9404, country: "Brunei" },
  // Africa
  { name: "Abuja", lat: 9.0765, lon: 7.3986, country: "Nigeria" },
  { name: "Addis Ababa", lat: 9.0300, lon: 38.7400, country: "Ethiopia" },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, country: "Egypt" },
  { name: "Kinshasa", lat: -4.4419, lon: 15.2663, country: "DR Congo" },
  { name: "Dodoma", lat: -6.1630, lon: 35.7516, country: "Tanzania" },
  { name: "Pretoria", lat: -25.7479, lon: 28.1878, country: "South Africa" },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219, country: "Kenya" },
  { name: "Kampala", lat: 0.3476, lon: 32.5825, country: "Uganda" },
  { name: "Algiers", lat: 36.7538, lon: 3.0588, country: "Algeria" },
  { name: "Khartoum", lat: 15.5007, lon: 32.5599, country: "Sudan" },
  { name: "Rabat", lat: 34.0209, lon: -6.8416, country: "Morocco" },
  { name: "Luanda", lat: -8.8390, lon: 13.2894, country: "Angola" },
  { name: "Maputo", lat: -25.9692, lon: 32.5732, country: "Mozambique" },
  { name: "Accra", lat: 5.6037, lon: -0.1870, country: "Ghana" },
  { name: "Antananarivo", lat: -18.8792, lon: 47.5079, country: "Madagascar" },
  { name: "Yaounde", lat: 3.8480, lon: 11.5021, country: "Cameroon" },
  { name: "Yamoussoukro", lat: 6.8276, lon: -5.2793, country: "Ivory Coast" },
  { name: "Niamey", lat: 13.5116, lon: 2.1254, country: "Niger" },
  { name: "Ouagadougou", lat: 12.3714, lon: -1.5197, country: "Burkina Faso" },
  { name: "Bamako", lat: 12.6392, lon: -8.0029, country: "Mali" },
  { name: "Lilongwe", lat: -13.9626, lon: 33.7741, country: "Malawi" },
  { name: "Lusaka", lat: -15.3875, lon: 28.3228, country: "Zambia" },
  { name: "Dakar", lat: 14.7167, lon: -17.4677, country: "Senegal" },
  { name: "N'Djamena", lat: 12.1348, lon: 15.0557, country: "Chad" },
  { name: "Mogadishu", lat: 2.0469, lon: 45.3182, country: "Somalia" },
  { name: "Harare", lat: -17.8252, lon: 31.0335, country: "Zimbabwe" },
  { name: "Conakry", lat: 9.5370, lon: -13.6773, country: "Guinea" },
  { name: "Kigali", lat: -1.9403, lon: 30.0596, country: "Rwanda" },
  { name: "Porto-Novo", lat: 6.4969, lon: 2.6289, country: "Benin" },
  { name: "Gitega", lat: -3.4274, lon: 29.9319, country: "Burundi" },
  { name: "Tunis", lat: 36.8065, lon: 10.1815, country: "Tunisia" },
  { name: "Juba", lat: 4.8517, lon: 31.5822, country: "South Sudan" },
  { name: "Lome", lat: 6.1375, lon: 1.2123, country: "Togo" },
  { name: "Freetown", lat: 8.4844, lon: -13.2344, country: "Sierra Leone" },
  { name: "Tripoli", lat: 32.8872, lon: 13.1913, country: "Libya" },
  { name: "Brazzaville", lat: -4.2634, lon: 15.2832, country: "Congo" },
  { name: "Bangui", lat: 4.3947, lon: 18.5582, country: "Central African Republic" },
  { name: "Monrovia", lat: 6.3156, lon: -10.8074, country: "Liberia" },
  { name: "Nouakchott", lat: 18.0835, lon: -15.9785, country: "Mauritania" },
  { name: "Asmara", lat: 15.3390, lon: 38.9371, country: "Eritrea" },
  { name: "Banjul", lat: 13.4549, lon: -16.5790, country: "Gambia" },
  { name: "Gaborone", lat: -24.6282, lon: 25.9231, country: "Botswana" },
  { name: "Libreville", lat: 0.4162, lon: 9.4673, country: "Gabon" },
  { name: "Maseru", lat: -29.3134, lon: 27.4844, country: "Lesotho" },
  { name: "Bissau", lat: 11.8632, lon: -15.5977, country: "Guinea-Bissau" },
  { name: "Malabo", lat: 3.7504, lon: 8.7832, country: "Equatorial Guinea" },
  { name: "Port Louis", lat: -20.1609, lon: 57.5012, country: "Mauritius" },
  { name: "Mbabane", lat: -26.3055, lon: 31.1367, country: "Eswatini" },
  { name: "Djibouti City", lat: 11.5880, lon: 43.1450, country: "Djibouti" },
  // Oceania
  { name: "Canberra", lat: -35.2809, lon: 149.1300, country: "Australia" },
  { name: "Wellington", lat: -41.2865, lon: 174.7762, country: "New Zealand" },
  { name: "Port Moresby", lat: -9.4438, lon: 147.1803, country: "Papua New Guinea" },
  { name: "Suva", lat: -18.1248, lon: 178.4501, country: "Fiji" },
  { name: "Honiara", lat: -9.4333, lon: 159.9500, country: "Solomon Islands" },
  { name: "Port Vila", lat: -17.7333, lon: 168.3167, country: "Vanuatu" },
  { name: "Apia", lat: -13.8333, lon: -171.7667, country: "Samoa" }
];


const fallbackPublicRepos = [
  { name: "react", owner: { login: "facebook" }, html_url: "https://github.com/facebook/react" },
  { name: "vue", owner: { login: "vuejs" }, html_url: "https://github.com/vuejs/core" },
  { name: "bootstrap", owner: { login: "twbs" }, html_url: "https://github.com/twbs/bootstrap" },
  { name: "vscode", owner: { login: "microsoft" }, html_url: "https://github.com/microsoft/vscode" },
  { name: "go", owner: { login: "golang" }, html_url: "https://github.com/golang/go" },
  { name: "django", owner: { login: "django" }, html_url: "https://github.com/django/django" },
  { name: "linux", owner: { login: "torvalds" }, html_url: "https://github.com/torvalds/linux" },
  { name: "freeCodeCamp", owner: { login: "freeCodeCamp" }, html_url: "https://github.com/freeCodeCamp/freeCodeCamp" },
  { name: "tensorflow", owner: { login: "tensorflow" }, html_url: "https://github.com/tensorflow/tensorflow" },
  { name: "three.js", owner: { login: "mrdoob" }, html_url: "https://github.com/mrdoob/three.js" },
  { name: "typescript", owner: { login: "microsoft" }, html_url: "https://github.com/microsoft/TypeScript" },
  { name: "rust", owner: { login: "rust-lang" }, html_url: "https://github.com/rust-lang/rust" },
  { name: "flutter", owner: { login: "flutter" }, html_url: "https://github.com/flutter/flutter" },
  { name: "svelte", owner: { login: "sveltejs" }, html_url: "https://github.com/sveltejs/svelte" },
  { name: "next.js", owner: { login: "vercel" }, html_url: "https://github.com/vercel/next.js" },
  { name: "kubernetes", owner: { login: "kubernetes" }, html_url: "https://github.com/kubernetes/kubernetes" },
  { name: "docker", owner: { login: "docker" }, html_url: "https://github.com/docker/docker-ce" },
  { name: "ansible", owner: { login: "ansible" }, html_url: "https://github.com/ansible/ansible" },
  { name: "deno", owner: { login: "denoland" }, html_url: "https://github.com/denoland/deno" },
  { name: "nest", owner: { login: "nestjs" }, html_url: "https://github.com/nestjs/nest" },
  { name: "laravel", owner: { login: "laravel" }, html_url: "https://github.com/laravel/laravel" },
  { name: "webpack", owner: { login: "webpack" }, html_url: "https://github.com/webpack/webpack" },
  { name: "npm", owner: { login: "npm" }, html_url: "https://github.com/npm/cli" },
  { name: "yarn", owner: { login: "yarnpkg" }, html_url: "https://github.com/yarnpkg/yarn" },
  { name: "pnpm", owner: { login: "pnpm" }, html_url: "https://github.com/pnpm/pnpm" },
  { name: "vite", owner: { login: "vitejs" }, html_url: "https://github.com/vitejs/vite" },
  { name: "esbuild", owner: { login: "evanw" }, html_url: "https://github.com/evanw/esbuild" },
  { name: "swc", owner: { login: "swc-project" }, html_url: "https://github.com/swc-project/swc" },
  { name: "babel", owner: { login: "babel" }, html_url: "https://github.com/babel/babel" },
  { name: "eslint", owner: { login: "eslint" }, html_url: "https://github.com/eslint/eslint" },
  { name: "prettier", owner: { login: "prettier" }, html_url: "https://github.com/prettier/prettier" },
  { name: "tailwind", owner: { login: "tailwindlabs" }, html_url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "sass", owner: { login: "sass" }, html_url: "https://github.com/sass/dart-sass" },
  { name: "less", owner: { login: "less" }, html_url: "https://github.com/less/less.js" },
  { name: "stylus", owner: { login: "stylus" }, html_url: "https://github.com/stylus/stylus" },
  { name: "postcss", owner: { login: "postcss" }, html_url: "https://github.com/postcss/postcss" },
  { name: "jquery", owner: { login: "jquery" }, html_url: "https://github.com/jquery/jquery" },
  { name: "lodash", owner: { login: "lodash" }, html_url: "https://github.com/lodash/lodash" },
  { name: "underscore", owner: { login: "jashkenas" }, html_url: "https://github.com/jashkenas/underscore" },
  { name: "ramda", owner: { login: "ramda" }, html_url: "https://github.com/ramda/ramda" },
  { name: "rxjs", owner: { login: "reactivex" }, html_url: "https://github.com/reactivex/rxjs" },
  { name: "redux", owner: { login: "reduxjs" }, html_url: "https://github.com/reduxjs/redux" },
  { name: "mobx", owner: { login: "mobxjs" }, html_url: "https://github.com/mobxjs/mobx" },
  { name: "zustand", owner: { login: "pmndrs" }, html_url: "https://github.com/pmndrs/zustand" },
  { name: "jotai", owner: { login: "pmndrs" }, html_url: "https://github.com/pmndrs/jotai" },
  { name: "recoil", owner: { login: "facebookexperimental" }, html_url: "https://github.com/facebookexperimental/Recoil" },
  { name: "xstate", owner: { login: "statelyai" }, html_url: "https://github.com/statelyai/xstate" },
  { name: "axios", owner: { login: "axios" }, html_url: "https://github.com/axios/axios" },
  { name: "fetch", owner: { login: "github" }, html_url: "https://github.com/github/fetch" },
  { name: "superagent", owner: { login: "ladjs" }, html_url: "https://github.com/ladjs/superagent" },
  { name: "express", owner: { login: "expressjs" }, html_url: "https://github.com/expressjs/express" },
  { name: "koa", owner: { login: "koajs" }, html_url: "https://github.com/koajs/koa" },
  { name: "fastify", owner: { login: "fastify" }, html_url: "https://github.com/fastify/fastify" },
  { name: "hapi", owner: { login: "hapijs" }, html_url: "https://github.com/hapijs/hapi" },
  { name: "meteor", owner: { login: "meteor" }, html_url: "https://github.com/meteor/meteor" },
  { name: "sails", owner: { login: "balderdashy" }, html_url: "https://github.com/balderdashy/sails" },
  { name: "feathers", owner: { login: "feathersjs" }, html_url: "https://github.com/feathersjs/feathers" },
  { name: "socket.io", owner: { login: "socketio" }, html_url: "https://github.com/socketio/socket.io" },
  { name: "ws", owner: { login: "websockets" }, html_url: "https://github.com/websockets/ws" },
  { name: "graphql", owner: { login: "graphql" }, html_url: "https://github.com/graphql/graphql-js" },
  { name: "apollo", owner: { login: "apollographql" }, html_url: "https://github.com/apollographql/apollo-client" },
  { name: "prisma", owner: { login: "prisma" }, html_url: "https://github.com/prisma/prisma" },
  { name: "sequelize", owner: { login: "sequelize" }, html_url: "https://github.com/sequelize/sequelize" },
  { name: "typeorm", owner: { login: "typeorm" }, html_url: "https://github.com/typeorm/typeorm" },
  { name: "mongoose", owner: { login: "Automattic" }, html_url: "https://github.com/Automattic/mongoose" },
  { name: "mongodb", owner: { login: "mongodb" }, html_url: "https://github.com/mongodb/node-mongodb-native" },
  { name: "redis", owner: { login: "redis" }, html_url: "https://github.com/redis/node-redis" },
  { name: "postgres", owner: { login: "brianc" }, html_url: "https://github.com/brianc/node-postgres" },
  { name: "mysql", owner: { login: "mysqljs" }, html_url: "https://github.com/mysqljs/mysql" },
  { name: "sqlite", owner: { login: "mapbox" }, html_url: "https://github.com/mapbox/node-sqlite3" },
  { name: "jest", owner: { login: "jestjs" }, html_url: "https://github.com/jestjs/jest" },
  { name: "mocha", owner: { login: "mochajs" }, html_url: "https://github.com/mochajs/mocha" },
  { name: "jasmine", owner: { login: "jasmine" }, html_url: "https://github.com/jasmine/jasmine.github.io" },
  { name: "cypress", owner: { login: "cypress-io" }, html_url: "https://github.com/cypress-io/cypress" },
  { name: "playwright", owner: { login: "microsoft" }, html_url: "https://github.com/microsoft/playwright" },
  { name: "puppeteer", owner: { login: "puppeteer" }, html_url: "https://github.com/puppeteer/puppeteer" },
  { name: "selenium", owner: { login: "SeleniumHQ" }, html_url: "https://github.com/SeleniumHQ/selenium" },
  { name: "webdriverio", owner: { login: "webdriverio" }, html_url: "https://github.com/webdriverio/webdriverio" },
  { name: "testcafe", owner: { login: "DevExpress" }, html_url: "https://github.com/DevExpress/testcafe" },
  { name: "ava", owner: { login: "avajs" }, html_url: "https://github.com/avajs/ava" },
  { name: "vitest", owner: { login: "vitest-dev" }, html_url: "https://github.com/vitest-dev/vitest" },
  { name: "testing-library", owner: { login: "testing-library" }, html_url: "https://github.com/testing-library/dom-testing-library" }
];

// Globe Repositories Discovery Endpoint (500 items high-density)
app.get('/api/globe-repos', async (req, res) => {
  const headers = getGithubHeaders();

  // 1. Fetch user's owned repositories (up to 100)
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
    console.log('Unable to fetch user repos, serving fallback coordinates.');
  }

  // Ensure we have user owned repos. If none are fetched, let's mock/simulate some for owner username "AppuzMathew9"
  if (ownedRepos.length === 0) {
    ownedRepos = [
      { name: "Tropic-Treasure-Portfolio", owner: { login: "AppuzMathew9" }, html_url: "https://github.com/AppuzMathew9/Tropic-Treasure-Portfolio" },
      { name: "creative-canvas-core", owner: { login: "AppuzMathew9" }, html_url: "https://github.com/AppuzMathew9/creative-canvas-core" },
      { name: "animejs-dom-effects", owner: { login: "AppuzMathew9" }, html_url: "https://github.com/AppuzMathew9/animejs-dom-effects" },
    ];
  }

  // 2. Fetch popular public repositories from GitHub
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
    console.log('Unable to fetch popular repositories: ', err.message);
  }

  // Fallback to static lists if empty
  if (publicRepos.length === 0) {
    publicRepos = fallbackPublicRepos;
  }

  // To increase owner repo rate, duplicate/expand ownedRepos so we have around 125 owner repos (25% rate)
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

  // Ensure public pool meets 375 items
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

  try {
    // Distribute repositories
    const mappedPoints = combinedRepos.map((repo, index) => {
      // Deterministically assign each repository to one of the cities / Alappuzha using its hash
      let hash = 0;
      const key = repo.name + (repo.owner?.login || 'fallback') + index;
      for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }

      const isOwner = ownedRepos.some(r => r.html_url === repo.html_url) || repo.owner?.login === 'AppuzMathew9';

      let lat, lon, loc;
      if (isOwner) {
        // Alappuzha, Kerala, India coordinates with micro scatter
        const scatterLat = 9.4981 + ((Math.abs(hash) % 40) - 20) / 250; // tight cluster (+/- 0.08 degrees)
        const scatterLon = 76.3388 + ((Math.abs(hash >> 2) % 40) - 20) / 250;
        lat = scatterLat;
        lon = scatterLon;
        loc = "Owner Repository (Alappuzha, India)";
      } else {
        // Distribute the public repos 1-to-1 to each country/city first
        let city;
        const publicIndex = index - 125; // index of public repos starting from 0
        if (publicIndex >= 0 && publicIndex < cities.length) {
          city = cities[publicIndex];
        } else {
          const cityIndex = Math.abs(hash) % cities.length;
          city = cities[cityIndex];
        }
        lat = city.lat + ((Math.abs(hash) % 40) - 20) / 100; // tightly cluster close to capital (+/- 0.2 degrees)
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

  } catch (error) {
    console.error('Globe repos distribution failed:', error);
    res.json([]);
  }
});



// Serve static assets in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all route to serve React index.html for client-side routing
  app.get('*', (req, res, next) => {
    // Exclude API paths
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
