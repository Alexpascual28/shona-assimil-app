"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    loadProgress: () => electron_1.ipcRenderer.invoke('get-user-progress'),
    saveProgress: (data) => electron_1.ipcRenderer.invoke('save-user-progress', data),
    loadExpandedCourse: () => electron_1.ipcRenderer.invoke('get-expanded-course'),
    resolveAudioUrl: (audioRelPath) => electron_1.ipcRenderer.invoke('resolve-audio-url', audioRelPath),
    generateMoreLessons: (count) => electron_1.ipcRenderer.invoke('generate-more-lessons', count),
    cancelGenerateMoreLessons: () => electron_1.ipcRenderer.invoke('cancel-generate-more-lessons'),
    onGenerationProgress: (callback) => {
        const listener = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('generation-progress', listener);
        return () => {
            electron_1.ipcRenderer.removeListener('generation-progress', listener);
        };
    },
    onLessonCardProgress: (callback) => {
        const listener = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('lesson-card-progress', listener);
        return () => {
            electron_1.ipcRenderer.removeListener('lesson-card-progress', listener);
        };
    },
    verifyDevPassword: (password) => electron_1.ipcRenderer.invoke('verify-dev-password', password),
    getAiModeStatus: () => electron_1.ipcRenderer.invoke('get-ai-mode-status'),
    verifyAndSetGeminiKey: (apiKey) => electron_1.ipcRenderer.invoke('verify-and-set-gemini-key', apiKey),
    removeLast50Lessons: () => electron_1.ipcRenderer.invoke('remove-last-50-lessons'),
    devFixLesson: (lessonNumber, useAiMode) => electron_1.ipcRenderer.invoke('dev-fix-lesson', { lessonNumber, useAiMode }),
    devRegenerateLesson: (lessonNumber) => electron_1.ipcRenderer.invoke('dev-regenerate-lesson', lessonNumber),
    devFindOrRecoverAudio: (lessonNumber) => electron_1.ipcRenderer.invoke('dev-find-or-recover-audio', lessonNumber),
    devRegenerateField: (lessonNumber, field, useAiMode) => electron_1.ipcRenderer.invoke('dev-regenerate-field', { lessonNumber, field, useAiMode }),
    devRegenerateSentence: (lessonNumber, sentenceId, useAiMode) => electron_1.ipcRenderer.invoke('dev-regenerate-sentence', { lessonNumber, sentenceId, useAiMode }),
    devRegenerateSentenceGloss: (lessonNumber, sentenceId, useAiMode) => electron_1.ipcRenderer.invoke('dev-regenerate-sentence-gloss', { lessonNumber, sentenceId, useAiMode }),
    isElectron: true,
});
