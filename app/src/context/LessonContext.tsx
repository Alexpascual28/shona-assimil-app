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
  allLessonsCompleted: boolean;
  isGeneratingLessons: boolean;
  generationProgress: { percent: number; message: string };
  lessonCardProgress: Record<number, { percent: number; message: string }>;
  insufficientReserveNotice: { remaining: number; required: number } | null;
  dismissInsufficientReserveNotice: () => void;
  generateNextFiftyLessons: () => Promise<void>;
  cancelGenerateLessons: () => Promise<void>;
  isDevMode: boolean;
  unlockDevMode: (password: string) => Promise<boolean>;
  lockDevMode: () => void;
  completeAllLessons: () => void;
  removeLastFiftyLessons: () => Promise<void>;
  deleteSingleLessonProgress: (lessonNum: number) => void;
  fixSingleLesson: (lessonNum: number) => Promise<void>;
  regenerateSingleLesson: (lessonNum: number) => Promise<void>;
  findOrRecoverAudio: (lessonNum: number) => Promise<void>;
  regenerateLessonField: (
    lessonNum: number,
    field: 'translation' | 'grammar_notes' | 'cultural_notes' | 'exercises'
  ) => Promise<void>;
  isDevActionRunning: boolean;
  devActionStatus: string;
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
        const mg = g as MorphemeGloss & { shona?: string };
        const shonaWord = mg.shona_word || mg.shona || '';
        glossBreakdown.push({ ...mg, shona_word: shonaWord });
        morphemes.push(`${shonaWord} [${mg.literal_english}]`);
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
    // Ensure literal_gloss and id are populated if missing on dialogue lines
    dialogue = dialogue.map((line, lineIdx) => ({
      ...line,
      id: line.id || lineIdx + 1,
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
      const promptStr = String(ex.prompt || '');
      let exType: 'multiple_choice' | 'fill_blank' | 'translate' = 'multiple_choice';
      if (ex.exercise_type === 'translation' || ex.type === 'translate') {
        exType = 'translate';
      } else if (ex.type === 'fill_blank' || promptStr.includes('______')) {
        exType = 'fill_blank';
      } else if (!hasOptions) {
        exType = 'fill_blank';
      }
      return {
        id: exIdx + 1,
        type: exType,
        prompt: promptStr,
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
    active_wave_target: raw.active_wave_review_lesson || (num >= 51 ? num - 50 : undefined)
  };
}

const EXPANDED_COURSE_STORAGE_KEY = 'shona_assimil_expanded_course_v2';

export const LessonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [rawCourseSnapshot, setRawCourseSnapshot] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratingLessons, setIsGeneratingLessons] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{ percent: number; message: string }>({
    percent: 0,
    message: ''
  });
  const [lessonCardProgress, setLessonCardProgress] = useState<
    Record<number, { percent: number; message: string }>
  >({});
  const [insufficientReserveNotice, setInsufficientReserveNotice] = useState<{
    remaining: number;
    required: number;
  } | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [isDevActionRunning, setIsDevActionRunning] = useState<boolean>(false);
  const [devActionStatus, setDevActionStatus] = useState<string>('');
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_USER_PROGRESS);
  const [currentLessonNum, setCurrentLessonNum] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<LessonStep>('PASSIVE_BLIND_1');
  const [activeLessonNum, setActiveLessonNum] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioKey, setAudioKey] = useState<number>(0);

  // Subscribe to Electron live progress bar events during +50 lesson generation
  useEffect(() => {
    if (window.electronAPI?.onGenerationProgress) {
      return window.electronAPI.onGenerationProgress((data) => {
        setGenerationProgress(data);
      });
    }
  }, []);

  // Subscribe to per-lesson card progress bar events
  useEffect(() => {
    if (window.electronAPI?.onLessonCardProgress) {
      return window.electronAPI.onLessonCardProgress((data) => {
        setLessonCardProgress((prev) => {
          const next = { ...prev };
          if (!data.message || data.percent <= 0) {
            delete next[data.lessonNumber];
          } else {
            next[data.lessonNumber] = {
              percent: data.percent,
              message: data.message
            };
          }
          return next;
        });
      });
    }
  }, []);

  // Load course data from public/course_data.json (or expanded course if user already added +50 lessons)
  useEffect(() => {
    async function init() {
      try {
        let rawData: Record<string, any> | null = null;

        if (window.electronAPI?.loadExpandedCourse) {
          try {
            const expanded = await window.electronAPI.loadExpandedCourse();
            if (expanded && Array.isArray(expanded.lessons) && expanded.lessons.length >= 100) {
              rawData = expanded;
            }
          } catch {}
        }

        if (!rawData) {
          try {
            const localExpanded = localStorage.getItem(EXPANDED_COURSE_STORAGE_KEY);
            if (localExpanded) {
              const parsed = JSON.parse(localExpanded);
              if (parsed && Array.isArray(parsed.lessons) && parsed.lessons.length >= 100) {
                rawData = parsed;
              }
            }
          } catch {}
        }

        const res = await fetch('./course_data.json');
        if (res.ok) {
          const baseData = await res.json();
          if (!rawData || (Array.isArray(baseData.lessons) && baseData.lessons.length > (rawData.lessons?.length || 0))) {
            rawData = baseData;
          }
        }
        if (!rawData) throw new Error('Failed to load course_data.json');

        setRawCourseSnapshot(rawData);

        // Normalize all lessons
        const rawList: RawLesson[] = rawData.lessons || [];
        const normalizedLessons: Lesson[] = rawList.map((r, i) => normalizeLesson(r, i));

        const normalizedData: CourseData = {
          course_title: rawData.course_title || 'Assimil Shona (ChiZezuru)',
          version: rawData.version || '2.0.0',
          dialect: rawData.target_dialect || rawData.dialect || 'Standard Shona (Zezuru)',
          total_lessons: normalizedLessons.length,
          active_wave_start_lesson: rawData.active_wave_start_lesson || 51,
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

    if (REVIEW_STEPS.includes(currentStep as ReviewStep)) {
      const idx = REVIEW_STEPS.indexOf(currentStep as ReviewStep);
      const titles: Record<ReviewStep, { title: string; instruction: string }> = {
        REVIEW_NOTES: {
          title: `Comprehensive Review: Grammar & Syntactic Summary (Lessons ${Math.max(1, currentLessonNum - 6)}–${currentLessonNum})`,
          instruction: 'Review & Consolidate: Read through the summary covering key points from the last 7 lessons (including this lesson).'
        },
        REVIEW_EXERCISES: {
          title: `Comprehensive Review: Interactive Exercises (Lessons ${Math.max(1, currentLessonNum - 6)}–${currentLessonNum})`,
          instruction: 'Interactive Evaluation: Test your mastery of the last 7 lessons with immediate feedback.'
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

    // Standard passive lesson steps (also used as Phase 1 of every 7th Review Lesson)
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
  }, [currentStep, currentLessonNum, activeLessonNum]);

  // Audio helpers
  const replayAudio = useCallback(() => {
    setAudioKey(prev => prev + 1);
    setIsAudioPlaying(true);
  }, []);

  // Jump to specific lesson (all lessons, including 7th review lessons, begin with Passive Phase)
  const jumpToLesson = useCallback((targetNum: number) => {
    if (!courseData) return;
    const target = courseData.lessons.find(l => l.num === targetNum);
    if (!target) return;

    const firstStep: LessonStep = 'PASSIVE_BLIND_1';

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
        const nextInitialStep: LessonStep = 'PASSIVE_BLIND_1';

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

    // B. Inside Review Phase (after Passive Phase on every 7th lesson)
    if (REVIEW_STEPS.includes(currentStep as ReviewStep)) {
      const currentReviewIdx = REVIEW_STEPS.indexOf(currentStep as ReviewStep);
      if (currentReviewIdx < REVIEW_STEPS.length - 1) {
        const nextStep = REVIEW_STEPS[currentReviewIdx + 1];
        setCurrentStep(nextStep);
        persist({
          ...progress,
          current_step: nextStep
        });
      } else {
        // Completed 7-lesson review! If Lesson >= active_wave_start_lesson (51), now engage the Active Wave!
        const activeStart = courseData.active_wave_start_lesson || 51;
        if (currentLessonNum >= activeStart) {
          const targetActiveNum = currentLesson.active_wave_target || (currentLessonNum - (activeStart - 1));
          const targetActiveLesson = courseData.lessons.find(l => l.num === targetActiveNum);
          if (targetActiveLesson) {
            setActiveLessonNum(targetActiveNum);
            setCurrentStep('ACTIVE_TRANSLATE');
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

        // Review completed (< 51) -> Advance to next lesson
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

    // C. Inside Passive Phase (Steps 1-7)
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
      // 1. If this is a 7th-day review lesson, transition to the 7-lesson Review Phase next!
      if (isReviewLesson) {
        setCurrentStep('REVIEW_NOTES');
        persist({
          ...progress,
          current_step: 'REVIEW_NOTES'
        });
        return;
      }

      // 2. Check if Active Wave is triggered: lesson_number >= active_wave_start_lesson (51)
      const activeStart = courseData.active_wave_start_lesson || 51;
      if (currentLessonNum >= activeStart) {
        const targetActiveNum = currentLesson.active_wave_target || (currentLessonNum - (activeStart - 1));
        const targetActiveLesson = courseData.lessons.find(l => l.num === targetActiveNum);

        if (targetActiveLesson) {
          setActiveLessonNum(targetActiveNum);
          setCurrentStep('ACTIVE_TRANSLATE');
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

      // 3. Normal completion of passive lesson (lesson < 50)
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
  }, [currentLesson, courseData, currentStep, progress, activeLessonNum, currentLessonNum, persist]);

  // Prev Step Transition
  const goToPrevStep = useCallback(() => {
    const isReviewLesson = currentLesson?.type === 'review' || (currentLesson && currentLesson.num % 7 === 0);

    // Inside Active Phase
    if (ACTIVE_STEPS.includes(currentStep as ActiveStep)) {
      const idx = ACTIVE_STEPS.indexOf(currentStep as ActiveStep);
      if (idx > 0) {
        const prevStep = ACTIVE_STEPS[idx - 1];
        setCurrentStep(prevStep);
        persist({ ...progress, current_step: prevStep });
      } else {
        // If at ACTIVE_TRANSLATE, step back to REVIEW_EXERCISES (if 7th lesson) or PASSIVE_PREV_REVIEW
        const prevPhaseStep: LessonStep = isReviewLesson ? 'REVIEW_EXERCISES' : 'PASSIVE_PREV_REVIEW';
        setCurrentStep(prevPhaseStep);
        setActiveLessonNum(null);
        persist({
          ...progress,
          current_step: prevPhaseStep,
          active_lesson_number: undefined
        });
      }
      return;
    }

    // Inside Review Phase
    if (REVIEW_STEPS.includes(currentStep as ReviewStep)) {
      const idx = REVIEW_STEPS.indexOf(currentStep as ReviewStep);
      if (idx > 0) {
        const prevStep = REVIEW_STEPS[idx - 1];
        setCurrentStep(prevStep);
        persist({ ...progress, current_step: prevStep });
      } else {
        // Step back from REVIEW_NOTES to PASSIVE_PREV_REVIEW of this 7th lesson
        setCurrentStep('PASSIVE_PREV_REVIEW');
        persist({ ...progress, current_step: 'PASSIVE_PREV_REVIEW' });
      }
      return;
    }

    // Inside Standard Passive Phase
    const idx = PASSIVE_STEPS.indexOf(currentStep as PassiveStep);
    if (idx > 0) {
      const prevStep = PASSIVE_STEPS[idx - 1];
      setCurrentStep(prevStep);
      persist({ ...progress, current_step: prevStep });
    }
  }, [currentStep, currentLesson, progress, persist]);

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

  // Check if all current lessons (both Passive 1..N and Active 1..N-50) are completed
  const allLessonsCompleted = useMemo(() => {
    if (!courseData || courseData.total_lessons === 0) return false;
    const total = courseData.total_lessons;
    const activeStart = courseData.active_wave_start_lesson || 51;
    const requiredActiveMax = Math.max(0, total - (activeStart - 1));

    const passiveSet = new Set(progress.completed_passive);
    const activeSet = new Set(progress.completed_active);

    for (let i = 1; i <= total; i++) {
      if (!passiveSet.has(i)) return false;
    }
    for (let j = 1; j <= requiredActiveMax; j++) {
      if (!activeSet.has(j)) return false;
    }
    return true;
  }, [courseData, progress.completed_passive, progress.completed_active]);

  const applyUpdatedRawCourse = useCallback(
    (updatedRaw: Record<string, any>) => {
      if (!updatedRaw || !Array.isArray(updatedRaw.lessons)) return;
      setRawCourseSnapshot(updatedRaw);
      try {
        if (updatedRaw.lessons.length > 100) {
          localStorage.setItem(EXPANDED_COURSE_STORAGE_KEY, JSON.stringify(updatedRaw));
        } else {
          localStorage.removeItem(EXPANDED_COURSE_STORAGE_KEY);
        }
      } catch {}

      const rawList: RawLesson[] = updatedRaw.lessons;
      const normalizedLessons: Lesson[] = rawList.map((r, i) => normalizeLesson(r, i));
      const normalizedData: CourseData = {
        course_title: updatedRaw.course_title || courseData?.course_title || 'Assimil Shona (ChiZezuru)',
        version: updatedRaw.version || courseData?.version || '2.0.0',
        dialect: updatedRaw.target_dialect || updatedRaw.dialect || courseData?.dialect || 'Standard Shona (Zezuru)',
        total_lessons: normalizedLessons.length,
        active_wave_start_lesson: updatedRaw.active_wave_start_lesson || 51,
        lessons: normalizedLessons
      };
      setCourseData(normalizedData);
    },
    [courseData]
  );

  const dismissInsufficientReserveNotice = useCallback(() => {
    setInsufficientReserveNotice(null);
  }, []);

  // Dev Mode authentication (always requires password re-entry after locking)
  const unlockDevMode = useCallback(async (password: string): Promise<boolean> => {
    if (window.electronAPI?.verifyDevPassword) {
      try {
        const ok = await window.electronAPI.verifyDevPassword(password);
        if (ok) {
          setIsDevMode(true);
          return true;
        }
        return false;
      } catch {}
    }
    const expected = (import.meta as any).env?.VITE_DEV_MODE_PASSWORD || 'shona_dev_pass';
    if (password.trim() === expected) {
      setIsDevMode(true);
      return true;
    }
    return false;
  }, []);

  const lockDevMode = useCallback(() => {
    setIsDevMode(false);
  }, []);

  // Dev Mode: Complete All Lessons simultaneously
  const completeAllLessons = useCallback(() => {
    if (!courseData) return;
    const total = courseData.total_lessons;
    const activeStart = courseData.active_wave_start_lesson || 51;
    const requiredActiveMax = Math.max(0, total - (activeStart - 1));

    const allPassive = Array.from({ length: total }, (_, i) => i + 1);
    const allActive = Array.from({ length: requiredActiveMax }, (_, i) => i + 1);

    persist({
      ...progress,
      completed_passive: allPassive,
      completed_active: allActive,
      current_lesson: total,
      current_step: 'PASSIVE_BLIND_1',
      active_lesson_number: undefined
    });
    setCurrentLessonNum(total);
    setCurrentStep('PASSIVE_BLIND_1');
    setActiveLessonNum(null);
  }, [courseData, progress, persist]);

  // Dev Mode: Remove lessons in blocks of 50 (starting from the newest added block, down to base 100)
  const removeLastFiftyLessons = useCallback(async () => {
    if (!courseData || courseData.total_lessons <= 100) return;
    setIsDevActionRunning(true);
    setDevActionStatus('Removing newest block of 50 lessons...');
    try {
      let updatedRaw: Record<string, any> | null = null;
      if (window.electronAPI?.removeLast50Lessons) {
        updatedRaw = await window.electronAPI.removeLast50Lessons();
      }
      if (!updatedRaw && rawCourseSnapshot && Array.isArray(rawCourseSnapshot.lessons)) {
        const targetCount = Math.max(100, rawCourseSnapshot.lessons.length - 50);
        const trimmed = rawCourseSnapshot.lessons.slice(0, targetCount);
        updatedRaw = {
          ...rawCourseSnapshot,
          total_lessons: trimmed.length,
          lessons: trimmed
        };
      }
      if (updatedRaw && Array.isArray(updatedRaw.lessons)) {
        const newTotal = updatedRaw.lessons.length;
        const activeStart = updatedRaw.active_wave_start_lesson || 51;
        const maxActive = Math.max(0, newTotal - (activeStart - 1));
        applyUpdatedRawCourse(updatedRaw);

        const clampedLesson = Math.min(currentLessonNum, newTotal);
        setCurrentLessonNum(clampedLesson);
        setCurrentStep('PASSIVE_BLIND_1');
        setActiveLessonNum(null);

        persist({
          ...progress,
          completed_passive: progress.completed_passive.filter((n) => n <= newTotal),
          completed_active: progress.completed_active.filter((n) => n <= maxActive),
          current_lesson: clampedLesson,
          current_step: 'PASSIVE_BLIND_1',
          active_lesson_number: undefined
        });
      }
    } finally {
      setIsDevActionRunning(false);
      setDevActionStatus('');
    }
  }, [courseData, rawCourseSnapshot, currentLessonNum, progress, persist, applyUpdatedRawCourse]);

  // Dev Mode: Delete progress for a single lesson only
  const deleteSingleLessonProgress = useCallback(
    (lessonNum: number) => {
      const updatedTranslations = { ...progress.active_translations };
      delete updatedTranslations[lessonNum];
      const updatedCorrections = { ...progress.active_corrections };
      delete updatedCorrections[lessonNum];
      const updatedExHistory: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(progress.exercise_history || {})) {
        if (!k.startsWith(`lesson_${lessonNum}_ex_`)) {
          updatedExHistory[k] = v;
        }
      }
      persist({
        ...progress,
        completed_passive: progress.completed_passive.filter((n) => n !== lessonNum),
        completed_active: progress.completed_active.filter((n) => n !== lessonNum),
        active_translations: updatedTranslations,
        active_corrections: updatedCorrections,
        exercise_history: updatedExHistory
      });
    },
    [progress, persist]
  );

  // Dev Mode: Fix Lesson (keep audio & transcription, regenerate translation, grammar, cultural notes, exercises)
  const fixSingleLesson = useCallback(
    async (lessonNum: number) => {
      setIsDevActionRunning(true);
      setDevActionStatus(`Fixing Lesson ${lessonNum} (regenerating translation, notes & exercises)...`);
      try {
        if (window.electronAPI?.devFixLesson) {
          const updatedRaw = await window.electronAPI.devFixLesson(lessonNum);
          if (updatedRaw && Array.isArray(updatedRaw.lessons)) {
            applyUpdatedRawCourse(updatedRaw);
            return;
          }
        }
      } finally {
        setIsDevActionRunning(false);
        setDevActionStatus('');
      }
    },
    [applyUpdatedRawCourse]
  );

  // Dev Mode: Fully Regenerate Lesson (remove old audio & data, replace with brand-new audio & enriched data)
  const regenerateSingleLesson = useCallback(
    async (lessonNum: number) => {
      setIsDevActionRunning(true);
      setDevActionStatus(`Regenerating Lesson ${lessonNum} with matching length, pedagogy & complexity...`);
      try {
        if (window.electronAPI?.devRegenerateLesson) {
          const updatedRaw = await window.electronAPI.devRegenerateLesson(lessonNum);
          if (updatedRaw && Array.isArray(updatedRaw.lessons)) {
            applyUpdatedRawCourse(updatedRaw);
            return;
          }
        }
      } finally {
        setIsDevActionRunning(false);
        setDevActionStatus('');
      }
    },
    [applyUpdatedRawCourse]
  );

  // Dev Mode: Find Audio File locally, or download from Hugging Face, or regenerate lesson with matching length & complexity
  const findOrRecoverAudio = useCallback(
    async (lessonNum: number) => {
      setIsDevActionRunning(true);
      setDevActionStatus(`Locating or downloading audio file for Lesson ${lessonNum}...`);
      try {
        if (window.electronAPI?.devFindOrRecoverAudio) {
          const res = await window.electronAPI.devFindOrRecoverAudio(lessonNum);
          if (res && res.course && Array.isArray((res.course as any).lessons)) {
            applyUpdatedRawCourse(res.course as Record<string, any>);
            setAudioKey((prev) => prev + 1);
            return;
          }
        }
      } finally {
        setIsDevActionRunning(false);
        setDevActionStatus('');
      }
    },
    [applyUpdatedRawCourse]
  );

  // Safely cancel +50 lesson generation at any time
  const cancelGenerateLessons = useCallback(async () => {
    setGenerationProgress((prev) => ({
      percent: prev.percent,
      message: 'Cancelling lesson generation...'
    }));
    if (window.electronAPI?.cancelGenerateMoreLessons) {
      try {
        await window.electronAPI.cancelGenerateMoreLessons();
      } catch {}
    }
  }, []);

  // Dev Mode: Regenerate individual field ('translation' | 'grammar_notes' | 'cultural_notes' | 'exercises')
  const regenerateLessonField = useCallback(
    async (
      lessonNum: number,
      field: 'translation' | 'grammar_notes' | 'cultural_notes' | 'exercises'
    ) => {
      const labelMap = {
        translation: 'English Translation',
        grammar_notes: 'Grammar Notes',
        cultural_notes: 'Cultural Notes',
        exercises: 'Exercises'
      };
      setIsDevActionRunning(true);
      setDevActionStatus(`Regenerating Lesson ${lessonNum} ${labelMap[field]}...`);
      try {
        if (window.electronAPI?.devRegenerateField) {
          const updatedRaw = await window.electronAPI.devRegenerateField(lessonNum, field);
          if (updatedRaw && Array.isArray(updatedRaw.lessons)) {
            applyUpdatedRawCourse(updatedRaw);
            return;
          }
        }
      } finally {
        setIsDevActionRunning(false);
        setDevActionStatus('');
      }
    },
    [applyUpdatedRawCourse]
  );

  // Generate +50 brand-new lessons in the Active Phase (e.g. 101..150 reviewing 51..100)
  const generateNextFiftyLessons = useCallback(async () => {
    if (!courseData || !allLessonsCompleted || isGeneratingLessons) return;
    setIsGeneratingLessons(true);
    setGenerationProgress({ percent: 2, message: 'Checking audio reserve pool & duration bands...' });
    try {
      const prevTotal = courseData.total_lessons;
      let updatedRaw: Record<string, any> | null = null;

      if (window.electronAPI?.generateMoreLessons) {
        try {
          updatedRaw = await window.electronAPI.generateMoreLessons(50);
          if (updatedRaw && (updatedRaw as any).cancelled) {
            return;
          }
          if (updatedRaw && (updatedRaw as any).error === 'INSUFFICIENT_OFFLINE_RESERVE') {
            setInsufficientReserveNotice({
              remaining: Number((updatedRaw as any).remaining ?? 0),
              required: Number((updatedRaw as any).required ?? 50)
            });
            return;
          }
        } catch (err) {
          console.warn('Electron generateMoreLessons fallback to browser pool:', err);
        }
      }

      // Browser / fallback expansion using expansion_pool.json
      if (!updatedRaw) {
        const poolRes = await fetch('./expansion_pool.json');
        if (!poolRes.ok) throw new Error('Failed to load expansion_pool.json');
        const poolLessons: RawLesson[] = await poolRes.json();

        const currentRawList: RawLesson[] = (rawCourseSnapshot?.lessons as RawLesson[]) || [];
        const existingIds = new Set(currentRawList.map((l: any) => l.clip_id).filter(Boolean));
        const existingTexts = new Set(
          currentRawList.map((l) => String(l.shona_text || '').trim().toLowerCase()).filter(Boolean)
        );

        const available = poolLessons.filter(
          (item: any) =>
            !existingIds.has(item.clip_id) &&
            !existingTexts.has(String(item.shona_text || '').trim().toLowerCase()) &&
            Number(item.duration_seconds || 0) <= 120.0
        );

        if (available.length < 50) {
          setInsufficientReserveNotice({
            remaining: available.length,
            required: 50
          });
          return;
        }

        const startLessonNum = currentRawList.length + 1;
        const bandIdx = Math.max(1, Math.floor((startLessonNum - 1) / 100));
        const sourcePool = available;

        const orderedCandidates: RawLesson[] = [];
        if (bandIdx >= 6) {
          const buckets = [
            sourcePool.filter((c: any) => Number(c.duration_seconds || 0) < 15),
            sourcePool.filter((c: any) => Number(c.duration_seconds || 0) >= 15 && Number(c.duration_seconds || 0) < 30),
            sourcePool.filter((c: any) => Number(c.duration_seconds || 0) >= 30 && Number(c.duration_seconds || 0) < 50),
            sourcePool.filter((c: any) => Number(c.duration_seconds || 0) >= 50 && Number(c.duration_seconds || 0) < 80),
            sourcePool.filter((c: any) => Number(c.duration_seconds || 0) >= 80 && Number(c.duration_seconds || 0) <= 120)
          ];
          const perBucket = Math.max(1, Math.floor(50 / buckets.length));
          const pickedIds = new Set<string>();
          for (const b of buckets) {
            const shuffled = [...b].sort(() => Math.random() - 0.5);
            for (const item of shuffled.slice(0, perBucket)) {
              const cid = String((item as any).clip_id || '');
              if (!pickedIds.has(cid)) {
                orderedCandidates.push(item);
                pickedIds.add(cid);
              }
            }
          }
          const rem = sourcePool.filter((c: any) => !pickedIds.has(String(c.clip_id || ''))).sort(() => Math.random() - 0.5);
          orderedCandidates.push(...rem.slice(0, Math.max(0, 50 - orderedCandidates.length)));
          orderedCandidates.sort(() => Math.random() - 0.5);
        } else {
          const primaryMin = bandIdx * 10;
          const primaryMax = bandIdx * 10 + 30;
          const sprinkleMax = bandIdx * 10;
          const sprinkleTarget = Math.round(50 * 0.25); // 13
          const primaryTarget = 50 - sprinkleTarget; // 37

          const primaryList = sourcePool
            .filter((c: any) => {
              const d = Number(c.duration_seconds || 0);
              return d >= primaryMin && d <= primaryMax;
            })
            .sort((a: any, b: any) => Number(a.duration_seconds || 0) - Number(b.duration_seconds || 0));

          const chosenPrimary = primaryList.slice(0, primaryTarget);
          const pickedIds = new Set<string>(chosenPrimary.map((c: any) => String(c.clip_id || '')));

          if (chosenPrimary.length < primaryTarget) {
            const midTarget = (primaryMin + primaryMax) / 2;
            const fallbackLonger = sourcePool
              .filter((c: any) => !pickedIds.has(String(c.clip_id || '')) && Number(c.duration_seconds || 0) >= sprinkleMax)
              .sort(
                (a: any, b: any) =>
                  Math.abs(Number(a.duration_seconds || 0) - midTarget) -
                  Math.abs(Number(b.duration_seconds || 0) - midTarget)
              );
            for (const fc of fallbackLonger) {
              if (chosenPrimary.length >= primaryTarget) break;
              chosenPrimary.push(fc);
              pickedIds.add(String((fc as any).clip_id || ''));
            }
          }

          const sprinkleList = sourcePool
            .filter((c: any) => !pickedIds.has(String(c.clip_id || '')) && Number(c.duration_seconds || 0) < sprinkleMax)
            .sort((a: any, b: any) => Number(a.difficulty_score || 0) - Number(b.difficulty_score || 0));

          const chosenSprinkle = sprinkleList.slice(0, sprinkleTarget);
          for (const sc of chosenSprinkle) pickedIds.add(String((sc as any).clip_id || ''));

          while (chosenPrimary.length + chosenSprinkle.length < 50) {
            const rem = sourcePool.find((c: any) => !pickedIds.has(String(c.clip_id || '')));
            if (!rem) break;
            chosenPrimary.push(rem);
            pickedIds.add(String((rem as any).clip_id || ''));
          }

          const totalCount = chosenPrimary.length + chosenSprinkle.length;
          const allPositions = Array.from({ length: totalCount }, (_, idx) => idx);
          for (let i = allPositions.length - 1; i > 0; i--) {
            const j = (startLessonNum * 31 + i * 17) % (i + 1);
            [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
          }
          const sprinklePos = new Set(allPositions.slice(0, chosenSprinkle.length));
          let pIdx = 0;
          let sIdx = 0;
          for (let pos = 0; pos < totalCount; pos++) {
            if (sprinklePos.has(pos) && sIdx < chosenSprinkle.length) {
              orderedCandidates.push(chosenSprinkle[sIdx++]);
            } else if (pIdx < chosenPrimary.length) {
              orderedCandidates.push(chosenPrimary[pIdx++]);
            } else if (sIdx < chosenSprinkle.length) {
              orderedCandidates.push(chosenSprinkle[sIdx++]);
            }
          }
        }

        const selectedBatch: RawLesson[] = [];
        for (let i = 0; i < 50; i++) {
          if (i < orderedCandidates.length) {
            const copy = JSON.parse(JSON.stringify(orderedCandidates[i]));
            selectedBatch.push(copy);
          }
        }

        const activeStart = courseData.active_wave_start_lesson || 51;
        const allRaw: RawLesson[] = [...currentRawList];

        for (let i = 0; i < selectedBatch.length; i++) {
          const rawNew = selectedBatch[i];
          const nextNum = allRaw.length + 1;
          setGenerationProgress({
            percent: Math.round(((i + 1) / selectedBatch.length) * 95),
            message: `Preparing Lesson ${nextNum} (${i + 1}/50)...`
          });
          const isRev = nextNum % 7 === 0;
          const blockIdx = Math.floor(nextNum / 7);
          const startNum = Math.max(1, nextNum - 6);
          const rangeStr = `Lessons ${startNum}–${nextNum}`;

          const newItem: RawLesson = {
            ...rawNew,
            lesson_number: nextNum,
            type: isRev ? 'review' : 'regular',
            phase: 'active',
            active_wave_review_lesson: nextNum - (activeStart - 1)
          };
          allRaw.push(newItem);

          if (isRev) {
            const sevenSlice = allRaw.slice(Math.max(0, allRaw.length - 7), allRaw.length);
            const vocabPoints = sevenSlice.map(
              (s, idx2) =>
                `Lesson ${s.lesson_number || startNum + idx2}: "${String(s.shona_text || '').slice(0, 90)}" — ${String(s.english_translation || '').slice(0, 90)}`
            );
            const grammarPoints: string[] = [];
            const culturePoints: string[] = [];
            const reviewEx: Record<string, unknown>[] = [];
            for (const s of sevenSlice) {
              if (Array.isArray(s.grammar_notes) && s.grammar_notes.length > 0) {
                const gn0 = s.grammar_notes[0];
                if (typeof gn0 === 'object' && gn0 !== null && 'title' in gn0) {
                  grammarPoints.push(`${gn0.title}${gn0.rule ? ': ' + gn0.rule : ''}`);
                }
              }
              if (Array.isArray(s.cultural_notes) && s.cultural_notes.length > 0) {
                const cn0 = s.cultural_notes[0];
                if (typeof cn0 === 'object' && cn0 !== null && 'title' in cn0) {
                  culturePoints.push(`${cn0.title}: ${String(cn0.content || '').split('. ')[0]}.`);
                }
              }
              if (Array.isArray(s.active_exercises) && s.active_exercises.length > 0) {
                reviewEx.push(s.active_exercises[0]);
              }
            }
            newItem.review_summary = {
              title: `Unit ${blockIdx} Comprehensive Review (${rangeStr})`,
              sections: [
                { heading: `1. Key Expressions & Sentences Reviewed (${rangeStr})`, points: vocabPoints.slice(0, 7) },
                { heading: '2. Core Shona Grammar Rules Consolidated', points: grammarPoints.slice(0, 6) },
                { heading: '3. Cultural Context & Practical Usage', points: culturePoints.slice(0, 4) }
              ]
            };
            newItem.review_exercises = reviewEx.slice(0, 6);
            newItem.reviewed_lessons = sevenSlice.map((s, idx2) => Number(s.lesson_number || startNum + idx2));
          }
        }

        updatedRaw = {
          ...(rawCourseSnapshot || {}),
          total_lessons: allRaw.length,
          active_wave_start_lesson: activeStart,
          lessons: allRaw
        };
      }

      if (updatedRaw && Array.isArray(updatedRaw.lessons)) {
        applyUpdatedRawCourse(updatedRaw);

        // Automatically advance to the first newly generated lesson (e.g. Lesson 101)
        const firstNewNum = prevTotal + 1;
        setCurrentLessonNum(firstNewNum);
        setCurrentStep('PASSIVE_BLIND_1');
        setActiveLessonNum(null);
        persist({
          ...progress,
          current_lesson: firstNewNum,
          current_step: 'PASSIVE_BLIND_1',
          active_lesson_number: undefined
        });
      }
    } catch (err) {
      console.error('Failed to generate +50 lessons:', err);
    } finally {
      setIsGeneratingLessons(false);
      setTimeout(() => {
        setGenerationProgress({ percent: 0, message: '' });
      }, 600);
    }
  }, [courseData, allLessonsCompleted, isGeneratingLessons, rawCourseSnapshot, progress, persist, applyUpdatedRawCourse]);

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
        resetProgress,
        allLessonsCompleted,
        isGeneratingLessons,
        generationProgress,
        lessonCardProgress,
        insufficientReserveNotice,
        dismissInsufficientReserveNotice,
        generateNextFiftyLessons,
        cancelGenerateLessons,
        isDevMode,
        unlockDevMode,
        lockDevMode,
        completeAllLessons,
        removeLastFiftyLessons,
        deleteSingleLessonProgress,
        fixSingleLesson,
        regenerateSingleLesson,
        findOrRecoverAudio,
        regenerateLessonField,
        isDevActionRunning,
        devActionStatus
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
