import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';

let mainWindow: BrowserWindow | null = null;

function getStoragePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'user_progress.json');
}

function getExpandedCoursePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'course_data_expanded.json');
}

function getWorkspaceBackupPath(): string {
  // Save to workspace root for transparent inspection
  return path.join(process.cwd(), 'user_progress.json');
}

function resolvePublicAssetPath(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'public', filename),
    path.join(process.cwd(), 'app', 'public', filename),
    path.join(__dirname, '../dist', filename),
    path.join(__dirname, '../public', filename),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }
  return null;
}

function buildReviewForSevenLessons(
  sevenLessons: Record<string, any>[],
  reviewLessonNum: number
): {
  review_summary: { title: string; sections: { heading: string; points: string[] }[] };
  key_noun_classes_covered: string[];
  review_exercises: Record<string, any>[];
  reviewed_lessons: number[];
} {
  const blockIdx = Math.floor(reviewLessonNum / 7);
  const startNum = Math.max(1, reviewLessonNum - 6);
  const rangeStr = `Lessons ${startNum}–${reviewLessonNum}`;

  const vocabPoints: string[] = [];
  const grammarPoints: string[] = [];
  const culturePoints: string[] = [];
  const topicsCovered: string[] = [];
  const collectedExercises: Record<string, any>[] = [];

  for (const l of sevenLessons) {
    const lNum = l.lesson_number || l.num;
    const shona = String(l.shona_text || '').trim();
    const eng = String(l.english_translation || '').trim();
    if (shona && eng) {
      const shortShona = shona.length <= 95 ? shona : shona.slice(0, 92) + '...';
      const shortEng = eng.length <= 95 ? eng : eng.slice(0, 92) + '...';
      vocabPoints.push(`Lesson ${lNum}: "${shortShona}" — ${shortEng}`);
    }
    const gNotes = Array.isArray(l.grammar_notes) ? l.grammar_notes : [];
    if (gNotes.length > 0 && typeof gNotes[0] === 'object' && gNotes[0] !== null) {
      const t = String(gNotes[0].title || '');
      const r = String(gNotes[0].rule || '');
      if (t && !topicsCovered.includes(t)) {
        topicsCovered.push(t);
        grammarPoints.push(r ? `${t}: ${r}` : t);
      }
    }
    const cNotes = Array.isArray(l.cultural_notes) ? l.cultural_notes : [];
    if (cNotes.length > 0 && typeof cNotes[0] === 'object' && cNotes[0] !== null && culturePoints.length < 4) {
      const ct = String(cNotes[0].title || '');
      const cc = String(cNotes[0].content || '');
      const firstSent = cc ? cc.split('. ')[0] + '.' : '';
      if (ct) culturePoints.push(`${ct}: ${firstSent}`);
    }
    const exList = Array.isArray(l.active_exercises) ? l.active_exercises : [];
    if (exList.length > 0) {
      collectedExercises.push({
        ...exList[0],
        prompt: `Unit ${blockIdx} Review (Lesson ${lNum}) — ${exList[0].prompt}`,
      });
    }
  }

  while (collectedExercises.length < 6 && sevenLessons.length > 0) {
    const fallbackLesson = sevenLessons[collectedExercises.length % sevenLessons.length];
    const exList = Array.isArray(fallbackLesson.active_exercises) ? fallbackLesson.active_exercises : [];
    const ex = exList[collectedExercises.length % Math.max(1, exList.length)];
    if (ex) {
      collectedExercises.push({
        ...ex,
        prompt: `Unit ${blockIdx} Synthesis — ${ex.prompt}`,
      });
    } else {
      break;
    }
  }

  return {
    review_summary: {
      title: `Unit ${blockIdx} Comprehensive Review (${rangeStr})`,
      sections: [
        {
          heading: `1. Key Expressions & Sentences Reviewed (${rangeStr})`,
          points: vocabPoints.slice(0, 7),
        },
        {
          heading: '2. Core Shona Grammar Rules Consolidated',
          points: grammarPoints.slice(0, 6),
        },
        {
          heading: '3. Cultural Context & Practical Usage',
          points: culturePoints.slice(0, 4),
        },
      ],
    },
    key_noun_classes_covered: topicsCovered.slice(0, 5),
    review_exercises: collectedExercises.slice(0, 6),
    reviewed_lessons: sevenLessons.map((l) => Number(l.lesson_number || l.num)),
  };
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

ipcMain.handle('get-expanded-course', async () => {
  try {
    const expandedPath = getExpandedCoursePath();
    if (fs.existsSync(expandedPath)) {
      const raw = JSON.parse(fs.readFileSync(expandedPath, 'utf-8'));
      if (raw && Array.isArray(raw.lessons) && raw.lessons.length >= 100) {
        return raw;
      }
    }
  } catch (err) {
    console.error('Failed to load expanded course:', err);
  }
  return null;
});

ipcMain.handle('generate-more-lessons', async (_event, count = 50) => {
  try {
    const numToAdd = typeof count === 'number' && count > 0 ? count : 50;
    const expandedPath = getExpandedCoursePath();
    const baseCoursePath = resolvePublicAssetPath('course_data.json');
    const poolPath = resolvePublicAssetPath('expansion_pool.json');

    let currentCourse: Record<string, any> | null = null;
    if (fs.existsSync(expandedPath)) {
      try {
        const expData = JSON.parse(fs.readFileSync(expandedPath, 'utf-8'));
        if (expData && Array.isArray(expData.lessons) && expData.lessons.length >= 100) {
          currentCourse = expData;
        }
      } catch {}
    }
    if (!currentCourse && baseCoursePath) {
      currentCourse = JSON.parse(fs.readFileSync(baseCoursePath, 'utf-8'));
    }
    if (!currentCourse || !Array.isArray(currentCourse.lessons)) {
      throw new Error('Could not load base course_data.json');
    }

    // Try running pipeline/build_course.py --append --max-new-lessons 50 if available in workspace
    const pipelineScriptCandidates = [
      path.resolve(process.cwd(), '../pipeline/build_course.py'),
      path.resolve(process.cwd(), 'pipeline/build_course.py'),
    ];
    const pipelineScript = pipelineScriptCandidates.find((p) => fs.existsSync(p));

    if (pipelineScript) {
      fs.writeFileSync(expandedPath, JSON.stringify(currentCourse, null, 2), 'utf-8');
      await new Promise<void>((resolve, reject) => {
        execFile(
          'python',
          [pipelineScript, '--append', '--max-new-lessons', String(numToAdd), '--output-json', expandedPath],
          { timeout: 60000 },
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }).catch((err) => {
        console.warn('Python pipeline invocation fallback to reserve pool:', err);
      });

      if (fs.existsSync(expandedPath)) {
        const updatedFromPy = JSON.parse(fs.readFileSync(expandedPath, 'utf-8'));
        if (
          updatedFromPy &&
          Array.isArray(updatedFromPy.lessons) &&
          updatedFromPy.lessons.length > currentCourse.lessons.length
        ) {
          return updatedFromPy;
        }
      }
    }

    // Reserve pool expansion (works 100% offline in standalone .exe and dev)
    if (!poolPath || !fs.existsSync(poolPath)) {
      throw new Error('Could not locate expansion_pool.json');
    }
    const poolLessons: Record<string, any>[] = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
    const existingIds = new Set(currentCourse.lessons.map((l: any) => l.clip_id).filter(Boolean));
    const existingTexts = new Set(
      currentCourse.lessons.map((l: any) => String(l.shona_text || '').trim().toLowerCase()).filter(Boolean)
    );

    const availableNew = poolLessons.filter(
      (item) =>
        !existingIds.has(item.clip_id) &&
        !existingTexts.has(String(item.shona_text || '').trim().toLowerCase())
    );

    const selectedBatch: Record<string, any>[] = [];
    for (let i = 0; i < numToAdd; i++) {
      if (i < availableNew.length) {
        selectedBatch.push(JSON.parse(JSON.stringify(availableNew[i])));
      } else if (poolLessons.length > 0) {
        // Cycle with fresh lesson numbering if user expands beyond total dataset size
        const base = JSON.parse(JSON.stringify(poolLessons[i % poolLessons.length]));
        base.clip_id = `${base.clip_id}_exp_${currentCourse.lessons.length + i + 1}`;
        selectedBatch.push(base);
      }
    }

    const allLessons: Record<string, any>[] = [...currentCourse.lessons];
    const activeWaveStart = Number(currentCourse.active_wave_start_lesson || 51);

    for (const rawNew of selectedBatch) {
      const nextNum = allLessons.length + 1;
      const words = String(rawNew.shona_text || '').split(/\s+/).filter(Boolean);
      const previewWords = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
      const isReviewSlot = nextNum % 7 === 0;
      const reviewBlockNum = Math.floor(nextNum / 7);

      const newLesson: Record<string, any> = {
        ...rawNew,
        lesson_number: nextNum,
        type: isReviewSlot ? 'review' : 'regular',
        phase: 'active',
        active_wave_review_lesson: nextNum - (activeWaveStart - 1),
        title: isReviewSlot
          ? `Chidzidzo ${nextNum}: ${previewWords} (Dzokororo ${reviewBlockNum})`
          : `Chidzidzo ${nextNum}: ${previewWords}`,
      };

      allLessons.push(newLesson);

      if (isReviewSlot) {
        const sevenSlice = allLessons.slice(Math.max(0, allLessons.length - 7), allLessons.length);
        const revData = buildReviewForSevenLessons(sevenSlice, nextNum);
        newLesson.review_summary = revData.review_summary;
        newLesson.key_noun_classes_covered = revData.key_noun_classes_covered;
        newLesson.review_exercises = revData.review_exercises;
        newLesson.reviewed_lessons = revData.reviewed_lessons;
      } else {
        newLesson.review_summary = null;
        newLesson.key_noun_classes_covered = [];
        newLesson.review_exercises = [];
        newLesson.reviewed_lessons = [];
      }
    }

    const updatedCourse = {
      ...currentCourse,
      generated_at: new Date().toISOString(),
      total_lessons: allLessons.length,
      regular_lessons_count: allLessons.filter((l) => l.type !== 'review').length,
      review_lessons_count: allLessons.filter((l) => l.type === 'review').length,
      active_wave_start_lesson: activeWaveStart,
      lessons: allLessons,
    };

    fs.writeFileSync(expandedPath, JSON.stringify(updatedCourse, null, 2), 'utf-8');
    return updatedCourse;
  } catch (err) {
    console.error('Failed to generate +50 lessons:', err);
    return null;
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
