import { DEFAULT_USER_PROGRESS, UserProgress } from '../types/progress';

declare global {
  interface Window {
    electronAPI?: {
      loadProgress: () => Promise<UserProgress | null>;
      saveProgress: (data: UserProgress) => Promise<boolean>;
      loadExpandedCourse?: () => Promise<Record<string, unknown> | null>;
      resolveAudioUrl?: (audioRelPath: string) => Promise<string | null>;
      generateMoreLessons?: (count: number) => Promise<Record<string, unknown> | null>;
      cancelGenerateMoreLessons?: () => Promise<boolean>;
      onGenerationProgress?: (
        callback: (data: { percent: number; message: string }) => void
      ) => () => void;
      onLessonCardProgress?: (
        callback: (data: { lessonNumber: number; percent: number; message: string }) => void
      ) => () => void;
      verifyDevPassword?: (password: string) => Promise<boolean>;
      removeLast50Lessons?: () => Promise<Record<string, unknown> | null>;
      devFixLesson?: (lessonNumber: number) => Promise<Record<string, unknown> | null>;
      devRegenerateLesson?: (lessonNumber: number) => Promise<Record<string, unknown> | null>;
      devFindOrRecoverAudio?: (
        lessonNumber: number
      ) => Promise<{ status: string; course: Record<string, unknown> } | null>;
      devRegenerateField?: (
        lessonNumber: number,
        field: 'translation' | 'grammar_notes' | 'cultural_notes' | 'exercises'
      ) => Promise<Record<string, unknown> | null>;
      isElectron?: boolean;
    };
  }
}

const STORAGE_KEY = 'shona_assimil_user_progress_v2';

export async function loadStoredProgress(): Promise<UserProgress> {
  // Try electron IPC first
  if (window.electronAPI?.loadProgress) {
    try {
      const diskData = await window.electronAPI.loadProgress();
      if (diskData && diskData.current_lesson) {
        return { ...DEFAULT_USER_PROGRESS, ...diskData };
      }
    } catch (err) {
      console.warn('Error reading Electron progress file:', err);
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_USER_PROGRESS, ...parsed };
    }
  } catch (err) {
    console.error('Error reading localStorage:', err);
  }

  return DEFAULT_USER_PROGRESS;
}

export async function saveStoredProgress(progress: UserProgress): Promise<void> {
  const updatedProgress: UserProgress = {
    ...progress,
    last_saved: new Date().toISOString()
  };

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgress));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }

  // Save to electron file
  if (window.electronAPI?.saveProgress) {
    try {
      await window.electronAPI.saveProgress(updatedProgress);
    } catch (err) {
      console.warn('Error saving to Electron file storage:', err);
    }
  }
}
