import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import {
  enrichClipObject,
  buildReviewForSevenLessons,
  resolveIdiomaticTranslationAndDialogue,
  generateTextbookGrammarNotes,
  generateTextbookCulturalNotes,
  generateContextualExercises,
  analyzeMorphemesAndClass,
  normalizeTextKey,
} from './enricher';

let mainWindow: BrowserWindow | null = null;

function emitGenerationProgress(percent: number, message: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('generation-progress', {
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      message,
    });
  }
}

function getStoragePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'user_progress.json');
}

function getExpandedCoursePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'course_data_expanded.json');
}

function getWorkspaceBackupPath(): string {
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

function getAllPublicAssetPaths(filename: string): string[] {
  const candidates = [
    path.join(process.cwd(), 'public', filename),
    path.join(process.cwd(), 'app', 'public', filename),
    path.join(__dirname, '../dist', filename),
    path.join(__dirname, '../public', filename),
  ];
  const unique = Array.from(new Set(candidates.map((p) => path.resolve(p))));
  return unique.filter((p) => fs.existsSync(path.dirname(p)));
}

function readDevModePassword(): string {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/^\s*(?:VITE_)?DEV_MODE_PASSWORD\s*=\s*(.+)\s*$/m);
        if (match && match[1]) {
          return match[1].trim().replace(/^["']|["']$/g, '');
        }
      } catch {}
    }
  }
  return process.env.DEV_MODE_PASSWORD || process.env.VITE_DEV_MODE_PASSWORD || 'shona_dev_pass';
}

function fetchHttpsBuffer(url: string, timeoutMs = 15000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShonaAssimilApp/1.0',
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchHttpsBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

async function checkHuggingFaceConnection(): Promise<boolean> {
  try {
    const buf = await fetchHttpsBuffer(
      'https://datasets-server.huggingface.co/is-valid?dataset=takuM23/shona-vibevoice-corpus',
      6000
    );
    return buf.length > 0;
  } catch {
    return false;
  }
}

function parseWavDurationSeconds(buf: Buffer): number {
  try {
    if (buf.length >= 44 && buf.toString('ascii', 0, 4) === 'RIFF') {
      const byteRate = buf.readUInt32LE(28);
      if (byteRate > 0) {
        // Find 'data' chunk
        let offset = 12;
        while (offset + 8 <= buf.length) {
          const chunkId = buf.toString('ascii', offset, offset + 4);
          const chunkSize = buf.readUInt32LE(offset + 4);
          if (chunkId === 'data') {
            return Number((chunkSize / byteRate).toFixed(2));
          }
          offset += 8 + chunkSize;
        }
        return Number(((buf.length - 44) / byteRate).toFixed(2));
      }
    }
  } catch {}
  return 0;
}

const NON_ZEZURU_MARKERS = new Set([
  'unjani', 'ngiyabonga', 'siyabonga', 'yebo', 'sawubona', 'kunjani', 'umntwana', 'inkosi',
]);

function isValidZezuruTranscript(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < 6) return false;
  const words = (cleaned.toLowerCase().match(/[a-z']+/g) || []);
  if (words.length < 2) return false;
  if (words.some((w) => NON_ZEZURU_MARKERS.has(w))) return false;
  return true;
}

function getBandConstraints(lessonNumber: number, batchSize: number) {
  const bandIdx = Math.floor((lessonNumber - 1) / 100);
  if (bandIdx <= 0) {
    return {
      bandIdx: 0,
      primaryMin: 0,
      primaryMax: 30,
      sprinkleMax: 0,
      primaryTarget: batchSize,
      sprinkleTarget: 0,
    };
  }
  if (bandIdx >= 6) {
    return {
      bandIdx,
      primaryMin: 0,
      primaryMax: 120,
      sprinkleMax: 0,
      primaryTarget: batchSize,
      sprinkleTarget: 0,
    };
  }
  const primaryMin = bandIdx * 10;
  const primaryMax = bandIdx * 10 + 30;
  const sprinkleMax = bandIdx * 10;
  const sprinkleTarget = Math.round(batchSize * 0.25);
  const primaryTarget = batchSize - sprinkleTarget;
  return {
    bandIdx,
    primaryMin,
    primaryMax,
    sprinkleMax,
    primaryTarget,
    sprinkleTarget,
  };
}

function evaluateReservePoolForBatch(
  availableNew: Record<string, any>[],
  startLessonNum: number,
  numToAdd: number
) {
  const constraints = getBandConstraints(startLessonNum, numToAdd);
  if (constraints.bandIdx === 0 || constraints.bandIdx >= 6) {
    const matching = availableNew.filter((c) => {
      const d = Number(c.duration_seconds || 0);
      return d >= constraints.primaryMin && d <= constraints.primaryMax;
    });
    return {
      satisfied: availableNew.length >= numToAdd && matching.length >= numToAdd,
      primaryMissing: Math.max(0, numToAdd - matching.length),
      sprinkleMissing: 0,
      totalMissing: Math.max(0, numToAdd - availableNew.length),
      constraints,
    };
  }

  const primaryClips = availableNew.filter((c) => {
    const d = Number(c.duration_seconds || 0);
    return d >= constraints.primaryMin && d <= constraints.primaryMax;
  });
  const sprinkleClips = availableNew.filter((c) => {
    const d = Number(c.duration_seconds || 0);
    return d > 0 && d < constraints.sprinkleMax;
  });

  const primaryMissing = Math.max(0, constraints.primaryTarget - primaryClips.length);
  const sprinkleMissing = Math.max(0, constraints.sprinkleTarget - sprinkleClips.length);
  const totalMissing = Math.max(0, numToAdd - availableNew.length);

  return {
    satisfied: totalMissing === 0 && primaryMissing === 0 && sprinkleMissing === 0,
    primaryMissing,
    sprinkleMissing,
    totalMissing,
    constraints,
  };
}

function saveAudioBufferLocally(clipId: string, wavBuffer: Buffer): string {
  const relPath = `audio/clip_${clipId}.wav`;
  const audioDirs = [
    path.join(process.cwd(), 'public', 'audio'),
    path.join(process.cwd(), 'app', 'public', 'audio'),
    path.join(__dirname, '../dist/audio'),
    path.join(__dirname, '../public/audio'),
  ];
  const uniqueDirs = Array.from(new Set(audioDirs.map((d) => path.resolve(d))));
  for (const dir of uniqueDirs) {
    if (fs.existsSync(path.dirname(dir))) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `clip_${clipId}.wav`), wavBuffer);
      } catch {}
    }
  }
  return relPath;
}

