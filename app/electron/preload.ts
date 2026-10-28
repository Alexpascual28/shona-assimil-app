import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadProgress: () => ipcRenderer.invoke('get-user-progress'),
  saveProgress: (data: unknown) => ipcRenderer.invoke('save-user-progress', data),
  loadExpandedCourse: () => ipcRenderer.invoke('get-expanded-course'),
  generateMoreLessons: (count: number) => ipcRenderer.invoke('generate-more-lessons', count),
  isElectron: true,
});
