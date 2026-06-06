import React, { useEffect, useRef } from 'react';
import type { AnalysisReport } from '../types';
import { gsap } from 'gsap';
import { UserCheck, Award, Shield, CheckCircle } from 'lucide-react';

interface Props {
  data: AnalysisReport;
  searchQuery?: string;
}

export const RecruiterSnapshot: React.FC<Props> = ({ data, searchQuery = '' }) => {
  const { analysis } = data;
  const snapshot = analysis.recruiterSnapshot;
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

  return (
    <div ref={rootRef} className="space-y-6">
      
      {/* Overview Heading */}
      <div className="rounded-3xl bg-[#111625] border border-white/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-outfit border border-cyan-800/30 bg-cyan-950/20 text-cyan-400">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Recruiter Quick Scan</span>
          </div>
          <h3 className="text-xl font-bold text-white font-outfit">Hiring Snapshot</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
            This snapshot provides recruiters and hiring managers with a synthesized, objective evaluation of this candidate's repository content, maturity tier, and recommended roles.
          </p>
        </div>
        
        {/* Large badge/maturity dial */}
        <div className="flex items-center gap-4 bg-slate-950/40 border border-slate-900 p-4 rounded-2xl md:w-64">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Maturity Level</div>
            <div className="text-lg font-extrabold text-white">{snapshot?.technicalMaturity || "Intermediate"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Recommended Roles Card */}
        <div className="rounded-3xl bg-[#111625] border border-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="p-2 bg-indigo-550/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white font-outfit">Recommended Roles</h4>
          </div>
          
          <div className="space-y-2.5">
            {(snapshot?.recommendedRoles ?? [])
              .filter(role => !searchQuery || role.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((role, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl hover:border-cyan-500/20 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                <span className="text-[11px] font-bold text-slate-200">{role}</span>
              </div>
            ))}
            {searchQuery && (snapshot?.recommendedRoles ?? []).filter(r => r.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <p className="text-[10px] text-slate-500 italic">No matching roles for "{searchQuery}".</p>
            )}
            {!snapshot?.recommendedRoles?.length && !searchQuery && (
              <p className="text-[10px] text-slate-500 font-mono">No recommended roles generated.</p>
            )}
          </div>
        </div>

        {/* Strongest Skills & Keywords Card */}
        <div className="rounded-3xl bg-[#111625] border border-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="p-2 bg-purple-550/10 rounded-lg text-purple-400 border border-purple-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white font-outfit">Strongest Demonstrated Skills</h4>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(snapshot?.strongestSkills ?? [])
              .filter(skill => !searchQuery || skill.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((skill, idx) => (
              <span 
                key={idx} 
                className="px-3.5 py-1.5 bg-gradient-to-r from-slate-900 to-slate-950 border border-white/5 text-[10px] font-bold text-cyan-400 rounded-xl shadow-sm hover:border-cyan-500/30 transition-all cursor-default"
              >
                {skill}
              </span>
            ))}
            {searchQuery && (snapshot?.strongestSkills ?? []).filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <p className="text-[10px] text-slate-500 italic">No matching skills for "{searchQuery}".</p>
            )}
            {!snapshot?.strongestSkills?.length && !searchQuery && (
              <p className="text-[10px] text-slate-500 font-mono">No skill keywords verified.</p>
            )}
          </div>

          <div className="bg-slate-950/20 border border-white/5 p-4 rounded-2xl text-[10px] text-slate-400 leading-relaxed mt-4">
            💡 **Recruiter Tip**: The skills listed above are verified directly through folder layout patterns, imported dependencies, and active logic implementations within the analyzed codebase.
          </div>
        </div>

      </div>

    </div>
  );
};
