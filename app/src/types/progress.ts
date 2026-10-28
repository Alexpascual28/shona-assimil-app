import { LessonStep } from './state';

export interface UserProgress {
  completed_passive: number[]; // e.g. [1, 2, 3...]
  completed_active: number[];  // e.g. [1, 2...]
  current_lesson: number;
  current_step: LessonStep;
  active_lesson_number?: number; // When active phase is engaged
  active_translations: Record<number, string>; // Typed Shona translations
  active_corrections: Record<number, string>;  // Revised Shona after correction step
  exercise_history: Record<string, boolean>;    // Exercise ID -> whether answered correctly
  last_saved: string;
}

export const DEFAULT_USER_PROGRESS: UserProgress = {
  completed_passive: [],
  completed_active: [],
  current_lesson: 1,
  current_step: 'PASSIVE_BLIND_1',
  active_translations: {},
  active_corrections: {},
  exercise_history: {},
  last_saved: new Date().toISOString()
};
