"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    loadProgress: () => electron_1.ipcRenderer.invoke('get-user-progress'),
    saveProgress: (data) => electron_1.ipcRenderer.invoke('save-user-progress', data),
    loadExpandedCourse: () => electron_1.ipcRenderer.invoke('get-expanded-course'),
    generateMoreLessons: (count) => electron_1.ipcRenderer.invoke('generate-more-lessons', count),
    isElectron: true,
});
