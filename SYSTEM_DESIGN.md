# RepoXray AI — System Design Document

**Author:** Appuz Mathew  
**Submission:** QuAnHack Final Round — AI Workflow Challenge  
**Date:** June 2026

---

## Overview

RepoXray AI is a real-time GitHub repository intelligence platform that takes any public GitHub URL and produces a comprehensive, structured AI-generated report covering engineering quality, documentation audit, resume-ready bullet points, interview prep questions, employability scoring, and a 30-day improvement roadmap.

The core problem: developers and students struggle to objectively evaluate their own GitHub repositories from a recruiter or technical reviewer's perspective. RepoXray AI closes this gap instantly, using a live LLM pipeline to analyze real code and documentation.

---

## Architecture

![RepoXray AI Architecture Diagrams](docs/architecture.png)

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐ │
│  │ Planetary    │    │  3D Globe    │    │  Dashboard         │ │
│  │ Loader       │───▶│  (amCharts5) │    │  (6 Tab Views)     │ │
│  │ (CSS Anim)   │    │  500 Repos   │    │  Report Render     │ │
│  └──────────────┘    └──────┬───────┘    └────────────────────┘ │
│                             │ click repo                        │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │              React Frontend (Vite + TypeScript)           │   │
│  │   URL Input ──▶ triggerJarvisScan() ──▶ POST /api/analyze │   │
│  │   Matrix Rain Canvas  │  Progress Bar  │  Log Stream      │   │
│  └──────────────────────────────────────────┬────────────────┘   │
└────────────────────────────────────────────-│────────────────────┘
                                             │ HTTP (Vite Proxy)
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js / Express Backend                     │
│                         (Port 5000)                             │
│                                                                 │
│  POST /api/analyze                                              │
│         │                                                       │
│         ├──▶ [1] Parse & Validate GitHub URL                    │
│         │                                                       │
│         ├──▶ [2] GitHub REST API (Authenticated)                │
│         │        ├── GET /repos/{owner}/{repo}  (metadata)      │
│         │        ├── GET /repos/{owner}/{repo}/readme           │
│         │        ├── GET /git/trees?recursive=1 (file tree)     │
│         │        └── GET /contents/{file} (key source files)    │
│         │                                                       │
│         ├──▶ [3] Prompt Builder                                 │
│         │        └── Template injection → consolidated prompt   │
│         │                                                       │
│         └──▶ [4] LLM Failover Chain                            │
│                  ├── Primary:   Gemini 1.5 Flash (Google SDK)   │
│                  ├── Failover1: OpenRouter (gemini-2.5-flash)   │
│                  ├── Failover2: Hugging Face Inference API      │
│                  │              (serverless LLaMA/Mistral/Phi-3)│
│                  └── Failover3: Groq (llama-3.3-70b)           │
│                                                                 │
│  GET /api/globe-repos ──▶ GitHub Search API ──▶ 500 repos      │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              Structured JSON Report Response
              {repository, analysis: {
                engineeringReview, documentationAudit,
                resumeGenerator, interviewPrep,
                employabilityScore, roadmapGenerator
              }}
```

---

## Data Flow

1. **User Input**: The user enters a GitHub URL or clicks a coordinate point on the 3D globe.
2. **Frontend Scan**: `triggerJarvisScan()` is called — sets loading state, renders a JARVIS-style terminal boot sequence with a matrix rain canvas animation.
3. **API Request**: A `POST /api/analyze` is dispatched with the repository URL through Vite's dev proxy to the Express backend on port 5000.
4. **GitHub Data Fetch**: The backend fetches 4 data sources in sequence — repository metadata (stars, forks, language, description), the README file (base64 decoded), the recursive file tree (filtered to remove build artifacts), and up to 3 key source files (config/app/server/index patterns, max 2000 chars each).
5. **Prompt Assembly**: All fetched data is injected into a `consolidated-analysis.txt` prompt template using `{{placeholder}}` variable substitution.
6. **LLM Query with Failover**: The assembled prompt is passed to `queryGemini()`, which attempts Google Gemini, OpenRouter, Hugging Face Inference API (serverless LLaMA/Mistral/Phi-3), and Groq in sequence with timeouts to prevent hanging.
7. **Structured Output Parsing**: The LLM returns a single JSON object matching the expected 6-section report schema. Markdown wrappers are stripped and the object is parsed and validated.
8. **Report Rendered**: The structured payload is returned to the React frontend, which unmounts the loading screen and renders 7 tabbed dashboard views.
9. **Automated README Generation (Optional)**: If the user requests an improved README on the Documentation tab, the frontend issues a `POST /api/generate-readme` request, prompting the LLM backend to construct a comprehensive production-grade markdown README file.

---

## Prompt Design

The consolidated prompt strategy sends a **single request** to the LLM rather than multiple sequential calls. This reduces latency, cost, and failure points.

The prompt instructs the model to output a single JSON object containing all 7 report sections simultaneously:

```
- engineeringReview   → score (0-100), strengths[], weaknesses[], recommendations[]
- documentationAudit  → score, presentSections[], missingSections[], recommendations[]
- resumeGenerator     → ATS-optimized bullet[] using action verbs
- interviewPrep       → questions[]{question, category, difficulty, talkingPoints[]}
- employabilityScore  → overallScore + 5 subscores
- roadmapGenerator    → 30-day tasks[]{title, priority, steps[], timeline, outcome}
- recruiterSnapshot   → recommendedRoles[], technicalMaturity, strongestSkills[]
```

The prompt ends with: *"Return ONLY a JSON object. Do not include markdown formatting outside of the valid JSON structure."* This reduces formatting hallucinations and parse errors.

---

## Key Trade-offs Considered

| Decision | Chosen Approach | Alternative | Reason |
|---|---|---|---|
| **LLM calls** | Single consolidated prompt | 6-7 sequential calls | Reduces latency from ~60s to ~15s; fewer failure points |
| **LLM failover** | Gemini → OpenRouter → Hugging Face → Groq | Single provider | Eliminates 100% failure on rate limit or API outage. Hugging Face Inference API serves open-source models remotely if localhost isn't running. |
| **README Fixer** | On-demand POST endpoint | Consolidated API payload | Keeps initial analysis payload small and fast; performs heavy code generation only when requested |
| **Readiness Badge** | Calculated programmatically | LLM evaluated | Guarantees consistency and alignment with numerical scores |
| **File context** | 3 files, 2000 chars each | Full repository clone | GitHub API rate limits; token budget management |
| **Frontend state** | React useState + useEffect | Redux / Zustand | Sufficient for scope; lower bundle overhead |
| **Globe rendering** | amCharts 5 (CDN) | Mapbox / Leaflet | 3D globe with animated markers out-of-box; no API key needed |
| **Animation** | Pure CSS keyframes | GSAP / Framer Motion | Zero JS animation library cost; better performance on load |
| **Request timeouts** | 12s per GitHub call, 20s LLM | No timeout | Prevents infinite hang on loading screen |

---

## Tech Stack Summary

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, amCharts 5, Lucide React  
**Backend:** Node.js, Express, Axios, @google/generative-ai SDK  
**LLM APIs:** Google Gemini 1.5 Flash, OpenRouter (gemini-2.5-flash), Hugging Face Inference API, Groq (llama-3.3-70b)  
**Data Sources:** GitHub REST API v3 (authenticated)  
**Endpoints:** `POST /api/analyze`, `POST /api/generate-readme`, `GET /api/globe-repos`  
**Animations:** Pure CSS keyframes (planetary loader, matrix rain canvas, 3D globe rotation)
