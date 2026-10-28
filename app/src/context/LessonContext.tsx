import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CourseData, Lesson, RawLesson, ExerciseItem, MorphemeGloss, NoteItem, ReviewSummary } from '../types/course';
import {
  LessonStep,
  PASSIVE_STEPS,
  REVIEW_STEPS,
  ACTIVE_STEPS,
  PassiveStep,
  ReviewStep,
  ActiveStep,
  StepMetadata
} from '../types/state';
import { UserProgress, DEFAULT_USER_PROGRESS } from '../types/progress';
import { loadStoredProgress, saveStoredProgress } from '../utils/storage';

interface LessonContextType {
  courseData: CourseData | null;
  loading: boolean;
  currentLesson: Lesson | null;
  activeTargetLesson: Lesson | null;
  currentStep: LessonStep;
  stepMetadata: StepMetadata;
  progress: UserProgress;
  activeLessonNumber: number | null;
  isAudioPlaying: boolean;
  audioKey: number;
  setIsAudioPlaying: (playing: boolean) => void;
  replayAudio: () => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  jumpToLesson: (lessonNum: number) => void;
  updateActiveTranslation: (text: string) => void;
  updateActiveCorrection: (text: string) => void;
  recordExerciseScore: (exerciseId: string, isCorrect: boolean) => void;
  resetProgress: () => void;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

// Normalization adapter for raw syllabus data
function normalizeLesson(raw: RawLesson, idx: number): Lesson {
  const num = raw.lesson_number || raw.num || (idx + 1);
  const isReview = raw.type === 'review' || num % 7 === 0;
  const duration_seconds = typeof raw.duration_seconds === 'number' ? raw.duration_seconds : null;

  // Never include Shona transcript or English translation in titles
  const title_shona = `Lesson ${num}`;
  const title_english = duration_seconds !== null ? `${duration_seconds.toFixed(1)}s` : (isReview ? 'Review' : '');

  // Audio path (normalize /audio/ to audio/)
  let audio = raw.audio_url || raw.audio || `audio/lesson_${String(num).padStart(3, '0')}.mp3`;
  if (audio.startsWith('/')) {
    audio = audio.substring(1);
  }

  const shona_text = raw.shona_text || '';
  const english_translation = raw.english_translation || '';

  // Morpheme Gloss formatting
  let formattedGlossStr = '';
  const glossBreakdown: MorphemeGloss[] = [];
  if (Array.isArray(raw.literal_gloss)) {
    const morphemes: string[] = [];
    raw.literal_gloss.forEach((g) => {
      if (typeof g === 'object' && g !== null && 'literal_english' in g) {
        const mg = g as MorphemeGloss;
        glossBreakdown.push(mg);
        morphemes.push(`${mg.shona_word} [${mg.literal_english}]`);
      } else if (typeof g === 'string') {
        morphemes.push(g);
      }
    });
    formattedGlossStr = morphemes.join(' • ');
  } else if (typeof raw.literal_gloss === 'string') {
    formattedGlossStr = raw.literal_gloss;
  }

  // Dialogue
  let dialogue = raw.dialogue;
  if (!dialogue || dialogue.length === 0) {
    if (shona_text) {
      dialogue = [
        {
          id: 1,
          shona: shona_text,
          english: english_translation,
          literal_gloss: formattedGlossStr || undefined,
          gloss_breakdown: glossBreakdown.length > 0 ? glossBreakdown : undefined
        }
      ];
    } else {
      dialogue = [];
    }
  } else {
    // Ensure literal_gloss is populated if missing on dialogue lines
    dialogue = dialogue.map((line) => ({
      ...line,
      literal_gloss: line.literal_gloss || formattedGlossStr || undefined,
      gloss_breakdown: line.gloss_breakdown || (glossBreakdown.length > 0 ? glossBreakdown : undefined)
    }));
  }

  // Grammar notes normalization
  const grammar_notes: NoteItem[] = [];
  if (Array.isArray(raw.grammar_notes)) {
    raw.grammar_notes.forEach((gn, i) => {
      if (typeof gn === 'string') {
        grammar_notes.push({
          title: `Linguistic Point ${i + 1}`,
          content: gn
        });
      } else if (typeof gn === 'object' && gn !== null) {
        grammar_notes.push(gn as NoteItem);
      }
    });
  }

  // Cultural notes normalization
  const cultural_notes: NoteItem[] = [];
  if (typeof raw.cultural_notes === 'string' && raw.cultural_notes.trim()) {
    cultural_notes.push({
      title: 'Tsika neMagariro (Cultural Background)',
      content: raw.cultural_notes
    });
  } else if (Array.isArray(raw.cultural_notes)) {
    raw.cultural_notes.forEach((cn) => {
      if (typeof cn === 'object' && cn !== null) cultural_notes.push(cn as NoteItem);
    });
  }

  // Exercises normalization
  const mapExercises = (exList?: Record<string, unknown>[]): ExerciseItem[] => {
    if (!exList || !Array.isArray(exList)) return [];
    return exList.map((ex, exIdx) => {
      const hasOptions = Array.isArray(ex.options) && ex.options.length > 0;
      return {
        id: exIdx + 1,
        type: hasOptions
          ? 'multiple_choice'
          : (ex.exercise_type === 'translation' || ex.type === 'translate')
          ? 'translate'
          : 'fill_blank',
        prompt: String(ex.prompt || ''),
        options: hasOptions ? (ex.options as string[]) : undefined,
        correct_answer: String(ex.correct_answer || ''),
        explanation: ex.explanation ? String(ex.explanation) : undefined
      };
    });
  };

  const active_exercises = mapExercises(raw.active_exercises);
  const review_exercises = mapExercises(raw.review_exercises);

  // Review Summary normalization
  let review_summary: ReviewSummary | undefined = undefined;
  if (typeof raw.review_summary === 'string') {
    review_summary = {
      title: `Comprehensive Review (Lesson ${num})`,
      sections: [
        {
          heading: 'Core Grammatical Mastery & Concords',
          points: raw.review_summary.split('. ').map(p => p.trim()).filter(Boolean)
        }
      ]
    };
  } else if (typeof raw.review_summary === 'object' && raw.review_summary !== null) {
    review_summary = raw.review_summary as ReviewSummary;
  }

  return {
    num,
    title_shona,
    title_english,
    type: isReview ? 'review' : 'standard',
    audio,
    duration_seconds,
    dialogue,
    shona_text,
    english_translation,
    grammar_notes,
    cultural_notes,
    review_summary,
    review_exercises,
    active_exercises,
    active_wave_target: raw.active_wave_review_lesson || (num >= 50 ? num - 49 : undefined)
  };
}

export const LessonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_USER_PROGRESS);
  const [currentLessonNum, setCurrentLessonNum] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<LessonStep>('PASSIVE_BLIND_1');
  const [activeLessonNum, setActiveLessonNum] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioKey, setAudioKey] = useState<number>(0);

  // Load course data from public/course_data.json
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('./course_data.json');
        if (!res.ok) throw new Error('Failed to load course_data.json');
        const rawData = await res.json();

        // Normalize all lessons
        const rawList: RawLesson[] = rawData.lessons || [];
        const normalizedLessons: Lesson[] = rawList.map((r, i) => normalizeLesson(r, i));

        const normalizedData: CourseData = {
          course_title: rawData.course_title || 'Assimil Shona (ChiZezuru)',
          version: rawData.version || '2.0.0',
          dialect: rawData.target_dialect || rawData.dialect || 'Standard Shona (Zezuru)',
          total_lessons: normalizedLessons.length,
          active_wave_start_lesson: rawData.active_wave_start_lesson || 50,
          lessons: normalizedLessons
        };

        setCourseData(normalizedData);

        // Load saved user progress
        const savedProgress = await loadStoredProgress();
        setProgress(savedProgress);
        setCurrentLessonNum(savedProgress.current_lesson || 1);
        setCurrentStep(savedProgress.current_step || 'PASSIVE_BLIND_1');
        if (savedProgress.active_lesson_number) {
          setActiveLessonNum(savedProgress.active_lesson_number);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Save progress helper
  const persist = useCallback((updated: UserProgress) => {
    setProgress(updated);
    saveStoredProgress(updated);
  }, []);

  // Current lesson object
  const currentLesson = useMemo(() => {
    if (!courseData) return null;
    return courseData.lessons.find(l => l.num === currentLessonNum) || courseData.lessons[0] || null;
  }, [courseData, currentLessonNum]);

  // Active target lesson object (e.g. Lesson 50 -> Lesson 1)
  const activeTargetLesson = useMemo(() => {
    if (!courseData || activeLessonNum === null) return null;
    return courseData.lessons.find(l => l.num === activeLessonNum) || null;
  }, [courseData, activeLessonNum]);

  // Determine current step metadata
  const stepMetadata = useMemo((): StepMetadata => {
    const isReviewLesson = currentLesson?.type === 'review' || (currentLesson && currentLesson.num % 7 === 0);

    if (ACTIVE_STEPS.includes(currentStep as ActiveStep)) {
      const idx = ACTIVE_STEPS.indexOf(currentStep as ActiveStep);
      const titles: Record<ActiveStep, { title: string; instruction: string }> = {
        ACTIVE_TRANSLATE: {
          title: `Active Wave: Translate into Shona (Lesson ${activeLessonNum})`,
          instruction: 'Active Recall: Type your Shona translation from memory based only on the English text.'
        },
        ACTIVE_NOTES: {
          title: `Active Wave: Grammar & Culture Review (Lesson ${activeLessonNum})`,
          instruction: 'Consolidate: Study the grammatical rules and cultural insights for this lesson.'
        },
        ACTIVE_EXERCISES: {
          title: `Active Wave: Exercises (Lesson ${activeLessonNum})`,
          instruction: 'Reinforce: Complete the active practice exercises.'
        },
        ACTIVE_CORRECTION: {
          title: `Active Wave: Translation Correction (Lesson ${activeLessonNum})`,
          instruction: 'Self-Correction: Compare your translation against the original Shona transcript and listen to the audio.'
        },
        ACTIVE_FINAL_SHADOW: {
          title: `Active Wave: Final Shadowing Pass (Lesson ${activeLessonNum})`,
          instruction: 'Final Active Shadowing: Read both texts and shadow the audio out loud at natural tempo.'
        }
      };

      const meta = titles[currentStep as ActiveStep];
      return {
        key: currentStep,
        stepNumber: idx + 1,
        totalSteps: ACTIVE_STEPS.length,
        phase: 'active',
        title: meta?.title || 'Active Wave Phase',
        instruction: meta?.instruction || ''
      };
    }

    if (isReviewLesson) {
      const idx = REVIEW_STEPS.indexOf(currentStep as ReviewStep);
      const titles: Record<ReviewStep, { title: string; instruction: string }> = {
        REVIEW_NOTES: {
          title: `Comprehensive Review: Grammar & Syntactic Summary (Lesson ${currentLessonNum})`,
          instruction: 'Review & Consolidate: Read through the summary covering key points from the previous 6 lessons.'
        },
        REVIEW_EXERCISES: {
          title: `Comprehensive Review: Interactive Exercises (Lesson ${currentLessonNum})`,
          instruction: 'Interactive Evaluation: Test your mastery with immediate feedback.'
        }
      };

      const meta = titles[currentStep as ReviewStep];
      return {
        key: currentStep,
        stepNumber: idx + 1,
        totalSteps: REVIEW_STEPS.length,
        phase: 'review',
        title: meta?.title || 'Review Phase',
        instruction: meta?.instruction || ''
      };
    }

    // Standard passive lesson
    const idx = PASSIVE_STEPS.indexOf(currentStep as PassiveStep);
    const titles: Record<PassiveStep, { title: string; instruction: string }> = {
      PASSIVE_BLIND_1: {
        title: 'Step 1: Blind Shadowing',
        instruction: 'Listen and repeat in Shona to the best of your ability.'
      },
      PASSIVE_GLOBAL: {
        title: 'Step 2: Global Comprehension',
        instruction: 'Listen, repeat in Shona, and read the English translation simultaneously.'
      },
      PASSIVE_DETAILED: {
        title: 'Step 3: Detailed Shadowing',
        instruction: 'Detailed Shadowing: Listen, repeat in Shona, and read both texts simultaneously.'
      },
      PASSIVE_NOTES: {
        title: 'Step 4: Linguistic & Cultural Notes',
        instruction: 'Study the grammar concords and cultural notes alongside the bilingual dialogue.'
      },
      PASSIVE_READ_NO_AUDIO: {
        title: 'Step 5: Autonomous Reading',
        instruction: 'Final Shadowing Pass: Read the Shona text aloud without audio, checking the translation as needed.'
      },
      PASSIVE_BLIND_2: {
        title: 'Step 6: Final Blind Shadowing',
        instruction: 'Final Blind Shadowing: Listen and repeat without text.'
      },
      PASSIVE_PREV_REVIEW: {
        title: `Step 7: Previous Lesson Review (Lesson ${Math.max(1, currentLessonNum - 1)})`,
        instruction: 'Review the previous lesson dialogue and audio to solidify recall before moving on.'
      }
    };

    const meta = titles[currentStep as PassiveStep];
    return {
      key: currentStep,
      stepNumber: Math.max(1, idx + 1),
      totalSteps: PASSIVE_STEPS.length,
      phase: 'passive',
      title: meta?.title || 'Passive Phase',
      instruction: meta?.instruction || ''
    };
  }, [currentStep, currentLesson, currentLessonNum, activeLessonNum]);

  // Audio helpers
  const replayAudio = useCallback(() => {
    setAudioKey(prev => prev + 1);
    setIsAudioPlaying(true);
  }, []);

  // Jump to specific lesson
  const jumpToLesson = useCallback((targetNum: number) => {
    if (!courseData) return;
    const target = courseData.lessons.find(l => l.num === targetNum);
    if (!target) return;

    const isReview = target.type === 'review' || targetNum % 7 === 0;
    const firstStep: LessonStep = isReview ? 'REVIEW_NOTES' : 'PASSIVE_BLIND_1';

    setCurrentLessonNum(targetNum);
    setCurrentStep(firstStep);
    setActiveLessonNum(null);

    persist({
      ...progress,
      current_lesson: targetNum,
      current_step: firstStep,
      active_lesson_number: undefined
    });
  }, [courseData, progress, persist]);

  // Next Step Transition
  const goToNextStep = useCallback(() => {
    if (!currentLesson || !courseData) return;

    const isReviewLesson = currentLesson.type === 'review' || currentLesson.num % 7 === 0;

    // A. Inside Active Phase
    if (ACTIVE_STEPS.includes(currentStep as ActiveStep)) {
      const currentActiveIdx = ACTIVE_STEPS.indexOf(currentStep as ActiveStep);
      if (currentActiveIdx < ACTIVE_STEPS.length - 1) {
        // Move to next active step
        const nextStep = ACTIVE_STEPS[currentActiveIdx + 1];
        setCurrentStep(nextStep);
        persist({
          ...progress,
          current_step: nextStep
        });
      } else {
        // Active Step 5 completed: Complete Active Wave for activeLessonNum and Passive for currentLessonNum
        const completedActiveSet = new Set(progress.completed_active);
        if (activeLessonNum) completedActiveSet.add(activeLessonNum);

        const completedPassiveSet = new Set(progress.completed_passive);
        completedPassiveSet.add(currentLessonNum);

        const nextLessonNum = Math.min(courseData.total_lessons, currentLessonNum + 1);
        const nextLessonObj = courseData.lessons.find(l => l.num === nextLessonNum);
        const nextIsReview = nextLessonObj?.type === 'review' || nextLessonNum % 7 === 0;
        const nextInitialStep: LessonStep = nextIsReview ? 'REVIEW_NOTES' : 'PASSIVE_BLIND_1';

        setCurrentLessonNum(nextLessonNum);
        setCurrentStep(nextInitialStep);
        setActiveLessonNum(null);

        persist({
          ...progress,
          completed_active: Array.from(completedActiveSet),
          completed_passive: Array.from(completedPassiveSet),
          current_lesson: nextLessonNum,
          current_step: nextInitialStep,
          active_lesson_number: undefined
        });
      }
      return;
    }

    // B. Inside Review Lesson
    if (isReviewLesson) {
      const currentReviewIdx = REVIEW_STEPS.indexOf(currentStep as ReviewStep);
      if (currentReviewIdx < REVIEW_STEPS.length - 1) {
        const nextStep = REVIEW_STEPS[currentReviewIdx + 1];
        setCurrentStep(nextStep);
        persist({
          ...progress,
          current_step: nextStep
        });
      } else {
        // Review completed -> Advance to next lesson
        const completedPassiveSet = new Set(progress.completed_passive);
        completedPassiveSet.add(currentLessonNum);

        const nextLessonNum = Math.min(courseData.total_lessons, currentLessonNum + 1);
        setCurrentLessonNum(nextLessonNum);
        setCurrentStep('PASSIVE_BLIND_1');

        persist({
          ...progress,
          completed_passive: Array.from(completedPassiveSet),
          current_lesson: nextLessonNum,
          current_step: 'PASSIVE_BLIND_1'
        });
      }
      return;
    }

    // C. Inside Standard Passive Lesson
    const currentPassiveIdx = PASSIVE_STEPS.indexOf(currentStep as PassiveStep);
    if (currentPassiveIdx < PASSIVE_STEPS.length - 1) {
      // Advance to next passive step
      const nextStep = PASSIVE_STEPS[currentPassiveIdx + 1];
      setCurrentStep(nextStep);
      persist({
        ...progress,
        current_step: nextStep
      });
    } else {
      // Completed Step 7 (PASSIVE_PREV_REVIEW)!
      // Check if Active Wave is triggered: lesson_number >= 50
      if (currentLessonNum >= 50) {
        // Trigger Active Wave!
        const targetActiveNum = currentLesson.active_wave_target || (currentLessonNum - 49);
        const targetActiveLesson = courseData.lessons.find(l => l.num === targetActiveNum);

        if (targetActiveLesson) {
          setActiveLessonNum(targetActiveNum);
          setCurrentStep('ACTIVE_TRANSLATE');
          // Clear any pre-existing translation for this active lesson so the user gets an empty textbox
          const updatedTranslations = { ...progress.active_translations };
          delete updatedTranslations[targetActiveNum];
          persist({
            ...progress,
            current_step: 'ACTIVE_TRANSLATE',
            active_lesson_number: targetActiveNum,
            active_translations: updatedTranslations
          });
          return;
        }
      }

      // Normal completion of passive lesson (lesson < 50)
      const completedPassiveSet = new Set(progress.completed_passive);
      completedPassiveSet.add(currentLessonNum);

      const nextLessonNum = Math.min(courseData.total_lessons, currentLessonNum + 1);
      const nextLessonObj = courseData.lessons.find(l => l.num === nextLessonNum);
      const nextIsReview = nextLessonObj?.type === 'review' || nextLessonNum % 7 === 0;
      const nextInitialStep: LessonStep = nextIsReview ? 'REVIEW_NOTES' : 'PASSIVE_BLIND_1';

      setCurrentLessonNum(nextLessonNum);
      setCurrentStep(nextInitialStep);

      persist({
        ...progress,
        completed_passive: Array.from(completedPassiveSet),
        current_lesson: nextLessonNum,
        current_step: nextInitialStep
      });
    }
  }, [currentLesson, courseData, currentStep, progress, activeLessonNum, currentLessonNum, persist]);

  // Prev Step Transition
  const goToPrevStep = useCallback(() => {
    // Inside Active Phase
    if (ACTIVE_STEPS.includes(currentStep as ActiveStep)) {
      const idx = ACTIVE_STEPS.indexOf(currentStep as ActiveStep);
      if (idx > 0) {
        const prevStep = ACTIVE_STEPS[idx - 1];
        setCurrentStep(prevStep);
        persist({ ...progress, current_step: prevStep });
      } else {
        // If at ACTIVE_TRANSLATE, step back to PASSIVE_PREV_REVIEW of current lesson
        setCurrentStep('PASSIVE_PREV_REVIEW');
        setActiveLessonNum(null);
        persist({
          ...progress,
          current_step: 'PASSIVE_PREV_REVIEW',
          active_lesson_number: undefined
        });
      }
      return;
    }

    // Inside Review Lesson
    if (REVIEW_STEPS.includes(currentStep as ReviewStep)) {
      const idx = REVIEW_STEPS.indexOf(currentStep as ReviewStep);
      if (idx > 0) {
        const prevStep = REVIEW_STEPS[idx - 1];
        setCurrentStep(prevStep);
        persist({ ...progress, current_step: prevStep });
      }
      return;
    }

    // Inside Standard Passive Lesson
    const idx = PASSIVE_STEPS.indexOf(currentStep as PassiveStep);
    if (idx > 0) {
      const prevStep = PASSIVE_STEPS[idx - 1];
      setCurrentStep(prevStep);
      persist({ ...progress, current_step: prevStep });
    }
  }, [currentStep, progress, persist]);

  // Save user's active translation
  const updateActiveTranslation = useCallback((text: string) => {
    if (!activeLessonNum) return;
    const updated = {
      ...progress,
      active_translations: {
        ...progress.active_translations,
        [activeLessonNum]: text
      }
    };
    persist(updated);
  }, [activeLessonNum, progress, persist]);

  // Save user's corrected translation
  const updateActiveCorrection = useCallback((text: string) => {
    if (!activeLessonNum) return;
    const updated = {
      ...progress,
      active_corrections: {
        ...progress.active_corrections,
        [activeLessonNum]: text
      }
    };
    persist(updated);
  }, [activeLessonNum, progress, persist]);

  // Record exercise results
  const recordExerciseScore = useCallback((exerciseId: string, isCorrect: boolean) => {
    const updated = {
      ...progress,
      exercise_history: {
        ...progress.exercise_history,
        [exerciseId]: isCorrect
      }
    };
    persist(updated);
  }, [progress, persist]);

  // Reset progress
  const resetProgress = useCallback(() => {
    setCurrentLessonNum(1);
    setCurrentStep('PASSIVE_BLIND_1');
    setActiveLessonNum(null);
    persist(DEFAULT_USER_PROGRESS);
  }, [persist]);

  return (
    <LessonContext.Provider
      value={{
        courseData,
        loading,
        currentLesson,
        activeTargetLesson,
        currentStep,
        stepMetadata,
        progress,
        activeLessonNumber: activeLessonNum,
        isAudioPlaying,
        audioKey,
        setIsAudioPlaying,
        replayAudio,
        goToNextStep,
        goToPrevStep,
        jumpToLesson,
        updateActiveTranslation,
        updateActiveCorrection,
        recordExerciseScore,
        resetProgress
      }}
    >
      {children}
    </LessonContext.Provider>
  );
};

export const useLesson = () => {
  const context = useContext(LessonContext);
  if (!context) {
    throw new Error('useLesson must be used within a LessonProvider');
  }
  return context;
};
