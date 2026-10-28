import React, { useState } from 'react';
import { ExerciseItem } from '../../types/course';
import { CheckCircle2, XCircle, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';

interface ExerciseRunnerProps {
  exercises: ExerciseItem[];
  lessonNumber: number;
  onRecordScore?: (exerciseId: string, isCorrect: boolean) => void;
  onCompleteAll?: () => void;
}

export const ExerciseRunner: React.FC<ExerciseRunnerProps> = ({
  exercises,
  lessonNumber,
  onRecordScore,
  onCompleteAll
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [activeIdx, setActiveIdx] = useState<number>(0);

  if (!exercises || exercises.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-white">No Additional Exercises Required</h4>
        <p className="text-sm mt-1">You have mastered the foundational drills for this module.</p>
      </div>
    );
  }

  const currentExercise = exercises[activeIdx] || exercises[0];
  const userAnswer = answers[currentExercise.id] || '';
  const isChecked = checked[currentExercise.id] || false;

  const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,!?:;'"(){}\[\]]/g, '');
  const isCorrect = normalize(userAnswer) === normalize(currentExercise.correct_answer);

  const handleCheckAnswer = () => {
    setChecked(prev => ({ ...prev, [currentExercise.id]: true }));
    const correct = normalize(userAnswer) === normalize(currentExercise.correct_answer);
    onRecordScore?.(`lesson_${lessonNumber}_ex_${currentExercise.id}`, correct);
  };

  const handleNextExercise = () => {
    if (activeIdx < exercises.length - 1) {
      setActiveIdx(prev => prev + 1);
    } else {
      onCompleteAll?.();
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur max-w-3xl mx-auto space-y-6">
      {/* Exercise progress header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Exercise {activeIdx + 1} of {exercises.length}
          </span>
          <span className="text-xs text-slate-400 uppercase font-semibold">
            {currentExercise.type.replace('_', ' ')}
          </span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {exercises.map((ex, idx) => {
            const isCompleted = checked[ex.id];
            const answerState = isCompleted
              ? normalize(answers[ex.id] || '') === normalize(ex.correct_answer)
              : null;

            return (
              <button
                key={ex.id}
                onClick={() => setActiveIdx(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === activeIdx
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 bg-amber-500'
                    : isCompleted
                    ? answerState
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Question ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Question prompt card */}
      <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800/80 space-y-4">
        <div className="text-lg font-medium text-slate-100 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <span>{currentExercise.prompt}</span>
        </div>

        {/* Answer input types */}
        {currentExercise.type === 'multiple_choice' && currentExercise.options ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentExercise.options.map((option, optIdx) => {
              const isSelected = userAnswer === option;
              let btnClass = 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200';
              if (isSelected) {
                btnClass = 'bg-amber-500/20 border-amber-400 text-white font-semibold ring-1 ring-amber-400';
              }
              if (isChecked) {
                if (option === currentExercise.correct_answer) {
                  btnClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                } else if (isSelected && !isCorrect) {
                  btnClass = 'bg-rose-500/20 border-rose-500 text-rose-200 line-through';
                }
              }

              return (
                <button
                  key={optIdx}
                  disabled={isChecked}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentExercise.id]: option }))}
                  className={`p-3.5 rounded-xl border text-left text-sm transition flex items-center justify-between ${btnClass}`}
                >
                  <span>{option}</span>
                  {isChecked && option === currentExercise.correct_answer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {isChecked && isSelected && !isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="pt-2">
            <input
              type="text"
              value={userAnswer}
              disabled={isChecked}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentExercise.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isChecked && userAnswer.trim()) {
                  handleCheckAnswer();
                }
              }}
              placeholder="Type your answer in Shona here..."
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition"
            />
          </div>
        )}
      </div>

      {/* Validation feedback card */}
      {isChecked && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
          isCorrect
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          {isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold text-sm">
              {isCorrect ? 'Mhinduro yakarurama! (Correct Answer)' : 'Zvakanganisika (Incorrect)'}
            </p>
            {!isCorrect && (
              <p className="text-xs text-rose-300">
                Correct response: <span className="font-bold underline">{currentExercise.correct_answer}</span>
              </p>
            )}
            {currentExercise.explanation && (
              <p className="text-xs text-slate-300 pt-1 leading-relaxed">
                💡 <span className="font-medium text-slate-200">Linguistic Note:</span> {currentExercise.explanation}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action controls */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-400">
          Question {activeIdx + 1} of {exercises.length}
        </span>

        <div className="flex items-center gap-3">
          {!isChecked ? (
            <button
              onClick={handleCheckAnswer}
              disabled={!userAnswer.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNextExercise}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2"
            >
              <span>{activeIdx < exercises.length - 1 ? 'Next Exercise' : 'Finish Exercises'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
