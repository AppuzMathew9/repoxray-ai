import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import Boom from '@hapi/boom';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateCache = new Map();

// Helper to read prompt template files
function getPromptTemplate(filename, data = {}) {
  try {
    let template = templateCache.get(filename);
    if (!template) {
      // prompts is in server/prompts, but llm.js is in server/lib/
      const filePath = path.join(__dirname, '..', 'prompts', filename);
      template = fs.readFileSync(filePath, 'utf-8');
      templateCache.set(filename, template);
      logger.info(`Loaded prompt template from disk and cached: ${filename}`);
    }
    
    let interpolated = template;
    for (const [key, value] of Object.entries(data)) {
      interpolated = interpolated.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return interpolated;
  } catch (error) {
    logger.error(`Failed to load prompt template ${filename}`, { error: error.message });
    throw Boom.internal(`Template processing error: ${error.message}`);
  }
}

// Helper to query LLMs (Local and Cloud) with structured JSON output expectation
async function queryGemini(promptText, schemaText) {
  const finalPrompt = `${promptText}\n\nIMPORTANT: Return ONLY a raw JSON object. No markdown, no code fences, no extra text. Just the JSON.`;

  // 1. Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = [
      { id: 'llama-3.1-8b-instant', maxChars: 5500 },
      { id: 'llama-3.3-70b-versatile', maxChars: 18000 },
    ];

    for (const { id: groqModel, maxChars } of groqModels) {
      try {
        let groqPrompt = finalPrompt;
        if (finalPrompt.length > maxChars) {
          const keepHead = Math.floor(maxChars * 0.6);
          const keepTail = maxChars - keepHead;
          groqPrompt = finalPrompt.slice(0, keepHead) +
            '\n[...repository content truncated for token limits...]\n' +
            finalPrompt.slice(-keepTail);
        }

        logger.info(`Attempting Groq (${groqModel}, ${groqPrompt.length} chars)...`);
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
        logger.warn(`Groq (${groqModel}) failed: ${errDetail}`);
      }
    }
    logger.info('All Groq models failed. Proceeding to Hugging Face / Local LLMs...');
  }

  // 2. Hugging Face
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
        logger.info(`Attempting Hugging Face LLM (${hfModel})...`);
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
        logger.warn(`Hugging Face LLM (${hfModel}) failed: ${err.message}`);
      }
    }
    logger.info('All Hugging Face models failed. Proceeding to Local LLMs...');
  }

  // 3. Local LLMs
  const localEndpoints = [
    { name: 'LM Studio', url: 'http://localhost:1234/v1/chat/completions', model: 'local-model' },
    { name: 'Ollama (Llama 3)', url: 'http://localhost:11434/v1/chat/completions', model: 'llama3' },
    { name: 'Ollama (Mistral)', url: 'http://localhost:11434/v1/chat/completions', model: 'mistral' },
    { name: 'Ollama (Phi-3)', url: 'http://localhost:11434/v1/chat/completions', model: 'phi3' },
    { name: 'vLLM', url: 'http://localhost:8000/v1/chat/completions', model: 'local-model' }
  ];

  for (const local of localEndpoints) {
    try {
      logger.info(`Attempting Local LLM (${local.name}) on ${local.url}...`);
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
          timeout: 4000
        }
      );
      const content = response.data.choices[0].message.content.trim();
      const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      logger.info(`Local LLM (${local.name}) not available: ${err.message}`);
    }
  }

  throw Boom.badGateway('All responsive LLM providers failed or were offline. Groq rate limits exceeded and local models are not running.');
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
    if (!Array.isArray(val)) return def;
    const filtered = val.filter(item => typeof item === 'string' && item.trim().length > 0);
    return filtered.length > 0 ? filtered : def;
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
  const standardSections = [
    'Project Overview',
    'Installation Guide',
    'Usage Instructions',
    'Screenshots',
    'Architecture Diagram',
    'API Documentation',
    'Contribution Guidelines',
    'License'
  ];

  const normalizeSections = (arr) => {
    if (!Array.isArray(arr)) return [];
    const mapped = new Set();
    for (const item of arr) {
      if (typeof item !== 'string') continue;
      const l = item.toLowerCase().trim();
      if (l.includes('overview') || l.includes('what it does') || l.includes('about')) {
        mapped.add('Project Overview');
      } else if (l.includes('install') || l.includes('getting started') || l.includes('setup') || l.includes('clone') || l.includes('prerequisite')) {
        mapped.add('Installation Guide');
      } else if (l.includes('usage') || l.includes('how to use') || l.includes('running') || l.includes('features')) {
        mapped.add('Usage Instructions');
      } else if (l.includes('screenshot')) {
        mapped.add('Screenshots');
      } else if (l.includes('architecture') || l.includes('diagram') || l.includes('structure') || l.includes('design')) {
        mapped.add('Architecture Diagram');
      } else if (l.includes('api') || l.includes('endpoint') || l.includes('reference')) {
        mapped.add('API Documentation');
      } else if (l.includes('contribut') || l.includes('guidelines') || l.includes('join')) {
        mapped.add('Contribution Guidelines');
      } else if (l.includes('license')) {
        mapped.add('License');
      } else {
        const match = standardSections.find(s => s.toLowerCase() === l);
        if (match) mapped.add(match);
      }
    }
    return Array.from(mapped);
  };

  const present = normalizeSections(rawDoc.presentSections || []);
  // Fallbacks if nothing detected or parsing is empty
  const presentSections = present.length > 0 ? present : ["Project Overview", "Installation Guide"];
  const missingSections = standardSections.filter(s => !presentSections.includes(s));

  const documentationAudit = {
    documentationScore: cleanNum(rawDoc.documentationScore, 70),
    presentSections,
    missingSections,
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

export {
  getPromptTemplate,
  queryGemini,
  safeJsonParse,
  sanitizeAnalysis
};
