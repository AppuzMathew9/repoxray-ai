import React, { useEffect, useRef, useState } from 'react';
import type { AnalysisReport } from '../types';
import { BookOpen, Check, X, AlertCircle, Sparkles, Copy, FileText, Loader2 } from 'lucide-react';
import { gsap } from 'gsap';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

interface Props {
  data: AnalysisReport;
  searchQuery?: string;
}

export const DocumentationAudit: React.FC<Props> = ({ data, searchQuery = '' }) => {
  const { documentationAudit } = data.analysis;
  const { htmlUrl } = data.repository;
  const rootRef = useRef<HTMLDivElement>(null);
  
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rootRef.current) {
      gsap.fromTo(
        rootRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, []);

  // Guard: if analysis section is missing, show a graceful fallback
  if (!documentationAudit) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-semibold">
        <span>Documentation audit data is unavailable. Please try scanning again.</span>
      </div>
    );
  }

  const docSections = [
    'Project Overview',
    'Installation Guide',
    'Usage Instructions',
    'Screenshots',
    'Architecture Diagram',
    'API Documentation',
    'Contribution Guidelines',
    'License'
  ];

  const handleGenerateReadme = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(`${API_BASE}/api/generate-readme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: htmlUrl }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to generate README');
      }

      setReadme(resData.readme);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!readme) return;
    navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={rootRef} className="space-y-8">
      {/* Overview Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Doc Audit Score */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6 flex flex-col justify-center items-center text-center group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <span className="text-slate-400 font-bold uppercase text-xs font-outfit tracking-widest">Documentation Score</span>
          
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
                className="text-purple-400 transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={402}
                strokeDashoffset={402 - (402 * documentationAudit.documentationScore) / 100}
                strokeLinecap="round"
                stroke="url(#purplePinkGradient)"
                fill="transparent"
                r="64"
                cx="80"
                cy="80"
              />
              <defs>
                <linearGradient id="purplePinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-extrabold text-white font-outfit tracking-tight">
                {documentationAudit.documentationScore}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">COMPLETE</span>
            </div>
          </div>
          
          {/* README Generator Trigger */}
          <button
            onClick={handleGenerateReadme}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold rounded-xl shadow-md shadow-indigo-950/40 border border-white/5 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Professional README</span>
              </>
            )}
          </button>
        </div>

        {/* Present vs Missing Checklist Grid */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-outfit">Standard README Audit Checklist</h3>
            <p className="text-[11px] text-slate-400 mt-1">Automatic verification of standard README header layouts and guidelines sections.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docSections
              .filter(sect => !searchQuery || sect.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((sect, idx) => {
              const isPresent = documentationAudit.presentSections.includes(sect);
              return (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    isPresent 
                      ? 'bg-slate-900/40 border-slate-800/80 hover:border-emerald-500/20' 
                      : 'bg-rose-950/5 border-rose-950/20 hover:border-rose-500/20'
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-300">{sect}</span>
                  {isPresent ? (
                    <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-900/30">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="p-1 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-900/30">
                      <X className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
            {searchQuery && docSections.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <p className="text-xs text-slate-500 italic col-span-2">No matching sections for "{searchQuery}".</p>
            )}
          </div>
        </div>
      </div>

      {/* Generated README Output Display */}
      {readme && (
        <div className="p-6 rounded-3xl bg-[#090d16] border border-cyan-500/20 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800/30">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-outfit">Generated README.md</h3>
            </div>
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-cyan-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>
          </div>

          <pre className="max-h-96 overflow-y-auto p-4 bg-slate-950/80 border border-white/5 rounded-2xl text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
            {readme}
          </pre>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-2xl text-rose-400 text-xs font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Actionable Recommendations */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-outfit flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Actionable Documentation Recommendations</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Recommended sections and structural steps to enrich repository indexing for developers and search tools.</p>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {documentationAudit.recommendations
            .filter(rec => !searchQuery || rec.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:border-purple-500/20 transition-all duration-200">
              <div className="mt-0.5 p-1.5 bg-purple-950 text-purple-400 rounded-lg border border-purple-900/30">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{rec}</p>
            </div>
          ))}
          {searchQuery && documentationAudit.recommendations.filter(r => r.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <p className="text-xs text-slate-500 italic">No matching recommendations for "{searchQuery}".</p>
          )}
        </div>
      </div>
    </div>
  );
};
