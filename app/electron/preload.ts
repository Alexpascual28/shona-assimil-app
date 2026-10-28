import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadProgress: () => ipcRenderer.invoke('get-user-progress'),
  saveProgress: (data: unknown) => ipcRenderer.invoke('save-user-progress', data),
  loadExpandedCourse: () => ipcRenderer.invoke('get-expanded-course'),
  resolveAudioUrl: (audioRelPath: string) => ipcRenderer.invoke('resolve-audio-url', audioRelPath),
  generateMoreLessons: (count: number) => ipcRenderer.invoke('generate-more-lessons', count),
  cancelGenerateMoreLessons: () => ipcRenderer.invoke('cancel-generate-more-lessons'),
  onGenerationProgress: (
    callback: (data: { percent: number; message: string }) => void
  ) => {
    const listener = (_event: unknown, data: { percent: number; message: string }) =>
      callback(data);
    ipcRenderer.on('generation-progress', listener);
    return () => {
      ipcRenderer.removeListener('generation-progress', listener);
    };
  },
  onLessonCardProgress: (
    callback: (data: { lessonNumber: number; percent: number; message: string }) => void
  ) => {
    const listener = (
      _event: unknown,
      data: { lessonNumber: number; percent: number; message: string }
    ) => callback(data);
    ipcRenderer.on('lesson-card-progress', listener);
    return () => {
      ipcRenderer.removeListener('lesson-card-progress', listener);
    };
  },
  verifyDevPassword: (password: string) => ipcRenderer.invoke('verify-dev-password', password),
  removeLast50Lessons: () => ipcRenderer.invoke('remove-last-50-lessons'),
  devFixLesson: (lessonNumber: number) => ipcRenderer.invoke('dev-fix-lesson', lessonNumber),
  devRegenerateLesson: (lessonNumber: number) =>
    ipcRenderer.invoke('dev-regenerate-lesson', lessonNumber),
  devFindOrRecoverAudio: (lessonNumber: number) =>
    ipcRenderer.invoke('dev-find-or-recover-audio', lessonNumber),
  devRegenerateField: (
    lessonNumber: number,
    field: 'translation' | 'grammar_notes' | 'cultural_notes' | 'exercises'
  ) => ipcRenderer.invoke('dev-regenerate-field', { lessonNumber, field }),
  isElectron: true,
});
