import React from 'react';
import { useLesson } from '../../context/LessonContext';
import { InstructionBanner } from '../ui/InstructionBanner';
import { ExerciseRunner } from '../ui/ExerciseRunner';
import { Layers, BookmarkCheck, Lightbulb } from 'lucide-react';

export const ReviewSteps: React.FC = () => {
  const { currentLesson, currentStep, stepMetadata, recordExerciseScore, goToNextStep } = useLesson();

  if (!currentLesson) return null;

  const reviewSummary = currentLesson.review_summary;
  const reviewExercises = currentLesson.review_exercises || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Prominent Review Instruction Banner */}
      <InstructionBanner
        phase="review"
        stepNumber={stepMetadata.stepNumber}
        totalSteps={stepMetadata.totalSteps}
        title={stepMetadata.title}
        instruction={stepMetadata.instruction}
        badgeLabel={`Review Lesson ${currentLesson.num}`}
      />

      {/* STEP 1: REVIEW_NOTES */}
      {currentStep === 'REVIEW_NOTES' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-6 shadow-xl backdrop-blur">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {reviewSummary?.title || `Comprehensive Review of Lessons ${currentLesson.num - 6} to ${currentLesson.num - 1}`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assimil 7th-Lesson Consolidation: Synthesizing core grammar, noun classes, and conversational fluency
                </p>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-6">
              {reviewSummary?.sections.map((section, sIdx) => (
                <div key={sIdx} className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 space-y-3">
                  <h4 className="text-base font-bold text-blue-300 flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-blue-400" />
                    {section.heading}
                  </h4>
                  <ul className="space-y-2">
                    {section.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-2"></span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p>
                Take your time to internalize the concord patterns. Review lessons ensure your passive recognition converts into stable intuitive competence before moving to new vocabulary.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW_EXERCISES */}
      {currentStep === 'REVIEW_EXERCISES' && (
        <div className="space-y-6">
          <ExerciseRunner
            exercises={reviewExercises}
            lessonNumber={currentLesson.num}
            onRecordScore={recordExerciseScore}
            onCompleteAll={goToNextStep}
          />
        </div>
      )}
    </div>
  );
};
