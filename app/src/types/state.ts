export type PassiveStep =
  | 'PASSIVE_BLIND_1'
  | 'PASSIVE_GLOBAL'
  | 'PASSIVE_DETAILED'
  | 'PASSIVE_NOTES'
  | 'PASSIVE_READ_NO_AUDIO'
  | 'PASSIVE_BLIND_2'
  | 'PASSIVE_PREV_REVIEW';

export type ReviewStep =
  | 'REVIEW_NOTES'
  | 'REVIEW_EXERCISES';

export type ActiveStep =
  | 'ACTIVE_TRANSLATE'
  | 'ACTIVE_NOTES'
  | 'ACTIVE_EXERCISES'
  | 'ACTIVE_CORRECTION'
  | 'ACTIVE_FINAL_SHADOW';

export type LessonStep = PassiveStep | ReviewStep | ActiveStep;

export type LessonPhase = 'passive' | 'review' | 'active';

export const PASSIVE_STEPS: PassiveStep[] = [
  'PASSIVE_BLIND_1',
  'PASSIVE_GLOBAL',
  'PASSIVE_DETAILED',
  'PASSIVE_NOTES',
  'PASSIVE_READ_NO_AUDIO',
  'PASSIVE_BLIND_2',
  'PASSIVE_PREV_REVIEW'
];

export const REVIEW_STEPS: ReviewStep[] = [
  'REVIEW_NOTES',
  'REVIEW_EXERCISES'
];

export const ACTIVE_STEPS: ActiveStep[] = [
  'ACTIVE_TRANSLATE',
  'ACTIVE_NOTES',
  'ACTIVE_EXERCISES',
  'ACTIVE_CORRECTION',
  'ACTIVE_FINAL_SHADOW'
];

export interface StepMetadata {
  key: LessonStep;
  stepNumber: number;
  totalSteps: number;
  phase: LessonPhase;
  title: string;
  instruction: string;
}
