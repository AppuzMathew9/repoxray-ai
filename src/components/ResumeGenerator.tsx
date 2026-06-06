import React, { useState } from 'react';
import type { AnalysisReport } from '../types';
import { Briefcase, Copy, Check, FileText, Sparkles } from 'lucide-react';

interface Props {
  data: AnalysisReport;
  searchQuery?: string;
}

export const ResumeGenerator: React.FC<Props> = ({ data, searchQuery = '' }) => {
  const bullets = data.analysis?.resumeGenerator?.bullets ?? [];
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!data.analysis?.resumeGenerator) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-semibold">
        <span>Resume data is unavailable. Please try scanning again.</span>
      </div>
    );
  }

  const filteredBullets = bullets.filter(b => 
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl glass-card space-y-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/40 text-cyan-400 rounded-xl border border-cyan-800/30">
            <Briefcase className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-outfit tracking-wide flex items-center gap-1.5">
              <span>ATS Resume Bullet Generator</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Professional, high-impact descriptors formatted to pass corporate applicant tracking systems.</p>
          </div>
        </div>
        
        <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
          Recruiters review resumes in seconds. These points leverage the action-context-impact methodology to capture engineering decisions, architectural improvements, and visual highlights.
        </p>
      </div>

      {/* Bullets Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredBullets.map((bullet, idx) => (
          <div 
            key={idx} 
            className="group relative p-5 bg-slate-900/30 border border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-950/40 rounded-2xl transition-all duration-300 flex items-start gap-4 justify-between"
          >
            <div className="flex gap-3">
              <div className="mt-1 p-2 bg-slate-900/60 border border-slate-850 rounded-xl text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-900/30 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">{bullet}</p>
            </div>
            
            <button
              onClick={() => copyToClipboard(bullet, idx)}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:border-cyan-500/40 transition-all flex-shrink-0 relative shadow-sm"
              title="Copy to clipboard"
            >
              {copiedIdx === idx ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-1">
                  <Check className="w-3.5 h-3.5" /> Copied
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}
        {filteredBullets.length === 0 && (
          <div className="text-center p-8 bg-slate-900/10 border border-white/5 rounded-2xl text-[11px] text-slate-500">
            No matching bullets found for "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
