import React from 'react';
import { useLesson } from '../../context/LessonContext';
import { ArrowLeft, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

export const NavigationBar: React.FC = () => {
  const {
    currentLesson,
    currentStep,
    stepMetadata,
    goToNextStep,
    goToPrevStep
  } = useLesson();

  if (!currentLesson) return null;

  const isFirstStep = currentStep === 'PASSIVE_BLIND_1';

  const isReviewLesson = currentLesson.type === 'review' || currentLesson.num % 7 === 0;
  const isLastPassiveStep = currentStep === 'PASSIVE_PREV_REVIEW';
  const isReviewCompleteStep = currentStep === 'REVIEW_EXERCISES';
  const isLastActiveStep = currentStep === 'ACTIVE_FINAL_SHADOW';
  const triggersReviewPhase = isLastPassiveStep && isReviewLesson;
  const triggersActiveWave =
    (isLastPassiveStep && !isReviewLesson && currentLesson.num >= 51) ||
    (isReviewCompleteStep && currentLesson.num >= 51);

  const getNextButtonConfig = () => {
    if (triggersReviewPhase) {
      return {
        label: `Start 7-Lesson Review (Lessons ${Math.max(1, currentLesson.num - 6)}–${currentLesson.num})`,
        icon: <ArrowRight className="w-4 h-4 text-blue-200" />,
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
      };
    }
    if (triggersActiveWave) {
      return {
        label: `Engage Active Wave (Lesson ${currentLesson.active_wave_target || (currentLesson.num - 50)})`,
        icon: <Zap className="w-4 h-4 fill-current text-purple-200" />,
        className: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
      };
    }
    if (isLastActiveStep) {
      return {
        label: `Complete Active Wave & Next Lesson`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-200" />,
        className: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
      };
    }
    if (isLastPassiveStep || isReviewCompleteStep) {
      return {
        label: `Complete Lesson & Advance`,
        icon: <CheckCircle2 className="w-4 h-4 text-amber-200" />,
        className: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-amber-500/20'
      };
    }
    return {
      label: `Next Step (${stepMetadata.stepNumber + 1}/${stepMetadata.totalSteps})`,
      icon: <ArrowRight className="w-4 h-4" />,
      className: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-amber-500/40'
    };
  };

  const nextBtn = getNextButtonConfig();

  return (
    <footer className="bg-slate-900/95 border-t border-slate-800 px-6 py-4 backdrop-blur sticky bottom-0 z-20">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Back Button */}
        <button
          onClick={goToPrevStep}
          disabled={isFirstStep}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${
            isFirstStep
              ? 'opacity-40 cursor-not-allowed bg-slate-950/40 text-slate-600 border-slate-800'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
          }`}
          title="Back (Left Arrow)"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Step</span>
          <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-900 text-slate-500 font-mono text-[10px]">
            ◀
          </kbd>
        </button>

        {/* Step indicator tracker */}
        <div className="text-xs text-slate-400 font-medium text-center">
          <span className="text-white font-bold">{stepMetadata.title}</span>
          <div className="text-[11px] text-slate-500">
            Step {stepMetadata.stepNumber} of {stepMetadata.totalSteps}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={goToNextStep}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${nextBtn.className}`}
          title="Next Step (Right Arrow or Enter)"
        >
          <span>{nextBtn.label}</span>
          {nextBtn.icon}
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-black/20 text-white/80 font-mono text-[10px]">
            Enter / ▶
          </kbd>
        </button>
      </div>
    </footer>
  );
};
