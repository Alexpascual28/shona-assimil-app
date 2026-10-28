import { DEFAULT_USER_PROGRESS, UserProgress } from '../types/progress';

declare global {
  interface Window {
    electronAPI?: {
      loadProgress: () => Promise<UserProgress | null>;
      saveProgress: (data: UserProgress) => Promise<boolean>;
      isElectron?: boolean;
    };
  }
}

const STORAGE_KEY = 'shona_assimil_user_progress_v1';

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
