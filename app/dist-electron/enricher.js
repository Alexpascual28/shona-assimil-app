"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTextKey = normalizeTextKey;
exports.splitShonaSentences = splitShonaSentences;
exports.translateShonaSentenceIdiomatic = translateShonaSentenceIdiomatic;
exports.resolveIdiomaticTranslationAndDialogue = resolveIdiomaticTranslationAndDialogue;
exports.analyzeMorphemesAndClass = analyzeMorphemesAndClass;
exports.generateTextbookGrammarNotes = generateTextbookGrammarNotes;
exports.generateTextbookCulturalNotes = generateTextbookCulturalNotes;
exports.generateContextualExercises = generateContextualExercises;
exports.buildReviewForSevenLessons = buildReviewForSevenLessons;
exports.calculateDifficultyScore = calculateDifficultyScore;
exports.enrichClipObject = enrichClipObject;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const child_process_1 = require("child_process");
let cachedKnowledge = null;
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
function normalizeTextKey(text) {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
}
function splitShonaSentences(shonaText) {
    const cleaned = shonaText.trim().replace(/\s+/g, ' ');
    if (!cleaned)
        return [];
    const rawParts = cleaned.split(/(?<=[.!?])\s+/);
    const sentences = [];
    for (const part of rawParts) {
        const p = part.trim();
        if (!p)
            continue;
        if (sentences.length > 0 &&
            (sentences[sentences.length - 1].match(/"/g) || []).length % 2 === 1) {
            sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${p}`;
        }
        else {
            sentences.push(p);
        }
    }
    return sentences.length > 0 ? sentences : [cleaned];
}
function fetchHttpsText(url, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
        const req = https_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShonaAssimilEnricher/1.0',
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
async function translateShonaSentenceIdiomatic(shonaSent, variationSeed = 0) {
    const sClean = shonaSent.trim();
    if (!sClean)
        return '';
    const kb = loadTextbookKnowledge();
    const norm = normalizeTextKey(sClean);
    const normNoPunct = norm.replace(/[.!?;:,]+$/, '');
    if (variationSeed === 0) {
        for (const [k, v] of Object.entries(kb.IDIOMATIC_SENTENCE_TRANSLATIONS)) {
            const kNorm = normalizeTextKey(k);
            if (kNorm === norm || kNorm.replace(/[.!?;:,]+$/, '') === normNoPunct) {
                return v;
            }
        }
        for (const entry of kb.VIBEVOICE_PASSAGE_TRANSLATIONS) {
            const pairs = entry.sentences || [];
            for (const [sPart, ePart] of pairs) {
                const spNorm = normalizeTextKey(sPart).replace(/[.!?;:,]+$/, '');
                if (spNorm === normNoPunct) {
                    return ePart;
                }
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
            if (typeof candidate === 'string' && candidate.trim() && !candidate.includes('MYMEMORY WARNING')) {
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
        if (candidate && normalizeTextKey(candidate) !== norm) {
            return variationSeed > 0 ? applyIdiomaticVariation(candidate, variationSeed) : candidate;
        }
    }
    // Fallback check in textbook dictionary even if variationSeed > 0
    for (const [k, v] of Object.entries(kb.IDIOMATIC_SENTENCE_TRANSLATIONS)) {
        const kNorm = normalizeTextKey(k);
        if (kNorm === norm || kNorm.replace(/[.!?;:,]+$/, '') === normNoPunct) {
            return variationSeed > 0 ? applyIdiomaticVariation(v, variationSeed) : v;
        }
    }
    for (const entry of kb.VIBEVOICE_PASSAGE_TRANSLATIONS) {
        const pairs = entry.sentences || [];
        for (const [sPart, ePart] of pairs) {
            const spNorm = normalizeTextKey(sPart).replace(/[.!?;:,]+$/, '');
            if (spNorm === normNoPunct) {
                return variationSeed > 0 ? applyIdiomaticVariation(ePart, variationSeed) : ePart;
            }
        }
    }
    throw new Error(`Could not translate Shona sentence idiomatically: "${sClean}"`);
}
function applyIdiomaticVariation(englishSent, seed) {
    if (seed <= 0)
        return englishSent;
    const swaps = [
        [/\bquickly\b/gi, ['rapidly', 'promptly', 'right away', 'quickly']],
        [/\bvery\b/gi, ['truly', 'deeply', 'exceedingly', 'very']],
        [/\bchildren\b/gi, ['kids', 'youngsters', 'children']],
        [/\bmother\b/gi, ['Mom', 'Mother']],
        [/\bfather\b/gi, ['Dad', 'Father']],
        [/\bstarted\b/gi, ['began', 'commenced', 'started']],
        [/\bhelped\b/gi, ['assisted', 'supported', 'helped']],
        [/\bhappy\b/gi, ['glad', 'joyful', 'pleased', 'happy']],
        [/\bimportant\b/gi, ['vital', 'essential', 'key', 'important']],
        [/\bmany\b/gi, ['numerous', 'plenty of', 'many']],
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
async function resolveIdiomaticTranslationAndDialogue(shonaText, variationSeed = 0) {
    const kb = loadTextbookKnowledge();
    const norm = normalizeTextKey(shonaText);
    const normNoPunct = norm.replace(/[.!?;:,]+$/, '');
    // 1. Check IDIOMATIC_SENTENCE_TRANSLATIONS
    for (const [key, eng] of Object.entries(kb.IDIOMATIC_SENTENCE_TRANSLATIONS)) {
        const kNorm = normalizeTextKey(key);
        if (kNorm === norm || kNorm.replace(/[.!?;:,]+$/, '') === normNoPunct) {
            const finalEng = variationSeed > 0 ? applyIdiomaticVariation(eng, variationSeed) : eng;
            if (shonaText.includes(';')) {
                const sParts = shonaText.split(';').map((p) => p.trim()).filter(Boolean);
                let eParts = finalEng.replace(/\?/g, '?.').replace(/;/g, '.').split('.').map((p) => p.trim()).filter(Boolean);
                if (sParts.length === eParts.length && sParts.length > 1) {
                    return {
                        englishTranslation: finalEng,
                        dialogue: sParts.map((sp, idx) => ({
                            speaker: 'Mutauri',
                            shona: sp,
                            english: eParts[idx].endsWith('.') || eParts[idx].endsWith('?') ? eParts[idx] : `${eParts[idx]}.`,
                        })),
                    };
                }
            }
            return {
                englishTranslation: finalEng,
                dialogue: [{ speaker: 'Mutauri', shona: shonaText.trim(), english: finalEng }],
            };
        }
    }
    // 2. Check VIBEVOICE_PASSAGE_TRANSLATIONS
    for (const entry of kb.VIBEVOICE_PASSAGE_TRANSLATIONS) {
        const mKey = normalizeTextKey(entry.match || '');
        if (mKey && norm.includes(mKey)) {
            const rawPairs = entry.sentences || [];
            if (rawPairs.length > 0) {
                const dialogue = rawPairs.map(([sSent, eSent]) => ({
                    speaker: 'Mutauri',
                    shona: sSent,
                    english: variationSeed > 0 ? applyIdiomaticVariation(eSent, variationSeed) : eSent,
                }));
                const fullEng = variationSeed > 0
                    ? dialogue.map((d) => d.english).join(' ')
                    : String(entry.english || dialogue.map((d) => d.english).join(' '));
                return { englishTranslation: fullEng, dialogue };
            }
            const fallbackEng = variationSeed > 0 ? applyIdiomaticVariation(entry.english, variationSeed) : entry.english;
            return {
                englishTranslation: fallbackEng,
                dialogue: [{ speaker: 'Mutauri', shona: shonaText.trim(), english: fallbackEng }],
            };
        }
    }
    // 3. Sentence-by-sentence idiomatic translation for any new clip downloaded from Hugging Face
    const shonaSentences = splitShonaSentences(shonaText);
    const dialogue = [];
    const engSentences = [];
    for (const sSent of shonaSentences) {
        const eSent = await translateShonaSentenceIdiomatic(sSent, variationSeed);
        dialogue.push({
            speaker: 'Mutauri',
            shona: sSent,
            english: eSent,
        });
        engSentences.push(eSent);
    }
    return {
        englishTranslation: engSentences.join(' ').trim(),
        dialogue,
    };
}
const NOUN_CLASS_PREFIXES = [
    ['vaka', 'va- (Class 2) + -ka- (remote past)', 'Verb (Class 2 Past)'],
    ['ndiri', 'ndi- (1st sg) + -ri (copula)', 'Verb (1st Sg Progressive)'],
    ['tiri', 'ti- (1st pl) + -ri (copula)', 'Verb (1st Pl Progressive)'],
    ['vari', 'va- (Class 2) + -ri (copula)', 'Verb (Class 2 Progressive)'],
    ['ndino', 'ndi- (1st sg) + -no- (present habitual)', 'Verb (1st Sg Present)'],
    ['vano', 'va- (Class 2) + -no- (present habitual)', 'Verb (Class 2 Present)'],
    ['tino', 'ti- (1st pl) + -no- (present habitual)', 'Verb (1st Pl Present)'],
    ['uno', 'u- (2nd sg) + -no- (present habitual)', 'Verb (2nd Sg Present)'],
    ['ano', 'a- (Class 1) + -no- (present habitual)', 'Verb (Class 1 Present)'],
    ['ndaka', 'nda- (1st sg) + -ka- (past)', 'Verb (1st Sg Past)'],
    ['taka', 'ta- (1st pl) + -ka- (past)', 'Verb (1st Pl Past)'],
    ['waka', 'wa- (2nd sg) + -ka- (past)', 'Verb (2nd Sg Past)'],
    ['aka', 'a- (Class 1) + -ka- (past)', 'Verb (Class 1 Past)'],
    ['yaka', 'ya- (Class 9) + -ka- (past)', 'Verb (Class 9 Past)'],
    ['zvi', 'zvi- (Class 8 plural)', 'Class 8 (zvi-)'],
    ['chi', 'chi- (Class 7 singular)', 'Class 7 (chi-)'],
    ['vanhu', 'va- (Class 2) + -nhu (person)', 'Class 2 (va-)'],
    ['munhu', 'mu- (Class 1) + -nhu (person)', 'Class 1 (mu-)'],
    ['vana', 'va- (Class 2) + -na (child)', 'Class 2 (va-)'],
    ['mwana', 'mu- (Class 1) + -ana (child)', 'Class 1 (mu-)'],
    ['mu', 'mu- (Class 1/3/18 prefix)', 'Class 1/3/18 (mu-)'],
    ['va', 'va- (Class 2 plural / honorific)', 'Class 2 (va-)'],
    ['ma', 'ma- (Class 6 plural)', 'Class 6 (ma-)'],
    ['ku', 'ku- (Class 15 infinitive / Class 17 locative)', 'Class 15/17 (ku-)'],
    ['pa', 'pa- (Class 16 locative: at/on)', 'Class 16 (pa-)'],
    ['ne', 'ne- (associative/conjunctive: with/and)', 'Conjunctive (ne-)'],
    ['na', 'na- (associative: with/and)', 'Conjunctive (na-)'],
];
function analyzeMorphemesAndClass(word) {
    const kb = loadTextbookKnowledge();
    const clean = word.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
    if (!clean) {
        return { shona: word, literal_english: word, morphemes: word, noun_class: 'Particle' };
    }
    if (kb.BEGINNER_WORD_GLOSS[clean]) {
        const [morph, nclass, gloss] = kb.BEGINNER_WORD_GLOSS[clean];
        return { shona: word, literal_english: gloss, morphemes: morph, noun_class: nclass };
    }
    for (const [prefix, morphDesc, nclass] of NOUN_CLASS_PREFIXES) {
        if (clean.startsWith(prefix) && clean.length > prefix.length + 1) {
            const stem = clean.slice(prefix.length);
            const stemGloss = kb.BEGINNER_WORD_GLOSS[stem]?.[2] || stem;
            return {
                shona: word,
                literal_english: stemGloss,
                morphemes: `${morphDesc} + -${stem}`,
                noun_class: nclass,
            };
        }
    }
    return {
        shona: word,
        literal_english: clean,
        morphemes: `${clean} (root)`,
        noun_class: 'Lexical Root',
    };
}
function generateTextbookGrammarNotes(shonaText, englishTranslation, lessonNumber, variationSeed = 0) {
    const lower = shonaText.toLowerCase();
    const words = shonaText.match(/[A-Za-z']+/g) || [];
    const lowerWords = words.map((w) => w.toLowerCase());
    const notes = [];
    // 1. Greetings
    const greetSet = new Set(['mangwanani', 'masikati', 'manheru', 'manhero', 'mhoro', 'makadini', 'waswera']);
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
        'huyai', 'uyai', 'batai', 'vhara', 'tora', 'svika', 'dzoka', 'rima',
        'dzidza', 'tsvaga', 'vhenekera', 'chiuya', 'chigara',
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
        'ndamuka', 'wabudirira', 'ndaisa', 'chapera', 'ndapedza', 'ndawana',
        'ndasiya', 'watanga', 'ndafara', 'yanaya', 'ranonoka', 'yafa',
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
        'tsvuku', 'nhema', 'tema', 'chena', 'girinhi', 'girini', 'bhuruu',
        'bhurauni', 'orenji', 'ruvara', 'mavara', 'goridhe', 'pingi',
    ];
    const colourMatches = words.filter((w) => colourKeywords.some((c) => w.toLowerCase().includes(c)));
    if (colourMatches.length > 0) {
        const cWord = colourMatches[variationSeed % colourMatches.length];
        notes.push({
            title: `Colours & Describing Objects in Shona ('${cWord}')`,
            content: `This passage uses colour vocabulary such as '${cWord}'. Shona has three traditional core colour adjectives that change their prefix slightly to match the noun they describe: '-chena' (white/clean, e.g., 'ruvara ruchena' or 'shangu chena'), '-tema / nhema' (black/dark, e.g., 'mota nhema' or 'ruvara rutema'), and '-tsvuku' (red/bright brown, e.g., 'mota tsvuku' or 'ruvara rutsvuku'). For other colours like green ('girinhi'), blue ('bhuruu'), or orange ('orenji'), speakers typically say 'ruvara rwe-' ('the colour of...') followed by the colour name, as in 'ruvara rwegirinhi' (green).`,
            rule: 'Core Colours: -chena (white), -tema / nhema (black), -tsvuku (red) | Phrase pattern: ruvara rwe-[colour] (e.g., ruvara rwegirinhi)',
        });
    }
    // 9. Numbers
    const numSet = new Set([
        'chimwe', 'mumwe', 'imwe', 'imwechete', 'mumwechete', 'maviri', 'vaviri',
        'mbiri', 'mitatu', 'matatu', 'rutatu', 'nhatu', 'zvitatatu', 'mana', 'vana', 'ina', 'mashanu',
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
    const locMatches = words.filter((w) => /^(pa|ku|mu)(tafura|mba|musha|chikoro|basa|musika|nze|harare|dhorobha|guta|mugwagwa|rutivi|musoro|kati|asi|nyika|nhandare)/i.test(w) || ['pasi', 'pamusoro', 'padivi', 'pedyo', 'pakati'].includes(w.toLowerCase()));
    if (locMatches.length > 0) {
        const lWord = locMatches[variationSeed % locMatches.length];
        notes.push({
            title: `Talking About Location: 'pa-', 'ku-', and 'mu-' ('${lWord}')`,
            content: `Look at how location is expressed with '${lWord}'. Instead of separate prepositions like 'on', 'to', or 'in', Shona attaches one of three location prefixes directly to the front of a noun:\n` +
                "• 'pa-' means 'at' or 'on' a specific point or surface (e.g., 'patafura' = on the table, 'pamusika' = at the market, 'pasi' = on the ground).\n" +
                "• 'ku-' means 'to', 'from', or 'at' a general destination (e.g., 'kuchikoro' = to school, 'kumusha' = to the rural home, 'kubasa' = at/to work).\n" +
                "• 'mu-' means 'inside' an enclosed space (e.g., 'mumba' = inside the house, 'muguta' = in the city, 'mumugwagwa' = in the road).",
            rule: 'pa- = on / at a point (patafura) | ku- = to / at a place (kuchikoro) | mu- = inside (mumba)',
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
            content: "The connector 'kuti' is one of the most useful words in Shona. After verbs of speaking, thinking, or knowing (like 'akati' = said, 'unofunga' = you think, 'ndinoziva' = I know), 'kuti' means 'that'. However, when placed after an action verb, 'kuti' means 'so that / in order to', and the following verb changes its final vowel from '-a' to '-e'! For instance, '-dya' (eat) becomes 'kuti tidye' ('so that we may eat'), and '-wana' (get) becomes 'kuti uwane' ('so that you may get').",
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
    if (lowerWords.some((ex) => ['pane', 'kune', 'mune', 'ine', 'ane', 'tine', 'une', 'rine', 'chine', 'dzine'].includes(ex))) {
        notes.push({
            title: "Expressing 'Has/Have' and 'There Is/Are' ('-ne' & 'pane / kune')",
            content: "Shona does not use a separate verb like 'have'; instead, it combines a subject prefix with '-ne' ('with'). For people: 'ndine' (I have), 'une' (you have), 'ane' (he/she has), 'tine' (we have), 'vane' (they have). For things, the prefix matches the object: 'imba ine...' ('the house has...'), 'rori rine...' ('the truck has...'). When combined with the location prefixes 'pa-', 'ku-', and 'mu-', it means 'there is / there are': 'pane' ('there is right here'), 'kune' ('there is in that area'), and 'mune' ('there is inside').",
            rule: 'Person/Thing + -ne = has/have (tine = we have, ine = it has) | pane / kune / mune = there is / there are',
        });
    }
    // 17. Past Habitual (-ai-)
    const aiMatches = words.filter((w) => /^(nd|w|v|t|m|y|r|ch|zv|dz|hw|kw)?ai[a-z]{2,}a$/i.test(w) &&
        !['chaizvo', 'pairi', 'kwaita', 'maitiro'].includes(w.toLowerCase()));
    if (aiMatches.length > 0) {
        const aiW = aiMatches[variationSeed % aiMatches.length];
        notes.push({
            title: `Talking About How Things Used to Be: The '-ai-' Past Habitual ('${aiW}')`,
            content: `In this sentence, '${aiW}' uses the past habitual/imperfect marker '-ai-'. Whenever you talk about how people used to live in historical times, or an ongoing state in the past ('used to do', 'was/were doing'), Shona combines the subject prefix with '-ai-' + the verb stem: for example, 'vaigara' ('they used to live'), 'vaitengeserana' ('they used to trade with one another'), 'yaivakwa' ('it used to be built'), and 'hwaizivikanwa' ('it was renowned/known').`,
            rule: "Subject Prefix + -ai- + Verb Stem = 'used to [verb] / was [verb]-ing' (va- + -ai- + -bva = vaibva, 'they came from')",
        });
    }
    // 18. Passive Voice (-wa)
    const passiveMatches = words.filter((w) => /(ikw|irw|isw|erw|urw|orw|nzw|tw|kw|rw|mw|dw|gw|pw|tsv|zvw)a$/i.test(w) &&
        !['mvura', 'nyama', 'shuga', 'tafura', 'nguva', 'mbavha', 'nhasi', 'mangwana', 'enzou'].includes(w.toLowerCase()));
    if (passiveMatches.length > 0) {
        const pw = passiveMatches[variationSeed % passiveMatches.length];
        notes.push({
            title: `The Passive Voice ('-wa' / '-iwa') in '${pw}'`,
            content: `Notice how '${pw}' ends in '-wa' right before the final '-a'. In Shona, you turn an active verb into a passive verb ('is done / was done') simply by inserting '-w-' (or '-iw-' / '-ew-') before the final vowel '-a'! For example: '-bika' (cook) becomes '-bikwa' ('be cooked', as in 'pakubikwa'), '-vaka' (build) becomes '-vakwa' ('be built'), '-ruma' (bite/sting) becomes '-rumwa' ('be stung', as in 'arumwa nenyuchi'), and '-zivikanwa' means 'be known'.`,
            rule: "Verb Root + -wa / -iwa = Passive ('be [verb]-ed') -> -bika (cook) -> -bikwa (be cooked); -vaka (build) -> -vakwa (be built)",
        });
    }
    // 19. Demonstratives
    const demSet = new Set([
        'uyu', 'uyo', 'ava', 'avo', 'iyi', 'iyo', 'iri', 'iro', 'aya', 'ayo',
        'ichi', 'icho', 'izvi', 'izvo', 'idzi', 'idzo', 'urwu', 'uhwu', 'uku',
        'uko', 'apa', 'apo', 'umu', 'muno', 'pano', 'kuno',
    ]);
    const demMatches = words.filter((w) => demSet.has(w.toLowerCase()));
    if (demMatches.length > 0) {
        const dw = demMatches[variationSeed % demMatches.length];
        notes.push({
            title: `Pointing Out Things: Demonstratives ('${dw}' = 'this / that / here')`,
            content: `In Shona, words for 'this/these' and 'that/those' (like '${dw}') come AFTER the noun they point to and mirror the noun's group! Near demonstratives ('this / these / right here') repeat the noun class vowel: 'mwana uyu' (this child), 'nyama iyi' (this meat), 'kapu iyi' (this cup), 'bhuku iri' (this book), 'zvinhu izvi' (these things). Replacing the final vowel with '-o' shifts the meaning to 'that / those / there': 'uyo' (that person), 'iyo' (that one), 'uko' (over there).`,
            rule: "Noun + Near Demonstrative ('uyu/iyi/iri/ichi/izvi' = this/these) | replace final vowel with '-o' ('uyo/iyo/iro/icho/izvo' = that/those)",
        });
    }
    // 20. Infinitives with ku-
    const infMatches = words.filter((w) => /^(ne|pa|mu|ye|we|re|che|zve|dze)?ku[a-z]{3,}a$/i.test(w) &&
        !['kumba', 'kumusha', 'kunze', 'kure', 'kuno'].includes(w.toLowerCase()));
    if (infMatches.length > 0) {
        const iw = infMatches[variationSeed % infMatches.length];
        notes.push({
            title: `Infinitive Verbs & Action Nouns with 'ku-' ('${iw}')`,
            content: `Look at '${iw}' in this sentence. Every Shona verb in its dictionary ('to do') form begins with 'ku-': for example, 'kudya' (to eat), 'kutenga' (to buy), 'kubhadhara' (to pay), 'kuona' (to see), and 'kurwa' (to fight). Because 'ku-' verbs also behave as action nouns ('eating', 'paying', 'working'), you can attach linking prefixes directly to them: 'yekubhadhara' ('for paying'), 'pakubikwa' ('in the cooking'), and 'nekuona' ('by/with seeing').`,
            rule: "ku- + Verb Stem = 'to [verb] / [verb]-ing' (ku- + -tenga = kutenga, 'to buy'; ye- + kubhadhara = yekubhadhara, 'for paying')",
        });
    }
    // 21. Adverbs
    const advSet = new Set([
        'zvakanaka', 'zvakasimba', 'zvishoma', 'chaizvo', 'zvikuru',
        'nekukurumidza', 'nekukasira', 'zvinyoronyoro', 'zvakanyanya', 'chose',
    ]);
    const advMatches = words.filter((w) => advSet.has(w.toLowerCase()));
    if (advMatches.length > 0) {
        const aw = advMatches[variationSeed % advMatches.length];
        notes.push({
            title: `Describing How Actions Are Done: Adverbs & Intensifiers ('${aw}')`,
            content: `To describe HOW an action is performed, Shona frequently uses the prefix 'zva-' / 'zvi-' or intensifiers like '${aw}'. Compare these high-frequency expressions you will hear every day: 'zvakanaka' ('well / nicely'), 'zvakasimba' ('firmly / strongly'), 'zvishoma' ('a little bit'), 'zvinyoronyoro' ('gently / softly'), and 'chaizvo' or 'zvikuru' ('very much').`,
            rule: 'Verb + Adverb of Manner/Degree (zvakanaka = well, zvakasimba = firmly, zvishoma = a little, chaizvo/zvikuru = very much)',
        });
    }
    // 22. Clause Connectors
    const connSet = new Set(['asi', 'saka', 'uye', 'nokuti', 'nekuti', 'pamwe']);
    const connMatches = words.filter((w) => connSet.has(w.toLowerCase()));
    if (connMatches.length > 0) {
        const cw = connMatches[variationSeed % connMatches.length];
        notes.push({
            title: `Linking Ideas Smoothly with '${cw}'`,
            content: `Longer Shona sentences flow naturally by linking two clauses with connectors like '${cw}'. The four essential connectors to master are: 'uye' ('and / furthermore' between two clauses), 'asi' ('but / however'), 'saka' ('so / therefore'), and 'nokuti' / 'nekuti' ('because').`,
            rule: 'Clause 1 + [uye (and) | asi (but) | saka (so/therefore) | nokuti (because)] + Clause 2',
        });
    }
    // 23. Participial -chi-
    const chiMatches = words.filter((w) => /^(nd|u|a|t|m|v|i|r|ch|zv|dz|rw|k|p)?ichi[a-z]{2,}a$|^(a|va|i|ri|chi|zvi|dzi)chi[a-z]{3,}a$/i.test(w));
    if (chiMatches.length > 0) {
        const chw = chiMatches[variationSeed % chiMatches.length];
        notes.push({
            title: `Simultaneous Actions: The Participial '-chi-' Marker ('${chw}')`,
            content: `In '${chw}', the infix '-chi-' expresses an accompanying or simultaneous action ('while doing / as it does'). For example: 'achifara' ('while rejoicing'), 'vachitaurirana' ('while conversing with one another'), and 'zvichiratidza' ('thereby showing').`,
            rule: "Subject Prefix + -chi- + Verb Stem = 'while [verb]-ing / thereby [verb]-ing'",
        });
    }
    // Dynamic text-grounded morphological analysis for remaining slots or variation seed
    const uniqueLongWords = Array.from(new Set(words.filter((w) => w.length >= 5))).sort((a, b) => b.length - a.length);
    for (const lw of uniqueLongWords.slice(0, 3)) {
        if (notes.length < 3 || variationSeed > 0) {
            const morph = analyzeMorphemesAndClass(lw);
            const shortShona = shonaText.length > 80 ? `${shonaText.slice(0, 80)}...` : shonaText;
            const shortEng = englishTranslation.length > 80 ? `${englishTranslation.slice(0, 80)}...` : englishTranslation;
            notes.push({
                title: `Morphological & Lexical Structure of '${lw}' (${morph.noun_class})`,
                content: `In this lesson's text ("${shortShona}"), the word '${lw}' (${morph.morphemes}) anchors the idiomatic meaning "${shortEng}". Notice how Shona agglutinates class prefixes and verbal/nominal extensions onto '${lw.toLowerCase()}' so a single word encodes both grammatical concord and core meaning.`,
                rule: `Key lexical item in Lesson ${lessonNumber}: '${lw}' [${morph.morphemes}]`,
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
function generateTextbookCulturalNotes(shonaText, englishTranslation, lessonNumber, variationSeed = 0) {
    const kb = loadTextbookKnowledge();
    const norm = normalizeTextKey(shonaText);
    if (variationSeed === 0) {
        for (const [subKey, title, content] of kb.SENTENCE_CULTURAL_NOTES) {
            if (norm.includes(subKey.toLowerCase())) {
                return [{ title, content }];
            }
        }
    }
    const shonaSentences = splitShonaSentences(shonaText);
    const engSentences = splitShonaSentences(englishTranslation);
    const firstShona = shonaSentences[variationSeed % Math.max(1, shonaSentences.length)] || shonaText.trim();
    const firstEng = engSentences[variationSeed % Math.max(1, engSentences.length)] || englishTranslation.trim();
    const lowerBoth = `${norm} ${englishTranslation.toLowerCase()}`;
    const topicCandidates = [];
    if (['chikoro', 'mudzidzisi', 'vadzidzi', 'bvunzo', 'kudzidza', 'school', 'teacher', 'student', 'library', 'book'].some((k) => lowerBoth.includes(k))) {
        topicCandidates.push({
            title: `Education & Academic Dedication in Zimbabwe (Lesson ${lessonNumber})`,
            content: `Anchored in "${firstShona}" (${firstEng}), this passage reflects the deep value placed on schooling ('chikoro') and lifelong learning across Zimbabwe. From rural primary schools to urban libraries and universities, teachers ('vadzidzi' and 'vadzidzisi') emphasize both academic mastery and 'hunhu'—respectful conduct, diligence, and community responsibility.`,
        });
    }
    if (['munda', 'kurima', 'mvura', 'goho', 'chibage', 'nzungu', 'farm', 'harvest', 'rain', 'crop', 'soil', 'field'].some((k) => lowerBoth.includes(k))) {
        topicCandidates.push({
            title: `Seasonal Agriculture & the Rainy Season ('Zhizha') (Lesson ${lessonNumber})`,
            content: `Illustrated by "${firstShona}" (${firstEng}), farming life on the Zimbabwean plateau revolves around the summer rainy season ('zhizha', November to March). Families closely watch the sky for 'mvura' (rain) to cultivate maize ('chibage'), groundnuts ('nzungu'), and leafy greens ('muriwo'), celebrating a bountiful harvest ('goho rakanaka') together.`,
        });
    }
    if (['sadza', 'muriwo', 'nyama', 'kubika', 'chikafu', 'tii', 'chingwa', 'mukaka', 'cook', 'food', 'meal', 'tea'].some((k) => lowerBoth.includes(k))) {
        topicCandidates.push({
            title: `Shona Culinary Traditions & Shared Hospitality (Lesson ${lessonNumber})`,
            content: `Centered on "${firstShona}" (${firstEng}), sharing food and drink is the heart of Shona hospitality. Whether serving morning tea ('tii') with bread ('chingwa') or preparing 'sadza nemuriwo' in the evening, offering refreshments to family and visitors expresses warmth and mutual care ('ukama').`,
        });
    }
    if (['amai', 'baba', 'mbuya', 'sekuru', 'mhuri', 'vana', 'kumusha', 'mother', 'father', 'grandmother', 'family', 'home'].some((k) => lowerBoth.includes(k))) {
        topicCandidates.push({
            title: `Extended Family Bonds ('Ukama') & Home Life (Lesson ${lessonNumber})`,
            content: `Grounded in "${firstShona}" (${firstEng}), Shona household life weaves together parents ('baba namai'), elders ('sekuru nambuya'), and children ('vana'). Even when working or studying in cities like Harare or Bulawayo, families maintain strong ties with their ancestral rural home ('kumusha').`,
        });
    }
    if (['bhazi', 'mota', 'mugwagwa', 'rwendo', 'kufamba', ' chitima', 'bus', 'car', 'road', 'travel', 'journey', 'driver'].some((k) => lowerBoth.includes(k))) {
        topicCandidates.push({
            title: `Travel, Public Transport & Daily Commuting in Zimbabwe (Lesson ${lessonNumber})`,
            content: `Captured in "${firstShona}" (${firstEng}), road travel by bus ('bhazi') and commuter omnibus ('kombi') connects Zimbabwe's bustling city centres ('madhorobha') with residential suburbs ('marukisheni') and rural districts. Fellow travellers customarily greet one another politely and look out for elders and children along the journey.`,
        });
    }
    topicCandidates.push({
        title: `Zezuru Expressive Discourse & Social Context (Lesson ${lessonNumber})`,
        content: `In "${firstShona}" (${firstEng}), the speaker uses vivid ChiZezuru phrasing to convey observation and human interaction. In Shona oral and written culture, speakers pay close attention to social harmony, clear sequence of events, and respectful register matched to the listener.`,
    });
    if (variationSeed > 0) {
        for (const [subKey, title, content] of kb.SENTENCE_CULTURAL_NOTES) {
            if (norm.includes(subKey.toLowerCase())) {
                topicCandidates.push({ title, content });
                break;
            }
        }
    }
    return [topicCandidates[variationSeed % topicCandidates.length]];
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
    const lowerWords = new Set((shonaText.toLowerCase().match(/[A-Za-z']+/g) || []));
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
async function enrichClipObject(rawClip, lessonNumber, variationSeed = 0) {
    const shonaText = String(rawClip.shona_text || rawClip.transcript || '').trim();
    const durationSeconds = Number(rawClip.duration_seconds || 5.0);
    // First try invoking pipeline/enrich.py if Python is accessible on the system
    const enrichPyCandidates = [
        path_1.default.resolve(process.cwd(), '../pipeline/enrich.py'),
        path_1.default.resolve(process.cwd(), 'pipeline/enrich.py'),
    ];
    const enrichPyPath = enrichPyCandidates.find((p) => fs_1.default.existsSync(p));
    if (enrichPyPath) {
        try {
            const tmpPath = path_1.default.join(process.cwd(), `tmp_enrich_${Date.now()}_${Math.floor(Math.random() * 10000)}.json`);
            fs_1.default.writeFileSync(tmpPath, JSON.stringify([{ ...rawClip, shona_text: shonaText }], null, 2), 'utf-8');
            await new Promise((resolve, reject) => {
                (0, child_process_1.execFile)('python', [
                    enrichPyPath,
                    '--input-json',
                    tmpPath,
                    '--output-json',
                    tmpPath,
                    '--start-lesson',
                    String(lessonNumber),
                    '--variation-seed',
                    String(variationSeed),
                ], { timeout: 25000 }, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            if (fs_1.default.existsSync(tmpPath)) {
                const pyOut = JSON.parse(fs_1.default.readFileSync(tmpPath, 'utf-8'));
                try {
                    fs_1.default.unlinkSync(tmpPath);
                }
                catch { }
                if (Array.isArray(pyOut) &&
                    pyOut.length > 0 &&
                    pyOut[0].english_translation &&
                    normalizeTextKey(pyOut[0].english_translation) !== normalizeTextKey(shonaText)) {
                    return pyOut[0];
                }
            }
        }
        catch {
            // Fall through seamlessly to Node textbook & neural enricher
        }
    }
    const words = shonaText.split(/\s+/).filter(Boolean);
    const literalGloss = words.map((w) => analyzeMorphemesAndClass(w));
    const { englishTranslation, dialogue } = await resolveIdiomaticTranslationAndDialogue(shonaText, variationSeed);
    const grammarNotes = generateTextbookGrammarNotes(shonaText, englishTranslation, lessonNumber, variationSeed);
    const culturalNotes = generateTextbookCulturalNotes(shonaText, englishTranslation, lessonNumber, variationSeed);
    const activeExercises = generateContextualExercises(shonaText, englishTranslation, lessonNumber, grammarNotes, literalGloss, variationSeed);
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
