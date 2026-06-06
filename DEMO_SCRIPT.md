# RepoXray AI — Demo Video Script
## QuAnHack Final Round Submission | 3–5 Minute Screen Recording

---

## 🎬 BEFORE YOU RECORD

**Setup checklist:**
- [ ] Browser open at `http://localhost:3000`
- [ ] Browser DevTools closed
- [ ] Screen resolution: 1920×1080 or 1440×900
- [ ] Microphone tested
- [ ] Have a real GitHub repo URL ready (use: `https://github.com/AppuzMathew9/Tropic-Treasure-Portfolio` or any public repo)
- [ ] Both dev servers running (frontend port 3000, backend port 5000)

**Recommended recording tool:** OBS Studio (free) or Loom

---

## 🎙️ SCRIPT

---

### [0:00 – 0:30] HOOK — Problem Statement

> *Show: Browser about to open localhost:3000*

**Say:**  
"Every developer has GitHub repos. But most of us have no idea how a recruiter or senior engineer actually reads them. Does my README hit the right sections? Is my code architecture clean? What interview questions would a hiring manager pull from my codebase?

I built RepoXray AI to answer all of those questions — in real time, for any public GitHub repository."

---

### [0:30 – 1:15] CINEMATIC ENTRY — Planetary Loader + Globe

> *Show: The page loading — planetary orbit animation plays for ~8 seconds*

**Say:**  
"When you first open RepoXray AI, you're greeted by a cinematic planetary loading sequence — this isn't just decoration. It represents the system aligning and booting up its AI pipeline.

Once loaded..."

> *Show: 3D rotating globe with glowing coordinate points*

**Say:**  
"...you're presented with an interactive 3D globe showing 500 real GitHub repositories, mapped to the physical locations of their owners around the world. Every glowing dot is a live repo you can audit.

You can click any coordinate to instantly analyze it, or you can paste your own GitHub URL below."

---

### [1:15 – 1:45] INPUT — Paste a GitHub URL

> *Show: Type or paste URL into the input field*

**Say:**  
"Let me walk you through a real end-to-end use case. I'll paste in a GitHub repository URL."

> *Paste: `https://github.com/AppuzMathew9/Tropic-Treasure-Portfolio`*

**Say:**  
"This is my own portfolio project. Let's see how it holds up under an AI engineering audit."

> *Click the submit arrow*

---

### [1:45 – 2:30] JARVIS SCAN — Loading Screen

> *Show: Full-screen matrix rain + JARVIS terminal with binary logs scrolling*

**Say:**  
"The moment you submit, RepoXray AI kicks off a multi-step pipeline.

On the backend, it's making authenticated GitHub API calls to pull the repository metadata, the README file, the full file tree, and key source files.

That data is assembled into a single consolidated prompt and sent to Google Gemini 1.5 Flash — my primary LLM. If Gemini is unavailable due to rate limits, it automatically fails over to OpenRouter, and then Groq as a third option.

The entire analysis — six report sections — is generated in a single LLM call to minimize latency."

> *Watch progress bar hit 100% and screen transition to dashboard*

---

### [2:30 – 3:30] REPORT WALKTHROUGH — 6 Tabs

> *Show: Dashboard Overview tab*

**Say:**  
"Here's the report. The Overview tab shows a high-level employability score — this repo scored [X]. You can see the repository stats — stars, forks, primary language — pulled live from GitHub."

> *Click Engineering Review tab*

**Say:**  
"The Engineering Review gives a code quality score out of 100, with specific subscores for architecture, maintainability, scalability, and organization. It identifies real strengths and concrete weaknesses from my actual code — not generic advice."

> *Click Documentation Audit tab*

**Say:**  
"Documentation Audit scans the README and scores it. It tells me exactly which sections I have, which are missing, and what I should add."

> *Click Resume Generator tab*

**Say:**  
"This is one of my favourite features — ATS-ready resume bullet points, written directly from my codebase. These are professional, action-verb-led bullets I can drop straight into a job application."

> *Click Interview Prep tab*

**Say:**  
"Interview Prep generates custom questions a hiring manager might ask about this specific repo — with suggested talking points for each. This is incredibly valuable before a technical interview."

> *Click Roadmap tab*

**Say:**  
"Finally, the 30-day improvement roadmap gives prioritized tasks with timelines and expected outcomes — a concrete action plan to make this repo more impressive."

---

### [3:30 – 4:00] CLOSING — Architecture Summary

> *Show: SYSTEM_DESIGN.md or a quick recap slide (or just keep dashboard visible)*

**Say:**  
"To summarise the architecture:

The React frontend proxies requests to an Express backend. The backend fetches data from the GitHub REST API, assembles a structured prompt, and calls Gemini 1.5 Flash with a multi-provider failover chain for resilience.

All six report sections — engineering score, documentation audit, resume bullets, interview questions, employability score, and roadmap — are generated in a single consolidated LLM response and rendered across six tabbed dashboard views.

This is RepoXray AI. A practical AI tool built for developers and students who want honest, actionable feedback on their GitHub work — available at localhost, with a clean GitHub repo and full system design documentation linked below."

> *End recording*

---

## 📌 POST-PRODUCTION TIPS

- Add **captions/subtitles** for professionalism
- Keep it **under 5 minutes** — judges are reviewing many submissions
- **Trim silence** between tab clicks
- Upload to **Google Drive** with "Anyone with the link can view" permissions
- Link in your submission form

---

## ✅ Submission Checklist

- [ ] Demo video recorded and uploaded to Google Drive (public link)
- [ ] GitHub repo pushed with clean commit history
- [ ] README.md complete with setup instructions
- [ ] SYSTEM_DESIGN.md included (500-800 words + diagram)
- [ ] Submission form filled out at QuAnHack link
- [ ] Reply email sent to careers@quanhack.com with confirmation

**Deadline: June 8, 2026** — Submit early for priority review!