async function downloadAndEnrichFromHuggingFace(
  neededCount: number,
  constraints: ReturnType<typeof getBandConstraints>,
  existingIds: Set<string>,
  existingTexts: Set<string>,
  startLessonNum: number
): Promise<Record<string, any>[]> {
  // Download enough clips to satisfy the current requirement + 15 extra buffer clips for future offline reserve
  const targetDownloadCount = Math.max(neededCount + 15, 20);
  const rawCandidates: Array<{
    clip_id: string;
    shona_text: string;
    audio_src: string;
    duration_seconds: number;
    dataset_source: string;
  }> = [];

  const datasetsToQuery = [
    {
      repo: 'takuM23/shona-vibevoice-corpus',
      config: 'default',
      split: 'train',
      offsets: [300, 400, 500, 600, 700, 200],
    },
    {
      repo: 'manassehzw/sna-manasseh-150-raw',
      config: 'default',
      split: 'train',
      offsets: [0, 100],
    },
    {
      repo: 'nigeLbasa/inzwi-shona-sample',
      config: 'default',
      split: 'train',
      offsets: [0],
    },
  ];

  emitGenerationProgress(8, 'Connecting to Hugging Face Shona audio datasets...');

  for (const ds of datasetsToQuery) {
    if (rawCandidates.length >= targetDownloadCount) break;
    for (const offset of ds.offsets) {
      if (rawCandidates.length >= targetDownloadCount) break;
      try {
        const apiUrl = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(
          ds.repo
        )}&config=${ds.config}&split=${ds.split}&offset=${offset}&length=100`;
        const buf = await fetchHttpsBuffer(apiUrl, 15000);
        const json = JSON.parse(buf.toString('utf-8'));
        const rows = Array.isArray(json.rows) ? json.rows : [];

        for (const r of rows) {
          if (rawCandidates.length >= targetDownloadCount) break;
          const row = r.row || {};
          const rowIdx = r.row_idx ?? Math.floor(Math.random() * 100000);
          const transcript = String(
            row.text || row.sentence || row.transcription || row.transcript || ''
          ).trim();
          if (!isValidZezuruTranscript(transcript)) continue;

          const normText = normalizeTextKey(transcript);
          if (existingTexts.has(normText)) continue;

          const audioField = row.audio || row.file || row.sound;
          let audioSrc = '';
          if (Array.isArray(audioField) && audioField.length > 0 && audioField[0]?.src) {
            audioSrc = String(audioField[0].src);
          } else if (audioField && typeof audioField === 'object' && audioField.src) {
            audioSrc = String(audioField.src);
          }
          if (!audioSrc) continue;

          const shortRepo = ds.repo.split('/')[1].replace(/[^a-z0-9]/gi, '_').slice(0, 14);
          const clipId = `hf_${shortRepo}_${rowIdx}`;
          if (existingIds.has(clipId)) continue;

          const wordCount = transcript.split(/\s+/).filter(Boolean).length;
          const estDur = Number(
            (row.duration || row.duration_seconds || Math.max(2.5, wordCount * 0.48)).toFixed(2)
          );
          if (estDur > 120.0) continue;

          rawCandidates.push({
            clip_id: clipId,
            shona_text: transcript,
            audio_src: audioSrc,
            duration_seconds: estDur,
            dataset_source: ds.repo,
          });
          existingIds.add(clipId);
          existingTexts.add(normText);
        }
      } catch (err) {
        console.warn(`HF fetch warning for ${ds.repo} offset ${offset}:`, err);
      }
    }
  }

  const enrichedResults: Record<string, any>[] = [];
  const totalToProcess = rawCandidates.length;

  for (let i = 0; i < totalToProcess; i++) {
    const item = rawCandidates[i];
    const fetchPct = 12 + Math.round(((i + 1) / Math.max(1, totalToProcess)) * 35);
    emitGenerationProgress(
      fetchPct,
      `Fetching audio ${i + 1}/${totalToProcess} (${item.clip_id})...`
    );

    try {
      const wavBuf = await fetchHttpsBuffer(item.audio_src, 20000);
      if (wavBuf.length < 200) continue;
      const realDuration = parseWavDurationSeconds(wavBuf) || item.duration_seconds;
      if (realDuration > 120.0) continue;

      const localAudioUrl = saveAudioBufferLocally(item.clip_id, wavBuf);

      const enrichPct = 47 + Math.round(((i + 1) / Math.max(1, totalToProcess)) * 35);
      emitGenerationProgress(
        enrichPct,
        `Enriching Lesson ${startLessonNum + enrichedResults.length} translation, grammar & cultural notes (${i + 1}/${totalToProcess})...`
      );

      const enriched = await enrichClipObject(
        {
          clip_id: item.clip_id,
          audio_url: localAudioUrl,
          duration_seconds: realDuration,
          shona_text: item.shona_text,
          dataset_source: item.dataset_source,
          speaker_id: 'zezuru_hf',
        },
        startLessonNum + enrichedResults.length,
        0
      );

      enrichedResults.push(enriched);
    } catch (err) {
      console.warn(`Failed to download/enrich ${item.clip_id}:`, err);
    }
  }

  return enrichedResults;
}

function selectBatchByBandAndPedagogy(
  sourcePool: Record<string, any>[],
  startLessonNum: number,
  numToAdd: number
): Record<string, any>[] {
  const constraints = getBandConstraints(startLessonNum, numToAdd);
  const sortByPedagogyAndLength = (a: Record<string, any>, b: Record<string, any>) => {
    const diffA = Number(a.difficulty_score || 0);
    const diffB = Number(b.difficulty_score || 0);
    const durA = Number(a.duration_seconds || 0);
    const durB = Number(b.duration_seconds || 0);
    return durA * 1.5 + diffA * 0.5 - (durB * 1.5 + diffB * 0.5);
  };

  if (constraints.bandIdx >= 6) {
    const buckets = [
      sourcePool.filter((c) => Number(c.duration_seconds || 0) < 15).sort(sortByPedagogyAndLength),
      sourcePool
        .filter((c) => Number(c.duration_seconds || 0) >= 15 && Number(c.duration_seconds || 0) < 30)
        .sort(sortByPedagogyAndLength),
      sourcePool
        .filter((c) => Number(c.duration_seconds || 0) >= 30 && Number(c.duration_seconds || 0) < 50)
        .sort(sortByPedagogyAndLength),
      sourcePool
        .filter((c) => Number(c.duration_seconds || 0) >= 50 && Number(c.duration_seconds || 0) < 80)
        .sort(sortByPedagogyAndLength),
      sourcePool
        .filter((c) => Number(c.duration_seconds || 0) >= 80 && Number(c.duration_seconds || 0) <= 120)
        .sort(sortByPedagogyAndLength),
    ];
    const perBucket = Math.max(1, Math.floor(numToAdd / buckets.length));
    const pickedIds = new Set<string>();
    const chosen: Record<string, any>[] = [];
    for (const b of buckets) {
      for (const item of b.slice(0, perBucket)) {
        if (!pickedIds.has(item.clip_id)) {
          chosen.push(item);
          pickedIds.add(item.clip_id);
        }
      }
    }
    const rem = sourcePool.filter((c) => !pickedIds.has(c.clip_id)).sort(sortByPedagogyAndLength);
    chosen.push(...rem.slice(0, Math.max(0, numToAdd - chosen.length)));
    return chosen.sort(sortByPedagogyAndLength);
  }

  const { primaryMin, primaryMax, sprinkleMax, primaryTarget, sprinkleTarget } = constraints;

  const primaryList = sourcePool
    .filter((c) => {
      const d = Number(c.duration_seconds || 0);
      return d >= primaryMin && d <= primaryMax;
    })
    .sort(sortByPedagogyAndLength);

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
    chosenPrimary.sort(sortByPedagogyAndLength);
  }

  const sprinkleList = sourcePool
    .filter((c) => !pickedIds.has(c.clip_id) && Number(c.duration_seconds || 0) < sprinkleMax)
    .sort(sortByPedagogyAndLength);

  const chosenSprinkle = sprinkleList.slice(0, sprinkleTarget);
  for (const sc of chosenSprinkle) pickedIds.add(sc.clip_id);

  while (chosenPrimary.length + chosenSprinkle.length < numToAdd) {
    const rem = sourcePool.find((c) => !pickedIds.has(c.clip_id));
    if (!rem) break;
    chosenPrimary.push(rem);
    pickedIds.add(rem.clip_id);
  }

  const totalCount = chosenPrimary.length + chosenSprinkle.length;
  const allPositions = Array.from({ length: totalCount }, (_, idx) => idx);
  for (let i = allPositions.length - 1; i > 0; i--) {
    const j = (startLessonNum * 31 + i * 17) % (i + 1);
    [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
  }
  const sprinklePos = new Set(allPositions.slice(0, chosenSprinkle.length));
  const orderedCandidates: Record<string, any>[] = [];
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
  return orderedCandidates;
}

function loadActiveCourseObject(): { course: Record<string, any>; expandedPath: string; baseCoursePath: string | null } {
  const expandedPath = getExpandedCoursePath();
  const baseCoursePath = resolvePublicAssetPath('course_data.json');
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
    throw new Error('Could not load course_data.json');
  }
  return { course: currentCourse, expandedPath, baseCoursePath };
}

function persistModifiedCourse(course: Record<string, any>, modifiedLessonNum?: number) {
  const expandedPath = getExpandedCoursePath();
  course.generated_at = new Date().toISOString();
  course.total_lessons = course.lessons.length;
  course.regular_lessons_count = course.lessons.filter((l: any) => l.type !== 'review').length;
  course.review_lessons_count = course.lessons.filter((l: any) => l.type === 'review').length;

  // Save to expanded course path if > 100 lessons or if expanded file already exists
  if (course.lessons.length > 100 || fs.existsSync(expandedPath)) {
    fs.writeFileSync(expandedPath, JSON.stringify(course, null, 2), 'utf-8');
  }

  // If a base lesson (1..100) was modified in Dev Mode, also persist to base course_data.json files
  if (modifiedLessonNum && modifiedLessonNum <= 100) {
    const baseCoursePaths = getAllPublicAssetPaths('course_data.json');
    const baseCourseSlice = {
      ...course,
      total_lessons: Math.min(100, course.lessons.length),
      regular_lessons_count: course.lessons.slice(0, 100).filter((l: any) => l.type !== 'review').length,
      review_lessons_count: course.lessons.slice(0, 100).filter((l: any) => l.type === 'review').length,
      lessons: course.lessons.slice(0, 100),
    };
    for (const bp of baseCoursePaths) {
      try {
        fs.writeFileSync(bp, JSON.stringify(baseCourseSlice, null, 2), 'utf-8');
      } catch {}
    }
  }
}

function updateAffectedSevenLessonReview(allLessons: Record<string, any>[], modifiedLessonNum: number) {
  const reviewLessonNum = Math.ceil(modifiedLessonNum / 7) * 7;
  const reviewIdx = allLessons.findIndex(
    (l) => Number(l.lesson_number || l.num) === reviewLessonNum
  );
  if (reviewIdx >= 0 && allLessons[reviewIdx].type === 'review') {
    const startIdx = Math.max(0, reviewIdx - 6);
    const sevenSlice = allLessons.slice(startIdx, reviewIdx + 1);
    const revData = buildReviewForSevenLessons(sevenSlice, reviewLessonNum);
    allLessons[reviewIdx].review_summary = revData.review_summary;
    allLessons[reviewIdx].key_noun_classes_covered = revData.key_noun_classes_covered;
    allLessons[reviewIdx].review_exercises = revData.review_exercises;
    allLessons[reviewIdx].reviewed_lessons = revData.reviewed_lessons;
  }
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

    fs.writeFileSync(storagePath, serialized, 'utf-8');
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
    emitGenerationProgress(2, 'Checking local audio reserve pool & duration bands...');

    const { course: currentCourse, expandedPath } = loadActiveCourseObject();
    const poolPath = resolvePublicAssetPath('expansion_pool.json');
    if (!poolPath || !fs.existsSync(poolPath)) {
      throw new Error('Could not locate expansion_pool.json');
    }

    let poolLessons: Record<string, any>[] = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
    const existingIds = new Set<string>(
      currentCourse.lessons.map((l: any) => String(l.clip_id || '')).filter(Boolean)
    );
    const existingTexts = new Set<string>(
      currentCourse.lessons
        .map((l: any) => normalizeTextKey(String(l.shona_text || '')))
        .filter(Boolean)
    );

    let availableNew = poolLessons.filter(
      (item) =>
        !existingIds.has(String(item.clip_id || '')) &&
        !existingTexts.has(normalizeTextKey(String(item.shona_text || ''))) &&
        Number(item.duration_seconds || 0) <= 120.0
    );

    const startLessonNum = currentCourse.lessons.length + 1;
    const bandEval = evaluateReservePoolForBatch(availableNew, startLessonNum, numToAdd);

    if (!bandEval.satisfied) {
      const isOnline = await checkHuggingFaceConnection();
      if (!isOnline) {
        if (availableNew.length < numToAdd) {
          emitGenerationProgress(0, '');
          return {
            error: 'INSUFFICIENT_OFFLINE_RESERVE',
            remaining: availableNew.length,
            required: numToAdd,
          };
        }
      } else {
        const missingCount = Math.max(
          bandEval.totalMissing,
          bandEval.primaryMissing + bandEval.sprinkleMissing
        );
        const allPoolIds = new Set<string>([
          ...existingIds,
          ...poolLessons.map((p) => String(p.clip_id || '')),
        ]);
        const allPoolTexts = new Set<string>([
          ...existingTexts,
          ...poolLessons.map((p) => normalizeTextKey(String(p.shona_text || ''))),
        ]);

        const newlyDownloaded = await downloadAndEnrichFromHuggingFace(
          missingCount,
          bandEval.constraints,
          allPoolIds,
          allPoolTexts,
          startLessonNum
        );

        if (newlyDownloaded.length > 0) {
          poolLessons = [...poolLessons, ...newlyDownloaded];
          for (const pPath of getAllPublicAssetPaths('expansion_pool.json')) {
            try {
              fs.writeFileSync(pPath, JSON.stringify(poolLessons, null, 2), 'utf-8');
            } catch {}
          }
          availableNew = poolLessons.filter(
            (item) =>
              !existingIds.has(String(item.clip_id || '')) &&
              !existingTexts.has(normalizeTextKey(String(item.shona_text || ''))) &&
              Number(item.duration_seconds || 0) <= 120.0
          );
        }

        if (availableNew.length < numToAdd) {
          emitGenerationProgress(0, '');
          return {
            error: 'INSUFFICIENT_OFFLINE_RESERVE',
            remaining: availableNew.length,
            required: numToAdd,
          };
        }
      }
    }

    emitGenerationProgress(
      55,
      `Selecting & ordering ${numToAdd} lessons by duration band & pedagogical complexity...`
    );

    const orderedCandidates = selectBatchByBandAndPedagogy(
      availableNew,
      startLessonNum,
      numToAdd
    );

    const selectedBatch: Record<string, any>[] = [];
    for (let i = 0; i < numToAdd; i++) {
      const candidate = orderedCandidates[i];
      if (!candidate) break;
      const copy = JSON.parse(JSON.stringify(candidate));

      // Verify enrichment completeness on every selected lesson
      const needsEnrich =
        !copy.english_translation ||
        normalizeTextKey(copy.english_translation) === normalizeTextKey(copy.shona_text) ||
        !Array.isArray(copy.grammar_notes) ||
        copy.grammar_notes.length === 0 ||
        !Array.isArray(copy.cultural_notes) ||
        copy.cultural_notes.length === 0 ||
        !Array.isArray(copy.active_exercises) ||
        copy.active_exercises.length === 0;

      const lessonNum = startLessonNum + i;
      const stepPct = 60 + Math.round(((i + 1) / numToAdd) * 32);
      emitGenerationProgress(
        stepPct,
        `Preparing Lesson ${lessonNum} (${i + 1}/${numToAdd}): verifying grammar, cultural notes & exercises...`
      );

      const verifiedClip = needsEnrich
        ? await enrichClipObject(copy, lessonNum, 0)
        : copy;

      selectedBatch.push(verifiedClip);
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
        phase: nextNum >= activeWaveStart ? 'active' : 'passive',
        active_wave_review_lesson: nextNum >= activeWaveStart ? nextNum - (activeWaveStart - 1) : null,
        title: isReviewSlot
          ? `Chidzidzo ${nextNum}: ${previewWords} (Dzokororo ${reviewBlockNum})`
          : `Chidzidzo ${nextNum}: ${previewWords}`,
      };

      allLessons.push(newLesson);

      if (isReviewSlot) {
        emitGenerationProgress(
          94,
          `Synthesizing Unit ${reviewBlockNum} Review (Lessons ${nextNum - 6}–${nextNum})...`
        );
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

    emitGenerationProgress(98, 'Saving expanded course data...');

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
    emitGenerationProgress(100, `Added ${selectedBatch.length} new lessons!`);
    return updatedCourse;
  } catch (err) {
    console.error('Failed to generate +50 lessons:', err);
    emitGenerationProgress(0, '');
    return null;
  }
});

// Dev Mode IPC Handlers
ipcMain.handle('verify-dev-password', async (_event, passwordInput: string) => {
  const expected = readDevModePassword();
  return String(passwordInput || '').trim() === expected;
});

ipcMain.handle('remove-last-50-lessons', async () => {
  try {
    const { course: currentCourse, expandedPath, baseCoursePath } = loadActiveCourseObject();
    if (currentCourse.lessons.length <= 100) {
      if (fs.existsSync(expandedPath)) {
        try {
          fs.unlinkSync(expandedPath);
        } catch {}
      }
      return currentCourse;
    }

    const newTargetLen = Math.max(100, currentCourse.lessons.length - 50);
    const trimmedLessons = currentCourse.lessons.slice(0, newTargetLen);

    if (newTargetLen <= 100) {
      if (fs.existsSync(expandedPath)) {
        try {
          fs.unlinkSync(expandedPath);
        } catch {}
      }
      if (baseCoursePath && fs.existsSync(baseCoursePath)) {
        return JSON.parse(fs.readFileSync(baseCoursePath, 'utf-8'));
      }
    }

    const updatedCourse = {
      ...currentCourse,
      generated_at: new Date().toISOString(),
      total_lessons: trimmedLessons.length,
      regular_lessons_count: trimmedLessons.filter((l: any) => l.type !== 'review').length,
      review_lessons_count: trimmedLessons.filter((l: any) => l.type === 'review').length,
      lessons: trimmedLessons,
    };

    fs.writeFileSync(expandedPath, JSON.stringify(updatedCourse, null, 2), 'utf-8');
    return updatedCourse;
  } catch (err) {
    console.error('Failed to remove last 50 lessons:', err);
    return null;
  }
});

ipcMain.handle('dev-fix-lesson', async (_event, lessonNumber: number) => {
  try {
    const { course } = loadActiveCourseObject();
    const idx = course.lessons.findIndex(
      (l: any) => Number(l.lesson_number || l.num) === Number(lessonNumber)
    );
    if (idx < 0) return null;

    const oldLesson = course.lessons[idx];
    const nextSeed = Number(oldLesson.variation_seed || 0) + 1;
    const reEnriched = await enrichClipObject(oldLesson, Number(lessonNumber), nextSeed);

    const updatedLesson: Record<string, any> = {
      ...oldLesson,
      ...reEnriched,
      lesson_number: oldLesson.lesson_number,
      title: oldLesson.title,
      type: oldLesson.type,
      phase: oldLesson.phase,
      active_wave_review_lesson: oldLesson.active_wave_review_lesson,
      variation_seed: nextSeed,
    };

    course.lessons[idx] = updatedLesson;
    updateAffectedSevenLessonReview(course.lessons, Number(lessonNumber));
    persistModifiedCourse(course, Number(lessonNumber));
    return course;
  } catch (err) {
    console.error('Failed in dev-fix-lesson:', err);
    return null;
  }
});

ipcMain.handle('dev-regenerate-lesson', async (_event, lessonNumber: number) => {
  try {
    const { course } = loadActiveCourseObject();
    const idx = course.lessons.findIndex(
      (l: any) => Number(l.lesson_number || l.num) === Number(lessonNumber)
    );
    if (idx < 0) return null;

    const oldLesson = course.lessons[idx];
    const oldClipId = String(oldLesson.clip_id || '');
    const oldAudioUrl = String(oldLesson.audio_url || '');

    // 1. Delete old sub-standard audio file from disk
    if (oldAudioUrl) {
      for (const p of getAllPublicAssetPaths(oldAudioUrl)) {
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      }
    }

    // 2. Remove old clip from expansion_pool.json
    const poolPath = resolvePublicAssetPath('expansion_pool.json');
    let poolLessons: Record<string, any>[] =
      poolPath && fs.existsSync(poolPath)
        ? JSON.parse(fs.readFileSync(poolPath, 'utf-8'))
        : [];
    poolLessons = poolLessons.filter((p) => String(p.clip_id || '') !== oldClipId);

    const existingIds = new Set<string>(
      course.lessons.map((l: any) => String(l.clip_id || '')).filter(Boolean)
    );
    const existingTexts = new Set<string>(
      course.lessons
        .map((l: any) => normalizeTextKey(String(l.shona_text || '')))
        .filter(Boolean)
    );

    const constraints = getBandConstraints(Number(lessonNumber), 50);
    let candidateReplacement = poolLessons.find((item) => {
      const d = Number(item.duration_seconds || 0);
      return (
        !existingIds.has(String(item.clip_id || '')) &&
        !existingTexts.has(normalizeTextKey(String(item.shona_text || ''))) &&
        d >= constraints.primaryMin &&
        d <= constraints.primaryMax
      );
    });

    if (!candidateReplacement) {
      candidateReplacement = poolLessons.find(
        (item) =>
          !existingIds.has(String(item.clip_id || '')) &&
          !existingTexts.has(normalizeTextKey(String(item.shona_text || '')))
      );
    }

    if (!candidateReplacement) {
      const isOnline = await checkHuggingFaceConnection();
      if (isOnline) {
        const downloaded = await downloadAndEnrichFromHuggingFace(
          1,
          constraints,
          existingIds,
          existingTexts,
          Number(lessonNumber)
        );
        if (downloaded.length > 0) {
          candidateReplacement = downloaded[0];
        }
      }
    }

    if (!candidateReplacement) {
      throw new Error('No replacement clip available in reserve pool or online.');
    }

    // Remove the picked replacement from expansion_pool.json if it came from there, and persist expansion_pool.json
    for (const pPath of getAllPublicAssetPaths('expansion_pool.json')) {
      try {
        fs.writeFileSync(pPath, JSON.stringify(poolLessons, null, 2), 'utf-8');
      } catch {}
    }

    const enrichedReplacement = await enrichClipObject(
      candidateReplacement,
      Number(lessonNumber),
      0
    );

    const words = String(enrichedReplacement.shona_text || '').split(/\s+/).filter(Boolean);
    const previewWords = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
    const isReviewSlot = Number(lessonNumber) % 7 === 0;
    const reviewBlockNum = Math.floor(Number(lessonNumber) / 7);

    course.lessons[idx] = {
      ...enrichedReplacement,
      lesson_number: Number(lessonNumber),
      type: oldLesson.type,
      phase: oldLesson.phase,
      active_wave_review_lesson: oldLesson.active_wave_review_lesson,
      title: isReviewSlot
        ? `Chidzidzo ${lessonNumber}: ${previewWords} (Dzokororo ${reviewBlockNum})`
        : `Chidzidzo ${lessonNumber}: ${previewWords}`,
    };

    updateAffectedSevenLessonReview(course.lessons, Number(lessonNumber));
    persistModifiedCourse(course, Number(lessonNumber));
    return course;
  } catch (err) {
    console.error('Failed in dev-regenerate-lesson:', err);
    return null;
  }
});

ipcMain.handle(
  'dev-regenerate-field',
  async (
    _event,
    payload: {
      lessonNumber: number;
      field: 'translation' | 'grammar_notes' | 'cultural_notes' | 'exercises';
    }
  ) => {
    try {
      const { lessonNumber, field } = payload;
      const { course } = loadActiveCourseObject();
      const idx = course.lessons.findIndex(
        (l: any) => Number(l.lesson_number || l.num) === Number(lessonNumber)
      );
      if (idx < 0) return null;

      const lesson = course.lessons[idx];
      const nextSeed = Number(lesson.variation_seed || 0) + 1;
      lesson.variation_seed = nextSeed;

      const shonaText = String(lesson.shona_text || '');
      const engText = String(lesson.english_translation || '');

      if (field === 'translation') {
        const { englishTranslation, dialogue } = await resolveIdiomaticTranslationAndDialogue(
          shonaText,
          nextSeed
        );
        lesson.english_translation = englishTranslation;
        lesson.dialogue = dialogue;
      } else if (field === 'grammar_notes') {
        lesson.grammar_notes = generateTextbookGrammarNotes(
          shonaText,
          engText,
          Number(lessonNumber),
          nextSeed
        );
      } else if (field === 'cultural_notes') {
        lesson.cultural_notes = generateTextbookCulturalNotes(
          shonaText,
          engText,
          Number(lessonNumber),
          nextSeed
        );
      } else if (field === 'exercises') {
        const words = shonaText.split(/\s+/).filter(Boolean);
        const gloss = Array.isArray(lesson.literal_gloss)
          ? lesson.literal_gloss
          : words.map((w) => analyzeMorphemesAndClass(w));
        lesson.active_exercises = generateContextualExercises(
          shonaText,
          engText,
          Number(lessonNumber),
          lesson.grammar_notes || [],
          gloss,
          nextSeed
        );
      }

      course.lessons[idx] = lesson;
      updateAffectedSevenLessonReview(course.lessons, Number(lessonNumber));
      persistModifiedCourse(course, Number(lessonNumber));
      return course;
    } catch (err) {
      console.error('Failed in dev-regenerate-field:', err);
      return null;
    }
  }
);

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
