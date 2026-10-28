"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const enricher_1 = require("./enricher");
let mainWindow = null;
function getStoragePath() {
    const userDataDir = electron_1.app.getPath('userData');
    return path_1.default.join(userDataDir, 'user_progress.json');
}
function getExpandedCoursePath() {
    const userDataDir = electron_1.app.getPath('userData');
    return path_1.default.join(userDataDir, 'course_data_expanded.json');
}
function getWorkspaceBackupPath() {
    // Save to workspace root for transparent inspection
    return path_1.default.join(process.cwd(), 'user_progress.json');
}
function getDevModePassword() {
    if (process.env.DEV_MODE_PASSWORD)
        return process.env.DEV_MODE_PASSWORD;
    const envCandidates = [
        path_1.default.join(process.cwd(), '.env'),
        path_1.default.join(process.cwd(), 'app', '.env'),
        path_1.default.join(__dirname, '../.env'),
        path_1.default.join(__dirname, '../../.env'),
        path_1.default.join(electron_1.app.getAppPath(), '.env'),
    ];
    for (const envPath of envCandidates) {
        if (fs_1.default.existsSync(envPath)) {
            try {
                const content = fs_1.default.readFileSync(envPath, 'utf-8');
                for (const line of content.split('\n')) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('DEV_MODE_PASSWORD=')) {
                        return trimmed.split('=')[1].trim();
                    }
                }
            }
            catch { }
        }
    }
    return 'shona_dev_pass';
}
function sendExpansionProgress(percent, statusText, details) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('expansion-progress', {
            percent,
            statusText,
            ...details,
        });
    }
}
function getDownloadedPoolPath() {
    const userDataDir = electron_1.app.getPath('userData');
    return path_1.default.join(userDataDir, 'expansion_pool_downloaded.json');
}
const PREFIX_RULES = [
    ['ndiriku', 'ndiri (I am) + ku- (doing)', 'Present Progressive (I am ...-ing)', 'I am'],
    ['uriku', 'uri (you are) + ku- (doing)', 'Present Progressive (you are ...-ing)', 'you are'],
    ['ariku', 'ari (he/she is) + ku- (doing)', 'Present Progressive (he/she is ...-ing)', 'he/she is'],
    ['tiriku', 'tiri (we are) + ku- (doing)', 'Present Progressive (we are ...-ing)', 'we are'],
    ['variku', 'vari (they are) + ku- (doing)', 'Present Progressive (they are ...-ing)', 'they are'],
    ['zviriku', 'zviri (they are) + ku- (doing)', 'Present Progressive (things are ...-ing)', 'they are'],
    ['ndino', 'ndi- (I) + -no- (present)', 'Present Tense Verb (I ...)', 'I'],
    ['ndiri', 'ndi- (I) + -ri (am)', 'Present Helper Verb (I am)', 'I am'],
    ['ndicha', 'ndi- (I) + -cha- (will)', 'Future Tense Verb (I will ...)', 'I will'],
    ['ndaka', 'nda- (I) + -ka- (past)', 'Past Tense Verb (I did ...)', 'I (past)'],
    ['tino', 'ti- (we) + -no- (present)', 'Present Tense Verb (we ...)', 'we'],
    ['ticha', 'ti- (we) + -cha- (will)', 'Future Tense Verb (we will ...)', 'we will'],
    ['vano', 'va- (they) + -no- (present)', 'Present Tense Verb (they ...)', 'they'],
    ['vaka', 'va- (they) + -ka- (past)', 'Past Tense Verb (they did ...)', 'they (past)'],
    ['vari', 'va- (they) + -ri (are)', 'Present Helper Verb (they are)', 'they are'],
    ['ano', 'a- (he/she) + -no- (present)', 'Present Tense Verb (he/she ...)', 'he/she'],
    ['aka', 'a- (he/she) + -ka- (past)', 'Past Tense Verb (he/she ...)', 'he/she (past)'],
    ['ari', 'a- (he/she) + -ri (is)', 'Present Helper Verb (he/she is)', 'he/she is'],
    ['ino', 'i- (it) + -no- (present)', 'Present Tense Verb (it ...)', 'it'],
    ['iri', 'i- (it) + -ri (is)', 'Present Helper Verb (it is)', 'it is'],
    ['zvi', 'zvi- (plural things prefix)', 'Plural Noun / Verb Prefix (zvi-)', 'things'],
    ['chi', 'chi- (singular thing prefix)', 'Singular Noun / Verb Prefix (chi-)', 'thing'],
    ['ma', 'ma- (plural prefix)', 'Plural Noun Prefix (ma-)', 'plural'],
    ['mu', 'mu- (singular person or "in")', 'Prefix (mu-)', 'in / singular'],
    ['va', 'va- (plural people prefix)', 'Plural Person Prefix (va-)', 'people'],
    ['ku', 'ku- ("to" infinitive or location)', 'Infinitive / Location Prefix (ku-)', 'to / at'],
    ['pa', 'pa- ("on / at" location prefix)', 'Location Prefix (pa-)', 'on / at'],
    ['ne', 'ne- ("and / with" prefix)', 'Connecting Prefix (ne-)', 'and / with'],
];
function buildGlossBreakdown(text) {
    const words = text.split(/\s+/).map((w) => w.replace(/[.,?!:;"'()]/g, '')).filter(Boolean);
    const items = [];
    for (const w of words.slice(0, 16)) {
        const lower = w.toLowerCase();
        let matched = false;
        for (const [pfx, morph, cat, lit] of PREFIX_RULES) {
            if (lower.startsWith(pfx)) {
                items.push({
                    shona_word: w,
                    morpheme_breakdown: `${morph} + ${w.slice(pfx.length) || 'stem'}`,
                    noun_class_or_concord: cat,
                    literal_english: `${lit} ...`,
                    tone_pattern: 'L-H',
                });
                matched = true;
                break;
            }
        }
        if (!matched) {
            items.push({
                shona_word: w,
                morpheme_breakdown: `${w} (lexical item)`,
                noun_class_or_concord: 'General Vocabulary',
                literal_english: w,
                tone_pattern: 'L-H',
            });
        }
    }
    return items;
}
async function downloadAndEnrichFromHuggingFace(neededCount, existingIds, existingTexts, offsetStart = 300, startLessonNumber = 1) {
    const rawClips = [];
    const limitPerReq = 100;
    let currentOffset = offsetStart;
    sendExpansionProgress(20, 'Local reserve pool depleted. Connecting to Hugging Face online...');
    while (rawClips.length < neededCount && currentOffset < 5000) {
        const url = `https://datasets-server.huggingface.co/rows?dataset=takuM23/shona-vibevoice-corpus&config=default&split=train&offset=${currentOffset}&length=${limitPerReq}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) {
            throw new Error(`Hugging Face datasets-server returned HTTP ${resp.status}`);
        }
        const data = await resp.json();
        const rows = Array.isArray(data.rows) ? data.rows : [];
        if (rows.length === 0)
            break;
        sendExpansionProgress(Math.min(26, 20 + Math.round((rawClips.length / neededCount) * 6)), `Streaming audio clips from Hugging Face dataset (${rawClips.length}/${neededCount})...`);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i].row;
            const rawText = String(r.text || '').trim();
            if (!rawText || rawText.length < 15)
                continue;
            const normText = rawText.toLowerCase();
            if (existingTexts.has(normText))
                continue;
            const clipId = `hf_vv_${currentOffset}_${i}`;
            if (existingIds.has(clipId))
                continue;
            let duration = typeof r.audio_duration === 'number' ? r.audio_duration : 0;
            if (!duration && r.audio && r.audio[0] && r.audio[0].src) {
                duration = Math.max(3.5, Math.min(120.0, Math.round((rawText.length / 13.0) * 10) / 10));
            }
            if (duration > 120.0)
                continue;
            const audioSrc = r.audio && r.audio[0] ? r.audio[0].src : null;
            rawClips.push({
                clip_id: clipId,
                shona_text: rawText,
                duration_seconds: duration,
                audio_url: audioSrc || `/audio/clip_${clipId}.wav`,
            });
            existingIds.add(clipId);
            existingTexts.add(normText);
            if (rawClips.length >= neededCount)
                break;
        }
        currentOffset += limitPerReq;
    }
    // Explicit post-download enrichment step using pipeline/enrich.py or built-in textbook enricher
    const enrichedClips = await (0, enricher_1.enrichClipsWithPythonOrFallback)(rawClips, startLessonNumber, (percent, msg) => sendExpansionProgress(percent, msg));
    return enrichedClips;
}
function resolvePublicAssetPath(filename) {
    const candidates = [
        path_1.default.join(process.cwd(), 'public', filename),
        path_1.default.join(process.cwd(), 'app', 'public', filename),
        path_1.default.join(__dirname, '../dist', filename),
        path_1.default.join(__dirname, '../public', filename),
    ];
    for (const cand of candidates) {
        if (fs_1.default.existsSync(cand)) {
            return cand;
        }
    }
    return null;
}
function buildReviewForSevenLessons(sevenLessons, reviewLessonNum) {
    const blockIdx = Math.floor(reviewLessonNum / 7);
    const startNum = Math.max(1, reviewLessonNum - 6);
    const rangeStr = `Lessons ${startNum}–${reviewLessonNum}`;
    const vocabPoints = [];
    const grammarPoints = [];
    const culturePoints = [];
    const topicsCovered = [];
    const collectedExercises = [];
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
            if (ct)
                culturePoints.push(`${ct}: ${firstSent}`);
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
        }
        else {
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
electron_1.ipcMain.handle('get-expanded-course', async () => {
    try {
        const expandedPath = getExpandedCoursePath();
        if (fs_1.default.existsSync(expandedPath)) {
            const raw = JSON.parse(fs_1.default.readFileSync(expandedPath, 'utf-8'));
            if (raw && Array.isArray(raw.lessons) && raw.lessons.length >= 100) {
                return raw;
            }
        }
    }
    catch (err) {
        console.error('Failed to load expanded course:', err);
    }
    return null;
});
electron_1.ipcMain.handle('verify-dev-password', async (_event, password) => {
    const expected = getDevModePassword();
    return typeof password === 'string' && password.trim() === expected.trim();
});
electron_1.ipcMain.handle('generate-more-lessons', async (_event, count = 50) => {
    try {
        sendExpansionProgress(5, 'Initializing lesson expansion pipeline...');
        const numToAdd = typeof count === 'number' && count > 0 ? count : 50;
        const expandedPath = getExpandedCoursePath();
        const baseCoursePath = resolvePublicAssetPath('course_data.json');
        const poolPath = resolvePublicAssetPath('expansion_pool.json');
        let currentCourse = null;
        if (fs_1.default.existsSync(expandedPath)) {
            try {
                const expData = JSON.parse(fs_1.default.readFileSync(expandedPath, 'utf-8'));
                if (expData && Array.isArray(expData.lessons) && expData.lessons.length >= 100) {
                    currentCourse = expData;
                }
            }
            catch { }
        }
        if (!currentCourse && baseCoursePath) {
            currentCourse = JSON.parse(fs_1.default.readFileSync(baseCoursePath, 'utf-8'));
        }
        if (!currentCourse || !Array.isArray(currentCourse.lessons)) {
            throw new Error('Could not load base course_data.json');
        }
        sendExpansionProgress(15, 'Scanning available audio clips in reserve pool...');
        await new Promise((r) => setTimeout(r, 100));
        // Reserve pool expansion (works 100% offline in standalone .exe and dev)
        if (!poolPath || !fs_1.default.existsSync(poolPath)) {
            throw new Error('Could not locate expansion_pool.json');
        }
        const poolLessons = JSON.parse(fs_1.default.readFileSync(poolPath, 'utf-8'));
        // Merge with any downloaded reserve lessons stored in userData
        const downloadedPath = getDownloadedPoolPath();
        if (fs_1.default.existsSync(downloadedPath)) {
            try {
                const downloadedList = JSON.parse(fs_1.default.readFileSync(downloadedPath, 'utf-8'));
                if (Array.isArray(downloadedList)) {
                    const poolIds = new Set(poolLessons.map((l) => l.clip_id));
                    for (const item of downloadedList) {
                        if (!poolIds.has(item.clip_id)) {
                            poolLessons.push(item);
                            poolIds.add(item.clip_id);
                        }
                    }
                }
            }
            catch { }
        }
        const existingIds = new Set(currentCourse.lessons.map((l) => l.clip_id).filter(Boolean));
        const existingTexts = new Set(currentCourse.lessons.map((l) => String(l.shona_text || '').trim().toLowerCase()).filter(Boolean));
        let availableNew = poolLessons.filter((item) => !existingIds.has(item.clip_id) &&
            !existingTexts.has(String(item.shona_text || '').trim().toLowerCase()) &&
            Number(item.duration_seconds || 0) <= 120.0);
        // If reserve pool has fewer than required lessons, automatically download and enrich from Hugging Face!
        if (availableNew.length < numToAdd) {
            sendExpansionProgress(20, `Local reserve pool has ${availableNew.length} clips. Fetching new audio clips from Hugging Face...`);
            try {
                const needed = Math.max(60, (numToAdd - availableNew.length) + 20);
                const fetchedClips = await downloadAndEnrichFromHuggingFace(needed, existingIds, existingTexts, Math.max(300, currentCourse.lessons.length * 2), currentCourse.lessons.length + 1);
                if (fetchedClips && fetchedClips.length > 0) {
                    poolLessons.push(...fetchedClips);
                    availableNew = poolLessons.filter((item) => !existingIds.has(item.clip_id) &&
                        !existingTexts.has(String(item.shona_text || '').trim().toLowerCase()) &&
                        Number(item.duration_seconds || 0) <= 120.0);
                    // Save to downloaded reserve pool so they persist offline for future sessions
                    try {
                        fs_1.default.writeFileSync(downloadedPath, JSON.stringify(poolLessons, null, 2), 'utf-8');
                    }
                    catch { }
                    sendExpansionProgress(32, `Successfully downloaded ${fetchedClips.length} new clips from Hugging Face!`);
                }
            }
            catch (netErr) {
                console.warn('Hugging Face online streaming encountered error:', netErr);
            }
        }
        // If still insufficient (user is offline / Hugging Face unreachable), show polite notice dialog
        if (availableNew.length < numToAdd) {
            sendExpansionProgress(0, 'Reserve pool below threshold.');
            return {
                error: 'INSUFFICIENT_OFFLINE_RESERVE',
                remaining: availableNew.length,
                required: numToAdd,
                message: `You appear to be offline or Hugging Face is currently unreachable. There are currently only ${availableNew.length} reserve lessons remaining in the offline pool (${numToAdd} required for a new batch). Please verify your internet connection or install an updated audio corpus pack.`,
            };
        }
        sendExpansionProgress(35, `Selecting ${numToAdd} progressive clips (75% progressive + 25% short review)...`);
        await new Promise((r) => setTimeout(r, 120));
        const startLessonNum = currentCourse.lessons.length + 1;
        const bandIdx = Math.max(1, Math.floor((startLessonNum - 1) / 100));
        const sourcePool = availableNew;
        let orderedCandidates = [];
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
            const pickedIds = new Set();
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
        }
        else {
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
            const pickedIds = new Set(chosenPrimary.map((c) => c.clip_id));
            if (chosenPrimary.length < primaryTarget) {
                const midTarget = (primaryMin + primaryMax) / 2;
                const fallbackLonger = sourcePool
                    .filter((c) => !pickedIds.has(c.clip_id) && Number(c.duration_seconds || 0) >= sprinkleMax)
                    .sort((a, b) => Math.abs(Number(a.duration_seconds || 0) - midTarget) -
                    Math.abs(Number(b.duration_seconds || 0) - midTarget));
                for (const fc of fallbackLonger) {
                    if (chosenPrimary.length >= primaryTarget)
                        break;
                    chosenPrimary.push(fc);
                    pickedIds.add(fc.clip_id);
                }
            }
            const sprinkleList = sourcePool
                .filter((c) => !pickedIds.has(c.clip_id) && Number(c.duration_seconds || 0) < sprinkleMax)
                .sort((a, b) => Number(a.difficulty_score || 0) - Number(b.difficulty_score || 0));
            const chosenSprinkle = sprinkleList.slice(0, sprinkleTarget);
            for (const sc of chosenSprinkle)
                pickedIds.add(sc.clip_id);
            while (chosenPrimary.length + chosenSprinkle.length < numToAdd) {
                const rem = sourcePool.find((c) => !pickedIds.has(c.clip_id));
                if (!rem)
                    break;
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
                }
                else if (pIdx < chosenPrimary.length) {
                    orderedCandidates.push(chosenPrimary[pIdx++]);
                }
                else if (sIdx < chosenSprinkle.length) {
                    orderedCandidates.push(chosenSprinkle[sIdx++]);
                }
            }
        }
        sendExpansionProgress(60, 'Assembling Active Wave metadata and translation pairs...');
        await new Promise((r) => setTimeout(r, 120));
        const selectedBatch = [];
        for (let i = 0; i < numToAdd; i++) {
            if (i < orderedCandidates.length) {
                const copy = JSON.parse(JSON.stringify(orderedCandidates[i]));
                if (existingIds.has(copy.clip_id)) {
                    copy.clip_id = `${copy.clip_id}_exp_${currentCourse.lessons.length + i + 1}`;
                }
                selectedBatch.push(copy);
            }
            else if (poolLessons.length > 0) {
                const base = JSON.parse(JSON.stringify(poolLessons[i % poolLessons.length]));
                base.clip_id = `${base.clip_id}_exp_${currentCourse.lessons.length + i + 1}`;
                selectedBatch.push(base);
            }
        }
        const allLessons = [...currentCourse.lessons];
        const activeWaveStart = Number(currentCourse.active_wave_start_lesson || 51);
        sendExpansionProgress(78, 'Synthesizing 7-lesson comprehensive review units and exercises...');
        await new Promise((r) => setTimeout(r, 120));
        for (const rawNew of selectedBatch) {
            const nextNum = allLessons.length + 1;
            const words = String(rawNew.shona_text || '').split(/\s+/).filter(Boolean);
            const previewWords = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
            const isReviewSlot = nextNum % 7 === 0;
            const reviewBlockNum = Math.floor(nextNum / 7);
            const newLesson = {
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
            }
            else {
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
        fs_1.default.writeFileSync(expandedPath, JSON.stringify(updatedCourse, null, 2), 'utf-8');
        sendExpansionProgress(100, `Completed! Lessons 1–${allLessons.length} are now active.`);
        return updatedCourse;
    }
    catch (err) {
        console.error('Failed to generate +50 lessons:', err);
        sendExpansionProgress(0, 'Failed to generate lessons.');
        return null;
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
