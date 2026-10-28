import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadProgress: () => ipcRenderer.invoke('get-user-progress'),
  saveProgress: (data: unknown) => ipcRenderer.invoke('save-user-progress', data),
  loadExpandedCourse: () => ipcRenderer.invoke('get-expanded-course'),
  generateMoreLessons: (count: number) => ipcRenderer.invoke('generate-more-lessons', count),
  verifyDevPassword: (password: string) => ipcRenderer.invoke('verify-dev-password', password),
  onExpansionProgress: (callback: (progress: any) => void) => {
    const handler = (_event: unknown, data: any) => callback(data);
    ipcRenderer.on('expansion-progress', handler);
    return () => {
      ipcRenderer.removeListener('expansion-progress', handler);
    };
  },
  isElectron: true,
});
