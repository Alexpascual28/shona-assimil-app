import React from 'react';
import { useLesson } from '../../context/LessonContext';
import { AudioPlayer } from '../audio/AudioPlayer';
import { InstructionBanner } from '../ui/InstructionBanner';
import { BookOpen, Globe2, Sparkles, Volume2, ArrowLeftRight } from 'lucide-react';

export const PassiveSteps: React.FC = () => {
  const { currentLesson, currentStep, stepMetadata, courseData, audioKey } = useLesson();

  if (!currentLesson) return null;

  // Previous lesson for Step 7
  const prevLessonNumber = Math.max(1, currentLesson.num - 1);
  const prevLesson = courseData?.lessons.find(l => l.num === prevLessonNumber) || null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Prominent Assimil Method Instruction Banner */}
      <InstructionBanner
        phase="passive"
        stepNumber={stepMetadata.stepNumber}
        totalSteps={stepMetadata.totalSteps}
        title={stepMetadata.title}
        instruction={stepMetadata.instruction}
        badgeLabel={`Lesson ${currentLesson.num}`}
      />

      {/* STEP 1: Blind Shadowing 1 (Audio ONLY, no text) */}
      {currentStep === 'PASSIVE_BLIND_1' && (
        <div className="space-y-8 text-center py-6">
          <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-3xl max-w-xl mx-auto shadow-2xl">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <Volume2 className="w-10 h-10 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Passive Phase: Blind Listening</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Focus entirely on the acoustics, rhythms, and high/low tonal melodies of the spoken Shona. Do not worry about spelling or grammar yet.
            </p>
          </div>

          <AudioPlayer
            src={currentLesson.audio}
            lessonNumber={currentLesson.num}
            autoPlay={true}
            forcePlayKey={audioKey}
            label={`Lesson ${currentLesson.num}: Acoustic Shadowing Pass`}
          />
        </div>
      )}

      {/* STEP 2: Global Comprehension (Audio + English translation ONLY, Shona and literal gloss hidden) */}
      {currentStep === 'PASSIVE_GLOBAL' && (
        <div className="space-y-6">
          <AudioPlayer
            src={currentLesson.audio}
            lessonNumber={currentLesson.num}
            autoPlay={true}
            forcePlayKey={audioKey}
            label={`Lesson ${currentLesson.num}: Global Meaning Pass`}
          />

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  English Translation
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Shona transcript hidden
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {currentLesson.dialogue.map((line) => (
                <div key={line.id} className="py-4 flex items-start gap-4">
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {line.id}
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-medium text-slate-100 leading-relaxed">
                      {line.english}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Detailed Shadowing (Audio + Shona transcript AND English translation side-by-side, no literal gloss) */}
      {currentStep === 'PASSIVE_DETAILED' && (
        <div className="space-y-6">
          <AudioPlayer
            src={currentLesson.audio}
            lessonNumber={currentLesson.num}
            autoPlay={true}
            forcePlayKey={audioKey}
            label={`Lesson ${currentLesson.num}: Detailed Bilingual Shadowing`}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shona column */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Shona Transcript (ChiZezuru)
                </h4>
              </div>
              <div className="divide-y divide-slate-800/60">
                {currentLesson.dialogue.map((line) => (
                  <div key={line.id} className="py-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {line.id}
                    </span>
                    <p className="text-base font-semibold text-slate-50 leading-relaxed">
                      {line.shona}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* English column */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
                <Globe2 className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
                  English Translation
                </h4>
              </div>
              <div className="divide-y divide-slate-800/60">
                {currentLesson.dialogue.map((line) => (
                  <div key={line.id} className="py-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {line.id}
                    </span>
                    <div className="space-y-1">
                      <p className="text-base text-slate-200 leading-relaxed">
                        {line.english}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Grammar & Cultural Notes (Texts + Literal Translation alongside notes; audio hidden/paused) */}
      {currentStep === 'PASSIVE_NOTES' && (
        <div className="space-y-6">
          {/* Bilingual transcript summary with Literal Word-by-Word Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Reference Dialogue & Word-by-Word Literal Breakdown
            </h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {currentLesson.dialogue.map((line) => (
                <div key={line.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-amber-500/80 uppercase tracking-wider block mb-0.5">
                        Shona Transcript
                      </span>
                      <p className="font-semibold text-base text-amber-300">{line.shona}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-wider block mb-0.5">
                        English Translation
                      </span>
                      <p className="text-slate-200 text-base">{line.english}</p>
                    </div>
                  </div>
                  {line.literal_gloss && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Literal Word-by-Word Translation
                      </span>
                      <p className="text-xs text-amber-400/90 font-mono leading-relaxed">
                        {line.literal_gloss}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Grammar Notes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Grammar & Concord Analysis</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentLesson.grammar_notes.map((note, idx) => (
                <div key={idx} className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
                  <h4 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                    {note.title}
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{note.content}</p>
                  {note.rule && (
                    <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-amber-500/20 text-xs text-amber-200 font-mono">
                      <span className="text-slate-400">Rule: </span>{note.rule}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cultural Notes */}
          {currentLesson.cultural_notes && currentLesson.cultural_notes.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="text-lg font-bold text-white">Tsika neMagariro (Cultural Context)</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {currentLesson.cultural_notes.map((note, idx) => (
                  <div key={idx} className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-5 shadow-lg">
                    <h4 className="text-base font-bold text-teal-300 mb-2">{note.title}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Autonomous Reading WITHOUT Audio */}
      {currentStep === 'PASSIVE_READ_NO_AUDIO' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-amber-400 shrink-0 line-through" />
            <span>Audio is intentionally muted for this step. Practice reading aloud to test autonomous pronunciation recall.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shona column */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider pb-3 mb-3 border-b border-slate-800">
                Read Aloud (ChiZezuru)
              </h4>
              <div className="divide-y divide-slate-800/60">
                {currentLesson.dialogue.map((line) => (
                  <div key={line.id} className="py-4 flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {line.id}
                    </span>
                    <p className="text-lg font-semibold text-white leading-relaxed">
                      {line.shona}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* English translation check */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider pb-3 mb-3 border-b border-slate-800">
                Verify Translation (English)
              </h4>
              <div className="divide-y divide-slate-800/60">
                {currentLesson.dialogue.map((line) => (
                  <div key={line.id} className="py-4 flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {line.id}
                    </span>
                    <p className="text-base text-slate-300 leading-relaxed">
                      {line.english}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Final Blind Shadowing (Audio ONLY, no texts) */}
      {currentStep === 'PASSIVE_BLIND_2' && (
        <div className="space-y-8 text-center py-6">
          <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-3xl max-w-xl mx-auto shadow-2xl">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <Volume2 className="w-10 h-10 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Final Blind Shadowing</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Now that you understand the grammatical rules and vocabulary, listen once more without reading. Repeat each phrase effortlessly in rhythm with the speaker.
            </p>
          </div>

          <AudioPlayer
            src={currentLesson.audio}
            lessonNumber={currentLesson.num}
            autoPlay={true}
            forcePlayKey={audioKey}
            label={`Lesson ${currentLesson.num}: Final Master Audio Pass`}
          />
        </div>
      )}

      {/* STEP 7: Previous Lesson Review (Lesson N - 1 side-by-side + audio) */}
      {currentStep === 'PASSIVE_PREV_REVIEW' && (
        <div className="space-y-6">
          {currentLesson.num === 1 || !prevLesson ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-xl mx-auto">
              <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">First Lesson Milestones Complete!</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                As this is Lesson 1, there is no previous lesson to review. Click <span className="font-bold text-amber-400">"Next Step"</span> to complete this lesson and advance to Lesson 2!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Reviewing Lesson {prevLesson.num}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {prevLesson.duration_seconds !== null
                        ? `Audio Duration: ${prevLesson.duration_seconds.toFixed(1)}s`
                        : 'Consolidation Review'}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Spacing Review
                </span>
              </div>

              <AudioPlayer
                src={prevLesson.audio}
                lessonNumber={prevLesson.num}
                autoPlay={true}
                forcePlayKey={audioKey}
                label={`Lesson ${prevLesson.num}: Review Audio`}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider pb-3 mb-3 border-b border-slate-800">
                    Shona Dialogue (Lesson {prevLesson.num})
                  </h4>
                  <div className="divide-y divide-slate-800/60">
                    {prevLesson.dialogue.map((line) => (
                      <div key={line.id} className="py-3 flex items-start gap-3">
                        <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {line.id}
                        </span>
                        <p className="text-base font-semibold text-slate-100">{line.shona}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider pb-3 mb-3 border-b border-slate-800">
                    English Translation
                  </h4>
                  <div className="divide-y divide-slate-800/60">
                    {prevLesson.dialogue.map((line) => (
                      <div key={line.id} className="py-3 flex items-start gap-3">
                        <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {line.id}
                        </span>
                        <p className="text-base text-slate-200">{line.english}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
