export interface MorphemeGloss {
  shona_word: string;
  morpheme_breakdown: string;
  noun_class_or_concord: string;
  literal_english: string;
  tone_pattern?: string;
}

export interface DialogueLine {
  id: number;
  shona: string;
  english: string;
  literal_gloss?: string;
  gloss_breakdown?: MorphemeGloss[];
}

export interface NoteItem {
  title: string;
  content: string;
  rule?: string | null;
}

export interface ExerciseItem {
  id: number;
  type: 'translate' | 'fill_blank' | 'multiple_choice';
  prompt: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export interface ReviewSection {
  heading: string;
  points: string[];
}

export interface ReviewSummary {
  title: string;
  sections: ReviewSection[];
}

export interface RawLesson {
  lesson_number?: number;
  num?: number;
  type?: string;
  phase?: string;
  title?: string;
  title_shona?: string;
  title_english?: string;
  audio_url?: string | null;
  audio?: string;
  duration_seconds?: number | null;
  shona_text?: string;
  english_translation?: string;
  literal_gloss?: (MorphemeGloss | string)[] | string;
  grammar_notes?: (string | NoteItem)[];
  cultural_notes?: string | NoteItem[];
  active_wave_review_lesson?: number | null;
  active_exercises?: Record<string, unknown>[];
  review_summary?: string | ReviewSummary | null;
  review_exercises?: Record<string, unknown>[];
  dialogue?: DialogueLine[];
  key_noun_classes_covered?: string[];
  reviewed_lessons?: number[];
}

export interface Lesson {
  num: number;
  title_shona: string;
  title_english: string;
  type: 'standard' | 'review';
  audio: string;
  duration_seconds: number | null;
  dialogue: DialogueLine[];
  shona_text: string;
  english_translation: string;
  grammar_notes: NoteItem[];
  cultural_notes: NoteItem[];
  review_summary?: ReviewSummary;
  review_exercises?: ExerciseItem[];
  active_exercises?: ExerciseItem[];
  active_wave_target?: number;
}

export interface CourseData {
  course_title: string;
  version: string;
  dialect?: string;
  target_dialect?: string;
  total_lessons: number;
  active_wave_start_lesson: number;
  lessons: Lesson[];
}
