import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisReport } from '../types';
import { ChevronDown } from 'lucide-react';
import { gsap } from 'gsap';

interface Props {
  data: AnalysisReport;
  searchQuery?: string;
}

export const DashboardOverview: React.FC<Props> = ({ data, searchQuery = '' }) => {
  const { repository, analysis } = data;
  const [showPipeline, setShowPipeline] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootRef.current) {
      // Stagger animate all direct child elements
      gsap.fromTo(
        rootRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, []);

  // Compute filtered items dynamically
  const filteredStrengths = (analysis.engineeringReview.strengths || []).filter(
    str => !searchQuery || str.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredWeaknesses = (analysis.engineeringReview.weaknesses || []).filter(
    weak => !searchQuery || weak.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTasks = (analysis.roadmapGenerator.tasks || []).filter(
    t => !searchQuery || 
         t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
         t.expectedOutcome.toLowerCase().includes(searchQuery.toLowerCase()) || 
         t.actionableSteps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCardTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = x - xc;
    const dy = y - yc;
    const rx = -(dy / yc) * 8;
    const ry = (dx / xc) * 8;
    
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.015, 1.015, 1.015)`;
    el.style.boxShadow = '0 20px 45px rgba(6, 182, 212, 0.12)';
    el.style.borderColor = 'rgba(6, 182, 212, 0.25)';
  };

  const resetCardTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    el.style.boxShadow = '';
    el.style.borderColor = '';
  };

  // Subscores for the vertical bar chart mapping
  const subscores = [
    { name: 'Arch', val: analysis.engineeringReview.subscores.architecture, color: 'bg-gradient-to-t from-purple-500 to-pink-500' },
    { name: 'Maint', val: analysis.engineeringReview.subscores.maintainability, color: 'bg-gradient-to-t from-purple-500 to-pink-500' },
    { name: 'Scal', val: analysis.engineeringReview.subscores.scalability, color: 'bg-gradient-to-t from-purple-500 to-pink-500' },
    { name: 'Org', val: analysis.engineeringReview.subscores.codeOrganization, color: 'bg-gradient-to-t from-purple-500 to-pink-500' },
  ];

  return (
    <div ref={rootRef} className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Repository Profile Card (Julien Magnifce mockup style) */}
      <div 
        onMouseMove={handleCardTilt}
        onMouseLeave={resetCardTilt}
        className="xl:col-span-4 rounded-3xl bg-[#111625] border border-white/5 p-6 space-y-6 flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 ease-out"
        style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        {/* Card Header dots */}
        <div className="w-full flex justify-between items-center text-slate-500 text-xs font-bold">
          <span>Repository Info</span>
          <span className="cursor-pointer">•••</span>
        </div>

        {/* Profile Avatar & Name */}
        <div className="space-y-3">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-full blur opacity-40"></div>
            <img 
              src={repository.ownerAvatar} 
              alt={repository.owner} 
              className="relative w-24 h-24 rounded-full border-2 border-white/10 object-cover" 
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-outfit tracking-wide">{repository.name}</h2>
            <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">{repository.primaryLanguage || 'JavaScript'}</p>
          </div>
        </div>

        {/* Contacts details */}
        <div className="w-full text-left space-y-3 pt-4 border-t border-white/5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Owner:</span>
            <span className="font-semibold text-white">@{repository.owner}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Stars:</span>
            <span className="font-semibold text-white">{repository.stars}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">GitHub Link:</span>
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="text-cyan-400 font-semibold hover:underline truncate max-w-[140px]">
              Open Link
            </a>
          </div>
        </div>

        {/* Action Status */}
        <div className="w-full space-y-4 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">Active Audit</span>
            <span className="text-slate-500 font-bold uppercase">2 min response</span>
          </div>

          {/* Portfolio Readiness Badge */}
          {(() => {
            const overallScore = analysis.employabilityScore.overallEmployabilityScore;
            let readinessTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
            let tierColor = 'text-amber-500 bg-amber-500/10 border-amber-900/30';
            
            if (overallScore >= 85) {
              readinessTier = 'Platinum';
              tierColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse';
            } else if (overallScore >= 70) {
              readinessTier = 'Gold';
              tierColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            } else if (overallScore >= 50) {
              readinessTier = 'Silver';
              tierColor = 'text-slate-300 bg-slate-500/10 border-slate-500/20';
            }

            return (
              <div className="w-full space-y-1.5 text-left border-t border-white/5 pt-4">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Portfolio Readiness</div>
                <div className={`px-4 py-2.5 rounded-2xl border text-center font-extrabold tracking-widest text-xs uppercase ${tierColor}`}>
                  🏆 {readinessTier} Tier
                </div>
              </div>
            );
          })()}
          
          <div className="grid grid-cols-2 gap-4 text-left border-t border-white/5 pt-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Stars</span>
              <div className="text-lg font-extrabold text-white mt-0.5">{repository.stars}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Forks</span>
              <div className="text-lg font-extrabold text-white mt-0.5">{repository.forks}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Grid Dashboard Components */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Row 1: Sales Report Chart (Subscores) & Activity Stats (Employability score) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Subscores Bar Chart (Sales Report replica) */}
          <div 
            onMouseMove={handleCardTilt}
            onMouseLeave={resetCardTilt}
            className="md:col-span-7 rounded-3xl bg-[#111625] border border-white/5 p-6 space-y-4 transition-all duration-300 ease-out"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white font-outfit">Engineering Review</h3>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Codebase architecture subscores</p>
              </div>
              <span className="text-xs text-slate-500 cursor-pointer">•••</span>
            </div>

            {/* Vertical Bar Chart */}
            <div className="h-44 flex items-end justify-between px-4 pt-4 relative">
              {/* Chart Grid Lines */}
              <div className="absolute inset-x-0 bottom-0 top-4 flex flex-col justify-between pointer-events-none">
                <div className="border-b border-white/5 w-full"></div>
                <div className="border-b border-white/5 w-full"></div>
                <div className="border-b border-white/5 w-full"></div>
                <div className="border-b border-white/5 w-full"></div>
              </div>

              {subscores.map((score, sIdx) => (
                <div key={sIdx} className="flex flex-col items-center gap-2 relative z-10 w-12 group">
                  <div className="text-[10px] font-bold text-white mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {score.val}%
                  </div>
                  <div className="w-6 bg-slate-800/80 rounded-t-lg h-28 flex items-end overflow-hidden">
                    <div 
                      className={`w-full rounded-t-lg ${score.color} transition-all duration-1000`} 
                      style={{ height: `${score.val}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {score.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Stats Dial */}
          <div 
            onMouseMove={handleCardTilt}
            onMouseLeave={resetCardTilt}
            className="md:col-span-5 rounded-3xl bg-[#111625] border border-white/5 p-6 flex flex-col justify-between transition-all duration-300 ease-out"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white font-outfit">Activity Stats</h3>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Employability Score</p>
              </div>
              <span className="text-xs text-slate-500 cursor-pointer">•••</span>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle className="text-slate-800/50" strokeWidth="8" stroke="currentColor" fill="transparent" r="48" cx="64" cy="64" />
                <circle 
                  className="text-emerald-400 transition-all duration-1000" 
                  strokeWidth="8" 
                  strokeDasharray={301} 
                  strokeDashoffset={301 - (301 * analysis.employabilityScore.overallEmployabilityScore) / 100} 
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="48" 
                  cx="64" 
                  cy="64" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-extrabold text-white font-outfit">
                  {analysis.employabilityScore.overallEmployabilityScore}%
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Overall</span>
              </div>
            </div>

            <p className="text-[9px] text-slate-400 text-center leading-relaxed">
              Your activity rate is {analysis.employabilityScore.overallEmployabilityScore}%. It aligns directly with target recruiter expectations.
            </p>
          </div>

        </div>

        {/* Row 2: Stats counters (Social counters replica) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div 
            onMouseMove={handleCardTilt}
            onMouseLeave={resetCardTilt}
            className="rounded-3xl bg-[#111625] border border-white/5 p-5 flex items-center justify-between group hover:border-cyan-500/20 transition-all duration-300 ease-out"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Strengths Found</span>
              <div className="text-xl font-extrabold text-white">
                {searchQuery ? `${filteredStrengths.length} / ${analysis.engineeringReview.strengths.length}` : `${analysis.engineeringReview.strengths.length} items`}
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-900/30">+10.2%</span>
          </div>

          <div 
            onMouseMove={handleCardTilt}
            onMouseLeave={resetCardTilt}
            className="rounded-3xl bg-[#111625] border border-white/5 p-5 flex items-center justify-between group hover:border-purple-500/20 transition-all duration-300 ease-out"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Weaknesses identified</span>
              <div className="text-xl font-extrabold text-white">
                {searchQuery ? `${filteredWeaknesses.length} / ${analysis.engineeringReview.weaknesses.length}` : `${analysis.engineeringReview.weaknesses.length} items`}
              </div>
            </div>
            <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-900/30">-5.4%</span>
          </div>

          <div 
            onMouseMove={handleCardTilt}
            onMouseLeave={resetCardTilt}
            className="rounded-3xl bg-[#111625] border border-white/5 p-5 flex items-center justify-between group hover:border-amber-500/20 transition-all duration-300 ease-out"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Improvement Steps</span>
              <div className="text-xl font-extrabold text-white">
                {searchQuery ? `${filteredTasks.length} / ${analysis.roadmapGenerator.tasks.length}` : `${analysis.roadmapGenerator.tasks.length} tasks`}
              </div>
            </div>
            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-900/30">+24.0%</span>
          </div>
        </div>

        {/* Dynamic Search Results Section (only visible when searching) */}
        {searchQuery.trim() !== '' && (
          <div 
            onMouseMove={handleCardTilt}
            onMouseLeave={resetCardTilt}
            className="rounded-3xl bg-[#111625] border border-cyan-500/25 p-6 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-all duration-300 ease-out"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-outfit">Dynamic Search Results</h3>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Matching elements for "{searchQuery}"</p>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-900/30">
                {filteredStrengths.length + filteredWeaknesses.length + filteredTasks.length} matches
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Matching Strengths */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Strengths ({filteredStrengths.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredStrengths.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-900/30 border border-slate-800/50 rounded-xl text-[10px] text-slate-350 leading-relaxed">
                      {item}
                    </div>
                  ))}
                  {filteredStrengths.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic">No matching strengths.</p>
                  )}
                </div>
              </div>

              {/* Matching Weaknesses */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Weaknesses ({filteredWeaknesses.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredWeaknesses.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-900/30 border border-slate-800/50 rounded-xl text-[10px] text-slate-350 leading-relaxed">
                      {item}
                    </div>
                  ))}
                  {filteredWeaknesses.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic">No matching weaknesses.</p>
                  )}
                </div>
              </div>

              {/* Matching Tasks */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  Improvement Tasks ({filteredTasks.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredTasks.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-900/30 border border-slate-800/50 rounded-xl text-[10px] text-slate-350 leading-relaxed">
                      <div className="font-bold text-white mb-0.5">{item.title}</div>
                      <div>{item.expectedOutcome}</div>
                    </div>
                  ))}
                  {filteredTasks.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic">No matching tasks.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Actionable Pipeline (Customer Analytics replica) */}
        <div 
          onMouseMove={handleCardTilt}
          onMouseLeave={resetCardTilt}
          className="rounded-3xl bg-[#111625] border border-white/5 p-6 space-y-4 transition-all duration-300 ease-out"
          style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white font-outfit">Quality Refactoring Flow</h3>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Checklist steps and priority items</p>
            </div>
            <button 
              onClick={() => setShowPipeline(!showPipeline)}
              className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-white transition-all cursor-pointer"
            >
              <span>{showPipeline ? 'Hide Flow' : 'Show Flow Details'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${showPipeline ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showPipeline ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {[
                { name: '1. Ingest URL', desc: 'Validates and extracts remote repository structure' },
                { name: '2. Static Review', desc: 'Audits folders, architecture loops & code separation' },
                { name: '3. Resume highlight', desc: 'Converts source logic to resume achievement bullets' },
                { name: '4. Prep & Roadmap', desc: 'Constructs custom scenarios and improvements roadmap' }
              ]
                .filter(step => !searchQuery || step.name.toLowerCase().includes(searchQuery.toLowerCase()) || step.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((step, idx) => (
                <div key={idx} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                  <h4 className="text-[10px] font-bold text-white">{step.name}</h4>
                  <p className="text-[9px] text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
              {searchQuery && [
                { name: '1. Ingest URL', desc: 'Validates and extracts remote repository structure' },
                { name: '2. Static Review', desc: 'Audits folders, architecture loops & code separation' },
                { name: '3. Resume highlight', desc: 'Converts source logic to resume achievement bullets' },
                { name: '4. Prep & Roadmap', desc: 'Constructs custom scenarios and improvements roadmap' }
              ].filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-[10px] text-slate-500 italic col-span-4">No matching pipeline steps for "{searchQuery}".</p>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 p-2 bg-slate-950/20 border border-white/5 rounded-xl text-center">
              🎉 Dashboard fully loaded. Select options in the left sidebar to generate Resume Highlights, Interview Prep, or Roadmap.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
