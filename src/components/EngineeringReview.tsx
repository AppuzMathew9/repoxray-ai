import React, { useEffect, useRef } from 'react';
import type { AnalysisReport } from '../types';
import { ShieldCheck, ShieldAlert, Award, Compass, Layers, CheckCircle2, ArrowUpRight, Cpu } from 'lucide-react';
import { gsap } from 'gsap';

interface Props {
  data: AnalysisReport;
  searchQuery?: string;
}

export const EngineeringReview: React.FC<Props> = ({ data, searchQuery = '' }) => {
  const { engineeringReview } = data.analysis;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootRef.current) {
      gsap.fromTo(
        rootRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, []);

  const subscoreDetails = [
    { name: 'Architecture', val: engineeringReview.subscores.architecture, icon: Layers, desc: 'Clean separation of concerns, pattern consistency' },
    { name: 'Maintainability', val: engineeringReview.subscores.maintainability, icon: ShieldCheck, desc: 'Formatting rules, ease of extensions, readability' },
    { name: 'Scalability', val: engineeringReview.subscores.scalability, icon: Compass, desc: 'Async payload safety and API request loops' },
    { name: 'Organization', val: engineeringReview.subscores.codeOrganization, icon: Award, desc: 'Folder structure and modular design imports' },
  ];

  return (
    <div ref={rootRef} className="space-y-8">
      {/* Overview Block with SVG Radial Gauge & Subscores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radial Card */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6 flex flex-col justify-center items-center text-center group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <span className="text-slate-400 font-bold uppercase text-xs font-outfit tracking-widest">Engineering Score</span>
          
          <div className="relative flex items-center justify-center my-6">
            <svg className="w-40 h-40 transform -rotate-90">
              {/* Background ring */}
              <circle 
                className="text-slate-800/80" 
                strokeWidth="10" 
                stroke="currentColor" 
                fill="transparent" 
                r="64" 
                cx="80" 
                cy="80" 
              />
              {/* Gradient stroke ring */}
              <circle
                className="text-cyan-400 transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={402} // 2 * pi * r (r=64 => 402.12)
                strokeDashoffset={402 - (402 * engineeringReview.engineeringScore) / 100}
                strokeLinecap="round"
                stroke="url(#cyanPurpleGradient)"
                fill="transparent"
                r="64"
                cx="80"
                cy="80"
              />
              <defs>
                <linearGradient id="cyanPurpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-extrabold text-white font-outfit tracking-tight">
                {engineeringReview.engineeringScore}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">HEALTH</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-[200px]">Aggregated score of coding style, structural cohesion, and design patterns.</p>
        </div>

        {/* Subscores Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subscoreDetails.map((sub, idx) => {
            const Icon = sub.icon;
            return (
              <div key={idx} className="relative overflow-hidden p-5 rounded-2xl glass-card group hover:border-cyan-500/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm font-bold text-white font-outfit">{sub.name}</span>
                  </div>
                  <span className="text-lg font-extrabold text-cyan-400 font-outfit">{sub.val}%</span>
                </div>
                
                <div className="mt-4 space-y-1.5">
                  {/* Glowing progress slider track */}
                  <div className="w-full bg-slate-900/80 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${sub.val}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{sub.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Weaknesses side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Strengths */}
        <div className="relative overflow-hidden rounded-3xl glass-card p-6 border-t-4 border-t-emerald-500/40">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-4 font-outfit uppercase tracking-widest">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Architectural Strengths
          </h3>
          <ul className="space-y-3.5">
            {engineeringReview.strengths
              .filter(str => !searchQuery || str.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((str, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2"></span>
                <span>{str}</span>
              </li>
            ))}
            {searchQuery && engineeringReview.strengths.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <li className="text-xs text-slate-500 italic">No matching strengths for "{searchQuery}".</li>
            )}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="relative overflow-hidden rounded-3xl glass-card p-6 border-t-4 border-t-rose-500/40">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-4 font-outfit uppercase tracking-widest">
            <ShieldAlert className="w-5 h-5 text-rose-400" /> Code Weaknesses
          </h3>
          <ul className="space-y-3.5">
            {engineeringReview.weaknesses
              .filter(weak => !searchQuery || weak.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((weak, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400 mt-2"></span>
                <span>{weak}</span>
              </li>
            ))}
            {searchQuery && engineeringReview.weaknesses.filter(w => w.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <li className="text-xs text-slate-500 italic">No matching weaknesses for "{searchQuery}".</li>
            )}
          </ul>
        </div>
      </div>

      {/* Code Recommendations Panel */}
      <div className="rounded-3xl glass-card p-6 sm:p-8 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-outfit flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Refactoring & Code Quality Recommendations</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Strategic actionable items to elevate codebase performance, cleanliness, and scalability.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {engineeringReview.recommendations
            .filter(rec => !searchQuery || rec.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-cyan-500/20 transition-all duration-200">
              <div className="mt-0.5 p-1.5 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-900/30">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{rec}</p>
            </div>
          ))}
          {searchQuery && engineeringReview.recommendations.filter(r => r.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <p className="text-xs text-slate-500 italic">No matching recommendations for "{searchQuery}".</p>
          )}
        </div>
      </div>
    </div>
  );
};
