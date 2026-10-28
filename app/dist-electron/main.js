"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let mainWindow = null;
function getStoragePath() {
    const userDataDir = electron_1.app.getPath('userData');
    return path_1.default.join(userDataDir, 'user_progress.json');
}
function getWorkspaceBackupPath() {
    // Save to workspace root for transparent inspection
    return path_1.default.join(process.cwd(), 'user_progress.json');
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 1024,
        minHeight: 700,
        title: 'Shona Assimil - ChiZezuru Platform',
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    const isDev = process.env.NODE_ENV === 'development';
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    if (isDev) {
        mainWindow.loadURL(devServerUrl).catch(() => {
            const indexPath = path_1.default.join(__dirname, '../dist/index.html');
            if (fs_1.default.existsSync(indexPath)) {
                mainWindow?.loadFile(indexPath);
            }
        });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    // Handle self-test flag
    if (process.env.TEST_SMOKE === '1') {
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('SMOKE_TEST_SUCCESS: Window loaded successfully.');
            setTimeout(() => {
                electron_1.app.quit();
            }, 1500);
        });
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// IPC Handlers
electron_1.ipcMain.handle('get-user-progress', async () => {
    try {
        const storagePath = getStoragePath();
        const backupPath = getWorkspaceBackupPath();
        if (fs_1.default.existsSync(backupPath)) {
            const data = fs_1.default.readFileSync(backupPath, 'utf-8');
            return JSON.parse(data);
        }
        else if (fs_1.default.existsSync(storagePath)) {
            const data = fs_1.default.readFileSync(storagePath, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (err) {
        console.error('Failed to read user_progress.json:', err);
    }
    return null;
});
electron_1.ipcMain.handle('save-user-progress', async (_event, progressData) => {
    try {
        const storagePath = getStoragePath();
        const backupPath = getWorkspaceBackupPath();
        const serialized = JSON.stringify(progressData, null, 2);
        // Save to userData
        fs_1.default.writeFileSync(storagePath, serialized, 'utf-8');
        // Also mirror to workspace root
        try {
            fs_1.default.writeFileSync(backupPath, serialized, 'utf-8');
        }
        catch { }
        return true;
    }
    catch (err) {
        console.error('Failed to write user_progress.json:', err);
        return false;
    }
});
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
