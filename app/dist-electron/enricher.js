"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearKnowledgeCache = clearKnowledgeCache;
exports.readEnvValue = readEnvValue;
exports.getGeminiApiKey = getGeminiApiKey;
exports.saveGeminiApiKeyToEnv = saveGeminiApiKeyToEnv;
exports.verifyGeminiApiKey = verifyGeminiApiKey;
exports.callGeminiJson = callGeminiJson;
exports.normalizeTextKey = normalizeTextKey;
exports.isValidZezuruTranscript = isValidZezuruTranscript;
exports.splitShonaSentences = splitShonaSentences;
exports.analyzeMorphemesAndClass = analyzeMorphemesAndClass;
exports.formatWordGlossList = formatWordGlossList;
exports.buildSentenceWordGlossSync = buildSentenceWordGlossSync;
exports.buildSentenceWordGlossAsync = buildSentenceWordGlossAsync;
exports.translateShonaSentenceIdiomatic = translateShonaSentenceIdiomatic;
exports.attachPerSentenceGlossesToDialogue = attachPerSentenceGlossesToDialogue;
exports.resolveIdiomaticTranslationAndDialogue = resolveIdiomaticTranslationAndDialogue;
exports.generateTextbookGrammarNotes = generateTextbookGrammarNotes;
exports.generateTextbookCulturalNotesAsync = generateTextbookCulturalNotesAsync;
exports.generateTextbookCulturalNotes = generateTextbookCulturalNotes;
exports.generateContextualExercises = generateContextualExercises;
exports.generateContextualExercisesAsync = generateContextualExercisesAsync;
exports.generateTextbookGrammarNotesAsync = generateTextbookGrammarNotesAsync;
exports.buildReviewForSevenLessons = buildReviewForSevenLessons;
exports.calculateDifficultyScore = calculateDifficultyScore;
exports.enrichClipObject = enrichClipObject;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
let cachedKnowledge = null;
let runtimeGeminiApiKey = '';
function clearKnowledgeCache() {
    cachedKnowledge = null;
}
function loadTextbookKnowledge() {
    if (cachedKnowledge)
        return cachedKnowledge;
    const candidates = [
        path_1.default.join(process.cwd(), 'public', 'textbook_knowledge.json'),
        path_1.default.join(process.cwd(), 'app', 'public', 'textbook_knowledge.json'),
        path_1.default.join(__dirname, '../dist/textbook_knowledge.json'),
        path_1.default.join(__dirname, '../public/textbook_knowledge.json'),
    ];
    for (const cand of candidates) {
        if (fs_1.default.existsSync(cand)) {
            try {
                cachedKnowledge = JSON.parse(fs_1.default.readFileSync(cand, 'utf-8'));
                return cachedKnowledge;
            }
            catch (e) {
                console.error('Failed to parse textbook_knowledge.json:', e);
            }
        }
    }
    cachedKnowledge = {
        IDIOMATIC_SENTENCE_TRANSLATIONS: {},
        VIBEVOICE_PASSAGE_TRANSLATIONS: [],
        BEGINNER_WORD_GLOSS: {},
        SENTENCE_CULTURAL_NOTES: [],
        THEMATIC_NEW_EXERCISES: [],
        REVIEW_BLOCK_NEW_EXERCISES: {},
    };
    return cachedKnowledge;
}
function readEnvValue(key) {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || path_1.default.dirname(process.execPath);
    const envCandidates = [
        path_1.default.resolve(process.cwd(), '.env'),
        path_1.default.resolve(process.cwd(), '../.env'),
        path_1.default.resolve(portableDir, '.env'),
        path_1.default.resolve(portableDir, '../.env'),
        path_1.default.resolve(portableDir, '../../.env'),
        'c:/Projects/Antigravity/shona-assimil-app/.env',
        'c:/Projects/Antigravity/shona-assimil-app/app/.env',
        path_1.default.resolve(__dirname, '../../.env'),
        path_1.default.resolve(__dirname, '../.env'),
    ];
    for (const envPath of envCandidates) {
        if (fs_1.default.existsSync(envPath)) {
            try {
                const content = fs_1.default.readFileSync(envPath, 'utf-8');
                const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm');
                const match = content.match(regex);
                if (match && match[1] !== undefined) {
                    const val = match[1].trim().replace(/^["']|["']$/g, '');
                    if (val)
                        return val;
                }
            }
            catch { }
        }
    }
    return process.env[key] || '';
}
function getGeminiApiKey() {
    if (runtimeGeminiApiKey)
        return runtimeGeminiApiKey;
    return (readEnvValue('GEMINI_API_KEY') ||
        readEnvValue('VITE_GEMINI_API_KEY') ||
        readEnvValue('GOOGLE_API_KEY') ||
        '');
}
function saveGeminiApiKeyToEnv(apiKey, userDataDir) {
    const cleanKey = String(apiKey || '').trim();
    runtimeGeminiApiKey = cleanKey;
    process.env.GEMINI_API_KEY = cleanKey;
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || path_1.default.dirname(process.execPath);
    const envPaths = [
        path_1.default.resolve(process.cwd(), '.env'),
        path_1.default.resolve(process.cwd(), '../.env'),
        path_1.default.resolve(portableDir, '.env'),
        path_1.default.resolve(portableDir, '../../.env'),
        'c:/Projects/Antigravity/shona-assimil-app/.env',
        'c:/Projects/Antigravity/shona-assimil-app/app/.env',
    ];
    if (userDataDir) {
        envPaths.unshift(path_1.default.join(userDataDir, '.env'));
    }
    const uniquePaths = Array.from(new Set(envPaths));
    for (const p of uniquePaths) {
        try {
            if (fs_1.default.existsSync(p)) {
                let content = fs_1.default.readFileSync(p, 'utf-8');
                if (/^\s*GEMINI_API_KEY\s*=/m.test(content)) {
                    content = content.replace(/^\s*GEMINI_API_KEY\s*=.*$/m, `GEMINI_API_KEY=${cleanKey}`);
                }
                else {
                    content = `${content.trim()}\nGEMINI_API_KEY=${cleanKey}\n`;
                }
                fs_1.default.writeFileSync(p, content, 'utf-8');
            }
            else if (userDataDir && p.startsWith(userDataDir)) {
                fs_1.default.writeFileSync(p, `DEV_MODE_PASSWORD=shona_dev_pass\nGEMINI_API_KEY=${cleanKey}\n`, 'utf-8');
            }
        }
        catch { }
    }
}
function postHttpsJson(url, bodyObj, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const payload = Buffer.from(JSON.stringify(bodyObj), 'utf-8');
        const parsedUrl = new URL(url);
        const req = https_1.default.request({
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length,
            },
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf-8');
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(text));
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                else {
                    reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 220)}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error('Gemini API request timed out'));
        });
        req.write(payload);
        req.end();
    });
}
const GEMINI_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
];
async function verifyGeminiApiKey(candidateKey, userDataDir) {
    const keyToTest = (candidateKey !== undefined ? candidateKey : getGeminiApiKey()).trim();
    if (!keyToTest) {
        return { valid: false, error: 'No Gemini API key found. Please enter a valid Gemini API key.' };
    }
    let lastError = 'Could not connect to Gemini API.';
    for (const model of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keyToTest)}`;
            const resp = await postHttpsJson(url, {
                contents: [{ parts: [{ text: 'Reply with {"ok": true}' }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 30,
                },
            }, 10000);
            const rawText = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof rawText === 'string' && rawText.trim().length > 0) {
                saveGeminiApiKeyToEnv(keyToTest, userDataDir);
                return { valid: true };
            }
        }
        catch (err) {
            lastError = err?.message || String(err);
            if (lastError.includes('API_KEY_INVALID') || lastError.includes('HTTP 400') || lastError.includes('HTTP 403')) {
                return { valid: false, error: 'Invalid Gemini API key. Please check your key and try again.' };
            }
        }
    }
    return { valid: false, error: lastError };
}
async function callGeminiJson(prompt) {
    const apiKey = getGeminiApiKey();
    if (!apiKey)
        return null;
    for (const model of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const resp = await postHttpsJson(url, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.65,
                    responseMimeType: 'application/json',
                },
            }, 18000);
            const rawText = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof rawText === 'string' && rawText.trim()) {
                const cleaned = rawText
                    .trim()
                    .replace(/^```json\s*/i, '')
                    .replace(/```\s*$/, '');
                return JSON.parse(cleaned);
            }
        }
        catch (err) {
            console.warn(`Gemini ${model} call warning:`, err);
        }
    }
    return null;
}
function normalizeTextKey(text) {
    return String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
}
const NON_ZEZURU_MARKERS = new Set([
    'unjani',
    'ngiyabonga',
    'siyabonga',
    'yebo',
    'sawubona',
    'kunjani',
    'umntwana',
    'inkosi',
]);
function isValidZezuruTranscript(text) {
    const cleaned = String(text || '').trim().replace(/\s+/g, ' ');
    if (cleaned.length < 12)
        return false;
    const words = cleaned.toLowerCase().match(/[a-z']+/g) || [];
    if (words.length < 3)
        return false;
    if (words.some((w) => NON_ZEZURU_MARKERS.has(w)))
        return false;
    const vowelWords = words.filter((w) => /[aeiou]/.test(w));
    if (vowelWords.length < Math.ceil(words.length * 0.8))
        return false;
    const sentences = splitShonaSentences(cleaned);
    if (sentences.length === 0)
        return false;
    for (const s of sentences) {
        const sWords = s.toLowerCase().match(/[a-z']+/g) || [];
        if (sWords.length === 0)
            return false;
        if (sWords.length === 1 && sWords[0].length < 4)
            return false;
    }
    return true;
}
function splitShonaSentences(shonaText) {
    const cleaned = String(shonaText || '').trim().replace(/\s+/g, ' ');
    if (!cleaned)
        return [];
    const rawParts = cleaned.split(/(?<=[.!?])\s+|(?<=[.!?])(?=[A-Z])/);
    const sentences = [];
    for (const part of rawParts) {
        const p = part.trim();
        if (!p)
            continue;
        if (p.replace(/[^A-Za-z]/g, '').length <= 2 && sentences.length > 0) {
            sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${p}`;
        }
        else if (sentences.length > 0 &&
            (sentences[sentences.length - 1].match(/"/g) || []).length % 2 === 1) {
            sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${p}`;
        }
        else {
            sentences.push(p);
        }
    }
    return sentences.filter((s) => s.replace(/[^A-Za-z]/g, '').length >= 3);
}
function fetchHttpsText(url, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
        const req = https_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShonaAssimilEnricher/2.0',
            },
        }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchHttpsText(res.headers.location, timeoutMs).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error('Request timed out'));
        });
    });
}
// ============================================================================
// MORPHOLOGICAL & WORD-BY-WORD LITERAL TRANSLATION ENGINE
// ============================================================================
const NOUN_CLASS_PREFIX_RULES = [
    { rx: /^necheku/i, engPrefix: 'towards ', morphDesc: 'necheku- (directional locative)', nclass: 'Locative (ku-)' },
    { rx: /^nechepa/i, engPrefix: 'around ', morphDesc: 'nechepa- (directional locative)', nclass: 'Locative (pa-)' },
    { rx: /^nechemu/i, engPrefix: 'inside around ', morphDesc: 'nechemu- (directional locative)', nclass: 'Locative (mu-)' },
    { rx: /^ndaka/i, engPrefix: 'I (past) ', morphDesc: 'nda- (I) + -ka- (past)', nclass: 'Verb (1st Sg Past)' },
    { rx: /^taka/i, engPrefix: 'we (past) ', morphDesc: 'ta- (we) + -ka- (past)', nclass: 'Verb (1st Pl Past)' },
    { rx: /^vaka/i, engPrefix: 'they (past/stative) ', morphDesc: 'va- (they, Class 2) + -ka- (past/stative)', nclass: 'Verb (Class 2 Past)' },
    { rx: /^waka/i, engPrefix: 'it/he/she (past/stative) ', morphDesc: 'wa- (Class 1/3) + -ka- (past/stative)', nclass: 'Verb (Past/Stative)' },
    { rx: /^aka/i, engPrefix: 'he/she (past/stative) ', morphDesc: 'a- (Class 1) + -ka- (past/stative)', nclass: 'Verb (Class 1 Past)' },
    { rx: /^yaka/i, engPrefix: 'it (past/stative) ', morphDesc: 'ya- (Class 4/9) + -ka- (past/stative)', nclass: 'Verb (Class 9 Stative)' },
    { rx: /^raka/i, engPrefix: 'it (past/stative) ', morphDesc: 'ra- (Class 5) + -ka- (past/stative)', nclass: 'Verb (Class 5 Stative)' },
    { rx: /^chaka/i, engPrefix: 'it (past/stative) ', morphDesc: 'cha- (Class 7) + -ka- (past/stative)', nclass: 'Verb (Class 7 Stative)' },
    { rx: /^dzaka/i, engPrefix: 'they (past/stative) ', morphDesc: 'dza- (Class 10) + -ka- (past/stative)', nclass: 'Verb (Class 10 Stative)' },
    { rx: /^zvaka/i, engPrefix: 'they (past/stative) ', morphDesc: 'zva- (Class 8) + -ka- (past/stative)', nclass: 'Verb (Class 8 Stative)' },
    { rx: /^vachi/i, engPrefix: 'while they ', morphDesc: 'va- (they) + -chi- (participial: while)', nclass: 'Participial Verb' },
    { rx: /^achi/i, engPrefix: 'while he/she ', morphDesc: 'a- (he/she) + -chi- (participial: while)', nclass: 'Participial Verb' },
    { rx: /^uchi/i, engPrefix: 'while you/it ', morphDesc: 'u- + -chi- (participial: while)', nclass: 'Participial Verb' },
    { rx: /^ichiri/i, engPrefix: 'still ', morphDesc: 'i- + -chi- (still) + -ri (be)', nclass: 'Persistive Copula' },
    { rx: /^vachiri/i, engPrefix: 'they are still ', morphDesc: 'va- + -chi- (still) + -ri (be)', nclass: 'Persistive Copula' },
    { rx: /^variku/i, engPrefix: 'they are ', morphDesc: 'va- (they) + -ri (are) + ku- (infinitive)', nclass: 'Verb (Class 2 Progressive)' },
    { rx: /^ariku/i, engPrefix: 'he/she is ', morphDesc: 'a- (he/she) + -ri (is) + ku- (infinitive)', nclass: 'Verb (Class 1 Progressive)' },
    { rx: /^uriku/i, engPrefix: 'is ', morphDesc: 'u- (Class 3 / 2nd sg) + -ri + ku-', nclass: 'Verb (Progressive)' },
    { rx: /^iriku/i, engPrefix: 'it is ', morphDesc: 'i- (Class 9) + -ri (is) + ku-', nclass: 'Verb (Class 9 Progressive)' },
    { rx: /^ririku/i, engPrefix: 'it is ', morphDesc: 'ri- (Class 5) + -ri (is) + ku-', nclass: 'Verb (Class 5 Progressive)' },
    { rx: /^chiriku/i, engPrefix: 'it is ', morphDesc: 'chi- (Class 7) + -ri (is) + ku-', nclass: 'Verb (Class 7 Progressive)' },
    { rx: /^zviriku/i, engPrefix: 'they are ', morphDesc: 'zvi- (Class 8) + -ri (are) + ku-', nclass: 'Verb (Class 8 Progressive)' },
    { rx: /^tiriku/i, engPrefix: 'we are ', morphDesc: 'ti- (we) + -ri (are) + ku-', nclass: 'Verb (1st Pl Progressive)' },
    { rx: /^ndiriku/i, engPrefix: 'I am ', morphDesc: 'ndi- (I) + -ri (am) + ku-', nclass: 'Verb (1st Sg Progressive)' },
    { rx: /^vano/i, engPrefix: 'they ', morphDesc: 'va- (they) + -no- (present)', nclass: 'Verb (Class 2 Present)' },
    { rx: /^ano/i, engPrefix: 'he/she ', morphDesc: 'a- (he/she) + -no- (present)', nclass: 'Verb (Class 1 Present)' },
    { rx: /^ndino/i, engPrefix: 'I ', morphDesc: 'ndi- (I) + -no- (present)', nclass: 'Verb (1st Sg Present)' },
    { rx: /^tino/i, engPrefix: 'we ', morphDesc: 'ti- (we) + -no- (present)', nclass: 'Verb (1st Pl Present)' },
    { rx: /^uno/i, engPrefix: 'you/it ', morphDesc: 'u- (2nd sg / Class 3) + -no- (present)', nclass: 'Verb (Present)' },
    { rx: /^ino/i, engPrefix: 'it ', morphDesc: 'i- (Class 9) + -no- (present)', nclass: 'Verb (Class 9 Present)' },
    { rx: /^rino/i, engPrefix: 'it ', morphDesc: 'ri- (Class 5) + -no- (present)', nclass: 'Verb (Class 5 Present)' },
    { rx: /^chino/i, engPrefix: 'it ', morphDesc: 'chi- (Class 7) + -no- (present)', nclass: 'Verb (Class 7 Present)' },
    { rx: /^zvino/i, engPrefix: 'they ', morphDesc: 'zvi- (Class 8) + -no- (present)', nclass: 'Verb (Class 8 Present)' },
    { rx: /^dzino/i, engPrefix: 'they ', morphDesc: 'dzi- (Class 10) + -no- (present)', nclass: 'Verb (Class 10 Present)' },
    { rx: /^ndicha/i, engPrefix: 'I will ', morphDesc: 'ndi- (I) + -cha- (future)', nclass: 'Verb (1st Sg Future)' },
    { rx: /^ticha/i, engPrefix: 'we will ', morphDesc: 'ti- (we) + -cha- (future)', nclass: 'Verb (1st Pl Future)' },
    { rx: /^vacha/i, engPrefix: 'they will ', morphDesc: 'va- (they) + -cha- (future)', nclass: 'Verb (Class 2 Future)' },
    { rx: /^acha/i, engPrefix: 'he/she will ', morphDesc: 'a- (he/she) + -cha- (future)', nclass: 'Verb (Class 1 Future)' },
    { rx: /^icha/i, engPrefix: 'it will ', morphDesc: 'i- (Class 9) + -cha- (future)', nclass: 'Verb (Class 9 Future)' },
    { rx: /^ne/i, engPrefix: 'and/with ', morphDesc: 'ne- (associative: and/with)', nclass: 'Conjunctive (ne-)' },
    { rx: /^na/i, engPrefix: 'with/and ', morphDesc: 'na- (associative: with/and)', nclass: 'Conjunctive (na-)' },
    { rx: /^se/i, engPrefix: 'like/as ', morphDesc: 'se- (similative: like/as)', nclass: 'Similative (se-)' },
    { rx: /^sa/i, engPrefix: 'like/as ', morphDesc: 'sa- (similative: like/as)', nclass: 'Similative (sa-)' },
    { rx: /^pa/i, engPrefix: 'at/on ', morphDesc: 'pa- (Class 16 locative: at/on)', nclass: 'Class 16 Locative (pa-)' },
    { rx: /^ku/i, engPrefix: 'to/at ', morphDesc: 'ku- (Class 15 infinitive / Class 17 locative)', nclass: 'Class 15/17 (ku-)' },
    { rx: /^mu/i, engPrefix: 'in / ', morphDesc: 'mu- (Class 1/3 singular or Class 18 inside)', nclass: 'Class 1/3/18 (mu-)' },
    { rx: /^pe/i, engPrefix: 'of (on) ', morphDesc: 'pe- (Class 16 possessive concord: of)', nclass: 'Possessive Concord (pe-)' },
    { rx: /^kwe/i, engPrefix: 'of ', morphDesc: 'kwe- (Class 15/17 possessive concord: of)', nclass: 'Possessive Concord (kwe-)' },
    { rx: /^rwe/i, engPrefix: 'of ', morphDesc: 'rwe- (Class 11 possessive concord: of)', nclass: 'Possessive Concord (rwe-)' },
    { rx: /^zve/i, engPrefix: 'of ', morphDesc: 'zve- (Class 8 possessive concord: of)', nclass: 'Possessive Concord (zve-)' },
    { rx: /^che/i, engPrefix: 'of ', morphDesc: 'che- (Class 7 possessive concord: of)', nclass: 'Possessive Concord (che-)' },
    { rx: /^dze/i, engPrefix: 'of ', morphDesc: 'dze- (Class 10 possessive concord: of)', nclass: 'Possessive Concord (dze-)' },
    { rx: /^we/i, engPrefix: 'of ', morphDesc: 'we- (Class 1/3 possessive concord: of)', nclass: 'Possessive Concord (we-)' },
    { rx: /^ye/i, engPrefix: 'of ', morphDesc: 'ye- (Class 4/9 possessive concord: of)', nclass: 'Possessive Concord (ye-)' },
    { rx: /^re/i, engPrefix: 'of ', morphDesc: 're- (Class 5 possessive concord: of)', nclass: 'Possessive Concord (re-)' },
    { rx: /^va/i, engPrefix: 'people / ', morphDesc: 'va- (Class 2 plural)', nclass: 'Class 2 (va-)' },
    { rx: /^ma/i, engPrefix: '', morphDesc: 'ma- (Class 6 plural)', nclass: 'Class 6 (ma-)' },
    { rx: /^chi/i, engPrefix: '', morphDesc: 'chi- (Class 7 singular)', nclass: 'Class 7 (chi-)' },
    { rx: /^zvi/i, engPrefix: '', morphDesc: 'zvi- (Class 8 plural)', nclass: 'Class 8 (zvi-)' },
];
function analyzeMorphemesAndClass(word) {
    const kb = loadTextbookKnowledge();
    const clean = word.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
    if (!clean) {
        return {
            shona: word,
            shona_word: word,
            literal_english: word,
            morphemes: word,
            morpheme_breakdown: word,
            noun_class: 'Particle',
            noun_class_or_concord: 'Particle',
        };
    }
    // 1. Direct lookup in BEGINNER_WORD_GLOSS
    const direct = kb.BEGINNER_WORD_GLOSS[clean];
    if (direct && direct[2] && direct[2].toLowerCase() !== clean) {
        return {
            shona: word,
            shona_word: word,
            literal_english: direct[2],
            morphemes: direct[0],
            morpheme_breakdown: direct[0],
            noun_class: direct[1],
            noun_class_or_concord: direct[1],
        };
    }
    // 1b. Handle internal punctuation or hyphenated reduplication (e.g., "pazasi.une", "yakasiyana-siyana")
    if (/[^a-zA-Z']/.test(clean)) {
        const subParts = clean.split(/[^a-zA-Z']+/).filter(Boolean);
        if (subParts.length > 1) {
            const subAnalyses = subParts.map((sp) => analyzeMorphemesAndClass(sp));
            const engParts = [];
            for (const sa of subAnalyses) {
                if (sa.literal_english && !engParts.includes(sa.literal_english)) {
                    engParts.push(sa.literal_english);
                }
            }
            const joinedEng = engParts.join(' / ');
            if (joinedEng && joinedEng.toLowerCase() !== clean) {
                return {
                    shona: word,
                    shona_word: word,
                    literal_english: joinedEng,
                    morphemes: subAnalyses.map((s) => s.morphemes).join(' + '),
                    morpheme_breakdown: subAnalyses.map((s) => s.morphemes).join(' + '),
                    noun_class: subAnalyses[0].noun_class,
                    noun_class_or_concord: subAnalyses[0].noun_class,
                };
            }
        }
    }
    // 1c. Handle enclitic -wo ("also / too")
    if (clean.endsWith('wo') && clean.length >= 5) {
        const baseWithoutWo = clean.slice(0, -2);
        const baseAnalysis = analyzeMorphemesAndClass(baseWithoutWo);
        if (baseAnalysis.literal_english &&
            baseAnalysis.literal_english.toLowerCase() !== baseWithoutWo) {
            const glossWithAlso = `${baseAnalysis.literal_english} also`;
            return {
                shona: word,
                shona_word: word,
                literal_english: glossWithAlso,
                morphemes: `${baseAnalysis.morphemes} + -wo (also)`,
                morpheme_breakdown: `${baseAnalysis.morphemes} + -wo (also)`,
                noun_class: baseAnalysis.noun_class,
                noun_class_or_concord: baseAnalysis.noun_class,
            };
        }
    }
    // 2. Prefix decomposition + stem lookup in BEGINNER_WORD_GLOSS
    for (const rule of NOUN_CLASS_PREFIX_RULES) {
        if (rule.rx.test(clean)) {
            const stem = clean.replace(rule.rx, '');
            if (stem.length >= 3) {
                const stemEntry = kb.BEGINNER_WORD_GLOSS[stem] ||
                    kb.BEGINNER_WORD_GLOSS[`ku${stem}`] ||
                    kb.BEGINNER_WORD_GLOSS[`mu${stem}`];
                if (stemEntry && stemEntry[2] && stemEntry[2].toLowerCase() !== stem) {
                    const cleanStemGloss = stemEntry[2].replace(/^to\s+/i, '');
                    const combinedGloss = `${rule.engPrefix}${cleanStemGloss}`.trim();
                    const morphStr = `${rule.morphDesc} + -${stem} (${cleanStemGloss})`;
                    return {
                        shona: word,
                        shona_word: word,
                        literal_english: combinedGloss,
                        morphemes: morphStr,
                        morpheme_breakdown: morphStr,
                        noun_class: rule.nclass,
                        noun_class_or_concord: rule.nclass,
                    };
                }
            }
        }
    }
    // 3. Suffix decomposition (-wa passive, -ira/-era applicative, -isa/-esa causative)
    if (clean.endsWith('wa') && clean.length >= 5) {
        const activeBase = `${clean.slice(0, -2)}a`;
        const baseEntry = kb.BEGINNER_WORD_GLOSS[activeBase];
        if (baseEntry && baseEntry[2] && baseEntry[2].toLowerCase() !== activeBase) {
            const gloss = `be ${baseEntry[2]} (passive)`;
            const morphStr = `${activeBase} (${baseEntry[2]}) + -wa (passive)`;
            return {
                shona: word,
                shona_word: word,
                literal_english: gloss,
                morphemes: morphStr,
                morpheme_breakdown: morphStr,
                noun_class: 'Passive Verb (-wa)',
                noun_class_or_concord: 'Passive Verb (-wa)',
            };
        }
    }
    return {
        shona: word,
        shona_word: word,
        literal_english: direct?.[2] || clean,
        morphemes: `${clean} (lexical root)`,
        morpheme_breakdown: `${clean} (lexical root)`,
        noun_class: 'Lexical Root',
        noun_class_or_concord: 'Lexical Root',
    };
}
function formatWordGlossList(glossList) {
    return glossList
        .map((g) => {
        const w = g.shona || g.shona_word || '';
        return `${w} [${g.literal_english}]`;
    })
        .join(' • ');
}
function buildSentenceWordGlossSync(shonaSentence) {
    const words = String(shonaSentence || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const breakdown = words.map((w) => analyzeMorphemesAndClass(w));
    return {
        literal_gloss: formatWordGlossList(breakdown),
        gloss_breakdown: breakdown,
    };
}
async function translateSingleShonaWordWithProviders(shonaWord, variationSeed = 0) {
    const clean = shonaWord.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
    if (!clean)
        return null;
    const encoded = encodeURIComponent(clean);
    const tryClients5 = async () => {
        try {
            const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=sn&tl=en&q=${encoded}`;
            const body = await fetchHttpsText(url, 8000);
            const parsed = JSON.parse(body);
            const res = Array.isArray(parsed) && typeof parsed[0] === 'string'
                ? parsed[0]
                : Array.isArray(parsed?.[0])
                    ? parsed[0][0]
                    : null;
            if (typeof res === 'string' && res.trim() && res.trim().toLowerCase() !== clean) {
                return res.trim().toLowerCase();
            }
        }
        catch { }
        return null;
    };
    const tryMyMemory = async () => {
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=sn|en`;
            const body = await fetchHttpsText(url, 8000);
            const parsed = JSON.parse(body);
            const cand = parsed?.responseData?.translatedText;
            if (typeof cand === 'string' &&
                cand.trim() &&
                !cand.includes('MYMEMORY WARNING') &&
                cand.trim().toLowerCase() !== clean) {
                return cand.trim().toLowerCase();
            }
        }
        catch { }
        return null;
    };
    const order = variationSeed % 2 === 1 ? [tryMyMemory, tryClients5] : [tryClients5, tryMyMemory];
    for (const fn of order) {
        const out = await fn();
        if (out)
            return out;
    }
    return null;
}
async function buildSentenceWordGlossAsync(shonaSentence, englishSentence, useAiMode = false, variationSeed = 0) {
    const words = String(shonaSentence || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) {
        return { literal_gloss: '', gloss_breakdown: [] };
    }
    // 1. If AI Mode is active, use Gemini to generate a rich, contextual word-by-word & morpheme breakdown for this exact sentence
    if (useAiMode && getGeminiApiKey()) {
        const gemOut = await callGeminiJson(`You are an expert Shona (ChiZezuru) linguist creating a Word-by-Word Literal Breakdown for an Assimil lesson.
Shona sentence: "${shonaSentence}"
Idiomatic English translation: "${englishSentence}"
Words in exact order: ${JSON.stringify(words)}

For EVERY word in the Shona sentence (in the exact order above), provide:
1. "shona": the exact word from the sentence
2. "literal_english": the clear, accurate English meaning of this word in context. If the word has prefixes, tense markers, or suffixes (e.g. "vakagara" = "va- (they) + -ka- (past) + -gara (sit)" -> "they sat / are seated (va-ka-gara)"; "pejira" = "pe- (of) + jira (cloth)" -> "of the cloth (pe-jira)"), include both the English meaning and the brief component breakdown if helpful. NEVER output the Shona word itself as its English translation!
3. "morphemes": morphological breakdown of prefixes, stems, and suffixes
4. "noun_class": grammatical class or verb tense label

Return JSON: {"words": [{"shona": "...", "literal_english": "...", "morphemes": "...", "noun_class": "..."}]}`);
        if (gemOut && Array.isArray(gemOut.words) && gemOut.words.length > 0) {
            const breakdown = words.map((origWord, idx) => {
                const gItem = gemOut.words[idx] || {};
                const fallback = analyzeMorphemesAndClass(origWord);
                const litEng = typeof gItem.literal_english === 'string' &&
                    gItem.literal_english.trim().length > 0 &&
                    gItem.literal_english.trim().toLowerCase() !==
                        origWord.replace(/[^A-Za-z']/g, '').toLowerCase()
                    ? gItem.literal_english.trim()
                    : fallback.literal_english;
                const morph = typeof gItem.morphemes === 'string' && gItem.morphemes.trim()
                    ? gItem.morphemes.trim()
                    : fallback.morphemes;
                const nclass = typeof gItem.noun_class === 'string' && gItem.noun_class.trim()
                    ? gItem.noun_class.trim()
                    : fallback.noun_class;
                return {
                    shona: origWord,
                    shona_word: origWord,
                    literal_english: litEng,
                    morphemes: morph,
                    morpheme_breakdown: morph,
                    noun_class: nclass,
                    noun_class_or_concord: nclass,
                };
            });
            return {
                literal_gloss: formatWordGlossList(breakdown),
                gloss_breakdown: breakdown,
            };
        }
    }
    // 2. Non-AI Mode (or fallback): analyze each word and resolve any untranslated words via neural provider
    const breakdown = [];
    for (const w of words) {
        const clean = w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
        const baseAnalysis = analyzeMorphemesAndClass(w);
        const isUntranslated = !baseAnalysis.literal_english ||
            baseAnalysis.literal_english.toLowerCase() === clean;
        if (isUntranslated || variationSeed > 0) {
            const onlineWordGloss = await translateSingleShonaWordWithProviders(w, variationSeed);
            if (onlineWordGloss && onlineWordGloss.toLowerCase() !== clean) {
                baseAnalysis.literal_english = onlineWordGloss;
            }
        }
        breakdown.push(baseAnalysis);
    }
    return {
        literal_gloss: formatWordGlossList(breakdown),
        gloss_breakdown: breakdown,
    };
}
// ============================================================================
// SENTENCE & PASSAGE TRANSLATION ENGINE
// ============================================================================
async function translateShonaSentenceIdiomatic(shonaSent, variationSeed = 0, useAiMode = false, fullPassageContext = '') {
    const sClean = shonaSent.trim();
    if (!sClean)
        return '';
    const kb = loadTextbookKnowledge();
    const norm = normalizeTextKey(sClean);
    const normNoPunct = norm.replace(/[.!?;:,]+$/, '');
    // 1. If AI Mode is active (or Gemini API key is set with variationSeed > 0), use Gemini
    if ((useAiMode || variationSeed > 0) && getGeminiApiKey()) {
        const contextLine = fullPassageContext
            ? `\nFull Shona passage for context: "${fullPassageContext}"`
            : '';
        const gemOut = await callGeminiJson(`Translate the following Shona (ChiZezuru) sentence into natural, 100% idiomatic everyday English as a native English speaker would say it (never literal word-for-word, and never leave Shona words untranslated).${contextLine}
Target Shona sentence to translate: "${sClean}"
Variation seed: ${variationSeed}
Return JSON: {"english": "..."}`);
        if (gemOut && typeof gemOut.english === 'string' && gemOut.english.trim().length > 2) {
            return gemOut.english.trim();
        }
    }
    if (variationSeed === 0 && !useAiMode) {
        for (const [k, v] of Object.entries(kb.IDIOMATIC_SENTENCE_TRANSLATIONS)) {
            const kNorm = normalizeTextKey(k);
            if (kNorm === norm || kNorm.replace(/[.!?;:,]+$/, '') === normNoPunct) {
                return v;
            }
        }
    }
    // Multi-provider neural Shona -> English idiomatic sentence translation
    const encoded = encodeURIComponent(sClean);
    const tryClients5 = async () => {
        try {
            const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=sn&tl=en&q=${encoded}`;
            const body = await fetchHttpsText(url, 12000);
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
                return parsed[0].trim().replace(/\s+/g, ' ');
            }
            if (Array.isArray(parsed) && Array.isArray(parsed[0]) && typeof parsed[0][0] === 'string') {
                return parsed[0][0].trim().replace(/\s+/g, ' ');
            }
        }
        catch { }
        return null;
    };
    const tryMyMemory = async () => {
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=sn|en`;
            const body = await fetchHttpsText(url, 12000);
            const parsed = JSON.parse(body);
            const candidate = parsed?.responseData?.translatedText;
            if (typeof candidate === 'string' &&
                candidate.trim() &&
                !candidate.includes('MYMEMORY WARNING')) {
                return candidate.trim().replace(/\s+/g, ' ');
            }
        }
        catch { }
        return null;
    };
    const tryGtx = async () => {
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=sn&tl=en&dt=t&q=${encoded}`;
            const body = await fetchHttpsText(url, 12000);
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
                const chunks = [];
                for (const seg of parsed[0]) {
                    if (Array.isArray(seg) && typeof seg[0] === 'string' && seg[0]) {
                        chunks.push(seg[0]);
                    }
                }
                const joined = chunks.join('').trim().replace(/\s+/g, ' ');
                if (joined)
                    return joined;
            }
        }
        catch { }
        return null;
    };
    const providers = variationSeed % 2 === 1
        ? [tryMyMemory, tryClients5, tryGtx]
        : [tryClients5, tryMyMemory, tryGtx];
    for (const provider of providers) {
        const candidate = await provider();
        if (candidate && normalizeTextKey(candidate) !== norm && candidate.length >= 3) {
            return variationSeed > 0 ? applyIdiomaticVariation(candidate, variationSeed) : candidate;
        }
    }
    for (const [k, v] of Object.entries(kb.IDIOMATIC_SENTENCE_TRANSLATIONS)) {
        const kNorm = normalizeTextKey(k);
        if (kNorm === norm || kNorm.replace(/[.!?;:,]+$/, '') === normNoPunct) {
            return variationSeed > 0 ? applyIdiomaticVariation(v, variationSeed) : v;
        }
    }
    return sClean;
}
function applyIdiomaticVariation(englishSent, seed) {
    if (seed <= 0)
        return englishSent;
    const swaps = [
        [/\bquickly\b/gi, ['rapidly', 'promptly', 'right away', 'quickly']],
        [/\bvery\b/gi, ['truly', 'deeply', 'remarkably', 'very']],
        [/\bchildren\b/gi, ['kids', 'youngsters', 'children']],
        [/\bmother\b/gi, ['Mom', 'Mother']],
        [/\bfather\b/gi, ['Dad', 'Father']],
        [/\bstarted\b/gi, ['began', 'commenced', 'started']],
        [/\bhelped\b/gi, ['assisted', 'supported', 'helped']],
        [/\bhappy\b/gi, ['glad', 'joyful', 'pleased', 'happy']],
        [/\bimportant\b/gi, ['vital', 'essential', 'key', 'important']],
        [/\bmany\b/gi, ['numerous', 'plenty of', 'many']],
        [/\blarge\b/gi, ['big', 'spacious', 'sizable', 'large']],
        [/\bbig\b/gi, ['large', 'sizable', 'spacious', 'big']],
        [/\bwoman\b/gi, ['lady', 'woman']],
        [/\bman\b/gi, ['gentleman', 'man']],
    ];
    let out = englishSent;
    for (const [regex, choices] of swaps) {
        if (regex.test(out)) {
            const pick = choices[seed % choices.length];
            out = out.replace(regex, (m) => {
                const isCap = m[0] === m[0].toUpperCase();
                return isCap ? pick.charAt(0).toUpperCase() + pick.slice(1) : pick;
            });
        }
    }
    return out;
}
async function attachPerSentenceGlossesToDialogue(lines, useAiMode = false) {
    const result = [];
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const sText = String(l.shona || '').trim();
        const eText = String(l.english || '').trim();
        const glossData = useAiMode
            ? await buildSentenceWordGlossAsync(sText, eText, true, 0)
            : buildSentenceWordGlossSync(sText);
        result.push({
            id: i + 1,
            speaker: l.speaker || 'Mutauri',
            shona: sText,
            english: eText,
            literal_gloss: glossData.literal_gloss,
            gloss_breakdown: glossData.gloss_breakdown,
        });
    }
    return result;
}
async function resolveIdiomaticTranslationAndDialogue(shonaText, variationSeed = 0, useAiMode = false) {
    const kb = loadTextbookKnowledge();
    const norm = normalizeTextKey(shonaText);
    const normNoPunct = norm.replace(/[.!?;:,]+$/, '');
    const shonaSentences = splitShonaSentences(shonaText);
    // 1. If AI Mode is enabled (or variationSeed > 0 with a valid Gemini key), use Gemini
    if ((useAiMode || variationSeed > 0) && getGeminiApiKey()) {
        const gemData = await callGeminiJson(`You are an expert Shona (ChiZezuru) to English translator for Assimil.
Translate each of these Shona sentences into 100% natural, idiomatic English sentences as a native English speaker would say them (not literal word-for-word, and never leave Shona words untranslated).
Shona sentences in order: ${JSON.stringify(shonaSentences)}
Return JSON: {"dialogue": [{"shona": "...", "english": "..."}], "english_translation": "..."}`);
        if (gemData &&
            Array.isArray(gemData.dialogue) &&
            gemData.dialogue.length > 0 &&
            gemData.dialogue.every((d) => typeof d.shona === 'string' &&
                d.shona.trim().length >= 3 &&
                typeof d.english === 'string' &&
                d.english.trim().length >= 3)) {
            const dialogue = await attachPerSentenceGlossesToDialogue(gemData.dialogue, useAiMode);
            return {
                englishTranslation: dialogue.map((d) => d.english).join(' '),
                dialogue,
            };
        }
    }
    // 2. Check IDIOMATIC_SENTENCE_TRANSLATIONS when not in AI regeneration mode
    if (variationSeed === 0 && !useAiMode) {
        for (const [key, eng] of Object.entries(kb.IDIOMATIC_SENTENCE_TRANSLATIONS)) {
            const kNorm = normalizeTextKey(key);
            if (kNorm === norm || kNorm.replace(/[.!?;:,]+$/, '') === normNoPunct) {
                if (shonaText.includes(';')) {
                    const sParts = shonaText.split(';').map((p) => p.trim()).filter(Boolean);
                    const eParts = eng
                        .replace(/\?/g, '?.')
                        .replace(/;/g, '.')
                        .split('.')
                        .map((p) => p.trim())
                        .filter(Boolean);
                    if (sParts.length === eParts.length && sParts.length > 1) {
                        const rawLines = sParts.map((sp, idx) => ({
                            id: idx + 1,
                            speaker: 'Mutauri',
                            shona: sp,
                            english: eParts[idx].endsWith('.') || eParts[idx].endsWith('?')
                                ? eParts[idx]
                                : `${eParts[idx]}.`,
                        }));
                        return {
                            englishTranslation: eng,
                            dialogue: await attachPerSentenceGlossesToDialogue(rawLines, false),
                        };
                    }
                }
                return {
                    englishTranslation: eng,
                    dialogue: await attachPerSentenceGlossesToDialogue([{ id: 1, speaker: 'Mutauri', shona: shonaText.trim(), english: eng }], false),
                };
            }
        }
        // 3. Check VIBEVOICE_PASSAGE_TRANSLATIONS
        for (const entry of kb.VIBEVOICE_PASSAGE_TRANSLATIONS) {
            const mKey = normalizeTextKey(entry.match || '');
            if (mKey && norm.includes(mKey)) {
                const rawSentences = entry.sentences || [];
                if (rawSentences.length > 0) {
                    if (Array.isArray(rawSentences[0]) && rawSentences[0].length === 2) {
                        const rawLines = rawSentences.map(([sSent, eSent], idx) => ({
                            id: idx + 1,
                            speaker: 'Mutauri',
                            shona: sSent,
                            english: eSent,
                        }));
                        const dialogue = await attachPerSentenceGlossesToDialogue(rawLines, false);
                        return {
                            englishTranslation: String(entry.english || dialogue.map((d) => d.english).join(' ')),
                            dialogue,
                        };
                    }
                    const engList = rawSentences.map((s) => String(s).trim()).filter(Boolean);
                    if (engList.length === shonaSentences.length && shonaSentences.length > 0) {
                        const rawLines = shonaSentences.map((sSent, idx) => ({
                            id: idx + 1,
                            speaker: 'Mutauri',
                            shona: sSent,
                            english: engList[idx],
                        }));
                        const dialogue = await attachPerSentenceGlossesToDialogue(rawLines, false);
                        return {
                            englishTranslation: String(entry.english || engList.join(' ')),
                            dialogue,
                        };
                    }
                }
                break;
            }
        }
    }
    // 4. Sentence-by-sentence idiomatic translation for every Shona sentence
    const rawLines = [];
    const engSentences = [];
    for (let i = 0; i < shonaSentences.length; i++) {
        const sSent = shonaSentences[i];
        const eSent = await translateShonaSentenceIdiomatic(sSent, variationSeed, useAiMode, shonaText);
        rawLines.push({
            id: i + 1,
            speaker: 'Mutauri',
            shona: sSent,
            english: eSent,
        });
        engSentences.push(eSent);
    }
    const dialogue = await attachPerSentenceGlossesToDialogue(rawLines, useAiMode);
    return {
        englishTranslation: engSentences.join(' ').trim(),
        dialogue,
    };
}
function generateTextbookGrammarNotes(shonaText, englishTranslation, lessonNumber, variationSeed = 0) {
    const lower = shonaText.toLowerCase();
    const words = shonaText.match(/[A-Za-z']+/g) || [];
    const lowerWords = words.map((w) => w.toLowerCase());
    const notes = [];
    // 1. Greetings
    const greetSet = new Set([
        'mangwanani',
        'masikati',
        'manheru',
        'manhero',
        'mhoro',
        'makadini',
        'waswera',
    ]);
    const greetFound = words.find((w) => greetSet.has(w.toLowerCase()));
    if (greetFound) {
        notes.push({
            title: `Shona Greetings & Time of Day ('${greetFound}')`,
            content: `In this lesson you encounter '${greetFound}'. Shona greetings change depending on the time of day and how many people you are addressing. 'Mangwanani' is used in the morning, 'Masikati' in the afternoon, and 'Manheru' in the evening. For a casual 'Hello' to a friend or peer, use 'Mhoro' (or 'Mhoroi' when speaking politely to an elder or group). To ask 'How are you?', speakers use 'Makadini?' (polite/plural) or ask how your day went with 'Waswera sei?' ('How did you spend the day?').`,
            rule: 'Morning: Mangwanani | Afternoon: Masikati | Evening: Manheru | How are you?: Makadini? / Wakadii?',
        });
    }
    // 2. Makorokoto
    if (lowerWords.includes('makorokoto')) {
        notes.push({
            title: "Celebrating Milestones with 'Makorokoto!'",
            content: "The exclamation 'Makorokoto!' means 'Congratulations!'. To specify what you are congratulating someone for, attach the prefix 'ne-' ('for / with') directly to an infinitive verb starting with 'ku-'. In this sentence, 'nekubudirira' combines 'ne-' (for) + 'kubudirira' (to succeed), literally meaning 'for succeeding'.",
            rule: 'Makorokoto + ne- + ku-[verb] = Congratulations on [doing something]! (e.g., Makorokoto nekubudirira!)',
        });
    }
    // 3. Imperatives
    const impSet = new Set([
        'huyai',
        'uyai',
        'batai',
        'vhara',
        'tora',
        'svika',
        'dzoka',
        'rima',
        'dzidza',
        'tsvaga',
        'vhenekera',
        'chiuya',
        'chigara',
    ]);
    const impWord = words.find((w) => impSet.has(w.toLowerCase()));
    if (impWord) {
        notes.push({
            title: `Giving Commands & Polite Requests ('${impWord}')`,
            content: `Notice the command verb '${impWord}' in this sentence. In Shona, a direct command to one person (singular) is simply the verb stem ending in '-a'—for example, 'Vhara!' ('Close!'), 'Tora!' ('Take!'), or 'Huya!' ('Come!'). When speaking to more than one person, or when showing polite respect to an adult, you add '-i' to the end, changing '-a' to '-ai' (as in 'Huyai!' = 'Come!' or 'Batai!' = 'Catch/Hold!'). Adding the prefix 'chi-' (as in 'Chiuya' or 'Chigara') means 'Do it right now'.`,
            rule: 'Singular Command: Verb stem (-a) [Huya! / Tora!] | Polite or Plural Command: Verb stem + -i (-ai) [Huyai! / Torai!]',
        });
    }
    // 4. Past Tense (-ka- and Recent Past -a-)
    const pastMatches = words.filter((w) => /^(nda|wa|a|ta|ma|va|ya|ra|cha|zva|dza)ka[a-z]{2,}/i.test(w));
    const recentSet = new Set([
        'ndamuka',
        'wabudirira',
        'ndaisa',
        'chapera',
        'ndapedza',
        'ndawana',
        'ndasiya',
        'watanga',
        'ndafara',
        'yanaya',
        'ranonoka',
        'yafa',
    ]);
    const recentMatches = words.filter((w) => recentSet.has(w.toLowerCase()));
    if (pastMatches.length > 0 || recentMatches.length > 0) {
        const allPast = [...pastMatches, ...recentMatches];
        const pWord = allPast[variationSeed % allPast.length];
        notes.push({
            title: `Talking About the Past ('${pWord}')`,
            content: `The verb '${pWord}' expresses a completed past action. Shona has two main ways to talk about the past: 1) For actions that happened earlier today or very recently, combine the short subject prefix ('nda-' = I, 'wa-' = you, 'a-' = he/she, 'ta-' = we, 'va-' = they) directly with the verb stem (e.g., 'ndamuka' = 'I woke up today', 'wabudirira' = 'you have succeeded'). 2) For events that happened yesterday or further in the past, insert '-ka-' after the subject prefix (e.g., 'takatenga' = 'we bought', 'vakaenda' = 'they went', 'akadanidzira' = 'he shouted').`,
            rule: 'Recent Today Past: [nda- / wa- / ta- / va-] + verb | Earlier Past: [ndaka- / waka- / taka- / vaka-] + verb',
        });
    }
    // 5. Present Progressive (-ri ku-)
    if (/\b(ndiri|uri|ari|tiri|muri|vari|iri|riri|chiri|zviri|rwuri|kuri|pari)\s+ku[a-z]+|\b(ndiriku|uriku|ariku|tiriku|variku|iriku|ririku|chiriku|zviriku)[a-z]+/i.test(lower)) {
        notes.push({
            title: "Actions Happening Right Now: The '-ri ku-' Progressive",
            content: "To describe an action that is happening right now ('I am doing', 'it is raining', 'they are walking'), Shona uses the helper verb '-ri' ('am/is/are') followed by 'ku-' ('to') and the action verb. For people, the forms are 'ndiri ku-' (I am), 'uri ku-' (you are), 'ari ku-' (he/she is), 'tiri ku-' (we are), and 'vari ku-' (they are). In fast speech or writing, the two words are sometimes joined together (e.g., 'ndiri kuenda' or 'ndirikuenda').",
            rule: '[Subject + -ri] + ku-[verb] -> Ndiri kuverenga (I am reading) | Vari kufamba (They are walking) | Mvura iri kunaya (It is raining)',
        });
    }
    // 6. Present Habitual (-no-)
    const habMatches = words.filter((w) => /^(ndi|u|a|ti|mu|va|i|ri|chi|zvi|ru|ku)no[a-z]{2,}/i.test(w));
    if (habMatches.length > 0) {
        const hWord = habMatches[variationSeed % habMatches.length];
        notes.push({
            title: `Present Tense & Everyday Actions ('${hWord}')`,
            content: `The verb '${hWord}' uses the present marker '-no-'. In Shona, inserting '-no-' between the subject prefix and the verb stem expresses general truths, everyday habits, or states of mind like 'wanting', 'thinking', and 'knowing'. For example: 'ndinoda' ('I want/like'), 'unofunga' ('you think'), 'vanoti' ('they say'), and 'vanorima' ('they farm').`,
            rule: '[ndi- (I) / u- (you) / a- (he/she) / ti- (we) / va- (they)] + -no- + verb -> Ndinoda (I want), Vanogara (They live)',
        });
    }
    // 7. Future Tense (-cha-)
    const futMatches = words.filter((w) => /^(ndi|u|a|ti|mu|va|i|ri|chi|zvi|ku)cha[a-z]{2,}/i.test(w));
    if (futMatches.length > 0) {
        const fWord = futMatches[variationSeed % futMatches.length];
        notes.push({
            title: `Talking About the Future with '-cha-' ('${fWord}')`,
            content: `Look at '${fWord}' in this sentence. Whenever you want to say what 'will' happen in the future, simply place the future marker '-cha-' between the subject prefix and the verb stem. For example, 'ndichabika' means 'I will cook', 'tichasvika' means 'we will arrive', and 'mvura ichanaya' means 'the rain will fall'. Pair it with 'mangwana' ('tomorrow') to talk about tomorrow's plans!`,
            rule: "Subject Prefix + -cha- + Verb Stem = Future ('will') -> Ndichaenda (I will go), Vachadzoka (They will return)",
        });
    }
    // 8. Colours
    const colourKeywords = [
        'tsvuku',
        'nhema',
        'tema',
        'chena',
        'girinhi',
        'girini',
        'bhuruu',
        'bhurauni',
        'orenji',
        'ruvara',
        'mavara',
        'goridhe',
        'pingi',
        'gireyi',
    ];
    const colourMatches = words.filter((w) => colourKeywords.some((c) => w.toLowerCase().includes(c)));
    if (colourMatches.length > 0) {
        const cWord = colourMatches[variationSeed % colourMatches.length];
        notes.push({
            title: `Colours & Describing Objects in Shona ('${cWord}')`,
            content: `This passage uses colour vocabulary such as '${cWord}'. Shona has three traditional core colour adjectives that change their prefix slightly to match the noun they describe: '-chena' (white/clean, e.g., 'ruvara ruchena' or 'shangu chena'), '-tema / nhema' (black/dark, e.g., 'mota nhema' or 'ruvara rutema'), and '-tsvuku' (red/bright brown, e.g., 'mota tsvuku' or 'ruvara rutsvuku'). For other colours like green ('girinhi'), blue ('bhuruu'), grey ('gireyi'), or orange ('orenji'), speakers typically say 'ruvara rwe-' ('the colour of...') followed by the colour name, as in 'ruvara rwegirinhi' (green).`,
            rule: 'Core Colours: -chena (white), -tema / nhema (black), -tsvuku (red) | Phrase pattern: ruvara rwe-[colour] (e.g., ruvara rwegirinhi)',
        });
    }
    // 9. Numbers
    const numSet = new Set([
        'chimwe',
        'mumwe',
        'imwe',
        'imwechete',
        'mumwechete',
        'maviri',
        'vaviri',
        'mbiri',
        'zviviri',
        'mitatu',
        'matatu',
        'rutatu',
        'nhatu',
        'zvitatu',
        'mana',
        'vana',
        'ina',
        'mashanu',
    ]);
    const numMatches = words.filter((w) => numSet.has(w.toLowerCase()));
    if (numMatches.length > 0) {
        const nWord = numMatches[variationSeed % numMatches.length];
        notes.push({
            title: `Counting & Numbers in Shona ('${nWord}')`,
            content: `In Shona, number words like '${nWord}' always come AFTER the noun they count, and their starting prefix matches the noun's group! The basic number stems are: '-mwe' (1), '-viri' (2), '-tatu' (3), '-na' (4), and '-shanu' (5). For example, when counting people ('vanhu'), you use 'va-': 'munhu mumwe' (1 person), 'vanhu vaviri' (2 people), 'varume vana' (4 men). When counting 'ma-' plurals like 'maminitsi' (minutes) or 'mavara' (colours), you use 'ma-': 'madhongi maviri' (2 donkeys), 'mavara matatu' (3 colours), 'maminitsi mashanu' (5 minutes).`,
            rule: 'Noun + Number Stem (-mwe = 1, -viri = 2, -tatu = 3, -na = 4, -shanu = 5) -> vanhu vaviri (2 people), maminitsi mashanu (5 minutes)',
        });
    }
    // 10. Locatives
    const locMatches = words.filter((w) => /^(pa|ku|mu)(tafura|mba|musha|chikoro|basa|musika|nze|harare|dhorobha|guta|mugwagwa|rutivi|musoro|kati|asi|nyika|nhandare|chigaro|uriri|ndiro|denga|mberi)/i.test(w) || ['pasi', 'pamusoro', 'padivi', 'pedyo', 'pakati', 'pamberi'].includes(w.toLowerCase()));
    if (locMatches.length > 0) {
        const lWord = locMatches[variationSeed % locMatches.length];
        notes.push({
            title: `Talking About Location: 'pa-', 'ku-', and 'mu-' ('${lWord}')`,
            content: `Look at how location is expressed with '${lWord}'. Instead of separate prepositions like 'on', 'to', or 'in', Shona attaches one of three location prefixes directly to the front of a noun:\n` +
                "• 'pa-' means 'at' or 'on' a specific point or surface (e.g., 'pachigaro' = on the chair, 'patafura' = on the table, 'pasi' = on the ground).\n" +
                "• 'ku-' means 'to', 'from', or 'at' a general destination (e.g., 'kuchikoro' = to school, 'kumusha' = to the rural home, 'kubasa' = at/to work).\n" +
                "• 'mu-' means 'inside' an enclosed space (e.g., 'mumba' = inside the house, 'mundiro' = in the plate, 'mumugwagwa' = in the road).",
            rule: 'pa- = on / at a point (pachigaro) | ku- = to / at a place (kuchikoro) | mu- = inside (mumba)',
        });
    }
    // 11. Questions
    if (lowerWords.some((q) => ['here', 'sei', 'ndeipi', 'chii'].includes(q))) {
        notes.push({
            title: "Asking Questions in Shona ('here', 'sei', 'ndeipi')",
            content: "Forming a yes/no question in Shona is remarkably easy: keep the normal statement word order and simply add the question word 'here' at the very end of the sentence! For example, 'Mvura ichanaya mangwana' ('It will rain tomorrow') becomes 'Mvura ichanaya here mangwana?' ('Will it rain tomorrow?'). For open questions, use 'sei?' ('how / why?', as in 'Wakafamba sei?' = 'How did you travel?') or 'ndeipi?' ('which one?', as in 'Ndeipi mota?' = 'Which car?').",
            rule: 'Statement + here? = Yes/No Question | Verb + sei? = How? | Ndeipi + Noun? = Which [noun]?',
        });
    }
    // 12. kuti
    if (lowerWords.includes('kuti')) {
        notes.push({
            title: "Connecting Clauses & Expressing Purpose with 'kuti'",
            content: "The connector 'kuti' is one of the most useful words in Shona. After verbs of speaking, thinking, or knowing (like 'akati' = said, 'unofunga' = you think, 'anoratidza' = shows), 'kuti' means 'that'. However, when placed after an action verb, 'kuti' means 'so that / in order to', and the following verb changes its final vowel from '-a' to '-e'! For instance, '-dya' (eat) becomes 'kuti tidye' ('so that we may eat'), and '-wana' (get) becomes 'kuti uwane' ('so that you may get').",
            rule: "kuti + [Subject Prefix + Verb ending in -e] = 'so that [someone] may...' (e.g., kuti tidye = so that we eat)",
        });
    }
    // 13. Conditionals
    if (lowerWords.some((c) => ['kana', 'usati', 'tisati', 'ndisati', 'kunyangwe'].includes(c))) {
        notes.push({
            title: "Saying 'If', 'When', and 'Before' ('kana' & '-sati')",
            content: "To link two events in time or condition, Shona uses 'kana' ('if / when'). When talking about a future condition ('If we work hard...'), the verb after 'kana' takes '-ka-' (e.g., 'kana tikashanda' = 'if we work'). When 'kana' sits between two nouns (like 'tsvuku kana nhema'), it simply means 'or'! To say 'before' something happens, Shona uses '-sati' ('not yet') followed by a past-form verb: 'usati wabuda' ('before you go out') or 'tisati tadya' ('before we eat').",
            rule: 'kana = if / when / or | [ndisati / usati / tisati] + past verb = before [I / you / we] do something',
        });
    }
    // 14. Possessives
    const possMatches = words.filter((w) => /(angu|ako|ake|edu|enyu|avo)$/i.test(w) && w.length >= 4);
    if (possMatches.length > 0) {
        const pWord = possMatches[variationSeed % possMatches.length];
        notes.push({
            title: `Possessive Pronouns: Saying 'My', 'Your', and 'Our' ('${pWord}')`,
            content: `In Shona, possessive words like '${pWord}' ('my/your/our/their') always follow the noun they belong to! The six core possessive stems are '-ngu' (my), '-ko' (your), '-ke' (his/her/its), '-du' (our), '-nyu' (your plural/polite), and '-vo' (their). A short linking sound ('wa-', 'ya-', 'ra-', 'cha-', 'dza-', 'ma-') attaches to the front of the stem to match the noun: for example, 'shamwari yangu' (my friend), 'munda wako' (your field), 'mabhuku edu' (our books), and 'kubudirira kwenyu' (your success).`,
            rule: 'Noun + [Linking Prefix + -ngu (my) / -ko (your) / -ke (his/her) / -du (our) / -nyu (your polite) / -vo (their)]',
        });
    }
    // 15. ne-
    const neMatches = words.filter((w) => /^ne[a-z]{3,}/i.test(w) && w.toLowerCase() !== 'nezuro');
    if (neMatches.length > 0) {
        const neW = neMatches[variationSeed % neMatches.length];
        notes.push({
            title: `Joining Words with 'ne-' ('and / with') in '${neW}'`,
            content: `Look closely at '${neW}'. In Shona, the word for 'and' or 'with' between nouns is not a separate word—instead, the prefix 'ne-' (or 'na-' before people's names) is written attached directly to the second noun! For example, 'ne-' + '${neW.slice(2)}' forms '${neW}'. You will see this everywhere in daily speech: 'sadza nemuriwo' ('sadza and vegetables'), 'nesimba' ('with strength'), and 'nekukasira' ('with haste / quickly').`,
            rule: 'ne- + Noun = and / with [Noun] (written as a single word, e.g., sadza nemuriwo = sadza and vegetables)',
        });
    }
    // 16. pane/kune/ine
    if (lowerWords.some((ex) => ['pane', 'kune', 'mune', 'ine', 'ane', 'tine', 'une', 'rine', 'chine', 'dzine', 'chiine'].includes(ex))) {
        notes.push({
            title: "Expressing 'Has/Have' and 'There Is/Are' ('-ne' & 'pane / kune')",
            content: "Shona does not use a separate verb like 'have'; instead, it combines a subject prefix with '-ne' ('with'). For people: 'ndine' (I have), 'une' (you have), 'ane' (he/she has), 'tine' (we have), 'vane' (they have). For things, the prefix matches the object: 'imba ine...' ('the house has...'), 'chivakwa chiine...' ('the building having...'). When combined with the location prefixes 'pa-', 'ku-', and 'mu-', it means 'there is / there are': 'pane' ('there is right here'), 'kune' ('there is in that area'), and 'mune' ('there is inside').",
            rule: 'Person/Thing + -ne = has/have (tine = we have, ine = it has) | pane / kune / mune = there is / there are',
        });
    }
    // 17. Passive Voice (-wa)
    const passiveMatches = words.filter((w) => /(ikw|irw|isw|erw|urw|orw|nzw|tw|kw|rw|mw|dw|gw|pw|tsv|zvw)a$/i.test(w) &&
        !['mvura', 'nyama', 'shuga', 'tafura', 'nguva', 'mbavha', 'nhasi', 'mangwana', 'enzou'].includes(w.toLowerCase()));
    if (passiveMatches.length > 0) {
        const pw = passiveMatches[variationSeed % passiveMatches.length];
        notes.push({
            title: `The Passive Voice ('-wa' / '-iwa') in '${pw}'`,
            content: `Notice how '${pw}' ends in '-wa' right before the final '-a'. In Shona, you turn an active verb into a passive verb ('is done / was done') simply by inserting '-w-' (or '-iw-' / '-ew-') before the final vowel '-a'! For example: '-ruka' (braid/weave) becomes '-rukwa' ('be braided/woven', as in 'wakarukwa'), '-vaka' (build) becomes '-vakwa' ('be built'), and '-bika' (cook) becomes '-bikwa' ('be cooked').`,
            rule: "Verb Root + -wa / -iwa = Passive ('be [verb]-ed') -> -ruka (braid) -> -rukwa (be braided); -vaka (build) -> -vakwa (be built)",
        });
    }
    // 18. Demonstratives
    const demSet = new Set([
        'uyu',
        'uyo',
        'ava',
        'avo',
        'iyi',
        'iyo',
        'iri',
        'iro',
        'aya',
        'ayo',
        'ichi',
        'icho',
        'izvi',
        'izvo',
        'idzi',
        'idzo',
        'urwu',
        'uhwu',
        'uku',
        'uko',
        'apa',
        'apo',
        'umu',
        'muno',
        'pano',
        'kuno',
    ]);
    const demMatches = words.filter((w) => demSet.has(w.toLowerCase()));
    if (demMatches.length > 0) {
        const dw = demMatches[variationSeed % demMatches.length];
        notes.push({
            title: `Pointing Out Things: Demonstratives ('${dw}' = 'this / that / here')`,
            content: `In Shona, words for 'this/these' and 'that/those' (like '${dw}') come AFTER the noun they point to and mirror the noun's group! Near demonstratives ('this / these / right here') repeat the noun class vowel: 'mwana uyu' (this child), 'shangu idzi' (these shoes), 'chivakwa ichi' (this building), 'bhuku iri' (this book). Replacing the final vowel with '-o' shifts the meaning to 'that / those / there': 'uyo' (that person), 'iyo' (that one), 'idzo' (those ones).`,
            rule: "Noun + Near Demonstrative ('uyu/iyi/iri/ichi/izvi/idzi' = this/these) | replace final vowel with '-o' ('uyo/iyo/iro/icho/izvo/idzo' = that/those)",
        });
    }
    // 19. Adverbs
    const advSet = new Set([
        'zvakanaka',
        'zvakasimba',
        'zvishoma',
        'chaizvo',
        'zvikuru',
        'kwazvo',
        'nekukurumidza',
        'nekukasira',
        'zvinyoronyoro',
        'zvakanyanya',
        'chose',
    ]);
    const advMatches = words.filter((w) => advSet.has(w.toLowerCase()));
    if (advMatches.length > 0) {
        const aw = advMatches[variationSeed % advMatches.length];
        notes.push({
            title: `Describing How Actions Are Done: Adverbs & Intensifiers ('${aw}')`,
            content: `To describe HOW an action is performed, Shona frequently uses the prefix 'zva-' / 'zvi-' or intensifiers like '${aw}'. Compare these high-frequency expressions you will hear every day: 'zvakanaka' ('well / neatly'), 'zvakasimba' ('firmly / strongly'), 'zvishoma' ('a little bit'), 'zvinyoronyoro' ('gently / softly'), and 'kwazvo', 'chaizvo', or 'zvikuru' ('very much / exceedingly').`,
            rule: 'Verb + Adverb of Manner/Degree (zvakanaka = well/neatly, zvakasimba = firmly, kwazvo/chaizvo/zvikuru = very much)',
        });
    }
    // 20. Clause Connectors
    const connSet = new Set(['asi', 'saka', 'uye', 'uyewo', 'nokuti', 'nekuti', 'pamwe']);
    const connMatches = words.filter((w) => connSet.has(w.toLowerCase()));
    if (connMatches.length > 0) {
        const cw = connMatches[variationSeed % connMatches.length];
        notes.push({
            title: `Linking Ideas Smoothly with '${cw}'`,
            content: `Longer Shona sentences flow naturally by linking two clauses with connectors like '${cw}'. The four essential connectors to master are: 'uye' / 'uyewo' ('and / furthermore' between two clauses), 'asi' ('but / however'), 'saka' ('so / therefore'), and 'nokuti' / 'nekuti' ('because').`,
            rule: 'Clause 1 + [uye (and) | asi (but) | saka (so/therefore) | nokuti (because)] + Clause 2',
        });
    }
    // Dynamic text-grounded morphological analysis for remaining slots or variation seed
    const uniqueLongWords = Array.from(new Set(words.filter((w) => w.length >= 5))).sort((a, b) => b.length - a.length);
    for (const lw of uniqueLongWords.slice(0, 4)) {
        if (notes.length < 3 || variationSeed > 0) {
            const morph = analyzeMorphemesAndClass(lw);
            notes.push({
                title: `Morphological & Concord Breakdown of '${lw}' ('${morph.literal_english}')`,
                content: `In this lesson, '${lw}' ('${morph.literal_english}') analyzes morphologically as ${morph.morphemes}. In ChiZezuru grammar, the class prefix governs subject, adjective, and possessive agreement across the clause so the listener can track which noun is performing or receiving the action.`,
                rule: `Lexical & Concord Structure: '${lw}' (${morph.literal_english}) -> ${morph.morphemes}`,
            });
        }
    }
    if (variationSeed > 0 && notes.length > 3) {
        const shift = variationSeed % notes.length;
        const rotated = [...notes.slice(shift), ...notes.slice(0, shift)];
        return rotated.slice(0, 3);
    }
    return notes.slice(0, 3);
}
const ZIMBABWE_CULTURAL_ENCYCLOPEDIA = [
    {
        primaryKeywords: [
            'wakarukwa',
            'akarukwa',
            'kuruka',
            'kurukwa',
            'zvirukwa',
            'vhudzi',
            'bvudzi',
            'madhiredzi',
            'nyarutatu',
            'hata',
        ],
        perspectives: [
            {
                title: "The Art of Hair Braiding ('Kuruka Musoro') in Zimbabwean Culture",
                content: "In Shona society, hair braiding ('kuruka musoro' or 'kuruka vhudzi') is both a treasured aesthetic art and an important social tradition. Across Harare, Bulawayo, and rural townships, women and girls gather at salons or on shaded verandas where skilled braiders weave intricate geometric patterns such as 'mabhanzi', three-strand plaits ('kuruka nyarutatu'), dreadlocks ('madhiredzi'), and neat cornrows ('lines').",
            },
            {
                title: 'Pre-Colonial & Contemporary Hairstyles as Social Identity in Mashonaland',
                content: "Historically among the Zezuru and neighbouring Shona peoples, hairstyles ('magerero nemarukiro emusoro') communicated age grade, marital status, and community celebration. Today, neatly braided hair ('musoro wakarukwa zvakanaka') remains a hallmark of 'kushambidzika' (personal neatness and dignity) for school, church gatherings, weddings ('michato'), and professional life.",
            },
        ],
    },
    {
        primaryKeywords: [
            'chigaro',
            'pachigaro',
            'zvigaro',
            'chituru',
            'masofa',
        ],
        perspectives: [
            {
                title: "Seating Etiquette & Respect ('Chigaro') in the Shona Household",
                content: "In traditional and modern Shona homes alike, seating arrangements ('kugara pachigaro') reflect age, kinship, and hospitality ('hunhu'). In a rural roundavel kitchen ('imba yekubikira'), elders traditionally sit on raised benches or carved wooden stools ('chigaro' / 'chituru'), while in urban living rooms ('imba yokutandarira') guests of honour are always offered the best seat first.",
            },
            {
                title: "Carved Wooden Stools ('Zvigaro') & Symbolism of Authority in Zimbabwe",
                content: "Hand-carved wooden headrests ('mutsago') and stools ('zvigaro') made from indigenous hardwoods like 'mukwa' have been symbols of status and leadership in Zimbabwe for centuries. In Shona idioms, 'chigaro' means both an everyday chair and a seat of leadership ('chigaro cheushe').",
            },
        ],
    },
    {
        primaryKeywords: [
            'shangu',
            'butsu',
            'bhutsu',
            'chitsiko',
            'tenisi',
            'yetenisi',
            'mhete',
        ],
        perspectives: [
            {
                title: "Dignified Dress ('Kushambidzika') & Footwear in Zimbabwean Daily Life",
                content: "Across Zimbabwe, personal presentation ('kushambidzika') is treated as a visible expression of self-respect and respect for others. Whether wearing canvas sneakers ('shangu yetenisi'), flat walking shoes ('butsu'), or heeled dress shoes ('shangu dzine chitsiko chakakwirira'), Zimbabweans take pride in clean, well-kept footwear.",
            },
            {
                title: "Gweru's Footwear Heritage & Everyday Shoe Terminology in ChiZezuru",
                content: "In ChiZezuru, 'shangu' refers generally to shoes, 'shangu yetenisi' refers to athletic sneakers/trainers, and 'bhutsu' (or 'butsu') refers to sturdy closed shoes or boots. Zimbabwe has a long footwear manufacturing heritage centred in the Midlands city of Gweru.",
            },
        ],
    },
    {
        primaryKeywords: [
            'chivakwa',
            'zvivakwa',
            'mafafutera',
            'muturikidzanwa',
            'yemuturikidzanwa',
            'kachitoro',
            'chitoro',
        ],
        perspectives: [
            {
                title: "Modernist High-Rise Architecture ('Zvivakwa Zvokudurikidzwa') in Harare",
                content: "Harare's central business district ('mudhorobha') is renowned for its modernist high-rise buildings ('zvivakwa zvakareba zvinoenda mudenga'). Iconic structures like the Eastgate Centre—designed by Zimbabwean architect Mick Pearce using natural biomimetic cooling inspired by indigenous termite mounds ('churu')—blend modern glass-and-concrete facades ('mafafutera akawanda') with environmental sustainability.",
            },
            {
                title: "Neighbourhood Tuckshops ('Kachitoro') & Community Commerce in Zimbabwe",
                content: "In Zimbabwean residential neighbourhoods ('munharaunda'), small neighbourhood shops ('zvitoro' or 'kachitoro') built near homes provide essential daily groceries—such as bread ('chingwa'), cooking oil ('mafuta'), and salt ('sauti')—within easy walking distance for local families.",
            },
        ],
    },
    {
        primaryKeywords: [
            'nhabvu',
            'wenhabvu',
            'chikwata',
            'zvikwata',
            'nhandare',
            'yinifomu',
        ],
        perspectives: [
            {
                title: "Football ('Mutambo weNhabvu') & Team Sports in Zimbabwe",
                content: "Team sports—led by football ('nhabvu'), netball, and school athletics—play a central role in Zimbabwean community life, from rural school pitches to urban stadiums like Rufaro Stadium in Harare and Barbourfields Stadium in Bulawayo. Competing teams ('zvikwata zviviri') wear distinctive kits ('yinifomu') cheered on by local supporters.",
            },
        ],
    },
    {
        primaryKeywords: [
            'maguru',
            'chikafu',
            'mundiro',
            'sadza',
            'muriwo',
            'mhiripiri',
            'jikichiri',
        ],
        perspectives: [
            {
                title: "Slow-Cooked Beef Tripe ('Maguru eMombe') & Traditional Shona Delicacies",
                content: "In Zimbabwean cuisine, beef tripe ('maguru emombe') slow-simmered until tender ('akabikwa zvine unyanzvi akaibva zvakanaka') in a rich tomato and onion gravy ('muto wakatsvukira') is a beloved traditional dish, often served in enamel plates ('ndiro yesimbi') alongside white maize 'sadza' and hot chilli relish ('mhiripiri').",
            },
        ],
    },
    {
        primaryKeywords: [
            'shizha',
            'mashizha',
            'maruva',
            'tsinga',
            'mukotopeya',
            'kanzira',
        ],
        perspectives: [
            {
                title: "Miombo Woodlands ('Masango eMusasa') & Botanical Observation in Zimbabwe",
                content: "Central Zimbabwe lies within the southern African Miombo woodland belt, alongside homestead fruit trees such as avocado ('muti wemukotopeya'), mango, and banana ('mibhanana'). Shona ethnobotany pays close attention to leaf venation ('mashizha netsinga dzawo') and seasonal moisture cycles during the dry ('chirimo') and rainy ('zhizha') seasons.",
            },
        ],
    },
    {
        primaryKeywords: [
            'motokari',
            'mudhudhudhu',
            'pamudhudhudhu',
            'mugwagwa',
            'tara',
        ],
        perspectives: [
            {
                title: "Tarred Highways ('Migwagwa ine Tara') & Motorcycles ('Midhudhudhu') in Zimbabwe",
                content: "Zimbabwe's road network links cities and rural districts via paved highways ('migwagwa ine tara'). Alongside cars ('motokari'), the onomatopoeic Shona noun 'mudhudhudhu' (motorcycle—named after the rhythmic 'dhu-dhu-dhu' sound of its engine) is widely used by urban couriers and rural outreach workers.",
            },
        ],
    },
    {
        primaryKeywords: [
            'rwizi',
            'kuyerera',
            'gwatara',
            'mugero',
        ],
        perspectives: [
            {
                title: "Seasonal Rains, Drainage Channels ('Gwatara') & River Safety in Zimbabwe",
                content: "During Zimbabwe's summer rainy season ('zhizha', November to March), stormwater channels ('gwatara' or 'mugero') and rivers ('rwizi') carry brisk runoff that nourishes moisture-loving crops like bananas ('mibhanana') and maize ('chibahwe'). Communities also emphasize river-crossing safety ('musayambuke rwizi rwuzere') during heavy rains.",
            },
        ],
    },
    {
        primaryKeywords: [
            'mabhuku',
            'ekunyorera',
            'raibhurari',
            'bvunzo',
            'mudzidzisi',
        ],
        perspectives: [
            {
                title: "Exercise Books ('Mabhuku eKunyorera') & Zimbabwe's High Literacy Tradition",
                content: "Zimbabwe boasts one of the highest literacy rates in Africa, rooted in strong family and community commitment to education ('dzidzo'). Students take pride in neatly covering and organizing their exercise notebooks ('mabhuku ekunyorera') and textbooks for school study.",
            },
        ],
    },
    {
        primaryKeywords: [
            'kuweredha',
            'haka',
            'makatapira',
            'piki',
            'mupinyi',
        ],
        perspectives: [
            {
                title: "Artisanal Metalworking ('Kuweredha') & Pangolin ('Haka') Conservation in Zimbabwe",
                content: "Skilled metalworking and welding ('basa remaoko rekuweredha') is a vital trade across Zimbabwe's urban home industries (such as Gazaland and Siyaso in Harare), fabricating gates, window frames, and farm implements. In Shona natural history and tradition, the pangolin ('haka'—distinguished by its protective overlapping scales 'makwapa' and digging claws 'nzara') is a strictly protected and culturally revered animal.",
            },
        ],
    },
    {
        primaryKeywords: [
            'mifananidzo',
            'pabendekete',
        ],
        perspectives: [
            {
                title: "Visual Art, Portraiture ('Mifananidzo') & Contemporary Expression in Zimbabwe",
                content: "In contemporary Zimbabwe, visual art and photography ('mifananidzo', derived from '-fanana' = to resemble) flourish across galleries and studios in Harare and Bulawayo, capturing expressive portraiture, traditional braiding styles ('zvirukwa'), and decorative artistry.",
            },
        ],
    },
];
async function generateTextbookCulturalNotesAsync(shonaText, englishTranslation, lessonNumber, variationSeed = 0, useAiMode = false) {
    // 1. If AI Mode is active (or Gemini API key is set when regenerating), use Gemini to write a brand-new, bespoke cultural note
    if ((useAiMode || variationSeed > 0) && getGeminiApiKey()) {
        const gemOut = await callGeminiJson(`You are writing a cultural, historical, geographical, or ethnographic note for Lesson ${lessonNumber} of an Assimil Shona (ChiZezuru) textbook.
Lesson Shona text: "${shonaText}"
Lesson English translation: "${englishTranslation}"
Variation angle: ${variationSeed}

Write ONE deeply researched, fascinating, concrete cultural/historical/geographical/sociolinguistic note directly relevant to the exact subject in this text (e.g. if the text is about a handball or football match, write about sports in Zimbabwe; if about a small shop with a low roof in hot weather, write about neighbourhood tuckshops and climate in Zimbabwe; if about shoes, braiding, farming, rivers, or family life, write specifically about that topic in Zimbabwe).
STRICT RULES:
- NEVER use generic boilerplate or filler phrases like "the speaker uses vivid ChiZezuru phrasing".
- NEVER mention unrelated topics (like Bata Shoes on a house lesson).
- Ground the cultural explanation directly in the exact theme and vocabulary of this passage.
Return JSON: {"title": "...", "content": "..."}`);
        if (gemOut &&
            typeof gemOut.title === 'string' &&
            typeof gemOut.content === 'string' &&
            gemOut.content.trim().length > 40) {
            return [{ title: gemOut.title.trim(), content: gemOut.content.trim() }];
        }
    }
    return generateTextbookCulturalNotes(shonaText, englishTranslation, lessonNumber, variationSeed);
}
function generateTextbookCulturalNotes(shonaText, englishTranslation, lessonNumber, variationSeed = 0) {
    const kb = loadTextbookKnowledge();
    const norm = normalizeTextKey(shonaText);
    // 1. Check exact curated per-sentence cultural notes first
    for (const [subKey, title, content] of kb.SENTENCE_CULTURAL_NOTES) {
        if (norm.includes(subKey.toLowerCase())) {
            return [{ title, content }];
        }
    }
    // 2. Strict primary-keyword whole-word matching (no loose cross-domain matching or unrelated Wikipedia tails)
    const shonaWords = new Set(norm.match(/[a-z']+/g) || []);
    let bestDomain = null;
    let bestScore = 0;
    for (const domain of ZIMBABWE_CULTURAL_ENCYCLOPEDIA) {
        let score = 0;
        for (const kw of domain.primaryKeywords) {
            if (shonaWords.has(kw.toLowerCase())) {
                score += 4;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestDomain = domain;
        }
    }
    // Only return a local note if there is a genuine primary keyword match (bestScore >= 4); otherwise return [] (nothing rather than an unrelated note)
    if (bestDomain && bestScore >= 4) {
        const persp = bestDomain.perspectives;
        return [persp[variationSeed % persp.length]];
    }
    return [];
}
function rotateOptions(correct, distractors, seed) {
    const uniqueDist = [];
    for (const d of distractors) {
        if (d !== correct && !uniqueDist.includes(d)) {
            uniqueDist.push(d);
        }
    }
    const chosen = [correct, ...uniqueDist.slice(0, 3)];
    if (chosen.length === 4) {
        const pos = seed % 4;
        const withoutCorrect = chosen.slice(1);
        withoutCorrect.splice(pos, 0, correct);
        return withoutCorrect;
    }
    return chosen.slice(0, 4);
}
function generateContextualExercises(shonaText, englishTranslation, lessonNumber, grammarNotes, literalGloss, variationSeed = 0) {
    const kb = loadTextbookKnowledge();
    const lowerWords = new Set(shonaText.toLowerCase().match(/[A-Za-z']+/g) || []);
    const scoredPools = [];
    kb.THEMATIC_NEW_EXERCISES.forEach((pool, idx) => {
        const overlap = (pool.tags || []).filter((t) => lowerWords.has(t.toLowerCase())).length;
        scoredPools.push([overlap, -idx, pool.drills || []]);
    });
    scoredPools.sort((a, b) => (b[0] !== a[0] ? b[0] - a[0] : b[1] - a[1]));
    const candidateDrills = [];
    for (const [, , drills] of scoredPools) {
        for (const d of drills) {
            if (!candidateDrills.includes(d)) {
                candidateDrills.push(d);
            }
        }
    }
    const exercises = [];
    if (candidateDrills.length > 0) {
        const startOffset = (lessonNumber * 3 + variationSeed * 5) % candidateDrills.length;
        const step = variationSeed % 2 === 0 ? 7 : 11;
        for (let i = 0; i < 3; i++) {
            const drill = candidateDrills[(startOffset + i * step) % candidateDrills.length];
            const opts = rotateOptions(drill.correct, drill.distractors || [], lessonNumber * 5 + i * 3 + variationSeed * 2 + 1);
            let exType = drill.type === 'translate' ? 'translate' : 'multiple_choice';
            if (String(drill.prompt || '').includes('______')) {
                exType = 'fill_blank';
            }
            exercises.push({
                type: exType,
                prompt: drill.prompt,
                options: opts,
                correct_answer: drill.correct,
                explanation: drill.explanation,
            });
        }
    }
    return exercises;
}
async function generateContextualExercisesAsync(shonaText, englishTranslation, lessonNumber, grammarNotes, literalGloss, variationSeed = 0, useAiMode = false) {
    if ((useAiMode || variationSeed > 0) && getGeminiApiKey()) {
        const gemOut = await callGeminiJson(`Create 3 varied Shona (ChiZezuru) exercises for Lesson ${lessonNumber} testing the vocabulary and grammar of this lesson on BRAND-NEW practice sentences (never asking for the already-shown translation of the lesson text).
Lesson Shona: "${shonaText}"
Lesson English: "${englishTranslation}"
Include a mix of "multiple_choice", "fill_blank" (using ______ in the prompt), and "translate". Each exercise must have 1 correct_answer, 3 plausible distractors, and a clear explanation.
Return JSON: {"exercises": [{"type": "multiple_choice"|"fill_blank"|"translate", "prompt": "...", "correct": "...", "distractors": ["...", "...", "..."], "explanation": "..."}]}`);
        if (gemOut && Array.isArray(gemOut.exercises) && gemOut.exercises.length >= 3) {
            return gemOut.exercises.slice(0, 3).map((ex, i) => {
                const opts = rotateOptions(String(ex.correct || ''), Array.isArray(ex.distractors) ? ex.distractors.map(String) : [], lessonNumber * 5 + i * 3 + variationSeed + 1);
                return {
                    type: ex.type === 'fill_blank' || String(ex.prompt || '').includes('______')
                        ? 'fill_blank'
                        : ex.type === 'translate'
                            ? 'translate'
                            : 'multiple_choice',
                    prompt: String(ex.prompt || ''),
                    options: opts,
                    correct_answer: String(ex.correct || ''),
                    explanation: String(ex.explanation || ''),
                };
            });
        }
    }
    return generateContextualExercises(shonaText, englishTranslation, lessonNumber, grammarNotes, literalGloss, variationSeed);
}
async function generateTextbookGrammarNotesAsync(shonaText, englishTranslation, lessonNumber, variationSeed = 0, useAiMode = false) {
    if ((useAiMode || variationSeed > 0) && getGeminiApiKey()) {
        const gemOut = await callGeminiJson(`Write 3 detailed, lesson-specific Shona (ChiZezuru) grammar notes for Lesson ${lessonNumber}, grounded directly in the exact words, prefixes, verb tenses, and noun class concords of this text:
Shona: "${shonaText}"
English: "${englishTranslation}"
Variation seed: ${variationSeed}
STRICT RULES:
- Every grammar note must quote and explain specific Shona words and grammatical patterns from the text above, plus clear example uses.
- Do NOT use any generic boilerplate or placeholder text.
Return JSON: {"grammar_notes": [{"title": "...", "content": "...", "rule": "..."}]}`);
        if (gemOut && Array.isArray(gemOut.grammar_notes) && gemOut.grammar_notes.length >= 3) {
            return gemOut.grammar_notes.slice(0, 3).map((g) => ({
                title: String(g.title || ''),
                content: String(g.content || ''),
                rule: String(g.rule || ''),
            }));
        }
    }
    return generateTextbookGrammarNotes(shonaText, englishTranslation, lessonNumber, variationSeed);
}
function buildReviewForSevenLessons(sevenLessons, reviewLessonNum) {
    const kb = loadTextbookKnowledge();
    const blockIdx = Math.floor(reviewLessonNum / 7);
    const startNum = Math.max(1, reviewLessonNum - 6);
    const rangeStr = `Lessons ${startNum}–${reviewLessonNum}`;
    const vocabPoints = [];
    const grammarPoints = [];
    const culturePoints = [];
    const topicsCovered = [];
    for (const l of sevenLessons) {
        const lNum = l.lesson_number || l.num;
        const shona = String(l.shona_text || '').trim();
        const eng = String(l.english_translation || '').trim();
        if (shona && eng) {
            const shortShona = shona.length <= 95 ? shona : `${shona.slice(0, 92)}...`;
            const shortEng = eng.length <= 95 ? eng : `${eng.slice(0, 92)}...`;
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
        if (cNotes.length > 0 &&
            typeof cNotes[0] === 'object' &&
            cNotes[0] !== null &&
            culturePoints.length < 4) {
            const ct = String(cNotes[0].title || '');
            const cc = String(cNotes[0].content || '');
            const firstSent = cc ? `${cc.split('. ')[0]}.` : '';
            if (ct)
                culturePoints.push(`${ct}: ${firstSent}`);
        }
    }
    const bankKey = String(((blockIdx - 1) % 14) + 1);
    const rawBank = kb.REVIEW_BLOCK_NEW_EXERCISES[bankKey] || kb.REVIEW_BLOCK_NEW_EXERCISES['1'] || [];
    const reviewExercises = [];
    rawBank.forEach((item, idx) => {
        const opts = rotateOptions(item.correct, item.distractors || [], reviewLessonNum * 3 + idx);
        let promptText = item.prompt;
        if (blockIdx > 14 && promptText.startsWith(`Review ${bankKey} `)) {
            promptText = promptText.replace(`Review ${bankKey} `, `Review ${blockIdx} `);
        }
        let exType = item.type === 'translate' ? 'translate' : 'multiple_choice';
        if (promptText.includes('______')) {
            exType = 'fill_blank';
        }
        reviewExercises.push({
            type: exType,
            prompt: promptText,
            options: opts,
            correct_answer: item.correct,
            explanation: item.explanation,
        });
    });
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
        review_exercises: reviewExercises.slice(0, 6),
        reviewed_lessons: sevenLessons.map((l) => Number(l.lesson_number || l.num)),
    };
}
function calculateDifficultyScore(shonaText, durationSeconds) {
    const words = shonaText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    if (wordCount === 0)
        return 999.0;
    const avgWordLen = words.reduce((acc, w) => acc + w.length, 0) / wordCount;
    return Number((wordCount * 1.8 + durationSeconds * 2.0 + avgWordLen * 1.2).toFixed(2));
}
async function enrichClipObject(rawClip, lessonNumber, variationSeed = 0, useAiMode = false) {
    const shonaText = String(rawClip.shona_text || rawClip.transcript || '').trim();
    const durationSeconds = Number(rawClip.duration_seconds || 5.0);
    const { englishTranslation, dialogue } = await resolveIdiomaticTranslationAndDialogue(shonaText, variationSeed, useAiMode);
    const literalGloss = dialogue.flatMap((d) => d.gloss_breakdown || []);
    const grammarNotes = await generateTextbookGrammarNotesAsync(shonaText, englishTranslation, lessonNumber, variationSeed, useAiMode);
    const culturalNotes = await generateTextbookCulturalNotesAsync(shonaText, englishTranslation, lessonNumber, variationSeed, useAiMode);
    const activeExercises = await generateContextualExercisesAsync(shonaText, englishTranslation, lessonNumber, grammarNotes, literalGloss, variationSeed, useAiMode);
    const difficultyScore = rawClip.difficulty_score !== undefined
        ? Number(rawClip.difficulty_score)
        : calculateDifficultyScore(shonaText, durationSeconds);
    return {
        ...rawClip,
        shona_text: shonaText,
        english_translation: englishTranslation,
        dialogue,
        literal_gloss: literalGloss,
        grammar_notes: grammarNotes,
        cultural_notes: culturalNotes,
        active_exercises: activeExercises,
        difficulty_score: difficultyScore,
    };
}
