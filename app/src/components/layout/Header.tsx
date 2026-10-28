import React from 'react';
import { useLesson } from '../../context/LessonContext';
import { Keyboard, CheckCircle, Clock } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentLesson, activeTargetLesson, currentStep, stepMetadata, activeLessonNumber } = useLesson();

  if (!currentLesson) return null;

  const isReview = currentLesson.type === 'review' || currentLesson.num % 7 === 0;
  const isActiveWave = stepMetadata.phase === 'active';

  const displayLesson = isActiveWave && activeTargetLesson ? activeTargetLesson : currentLesson;
  const durationDisplay =
    displayLesson.duration_seconds !== null
      ? `${displayLesson.duration_seconds.toFixed(1)}s`
      : isReview
      ? 'Review Module'
      : '';

  // Step names for visual breadcrumbs
  const getStepLabels = () => {
    if (isActiveWave) {
      return [
        { key: 'ACTIVE_TRANSLATE', label: '1. Translate' },
        { key: 'ACTIVE_NOTES', label: '2. Notes' },
        { key: 'ACTIVE_EXERCISES', label: '3. Exercises' },
        { key: 'ACTIVE_CORRECTION', label: '4. Correction' },
        { key: 'ACTIVE_FINAL_SHADOW', label: '5. Shadow' }
      ];
    }
    if (isReview) {
      return [
        { key: 'REVIEW_NOTES', label: '1. Review Summary' },
        { key: 'REVIEW_EXERCISES', label: '2. Interactive Quiz' }
      ];
    }
    return [
      { key: 'PASSIVE_BLIND_1', label: '1. Blind' },
      { key: 'PASSIVE_GLOBAL', label: '2. Global' },
      { key: 'PASSIVE_DETAILED', label: '3. Detailed' },
      { key: 'PASSIVE_NOTES', label: '4. Notes' },
      { key: 'PASSIVE_READ_NO_AUDIO', label: '5. Read' },
      { key: 'PASSIVE_BLIND_2', label: '6. Blind 2' },
      { key: 'PASSIVE_PREV_REVIEW', label: '7. Review' }
    ];
  };

  const stepLabels = getStepLabels();

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 backdrop-blur sticky top-0 z-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Lesson Number & Audio Duration ONLY */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-md ${
              isActiveWave
                ? 'bg-purple-600 text-white shadow-purple-600/30'
                : isReview
                ? 'bg-blue-600 text-white shadow-blue-600/30'
                : 'bg-amber-500 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isActiveWave ? `L${activeLessonNumber}` : `L${currentLesson.num}`}
          </div>

          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>{isActiveWave ? `Lesson ${activeLessonNumber}` : `Lesson ${currentLesson.num}`}</span>
              {durationDisplay && (
                <span className="text-xs font-mono text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1">
                  {displayLesson.duration_seconds !== null && <Clock className="w-3 h-3 text-amber-400" />}
                  {durationDisplay}
                </span>
              )}
            </h2>
            <span
              className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                isActiveWave
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : isReview
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {stepMetadata.phase} wave
            </span>
          </div>
        </div>

        {/* Center: Stepper Progression */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
          {stepLabels.map((item, idx) => {
            const isCurrent = currentStep === item.key;
            const isPast = idx < stepMetadata.stepNumber - 1;

            return (
              <div
                key={item.key}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  isCurrent
                    ? isActiveWave
                      ? 'bg-purple-600 text-white shadow-md'
                      : isReview
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : isPast
                    ? 'bg-slate-900 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {isPast ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : null}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Right: Offline status & Keyboard shortcut badge */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 border border-slate-700 select-none"
            title="Keyboard shortcuts: Space to replay audio, Right Arrow or Enter for Next Step, Left Arrow for Back Step"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-mono text-[11px]">Space / ➔</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Offline Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};
