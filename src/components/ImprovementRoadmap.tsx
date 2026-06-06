import React from 'react';
import type { AnalysisReport } from '../types';
import { Clock, ArrowRight, Sparkles, Target } from 'lucide-react';

interface Props {
  data: AnalysisReport;
  searchQuery?: string;
}

export const ImprovementRoadmap: React.FC<Props> = ({ data, searchQuery = '' }) => {
  const tasks = data.analysis?.roadmapGenerator?.tasks ?? [];

  if (!data.analysis?.roadmapGenerator) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-semibold">
        <span>Roadmap data is unavailable. Please try scanning again.</span>
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.expectedOutcome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.actionableSteps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'High':
        return {
          bg: 'bg-rose-950/5 border-rose-900/20 hover:border-rose-500/20',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-900/30',
          iconColor: 'text-rose-400',
          dot: 'bg-rose-400 border-rose-500/30 ring-rose-500/10'
        };
      case 'Medium':
        return {
          bg: 'bg-amber-950/5 border-amber-900/20 hover:border-amber-500/20',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-900/30',
          iconColor: 'text-amber-400',
          dot: 'bg-amber-400 border-amber-500/30 ring-amber-500/10'
        };
      default:
        return {
          bg: 'bg-emerald-950/5 border-emerald-900/20 hover:border-emerald-500/20',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-900/30',
          iconColor: 'text-emerald-400',
          dot: 'bg-emerald-400 border-emerald-500/30 ring-emerald-500/10'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl glass-card space-y-2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <h2 className="text-xl font-bold text-white font-outfit tracking-wide flex items-center gap-1.5">
          <span>30-Day Project Improvement Roadmap</span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </h2>
        <p className="text-xs text-slate-400">Prioritized checklist tasks to clean code architecture, expand test coverage, and improve repository ranking.</p>
      </div>

      {/* Roadmap Timeline Track */}
      <div className="relative border-l-2 border-slate-800 pl-6 ml-4 space-y-8">
        {filteredTasks.map((task, idx) => {
          const styles = getPriorityStyles(task.priority);
          return (
            <div key={idx} className="relative group">
              {/* Timeline dot marker */}
              <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold font-outfit shadow-md transition-all group-hover:scale-110`}>
                {idx + 1}
              </div>

              <div className={`p-5 rounded-2xl border glass-card ${styles.bg} space-y-4 transition-all duration-300`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded-md ${styles.badge}`}>
                      {task.priority} Priority
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white font-outfit group-hover:text-cyan-400 transition-colors">
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                     <Clock className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[11px] tracking-wide">{task.timeline}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actionable Steps</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {task.actionableSteps.map((step, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2 p-3 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors">
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-850/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px]">Outcome: <strong className="text-slate-200">{task.expectedOutcome}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="text-center p-8 bg-slate-900/10 border border-white/5 rounded-2xl text-[11px] text-slate-500 -ml-6">
            No matching tasks found for "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
