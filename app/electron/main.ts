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

function getDevModePassword(): string {
  if (process.env.DEV_MODE_PASSWORD) return process.env.DEV_MODE_PASSWORD;
  const envCandidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'app', '.env'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(app.getAppPath(), '.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('DEV_MODE_PASSWORD=')) {
            return trimmed.split('=')[1].trim();
          }
        }
      } catch {}
    }
  }
  return 'shona_dev_pass';
}

function sendExpansionProgress(percent: number, statusText: string, details?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('expansion-progress', {
      percent,
      statusText,
      ...details,
    });
  }
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

ipcMain.handle('verify-dev-password', async (_event, password: string) => {
  const expected = getDevModePassword();
  return typeof password === 'string' && password.trim() === expected.trim();
});

ipcMain.handle('generate-more-lessons', async (_event, count = 50) => {
  try {
    sendExpansionProgress(5, 'Initializing lesson expansion pipeline...');
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

    sendExpansionProgress(15, 'Scanning available audio clips in reserve pool...');
    await new Promise((r) => setTimeout(r, 100));

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
        !existingTexts.has(String(item.shona_text || '').trim().toLowerCase()) &&
        Number(item.duration_seconds || 0) <= 120.0
    );

    // If reserve pool has fewer than 50 lessons left, return polite offline dialog notice
    if (availableNew.length < numToAdd) {
      sendExpansionProgress(0, 'Reserve pool below threshold.');
      return {
        error: 'INSUFFICIENT_OFFLINE_RESERVE',
        remaining: availableNew.length,
        required: numToAdd,
        message: `There are currently only ${availableNew.length} reserve lessons remaining in the offline pool (${numToAdd} required for a new batch). Please connect to the internet to download additional audio clips or update your course pack.`,
      };
    }

    sendExpansionProgress(35, `Selecting ${numToAdd} progressive clips (75% progressive + 25% short review)...`);
    await new Promise((r) => setTimeout(r, 120));

    const startLessonNum = currentCourse.lessons.length + 1;
    const bandIdx = Math.max(1, Math.floor((startLessonNum - 1) / 100));
    const sourcePool = availableNew;

    let orderedCandidates: Record<string, any>[] = [];
    if (bandIdx >= 6) {
      // Lessons 601+: balanced mix of clip lengths up to 120s at random
      const buckets = [
        sourcePool.filter((c) => Number(c.duration_seconds || 0) < 15),
        sourcePool.filter((c) => Number(c.duration_seconds || 0) >= 15 && Number(c.duration_seconds || 0) < 30),
        sourcePool.filter((c) => Number(c.duration_seconds || 0) >= 30 && Number(c.duration_seconds || 0) < 50),
        sourcePool.filter((c) => Number(c.duration_seconds || 0) >= 50 && Number(c.duration_seconds || 0) < 80),
        sourcePool.filter((c) => Number(c.duration_seconds || 0) >= 80 && Number(c.duration_seconds || 0) <= 120),
      ];
      const perBucket = Math.max(1, Math.floor(numToAdd / buckets.length));
      const pickedIds = new Set<string>();
      for (const b of buckets) {
        const shuffled = [...b].sort(() => Math.random() - 0.5);
        for (const item of shuffled.slice(0, perBucket)) {
          if (!pickedIds.has(item.clip_id)) {
            orderedCandidates.push(item);
            pickedIds.add(item.clip_id);
          }
        }
      }
      const rem = sourcePool.filter((c) => !pickedIds.has(c.clip_id)).sort(() => Math.random() - 0.5);
      orderedCandidates.push(...rem.slice(0, Math.max(0, numToAdd - orderedCandidates.length)));
      orderedCandidates.sort(() => Math.random() - 0.5);
    } else {
      // Tiered 100-lesson band (bandIdx = 1..5):
      // Primary range: [bandIdx * 10, bandIdx * 10 + 30] (75%)
      // Sprinkle range: [0, bandIdx * 10) (25% sprinkled arbitrarily)
      const primaryMin = bandIdx * 10;
      const primaryMax = bandIdx * 10 + 30;
      const sprinkleMax = bandIdx * 10;
      const sprinkleTarget = Math.round(numToAdd * 0.25); // 12 or 13
      const primaryTarget = numToAdd - sprinkleTarget; // 38 or 37

      const primaryList = sourcePool
        .filter((c) => {
          const d = Number(c.duration_seconds || 0);
          return d >= primaryMin && d <= primaryMax;
        })
        .sort((a, b) => Number(a.duration_seconds || 0) - Number(b.duration_seconds || 0));

      const chosenPrimary = primaryList.slice(0, primaryTarget);
      const pickedIds = new Set<string>(chosenPrimary.map((c) => c.clip_id));

      if (chosenPrimary.length < primaryTarget) {
        const midTarget = (primaryMin + primaryMax) / 2;
        const fallbackLonger = sourcePool
          .filter((c) => !pickedIds.has(c.clip_id) && Number(c.duration_seconds || 0) >= sprinkleMax)
          .sort(
            (a, b) =>
              Math.abs(Number(a.duration_seconds || 0) - midTarget) -
              Math.abs(Number(b.duration_seconds || 0) - midTarget)
          );
        for (const fc of fallbackLonger) {
          if (chosenPrimary.length >= primaryTarget) break;
          chosenPrimary.push(fc);
          pickedIds.add(fc.clip_id);
        }
      }

      const sprinkleList = sourcePool
        .filter((c) => !pickedIds.has(c.clip_id) && Number(c.duration_seconds || 0) < sprinkleMax)
        .sort((a, b) => Number(a.difficulty_score || 0) - Number(b.difficulty_score || 0));

      const chosenSprinkle = sprinkleList.slice(0, sprinkleTarget);
      for (const sc of chosenSprinkle) pickedIds.add(sc.clip_id);

      while (chosenPrimary.length + chosenSprinkle.length < numToAdd) {
        const rem = sourcePool.find((c) => !pickedIds.has(c.clip_id));
        if (!rem) break;
        chosenPrimary.push(rem);
        pickedIds.add(rem.clip_id);
      }

      // Interleave 25% shorter clips at arbitrary positions among the 75% progressive primary clips
      const totalCount = chosenPrimary.length + chosenSprinkle.length;
      const allPositions = Array.from({ length: totalCount }, (_, idx) => idx);
      for (let i = allPositions.length - 1; i > 0; i--) {
        const j = (startLessonNum * 31 + i * 17) % (i + 1);
        [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
      }
      const sprinklePos = new Set(allPositions.slice(0, chosenSprinkle.length));
      let pIdx = 0;
      let sIdx = 0;
      for (let pos = 0; pos < totalCount; pos++) {
        if (sprinklePos.has(pos) && sIdx < chosenSprinkle.length) {
          orderedCandidates.push(chosenSprinkle[sIdx++]);
        } else if (pIdx < chosenPrimary.length) {
          orderedCandidates.push(chosenPrimary[pIdx++]);
        } else if (sIdx < chosenSprinkle.length) {
          orderedCandidates.push(chosenSprinkle[sIdx++]);
        }
      }
    }

    sendExpansionProgress(60, 'Assembling Active Wave metadata and translation pairs...');
    await new Promise((r) => setTimeout(r, 120));

    const selectedBatch: Record<string, any>[] = [];
    for (let i = 0; i < numToAdd; i++) {
      if (i < orderedCandidates.length) {
        const copy = JSON.parse(JSON.stringify(orderedCandidates[i]));
        if (existingIds.has(copy.clip_id)) {
          copy.clip_id = `${copy.clip_id}_exp_${currentCourse.lessons.length + i + 1}`;
        }
        selectedBatch.push(copy);
      } else if (poolLessons.length > 0) {
        const base = JSON.parse(JSON.stringify(poolLessons[i % poolLessons.length]));
        base.clip_id = `${base.clip_id}_exp_${currentCourse.lessons.length + i + 1}`;
        selectedBatch.push(base);
      }
    }

    const allLessons: Record<string, any>[] = [...currentCourse.lessons];
    const activeWaveStart = Number(currentCourse.active_wave_start_lesson || 51);

    sendExpansionProgress(78, 'Synthesizing 7-lesson comprehensive review units and exercises...');
    await new Promise((r) => setTimeout(r, 120));

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

    sendExpansionProgress(92, 'Saving expanded syllabus to persistent app storage...');
    await new Promise((r) => setTimeout(r, 100));

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

    sendExpansionProgress(100, `Completed! Lessons 1–${allLessons.length} are now active.`);
    return updatedCourse;
  } catch (err) {
    console.error('Failed to generate +50 lessons:', err);
    sendExpansionProgress(0, 'Failed to generate lessons.');
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
