import React, { useState } from 'react';
import type { AnalysisReport } from '../types';
import { ChevronDown, ChevronUp, AlertCircle, Bookmark, Sparkles, MessageCircle } from 'lucide-react';

interface Props {
  data: AnalysisReport;
  searchQuery?: string;
}

export const InterviewPrep: React.FC<Props> = ({ data, searchQuery = '' }) => {
  const { questions } = data.analysis.interviewPrep;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredQuestions = questions.filter(q => 
    q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.suggestedTalkingPoints.some(pt => pt.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Advanced':
        return 'bg-rose-500/10 text-rose-400 border-rose-900/30';
      case 'Intermediate':
        return 'bg-amber-500/10 text-amber-400 border-amber-900/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-900/30';
    }
  };

  const categories = [
    'Technical Questions',
    'Project-Specific Questions',
    'Deep-Dive Follow-Up Questions'
  ];

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl glass-card space-y-2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <h2 className="text-xl font-bold text-white font-outfit tracking-wide flex items-center gap-1.5">
          <span>Interview Preparation Dashboard</span>
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </h2>
        <p className="text-xs text-slate-400">Custom tailored interview prompts and talking points to showcase your engineering choices.</p>
      </div>

      {/* Categories Accordion Group */}
      <div className="space-y-8">
        {categories.map((category) => {
          const catQuestions = filteredQuestions.filter(q => q.category === category);
          if (catQuestions.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-outfit border-b border-slate-800 pb-2.5 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-cyan-400" /> 
                <span>{category}</span>
              </h3>
              
              <div className="grid grid-cols-1 gap-3.5">
                {catQuestions.map((q) => {
                  const isExpanded = expandedId === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-900/50 border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
                          : 'bg-slate-900/20 border-slate-800/80 hover:border-slate-700/60'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        className="w-full p-5 flex items-start justify-between gap-4 text-left cursor-pointer"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`p-2 rounded-xl border transition-colors ${
                            isExpanded ? 'bg-cyan-950/40 text-cyan-400 border-cyan-850' : 'bg-slate-900/60 text-slate-400 border-slate-800'
                          }`}>
                            <MessageCircle className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-snug">{q.question}</p>
                            <span className={`inline-block mt-2.5 px-2.5 py-0.5 text-[9px] font-bold tracking-widest border rounded-md uppercase ${getDifficultyColor(q.difficulty)}`}>
                              {q.difficulty}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4.5 h-4.5 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-4.5 h-4.5 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {/* Content panel */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 border-t border-slate-850/80 bg-slate-950/30">
                          <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 font-outfit flex items-center gap-1.5">
                            <AlertCircle className="w-4.5 h-4.5" /> Suggested Key Talking Points
                          </h4>
                          <ul className="grid grid-cols-1 gap-2.5">
                            {q.suggestedTalkingPoints.map((pt, idx) => (
                              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/40 p-3 border border-slate-850 rounded-xl leading-relaxed">
                                <span className="text-cyan-400 mt-0.5 font-bold">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filteredQuestions.length === 0 && (
          <div className="text-center p-8 bg-slate-900/10 border border-white/5 rounded-2xl text-[11px] text-slate-500">
            No matching questions found for "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
