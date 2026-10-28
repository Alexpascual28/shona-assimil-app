import React, { useState, useEffect } from 'react';
import { useLesson } from '../../context/LessonContext';
import { InstructionBanner } from '../ui/InstructionBanner';
import { AudioPlayer } from '../audio/AudioPlayer';
import { DiffViewer } from '../ui/DiffViewer';
import { ExerciseRunner } from '../ui/ExerciseRunner';
import { Sparkles, Globe2, BookOpen, Edit3, RefreshCw } from 'lucide-react';

export const ActiveSteps: React.FC = () => {
  const {
    activeTargetLesson,
    activeLessonNumber,
    currentStep,
    stepMetadata,
    progress,
    updateActiveTranslation,
    updateActiveCorrection,
    recordExerciseScore,
    goToNextStep,
    audioKey,
    isDevMode,
    isDevActionRunning,
    regenerateLessonField
  } = useLesson();

  const [localTranslation, setLocalTranslation] = useState<string>('');

  // Sync saved translation for this active lesson
  useEffect(() => {
    if (activeLessonNumber && progress.active_translations[activeLessonNumber]) {
      setLocalTranslation(progress.active_translations[activeLessonNumber]);
    } else {
      setLocalTranslation('');
    }
  }, [activeLessonNumber, progress.active_translations]);

  if (!activeTargetLesson || !activeLessonNumber) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-2 animate-bounce" />
        <h3 className="text-lg font-bold text-white">Active Wave Initializing...</h3>
      </div>
    );
  }

  const renderRegenButton = (
    field: 'translation' | 'grammar_notes' | 'cultural_notes',
    label: string
  ) => {
    if (!isDevMode) return null;
    return (
      <button
        onClick={() => regenerateLessonField(activeLessonNumber, field)}
        disabled={isDevActionRunning}
        title={`Dev Mode: Regenerate ${label} for Lesson ${activeLessonNumber}`}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isDevActionRunning ? 'animate-spin' : ''}`} />
        <span>Regenerate {label}</span>
      </button>
    );
  };

  // Full canonical Shona text concatenated for diff comparison
  const canonicalShona = activeTargetLesson.dialogue.map(d => d.shona).join(' ');

  const handleTranslationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalTranslation(val);
    updateActiveTranslation(val);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Active Wave Instruction Banner */}
      <InstructionBanner
        phase="active"
        stepNumber={stepMetadata.stepNumber}
        totalSteps={stepMetadata.totalSteps}
        title={stepMetadata.title}
        instruction={stepMetadata.instruction}
        badgeLabel={`Active Target: Lesson ${activeLessonNumber}`}
      />

      {/* ACTIVE STEP 1: ACTIVE_TRANSLATE (English ONLY + Empty Textbox, no literal gloss) */}
      {currentStep === 'ACTIVE_TRANSLATE' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  English Prompt (Lesson {activeLessonNumber})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {renderRegenButton('translation', 'Translation')}
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                  Active Recall Mode
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 mb-6">
              {activeTargetLesson.dialogue.map((line) => (
                <div key={line.id} className="py-3.5 flex items-start gap-4">
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {line.id}
                  </span>
                  <div>
                    <p className="text-base font-medium text-slate-100">{line.english}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Large User Translation Input */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-sm font-bold text-purple-300 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                Your Shona Translation (Type from memory based on the English sentence above):
              </label>
              <textarea
                value={localTranslation}
                onChange={handleTranslationChange}
                rows={5}
                placeholder="Type your complete Shona translation here..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 rounded-xl p-4 text-slate-100 font-sans text-base leading-relaxed placeholder-slate-600 focus:outline-none transition"
              />
              <p className="text-xs text-slate-400 italic">
                * Your translation is saved as you type. You will inspect and compare your words against the Shona transcript in Step 4.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE STEP 2: ACTIVE_NOTES */}
      {currentStep === 'ACTIVE_NOTES' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">
                  Active Grammar Consolidation (Lesson {activeLessonNumber})
                </h3>
              </div>
              {renderRegenButton('grammar_notes', 'Grammar Notes')}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeTargetLesson.grammar_notes.map((note, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-base font-bold text-amber-300 mb-2">{note.title}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{note.content}</p>
                  {note.rule && (
                    <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-amber-500/20 text-xs text-amber-200 font-mono">
                      <span className="text-slate-400">Rule: </span>{note.rule}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {activeTargetLesson.cultural_notes && activeTargetLesson.cultural_notes.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-teal-400 uppercase tracking-wider">
                    Cultural Context
                  </h4>
                  {renderRegenButton('cultural_notes', 'Cultural Notes')}
                </div>
                {activeTargetLesson.cultural_notes.map((note, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-teal-500/20 rounded-xl p-5">
                    <h5 className="text-sm font-bold text-teal-300 mb-1">{note.title}</h5>
                    <p className="text-sm text-slate-300 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE STEP 3: ACTIVE_EXERCISES */}
      {currentStep === 'ACTIVE_EXERCISES' && (
        <div className="space-y-6">
          <ExerciseRunner
            exercises={activeTargetLesson.active_exercises || []}
            lessonNumber={activeLessonNumber}
            onRecordScore={recordExerciseScore}
            onCompleteAll={goToNextStep}
          />
        </div>
      )}

      {/* ACTIVE STEP 4: ACTIVE_CORRECTION (Audio + Shona transcript vs User translation diff) */}
      {currentStep === 'ACTIVE_CORRECTION' && (
        <div className="space-y-6">
          <AudioPlayer
            src={activeTargetLesson.audio}
            lessonNumber={activeLessonNumber}
            autoPlay={false}
            forcePlayKey={audioKey}
            label={`Lesson ${activeLessonNumber}: Correction & Cadence Verification`}
          />

          <DiffViewer
            userInput={localTranslation || '(No translation entered)'}
            referenceShona={canonicalShona}
            onSaveCorrection={(corr) => updateActiveCorrection(corr)}
          />
        </div>
      )}

      {/* ACTIVE STEP 5: ACTIVE_FINAL_SHADOW (Audio + Shona + English side-by-side) */}
      {currentStep === 'ACTIVE_FINAL_SHADOW' && (
        <div className="space-y-6">
          <AudioPlayer
            src={activeTargetLesson.audio}
            lessonNumber={activeLessonNumber}
            autoPlay={false}
            forcePlayKey={audioKey}
            label={`Lesson ${activeLessonNumber}: Master Active Shadowing Pass`}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shona column */}
            <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
              <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider pb-3 mb-3 border-b border-slate-800">
                Original Shona (Lesson {activeLessonNumber})
              </h4>
              <div className="divide-y divide-slate-800/60">
                {activeTargetLesson.dialogue.map((line) => (
                  <div key={line.id} className="py-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {line.id}
                    </span>
                    <p className="text-base font-semibold text-white leading-relaxed">
                      {line.shona}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* English column */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  English Translation
                </h4>
                {renderRegenButton('translation', 'Translation')}
              </div>
              <div className="divide-y divide-slate-800/60">
                {activeTargetLesson.dialogue.map((line) => (
                  <div key={line.id} className="py-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {line.id}
                    </span>
                    <p className="text-base text-slate-200 leading-relaxed">
                      {line.english}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
