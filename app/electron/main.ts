import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function getStoragePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'user_progress.json');
}

function getWorkspaceBackupPath(): string {
  // Save to workspace root for transparent inspection
  return path.join(process.cwd(), 'user_progress.json');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Shona Assimil - ChiZezuru Platform',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow?.loadFile(indexPath);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle self-test flag
  if (process.env.TEST_SMOKE === '1') {
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('SMOKE_TEST_SUCCESS: Window loaded successfully.');
      setTimeout(() => {
        app.quit();
      }, 1500);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-user-progress', async () => {
  try {
    const storagePath = getStoragePath();
    const backupPath = getWorkspaceBackupPath();

    if (fs.existsSync(backupPath)) {
      const data = fs.readFileSync(backupPath, 'utf-8');
      return JSON.parse(data);
    } else if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read user_progress.json:', err);
  }
  return null;
});

ipcMain.handle('save-user-progress', async (_event, progressData) => {
  try {
    const storagePath = getStoragePath();
    const backupPath = getWorkspaceBackupPath();
    const serialized = JSON.stringify(progressData, null, 2);

    // Save to userData
    fs.writeFileSync(storagePath, serialized, 'utf-8');

    // Also mirror to workspace root
    try {
      fs.writeFileSync(backupPath, serialized, 'utf-8');
    } catch {}

    return true;
  } catch (err) {
    console.error('Failed to write user_progress.json:', err);
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
