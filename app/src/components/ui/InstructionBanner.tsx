import React from 'react';
import { Volume2, Sparkles, Layers } from 'lucide-react';
import { LessonPhase } from '../../types/state';

interface InstructionBannerProps {
  phase: LessonPhase;
  stepNumber: number;
  totalSteps: number;
  title: string;
  instruction: string;
  badgeLabel?: string;
}

export const InstructionBanner: React.FC<InstructionBannerProps> = ({
  phase,
  stepNumber,
  totalSteps,
  title,
  instruction,
  badgeLabel
}) => {
  const getPhaseStyles = () => {
    switch (phase) {
      case 'active':
        return {
          wrapper: 'bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-slate-900 border-purple-500/40 shadow-purple-950/40',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          icon: <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
        };
      case 'review':
        return {
          wrapper: 'bg-gradient-to-r from-blue-950/80 via-cyan-950/70 to-slate-900 border-blue-500/40 shadow-blue-950/40',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          icon: <Layers className="w-5 h-5 text-blue-400" />
        };
      default:
        return {
          wrapper: 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-500/30 shadow-amber-950/20',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <Volume2 className="w-5 h-5 text-amber-400" />
        };
    }
  };

  const styles = getPhaseStyles();

  return (
    <div className={`p-4 rounded-xl border backdrop-blur shadow-lg transition-all duration-300 mb-6 ${styles.wrapper}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60">
            {styles.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Step {stepNumber} of {totalSteps}</span>
              <span>•</span>
              <span className="capitalize">{phase} Phase</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badgeLabel && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {badgeLabel}
            </span>
          )}
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles.badge}`}>
            {phase.toUpperCase()} WAVE
          </span>
        </div>
      </div>

      <div className="mt-2 text-sm md:text-base font-medium text-slate-200 bg-slate-950/40 rounded-lg p-3 border border-slate-800/80 flex items-start gap-2.5">
        <span className="text-amber-400 font-bold select-none">▶</span>
        <p className="leading-relaxed italic">{instruction}</p>
      </div>
    </div>
  );
};
