import fs from 'fs';
import path from 'path';
import https from 'https';
import { execFile } from 'child_process';

export interface DialogueLine {
  id?: number;
  speaker: string;
  shona: string;
  english: string;
}

export interface WordGloss {
  shona: string;
  literal_english: string;
  morphemes: string;
  noun_class: string;
}

export interface GrammarNote {
  title: string;
  content: string;
  rule: string;
}

export interface CulturalNote {
  title: string;
  content: string;
}

export interface ExerciseItem {
  type: 'multiple_choice' | 'fill_blank' | 'translate';
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface TextbookKnowledge {
  IDIOMATIC_SENTENCE_TRANSLATIONS: Record<string, string>;
  VIBEVOICE_PASSAGE_TRANSLATIONS: Array<{
    match: string;
    english: string;
    sentences?: Array<string | [string, string]>;
  }>;
  BEGINNER_WORD_GLOSS: Record<string, [string, string, string]>;
  SENTENCE_CULTURAL_NOTES: Array<[string, string, string]>;
  THEMATIC_NEW_EXERCISES: Array<{
    tags: string[];
    drills: Array<{
      type: string;
      prompt: string;
      correct: string;
      distractors: string[];
      explanation: string;
    }>;
  }>;
  REVIEW_BLOCK_NEW_EXERCISES: Record<
    string,
    Array<{
      type: string;
      prompt: string;
      correct: string;
      distractors: string[];
      explanation: string;
    }>
  >;
}

let cachedKnowledge: TextbookKnowledge | null = null;

function loadTextbookKnowledge(): TextbookKnowledge {
  if (cachedKnowledge) return cachedKnowledge;
  const candidates = [
    path.join(process.cwd(), 'public', 'textbook_knowledge.json'),
    path.join(process.cwd(), 'app', 'public', 'textbook_knowledge.json'),
    path.join(__dirname, '../dist/textbook_knowledge.json'),
    path.join(__dirname, '../public/textbook_knowledge.json'),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      try {
        cachedKnowledge = JSON.parse(fs.readFileSync(cand, 'utf-8'));
        return cachedKnowledge!;
      } catch (e) {
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

export function readEnvValue(key: string): string {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(portableDir, '.env'),
    path.resolve(portableDir, '../.env'),
    path.resolve(portableDir, '../../.env'),
    'c:/Projects/Antigravity/shona-assimil-app/.env',
    'c:/Projects/Antigravity/shona-assimil-app/app/.env',
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm');
        const match = content.match(regex);
        if (match && match[1] !== undefined) {
          const val = match[1].trim().replace(/^["']|["']$/g, '');
          if (val) return val;
        }
      } catch {}
    }
  }
  return process.env[key] || '';
}

export function getGeminiApiKey(): string {
  return (
    readEnvValue('GEMINI_API_KEY') ||
    readEnvValue('VITE_GEMINI_API_KEY') ||
    readEnvValue('GOOGLE_API_KEY') ||
    ''
  );
}

function postHttpsJson(url: string, bodyObj: unknown, timeoutMs = 20000): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(bodyObj), 'utf-8');
    const parsedUrl = new URL(url);
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(text));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Gemini API request timed out'));
    });
    req.write(payload);
    req.end();
  });
}

async function callGeminiJson(prompt: string): Promise<any | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;
      const resp = await postHttpsJson(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        },
        22000
      );
      const rawText = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof rawText === 'string' && rawText.trim()) {
        const cleaned = rawText
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/, '');
        return JSON.parse(cleaned);
      }
    } catch (err) {
      console.warn(`Gemini ${model} call warning:`, err);
    }
  }
  return null;
}

export function normalizeTextKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
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

export function isValidZezuruTranscript(text: string): boolean {
  const cleaned = String(text || '').trim().replace(/\s+/g, ' ');
  if (cleaned.length < 12) return false;
  const words = cleaned.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length < 3) return false;
  if (words.some((w) => NON_ZEZURU_MARKERS.has(w))) return false;
  // Every word of length >= 2 must contain at least one vowel (reject consonant gibberish)
  const vowelWords = words.filter((w) => /[aeiou]/.test(w));
  if (vowelWords.length < Math.ceil(words.length * 0.8)) return false;
  // Reject if any split sentence is just a single letter or gibberish
  const sentences = splitShonaSentences(cleaned);
  if (sentences.length === 0) return false;
  for (const s of sentences) {
    const sWords = s.toLowerCase().match(/[a-z']+/g) || [];
    if (sWords.length === 0) return false;
    if (sWords.length === 1 && sWords[0].length < 4) return false;
  }
  return true;
}

export function splitShonaSentences(shonaText: string): string[] {
  const cleaned = String(shonaText || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];
  const rawParts = cleaned.split(/(?<=[.!?])\s+|(?<=[.!?])(?=[A-Z])/);
  const sentences: string[] = [];
  for (const part of rawParts) {
    const p = part.trim();
    if (!p) continue;
    // Merge single-letter fragments (like initials) with adjacent sentence
    if (p.replace(/[^A-Za-z]/g, '').length <= 2 && sentences.length > 0) {
      sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${p}`;
    } else if (
      sentences.length > 0 &&
      (sentences[sentences.length - 1].match(/"/g) || []).length % 2 === 1
    ) {
      sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${p}`;
    } else {
      sentences.push(p);
    }
  }
  return sentences.filter((s) => s.replace(/[^A-Za-z]/g, '').length >= 3);
}

function fetchHttpsText(url: string, timeoutMs = 12000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShonaAssimilEnricher/2.0',
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchHttpsText(res.headers.location, timeoutMs).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

export async function translateShonaSentenceIdiomatic(
  shonaSent: string,
  variationSeed = 0
): Promise<string> {
  const sClean = shonaSent.trim();
  if (!sClean) return '';

  const kb = loadTextbookKnowledge();
  const norm = normalizeTextKey(sClean);
  const normNoPunct = norm.replace(/[.!?;:,]+$/, '');

  // If Gemini API key is configured and variationSeed > 0, use Gemini for fresh idiomatic translation
  if (getGeminiApiKey() && variationSeed > 0) {
    const gemOut = await callGeminiJson(
      `Translate the following Shona (ChiZezuru) sentence into natural, 100% idiomatic everyday English as a native English speaker would say it (not literal word-for-word). Return JSON: {"english": "..."}.\nShona: "${sClean}"`
    );
    if (gemOut && typeof gemOut.english === 'string' && gemOut.english.trim().length > 2) {
      return gemOut.english.trim();
    }
  }

  if (variationSeed === 0) {
    for (const [k, v] of Object.entries(kb.IDIOMATIC_SENTENCE_TRANSLATIONS)) {
      const kNorm = normalizeTextKey(k);
      if (kNorm === norm || kNorm.replace(/[.!?;:,]+$/, '') === normNoPunct) {
        return v;
      }
    }
  }

  // Multi-provider neural Shona -> English idiomatic sentence translation
  const encoded = encodeURIComponent(sClean);

  const tryClients5 = async (): Promise<string | null> => {
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
    } catch {}
    return null;
  };

  const tryMyMemory = async (): Promise<string | null> => {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=sn|en`;
      const body = await fetchHttpsText(url, 12000);
      const parsed = JSON.parse(body);
      const candidate = parsed?.responseData?.translatedText;
      if (
        typeof candidate === 'string' &&
        candidate.trim() &&
        !candidate.includes('MYMEMORY WARNING')
      ) {
        return candidate.trim().replace(/\s+/g, ' ');
      }
    } catch {}
    return null;
  };

  const tryGtx = async (): Promise<string | null> => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=sn&tl=en&dt=t&q=${encoded}`;
      const body = await fetchHttpsText(url, 12000);
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
        const chunks: string[] = [];
        for (const seg of parsed[0]) {
          if (Array.isArray(seg) && typeof seg[0] === 'string' && seg[0]) {
            chunks.push(seg[0]);
          }
        }
        const joined = chunks.join('').trim().replace(/\s+/g, ' ');
        if (joined) return joined;
      }
    } catch {}
    return null;
  };

  const providers =
    variationSeed % 2 === 1
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

  throw new Error(`Could not translate Shona sentence idiomatically: "${sClean}"`);
}

function applyIdiomaticVariation(englishSent: string, seed: number): string {
  if (seed <= 0) return englishSent;
  const swaps: Array<[RegExp, string[]]> = [
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

export async function resolveIdiomaticTranslationAndDialogue(
  shonaText: string,
  variationSeed = 0
): Promise<{ englishTranslation: string; dialogue: DialogueLine[] }> {
  const kb = loadTextbookKnowledge();
  const norm = normalizeTextKey(shonaText);
  const normNoPunct = norm.replace(/[.!?;:,]+$/, '');
  const shonaSentences = splitShonaSentences(shonaText);

  // If Gemini API key is configured, try Gemini sentence-by-sentence idiomatic translation
  if (getGeminiApiKey() && variationSeed > 0) {
    const gemData = await callGeminiJson(
      `You are an expert Shona (ChiZezuru) to English translator for Assimil.
Split and translate each of these Shona sentences into 100% natural, idiomatic English sentences (never literal word-for-word).
Shona sentences: ${JSON.stringify(shonaSentences)}
Return JSON: {"dialogue": [{"shona": "...", "english": "..."}], "english_translation": "..."}`
    );
    if (
      gemData &&
      Array.isArray(gemData.dialogue) &&
      gemData.dialogue.length > 0 &&
      gemData.dialogue.every(
        (d: any) =>
          typeof d.shona === 'string' &&
          d.shona.trim().length >= 3 &&
          typeof d.english === 'string' &&
          d.english.trim().length >= 3
      )
    ) {
      const dialogue: DialogueLine[] = gemData.dialogue.map((d: any, idx: number) => ({
        id: idx + 1,
        speaker: 'Mutauri',
        shona: d.shona.trim(),
        english: d.english.trim(),
      }));
      return {
        englishTranslation: dialogue.map((d) => d.english).join(' '),
        dialogue,
      };
    }
  }

  // 1. Check IDIOMATIC_SENTENCE_TRANSLATIONS
  if (variationSeed === 0) {
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
            return {
              englishTranslation: eng,
              dialogue: sParts.map((sp, idx) => ({
                id: idx + 1,
                speaker: 'Mutauri',
                shona: sp,
                english:
                  eParts[idx].endsWith('.') || eParts[idx].endsWith('?')
                    ? eParts[idx]
                    : `${eParts[idx]}.`,
              })),
            };
          }
        }
        return {
          englishTranslation: eng,
          dialogue: [{ id: 1, speaker: 'Mutauri', shona: shonaText.trim(), english: eng }],
        };
      }
    }

    // 2. Check VIBEVOICE_PASSAGE_TRANSLATIONS (pairing shonaSentences[i] with English sentences[i])
    for (const entry of kb.VIBEVOICE_PASSAGE_TRANSLATIONS) {
      const mKey = normalizeTextKey(entry.match || '');
      if (mKey && norm.includes(mKey)) {
        const rawSentences = entry.sentences || [];
        if (rawSentences.length > 0) {
          // Case A: entry.sentences is an array of [shona, english] tuples
          if (Array.isArray(rawSentences[0]) && rawSentences[0].length === 2) {
            const dialogue = (rawSentences as Array<[string, string]>).map(
              ([sSent, eSent], idx) => ({
                id: idx + 1,
                speaker: 'Mutauri',
                shona: sSent,
                english: eSent,
              })
            );
            return {
              englishTranslation: String(
                entry.english || dialogue.map((d) => d.english).join(' ')
              ),
              dialogue,
            };
          }
          // Case B: entry.sentences is an array of English strings corresponding to shonaSentences
          const engList = (rawSentences as string[]).map((s) => String(s).trim()).filter(Boolean);
          if (engList.length === shonaSentences.length && shonaSentences.length > 0) {
            const dialogue = shonaSentences.map((sSent, idx) => ({
              id: idx + 1,
              speaker: 'Mutauri',
              shona: sSent,
              english: engList[idx],
            }));
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

  // 3. Sentence-by-sentence idiomatic translation for every Shona sentence
  const dialogue: DialogueLine[] = [];
  const engSentences: string[] = [];

  for (let i = 0; i < shonaSentences.length; i++) {
    const sSent = shonaSentences[i];
    const eSent = await translateShonaSentenceIdiomatic(sSent, variationSeed);
    dialogue.push({
      id: i + 1,
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

const NOUN_CLASS_PREFIXES: Array<[string, string, string]> = [
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

export function analyzeMorphemesAndClass(word: string): WordGloss {
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

export function generateTextbookGrammarNotes(
  shonaText: string,
  englishTranslation: string,
  lessonNumber: number,
  variationSeed = 0
): GrammarNote[] {
  const lower = shonaText.toLowerCase();
  const words = shonaText.match(/[A-Za-z']+/g) || [];
  const lowerWords = words.map((w) => w.toLowerCase());
  const notes: GrammarNote[] = [];

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
      content:
        "The exclamation 'Makorokoto!' means 'Congratulations!'. To specify what you are congratulating someone for, attach the prefix 'ne-' ('for / with') directly to an infinitive verb starting with 'ku-'. In this sentence, 'nekubudirira' combines 'ne-' (for) + 'kubudirira' (to succeed), literally meaning 'for succeeding'.",
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
  const pastMatches = words.filter((w) =>
    /^(nda|wa|a|ta|ma|va|ya|ra|cha|zva|dza)ka[a-z]{2,}/i.test(w)
  );
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
  if (
    /\b(ndiri|uri|ari|tiri|muri|vari|iri|riri|chiri|zviri|rwuri|kuri|pari)\s+ku[a-z]+|\b(ndiriku|uriku|ariku|tiriku|variku|iriku|ririku|chiriku|zviriku)[a-z]+/i.test(
      lower
    )
  ) {
    notes.push({
      title: "Actions Happening Right Now: The '-ri ku-' Progressive",
      content:
        "To describe an action that is happening right now ('I am doing', 'it is raining', 'they are walking'), Shona uses the helper verb '-ri' ('am/is/are') followed by 'ku-' ('to') and the action verb. For people, the forms are 'ndiri ku-' (I am), 'uri ku-' (you are), 'ari ku-' (he/she is), 'tiri ku-' (we are), and 'vari ku-' (they are). In fast speech or writing, the two words are sometimes joined together (e.g., 'ndiri kuenda' or 'ndirikuenda').",
      rule: '[Subject + -ri] + ku-[verb] -> Ndiri kuverenga (I am reading) | Vari kufamba (They are walking) | Mvura iri kunaya (It is raining)',
    });
  }

  // 6. Present Habitual (-no-)
  const habMatches = words.filter((w) =>
    /^(ndi|u|a|ti|mu|va|i|ri|chi|zvi|ru|ku)no[a-z]{2,}/i.test(w)
  );
  if (habMatches.length > 0) {
    const hWord = habMatches[variationSeed % habMatches.length];
    notes.push({
      title: `Present Tense & Everyday Actions ('${hWord}')`,
      content: `The verb '${hWord}' uses the present marker '-no-'. In Shona, inserting '-no-' between the subject prefix and the verb stem expresses general truths, everyday habits, or states of mind like 'wanting', 'thinking', and 'knowing'. For example: 'ndinoda' ('I want/like'), 'unofunga' ('you think'), 'vanoti' ('they say'), and 'vanorima' ('they farm').`,
      rule: '[ndi- (I) / u- (you) / a- (he/she) / ti- (we) / va- (they)] + -no- + verb -> Ndinoda (I want), Vanogara (They live)',
    });
  }

  // 7. Future Tense (-cha-)
  const futMatches = words.filter((w) =>
    /^(ndi|u|a|ti|mu|va|i|ri|chi|zvi|ku)cha[a-z]{2,}/i.test(w)
  );
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
  const locMatches = words.filter(
    (w) =>
      /^(pa|ku|mu)(tafura|mba|musha|chikoro|basa|musika|nze|harare|dhorobha|guta|mugwagwa|rutivi|musoro|kati|asi|nyika|nhandare|chigaro|uriri|ndiro|denga|mberi)/i.test(
        w
      ) || ['pasi', 'pamusoro', 'padivi', 'pedyo', 'pakati', 'pamberi'].includes(w.toLowerCase())
  );
  if (locMatches.length > 0) {
    const lWord = locMatches[variationSeed % locMatches.length];
    notes.push({
      title: `Talking About Location: 'pa-', 'ku-', and 'mu-' ('${lWord}')`,
      content:
        `Look at how location is expressed with '${lWord}'. Instead of separate prepositions like 'on', 'to', or 'in', Shona attaches one of three location prefixes directly to the front of a noun:\n` +
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
      content:
        "Forming a yes/no question in Shona is remarkably easy: keep the normal statement word order and simply add the question word 'here' at the very end of the sentence! For example, 'Mvura ichanaya mangwana' ('It will rain tomorrow') becomes 'Mvura ichanaya here mangwana?' ('Will it rain tomorrow?'). For open questions, use 'sei?' ('how / why?', as in 'Wakafamba sei?' = 'How did you travel?') or 'ndeipi?' ('which one?', as in 'Ndeipi mota?' = 'Which car?').",
      rule: 'Statement + here? = Yes/No Question | Verb + sei? = How? | Ndeipi + Noun? = Which [noun]?',
    });
  }

  // 12. kuti
  if (lowerWords.includes('kuti')) {
    notes.push({
      title: "Connecting Clauses & Expressing Purpose with 'kuti'",
      content:
        "The connector 'kuti' is one of the most useful words in Shona. After verbs of speaking, thinking, or knowing (like 'akati' = said, 'unofunga' = you think, 'anoratidza' = shows), 'kuti' means 'that'. However, when placed after an action verb, 'kuti' means 'so that / in order to', and the following verb changes its final vowel from '-a' to '-e'! For instance, '-dya' (eat) becomes 'kuti tidye' ('so that we may eat'), and '-wana' (get) becomes 'kuti uwane' ('so that you may get').",
      rule: "kuti + [Subject Prefix + Verb ending in -e] = 'so that [someone] may...' (e.g., kuti tidye = so that we eat)",
    });
  }

  // 13. Conditionals
  if (lowerWords.some((c) => ['kana', 'usati', 'tisati', 'ndisati', 'kunyangwe'].includes(c))) {
    notes.push({
      title: "Saying 'If', 'When', and 'Before' ('kana' & '-sati')",
      content:
        "To link two events in time or condition, Shona uses 'kana' ('if / when'). When talking about a future condition ('If we work hard...'), the verb after 'kana' takes '-ka-' (e.g., 'kana tikashanda' = 'if we work'). When 'kana' sits between two nouns (like 'tsvuku kana nhema'), it simply means 'or'! To say 'before' something happens, Shona uses '-sati' ('not yet') followed by a past-form verb: 'usati wabuda' ('before you go out') or 'tisati tadya' ('before we eat').",
      rule: 'kana = if / when / or | [ndisati / usati / tisati] + past verb = before [I / you / we] do something',
    });
  }

  // 14. Possessives
  const possMatches = words.filter(
    (w) => /(angu|ako|ake|edu|enyu|avo)$/i.test(w) && w.length >= 4
  );
  if (possMatches.length > 0) {
    const pWord = possMatches[variationSeed % possMatches.length];
    notes.push({
      title: `Possessive Pronouns: Saying 'My', 'Your', and 'Our' ('${pWord}')`,
      content: `In Shona, possessive words like '${pWord}' ('my/your/our/their') always follow the noun they belong to! The six core possessive stems are '-ngu' (my), '-ko' (your), '-ke' (his/her/its), '-du' (our), '-nyu' (your plural/polite), and '-vo' (their). A short linking sound ('wa-', 'ya-', 'ra-', 'cha-', 'dza-', 'ma-') attaches to the front of the stem to match the noun: for example, 'shamwari yangu' (my friend), 'munda wako' (your field), 'mabhuku edu' (our books), and 'kubudirira kwenyu' (your success).`,
      rule: 'Noun + [Linking Prefix + -ngu (my) / -ko (your) / -ke (his/her) / -du (our) / -nyu (your polite) / -vo (their)]',
    });
  }

  // 15. ne-
  const neMatches = words.filter(
    (w) => /^ne[a-z]{3,}/i.test(w) && w.toLowerCase() !== 'nezuro'
  );
  if (neMatches.length > 0) {
    const neW = neMatches[variationSeed % neMatches.length];
    notes.push({
      title: `Joining Words with 'ne-' ('and / with') in '${neW}'`,
      content: `Look closely at '${neW}'. In Shona, the word for 'and' or 'with' between nouns is not a separate word—instead, the prefix 'ne-' (or 'na-' before people's names) is written attached directly to the second noun! For example, 'ne-' + '${neW.slice(2)}' forms '${neW}'. You will see this everywhere in daily speech: 'sadza nemuriwo' ('sadza and vegetables'), 'nesimba' ('with strength'), and 'nekukasira' ('with haste / quickly').`,
      rule: 'ne- + Noun = and / with [Noun] (written as a single word, e.g., sadza nemuriwo = sadza and vegetables)',
    });
  }

  // 16. pane/kune/ine
  if (
    lowerWords.some((ex) =>
      ['pane', 'kune', 'mune', 'ine', 'ane', 'tine', 'une', 'rine', 'chine', 'dzine', 'chiine'].includes(
        ex
      )
    )
  ) {
    notes.push({
      title: "Expressing 'Has/Have' and 'There Is/Are' ('-ne' & 'pane / kune')",
      content:
        "Shona does not use a separate verb like 'have'; instead, it combines a subject prefix with '-ne' ('with'). For people: 'ndine' (I have), 'une' (you have), 'ane' (he/she has), 'tine' (we have), 'vane' (they have). For things, the prefix matches the object: 'imba ine...' ('the house has...'), 'chivakwa chiine...' ('the building having...'). When combined with the location prefixes 'pa-', 'ku-', and 'mu-', it means 'there is / there are': 'pane' ('there is right here'), 'kune' ('there is in that area'), and 'mune' ('there is inside').",
      rule: 'Person/Thing + -ne = has/have (tine = we have, ine = it has) | pane / kune / mune = there is / there are',
    });
  }

  // 17. Passive Voice (-wa)
  const passiveMatches = words.filter(
    (w) =>
      /(ikw|irw|isw|erw|urw|orw|nzw|tw|kw|rw|mw|dw|gw|pw|tsv|zvw)a$/i.test(w) &&
      !['mvura', 'nyama', 'shuga', 'tafura', 'nguva', 'mbavha', 'nhasi', 'mangwana', 'enzou'].includes(
        w.toLowerCase()
      )
  );
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
  const uniqueLongWords = Array.from(new Set(words.filter((w) => w.length >= 5))).sort(
    (a, b) => b.length - a.length
  );
  for (const lw of uniqueLongWords.slice(0, 4)) {
    if (notes.length < 3 || variationSeed > 0) {
      const morph = analyzeMorphemesAndClass(lw);
      notes.push({
        title: `Morphological & Concord Breakdown of '${lw}' (${morph.noun_class})`,
        content: `In this lesson, '${lw}' analyzes morphologically as ${morph.morphemes}. In ChiZezuru grammar, the class prefix governs subject, adjective, and possessive agreement across the clause so the listener can track which noun is performing or receiving the action.`,
        rule: `Lexical & Concord Structure: '${lw}' -> ${morph.morphemes}`,
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

interface CulturalDomainEntry {
  keywords: string[];
  wikiTopics: string[];
  perspectives: Array<{ title: string; content: string }>;
}

const ZIMBABWE_CULTURAL_ENCYCLOPEDIA: CulturalDomainEntry[] = [
  {
    keywords: [
      'musoro',
      'wakarukwa',
      'akarukwa',
      'kuruka',
      'kurukwa',
      'vhudzi',
      'bvudzi',
      'braid',
      'braided',
      'woven',
      'hair',
      'rastasta',
      'dreadlocks',
    ],
    wikiTopics: ['Hair_braiding', 'Shona_people', 'Culture_of_Zimbabwe'],
    perspectives: [
      {
        title: "The Art of Hair Braiding ('Kuruka Musoro') in Zimbabwean Culture",
        content:
          "In Shona society, hair braiding ('kuruka musoro' or 'kuruka vhudzi') is both a treasured aesthetic art and an important social tradition. Across Harare, Bulawayo, and rural townships, women and girls gather at salons or on shaded verandas where skilled braiders weave intricate geometric patterns such as 'mabhanzi', three-strand plaits ('kuruka rutatu'), and neat cornrows ('lines'), often incorporating synthetic extensions ('rastasta').",
      },
      {
        title: 'Pre-Colonial & Contemporary Hairstyles as Social Identity in Mashonaland',
        content:
          "Historically among the Zezuru and neighbouring Shona peoples, hairstyles ('magerero nemarukiro emusoro') communicated age grade, marital status, and community celebration. Today, neatly braided hair ('musoro wakarukwa zvakanaka') remains a hallmark of 'kushambidzika' (personal neatness and dignity) for school, church gatherings, weddings ('michato'), and professional life.",
      },
      {
        title: 'Salon Micro-Enterprises & Women’s Entrepreneurship in Urban Zimbabwe',
        content:
          "Hairdressing and braiding studios form one of the most vibrant female-led micro-enterprise sectors in Zimbabwe's urban centres and growth points ('magrowth point'). Master braiders pass down finger-weaving techniques that protect natural hair texture during Zimbabwe's dry winter ('chando') and hot spring ('chirimo') seasons.",
      },
      {
        title: "ChiZezuru Vocabulary of Grooming: '-ruka' (Weave/Braid) & Craftsmanship",
        content:
          "In ChiZezuru, the verb root '-ruka' ('to braid, plait, or weave') links personal grooming ('kuruka musoro' = braiding the head/hair) with traditional basketry ('kuruka tswanda' = weaving reed baskets) and mat-making ('kuruka rupasa'). Using the passive 'wakarukwa zvakanaka' praises the precision and symmetry of the artisan's handiwork.",
      },
    ],
  },
  {
    keywords: [
      'chigaro',
      'pachigaro',
      'zvigaro',
      'chituru',
      'masofa',
      'sofa',
      'chair',
      'throne',
      'seat',
      'stool',
      'sitting',
      'akagara',
    ],
    wikiTopics: ['Shona_people', 'Culture_of_Zimbabwe', 'Great_Zimbabwe'],
    perspectives: [
      {
        title: "Seating Etiquette & Respect ('Chigaro') in the Shona Household",
        content:
          "In traditional and modern Shona homes alike, seating arrangements ('kugara pachigaro') reflect age, kinship, and hospitality ('hunhu'). In a rural roundavel kitchen ('imba yekubikira'), men and elders traditionally sit on raised carved wooden stools or benches ('chigaro' / 'chituru'), while women often sit on woven reed mats ('rupasa' or 'bonde'), though in urban living rooms ('imba yokutandarira') guests of honour are always offered the best armchair ('chigaro chakanaka').",
      },
      {
        title: "Carved Wooden Stools ('Zvigaro') & Symbolism of Authority in Zimbabwe",
        content:
          "Hand-carved wooden headrests ('mutsago') and stools ('zvigaro') made from indigenous hardwoods like 'mukwa' and 'muvava' have been symbols of status and leadership in Zimbabwe for centuries. In Shona idioms, the word 'chigaro' means both an everyday chair and a seat of leadership or throne ('chigaro cheushe' = royal throne), which is why 'kugara pachigaro' carries connotations of poise and dignity.",
      },
      {
        title: 'Hospitality When Welcoming Visitors: "Garai Pasi Pachigaro"',
        content:
          "When a visitor arrives at a Zimbabwean home, the host immediately offers a seat before any business is discussed—saying 'Pindai mugare pachigaro' ('Come in and sit on a chair'). Offering a clean seat followed by a clap of respect ('kuombera') establishes warmth before exchanging formal greetings ('kubvunzana mufaro').",
      },
      {
        title: "Noun Class 7 ('chi-/zvi-') Instrument Derivation: '-gara' -> 'chigaro'",
        content:
          "Culturally and linguistically, Shona derives the names of household furnishings directly from action verbs by adding the Class 7 prefix 'chi-' and changing the final vowel '-a' to '-o': from '-gara' ('to sit') comes 'chigaro' ('chair / seat / throne', plural 'zvigaro'), and from '-rara' ('to sleep') comes 'chiraro'.",
      },
    ],
  },
  {
    keywords: [
      'shangu',
      'butsu',
      'bhutsu',
      'chitsiko',
      'hembe',
      'dhirezi',
      'mbatya',
      'nhumbi',
      ' bhurugwa',
      'mukabudura',
      'heti',
      'ngowani',
      'shoe',
      'shoes',
      'boots',
      'shirt',
      'dress',
      'clothes',
    ],
    wikiTopics: ['Culture_of_Zimbabwe', 'Fashion_in_Africa', 'Bata_Shoes'],
    perspectives: [
      {
        title: "Dignified Dress ('Kushambidzika') & Footwear in Zimbabwean Daily Life",
        content:
          "Across Zimbabwe, personal presentation ('kushambidzika') is treated as a visible expression of self-respect and respect for others. Whether wearing polished leather shoes ('shangu' or 'bhutsu') to office work in Harare or neat church attire ('mbatya dzechechi') on weekends, Zimbabweans take great pride in well-coordinated clothing and clean footwear.",
      },
      {
        title: "Gweru's Footwear Heritage & the Bata Shoe Tradition in Zimbabwe",
        content:
          "Zimbabwe has a long industrial history in footwear manufacturing centered in the Midlands city of Gweru, where the historic Bata shoe factory (established in 1939) produced iconic canvas 'Toughees' school shoes and 'Sandak' sandals worn by generations of Zimbabwean students and workers.",
      },
      {
        title: "Boutiques ('Zvitoro zveNhumbi') & Tailoring Markets in Harare and Bulawayo",
        content:
          "Local clothing boutiques ('zvitoro zvinotengesa nhumbi') and open-air textile markets such as Mupedzanhamo in Mbare supply colourful dresses ('madhirezi'), shirts ('mahembe'), and high-heeled or flat shoes ('shangu dzine chitsiko chakakwirira'). Independent tailors ('vasonsi') also craft bespoke garments for family celebrations.",
      },
      {
        title: 'Shona Footwear & Garment Terminology in Everyday Conversation',
        content:
          "In ChiZezuru, 'shangu' refers generally to shoes or sandals, while 'bhutsu' (or 'butsu') refers to closed boots or sturdy walking shoes. Speakers describe footwear details precisely—such as 'chitsiko chakakwirira' (a high heel) or 'ruvara ruchena nerutsvuku' (white and red colour)—when shopping or describing someone's outfit.",
      },
    ],
  },
  {
    keywords: [
      'chivakwa',
      'zvivakwa',
      'mafafutera',
      'hwindo',
      'mudhuri',
      'uriri',
      'imba',
      'dzimba',
      'murokesheni',
      'building',
      'windows',
      'skyline',
      'floor',
      'wall',
    ],
    wikiTopics: ['Architecture_of_Zimbabwe', 'Eastgate_Centre,_Harare', 'Harare'],
    perspectives: [
      {
        title: "Modernist High-Rise Architecture ('Zvivakwa Zvokudurikidzwa') in Harare",
        content:
          "Harare's central business district ('mudhorobha') is renowned for its striking post-independence and modernist high-rise buildings ('zvivakwa zvakareba zvinoenda mudenga'). Iconic structures like the Eastgate Centre—designed by Zimbabwean architect Mick Pearce using natural biomimetic cooling inspired by indigenous termite mounds ('churu')—blend modern glass-and-concrete facades ('mafafutera akawanda') with environmental sustainability.",
      },
      {
        title: "Suburban Neighbourhoods ('Marukisheni') & Tiled Roof Architecture",
        content:
          "Residential suburbs across Zimbabwe—colloquially called 'marukisheni' (from 'locations')—feature detached brick houses ('dzimba dzezvidhinha') topped with red clay or concrete roof tiles ('matenga anemataira matsvuku') and shaded by fruit and ornamental trees ('miti yakawanda') in the front yard ('chivanze').",
      },
      {
        title: "From Stone Enclosures ('Dzimbahwe') to Contemporary Urban Design",
        content:
          "The very name 'Zimbabwe' derives from the Shona phrase 'dzimba dzemabwe' ('houses of stone'), honouring the dry-stone masonry of Great Zimbabwe and Khami. Modern Zimbabwean builders continue this appreciation for solid masonry ('kuvaka zvivakwa zvakasimba'), polished floors ('uriri'), and shaded pedestrian arcades.",
      },
      {
        title: 'Street-Level Life Around Urban Office Buildings in Zimbabwe',
        content:
          "Along the tree-lined avenues in front of tall commercial buildings ('pamberi pechivakwa') in Harare and Bulawayo, parked cars ('motokari dzakamirapo') share the shade of jacaranda and flamboyant trees with licensed refreshment vendors ('vatengesi varikutengesa zvinwiwa') serving cold drinks to commuters.",
      },
    ],
  },
  {
    keywords: [
      'nhabvu',
      'chikwata',
      'zvikwata',
      'mutambo',
      'nhandare',
      'yinifomu',
      'football',
      'soccer',
      'team',
      'match',
      'stadium',
    ],
    wikiTopics: ['Football_in_Zimbabwe', 'Zimbabwe_national_football_team', 'Rufaro_Stadium'],
    perspectives: [
      {
        title: "Football ('Mutambo weNhabvu') — Zimbabwe's National Sporting Passion",
        content:
          "Football ('nhabvu') is the most popular sport in Zimbabwe, uniting communities from rural school pitches to packed urban stadiums like Rufaro Stadium and the National Sports Stadium in Harare, or Barbourfields Stadium in Bulawayo. Historic clubs such as Dynamos ('DeMbare'), Highlanders ('Bosso'), and CAPS United draw thousands of passionate supporters wearing their team colours ('yinifomu yechikwata').",
      },
      {
        title: 'Community Youth Leagues & Township Football Tournaments',
        content:
          "Every weekend across Zimbabwean neighbourhoods and growth points, local teams ('zvikwata zviviri') compete in spirited matches on grass or dust pitches. Wearing distinct team kits ('yinifomu'), young players develop close teamwork and discipline cheered on by neighbours along the touchline.",
      },
      {
        title: 'The "Warriors" & Mighty Warriors in Southern African Football',
        content:
          "Zimbabwe's men's national football team (the 'Warriors') and women's national team (the 'Mighty Warriors', who qualified for the 2016 Rio Olympics) hold a proud place in COSAFA and AFCON competitions, making 'mutambo wenhabvu' a frequent topic of lively daily conversation.",
      },
      {
        title: "ChiZezuru Sports Terminology: 'Nhabvu', 'Chikwata', and 'Nhandare'",
        content:
          "In Shona sports commentary—famous on Radio Zimbabwe for its rapid, poetic imagery—'nhabvu' means football, 'chikwata' (plural 'zvikwata') means team or squad, 'nhandare' is the stadium or pitch, and 'mutambi' is a player.",
      },
    ],
  },
  {
    keywords: [
      'maguru',
      'chikafu',
      'mundiro',
      'ndiro',
      'sadza',
      'muriwo',
      'nyama',
      'hupfu',
      'kubika',
      'akabikwa',
      'tii',
      'chingwa',
      'mukaka',
      'food',
      'tripe',
      'plate',
      'cooked',
      'meal',
    ],
    wikiTopics: ['Cuisine_of_Zimbabwe', 'Sadza', 'Culture_of_Zimbabwe'],
    perspectives: [
      {
        title: "Slow-Cooked Beef Tripe ('Maguru eMombe') & Traditional Shona Delicacies",
        content:
          "In Zimbabwean cuisine, beef tripe and offal ('maguru nematumbu emombe') slow-simmered until tender ('akabikwa zvine unyanzvi akaibva zvakanaka') is a beloved traditional dish. Served steaming hot on a plate ('mundiro') alongside white maize 'sadza' and leafy greens ('muriwo'), 'maguru' is prized both at family dinners and at local 'gochi-gochi' eateries.",
      },
      {
        title: "Handwashing Etiquette ('kugeza maoko') & Shared Dining in Shona Homes",
        content:
          "Before a traditional Shona meal is served on plates ('mundiro'), a younger family member brings a basin and pitcher ('chirongo' or jug) of warm water so each person can wash their hands ('kugeza maoko'), starting with the elders. Sharing well-prepared food ('chikafu chakabikwa zvakanaka') strengthens family bonds ('ukama').",
      },
      {
        title: "From Staple Grains ('Chibage neZviyo') to Relishes ('Usavi')",
        content:
          "A complete Zimbabwean main meal consists of a stiff grain porridge ('sadza' made from white maize meal 'hupfu', or nutritious reddish finger millet 'sadza rezviyo') paired with a savoury relish ('usavi') such as braised beef, 'maguru', free-range chicken ('huku yechibhoyi'), or peanut-butter greens ('muriwo unedovi').",
      },
      {
        title: "Culinary Vocabulary in ChiZezuru: '-bika' (Cook) vs. '-ibva' (Be Thoroughly Cooked/Ripe)",
        content:
          "Notice the distinction in Shona culinary language between '-bika' ('to cook', passive '-bikwa') and '-ibva' ('to become fully cooked, tender, or ripe'). Saying 'akabikwa zvine unyanzvi akaibva zvakanaka' compliments the cook by noting that the dish was prepared with skill ('unyanzvi') and cooked to perfection.",
      },
    ],
  },
  {
    keywords: [
      'shizha',
      'mashizha',
      'maruva',
      'ruva',
      'muti',
      'miti',
      'tsinga',
      'huswa',
      'uswa',
      'sango',
      'kanzira',
      'leaf',
      'flower',
      'flowers',
      'tree',
      'trees',
      'veins',
      'grass',
      'forest',
      'path',
    ],
    wikiTopics: ['Flora_of_Zimbabwe', 'Miombo_woodland', 'Geography_of_Zimbabwe'],
    perspectives: [
      {
        title: "Miombo Woodlands ('Masango eMusasa') & Indigenous Flora of the Highveld",
        content:
          "Much of central Zimbabwe lies within the southern African Miombo woodland belt, dominated by indigenous 'musasa' (Brachystegia spiciformis) and 'mnondo' trees. In spring ('chirimo', September–October), new leaves ('mashizha') emerge in brilliant shades of copper, crimson, and lime green before turning deep green during the summer rains.",
      },
      {
        title: "Botanical Observation & Plant Anatomy ('Shizha neTsinga') in Shona Education",
        content:
          "In Zimbabwean nature study and agricultural science, students examine leaf structure ('shizha') closely—distinguishing the prominent central midrib ('tsinga hobvu iri pakati') from the delicate branching veins ('tsinga dzitete dzinofambisa mvura') that transport water and nutrients through the plant.",
      },
      {
        title: "Flowering Gardens, Drought Resilience & Seasonal Rains ('Mvura') in Zimbabwe",
        content:
          "Zimbabwean homesteads and municipal parks cultivate vibrant flowering plants ('maruva emhando yakasiyana'), from bougainvillea and hibiscus to aloes and cosmos. During dry spells before the onset of the 'zhizha' rains, gardeners closely monitor soil moisture so flowers do not wilt from lack of water ('kuoma nenhau yekushaya mvura').",
      },
      {
        title: "Rural Footpaths ('Twunzira') Through Savanna Grasslands ('Uswa')",
        content:
          "Across rural Mashonaland, narrow winding footpaths ('kanzira kadiki') beaten through tall savanna grass ('uswa') and woodland ('sango') link neighbouring villages, rivers, and fields—forming a living network of pedestrian routes maintained by daily community travel.",
      },
    ],
  },
  {
    keywords: [
      'motokari',
      'mota',
      'mugwagwa',
      'tara',
      'mudhudhudhu',
      'bhasikoro',
      'bhazi',
      'chitima',
      'rwendo',
      'driver',
      'motorcycle',
      'motorbike',
      'highway',
      'tarred',
      'traffic',
    ],
    wikiTopics: ['Transport_in_Zimbabwe', 'Harare', 'Geography_of_Zimbabwe'],
    perspectives: [
      {
        title: "Tarred Trunk Highways ('Migwagwa ine Tara') & Urban Mobility in Zimbabwe",
        content:
          "Zimbabwe's road network centres on paved trunk highways ('migwagwa ine tara') connecting Harare with Bulawayo, Mutare, Masvingo, and Chirundu. Within cities and towns, private cars ('motokari'), commuter minibuses, and delivery motorcycles ('midhudhudhu') share busy thoroughfares lined with commercial shops and street trees.",
      },
      {
        title: "Motorcycles ('Midhudhudhu') in Zimbabwean Delivery & Rural Outreach",
        content:
          "The Shona onomatopoeic noun 'mudhudhudhu' (motorcycle—named after the rhythmic 'dhu-dhu-dhu' sound of its two-stroke engine) plays a growing role in Zimbabwe, used by urban courier riders in Harare as well as agricultural extension officers and clinic staff reaching remote rural wards.",
      },
      {
        title: "Long-Distance Journeys ('Rwendo') & Travel Courtesies in Mashonaland",
        content:
          "Planning a trip ('kuronga rwendo') between rural districts and major cities like Harare involves early morning departures and warm wishes of 'Fambai zvakanaka' ('Travel safely'). Upon arrival, relatives greet travellers with 'Makafamba sei?' ('How did you travel?').",
      },
      {
        title: 'Ideophones & Sound-Symbolic Nouns in Modern Shona Transport Vocabulary',
        content:
          "ChiZezuru creatively coins modern technical nouns from sound symbolism and loan adaptations: 'mudhudhudhu' captures the exhaust cadence of a motorbike, while 'motokari' (or 'mota') adapts 'motorcar' into Noun Class 9/10 ('motokari irikufamba' / 'motokari dzakamira').",
      },
    ],
  },
  {
    keywords: [
      'rwizi',
      'kuyerera',
      'mugero',
      'mvura',
      'kunaya',
      'makore',
      'mhepo',
      'river',
      'flowing',
      'gutter',
      'drain',
      'rain',
      'clouds',
      'wind',
    ],
    wikiTopics: ['Geography_of_Zimbabwe', 'Climate_of_Zimbabwe', 'Zambezi'],
    perspectives: [
      {
        title: "Seasonal Flash Floods & River Crossing Safety ('Musayambuke Rwizi') in Zimbabwe",
        content:
          "During Zimbabwe's summer rainy season ('zhizha', November to March), intense afternoon thunderstorms cause rivers ('nzizi') like the Save, Manyame, and Mazowe to swell rapidly and flow with powerful currents ('rwizi rwuri kuyerera zvine simba'). Elders, schools, and the Civil Protection Unit constantly advise communities never to cross a flooded river ('musayambuke rwizi rwuzere').",
      },
      {
        title: "Cloud Formations ('Makore'), Highveld Winds & Rain Forecasting in Shona Culture",
        content:
          "On the Zimbabwean highveld, residents read the afternoon sky closely: heavy cumulus clouds ('makore akawanda') gathering on the horizon and brisk winds ('mhepo inofefetera nesimba') swaying the trees ('miti ikazununguka') signal approaching evening showers ('kunaya manheru').",
      },
      {
        title: "Stormwater Channels ('Migero yeMvura') & Environmental Care",
        content:
          "In towns and rural homesteads alike, grass-lined drainage channels and gutters ('migero') guide rainwater runoff ('mvura inoyerera') safely away from homes and roads while nourishing border vegetation.",
      },
      {
        title: "Class 11 ('ru-') Concords for Rivers & Long Flowing Features ('Rwizi Rwuri Kuyerera')",
        content:
          "In Shona grammar, elongated geographical features like 'rwizi' (river) and 'rwendo' (journey) belong to Noun Class 11 ('ru-'), taking the distinctive 'rwu-' / 'rwa-' subject concord—as seen in 'rwizi rwuri kuyerera' ('the river is flowing').",
      },
    ],
  },
  {
    keywords: [
      'mabhuku',
      'bhuku',
      'chikoro',
      'mudzidzisi',
      'vadzidzi',
      'raibhurari',
      'bvunzo',
      'kuverenga',
      'kunyora',
      'notebook',
      'notebooks',
      'books',
      'school',
      'teacher',
      'cloth',
      'jira',
    ],
    wikiTopics: ['Education_in_Zimbabwe', 'Culture_of_Zimbabwe', 'University_of_Zimbabwe'],
    perspectives: [
      {
        title: "Exercise Books ('Mabhuku eKunyora') & Zimbabwe's High Literacy Tradition",
        content:
          "Zimbabwe boasts one of the highest literacy rates in Africa, a legacy of deep family investment in schooling ('chikoro'). Students carefully cover and arrange their ruled exercise books ('mabhuku ekunyora') and textbooks ('mabhuku ekuverenga'), treating study materials with great care at home and in the classroom.",
      },
      {
        title: "Patterned Textiles ('Machira') & Decorative Tablecloths in Shona Homes",
        content:
          "In Zimbabwean households, tables and study desks are frequently draped with colourful woven cloths ('jira dzvuku neritema' or 'machira emavara')—including traditional 'retso' and 'zambia' fabrics—creating an orderly, welcoming surface for reading and family study.",
      },
      {
        title: "The Role of the Teacher ('Mudzidzisi') & Examination Preparation ('Bvunzo')",
        content:
          "In Zimbabwean primary and secondary schools, teachers ('vadzidzisi') guide students toward national ZIMSEC examinations ('bvunzo'), encouraging daily reading ('kuverenga mabhuku zuva nezuva') and collaborative study groups.",
      },
      {
        title: "Class 5/6 ('ri-/ma-') Adaptation of Educational Vocabulary ('Bhuku' / 'Mabhuku')",
        content:
          "Shona integrates educational nouns like 'bhuku' (singular, Class 5 'bhuku iri') and 'mabhuku' (plural, Class 6 'mabhuku aya') seamlessly into Bantu concord patterns, allowing speakers to describe study materials with rich adjectival and locative precision.",
      },
    ],
  },
  {
    keywords: [
      'kupisa',
      'basa',
      'kurima',
      'munda',
      'nzungu',
      'gohwo',
      'goho',
      'chibage',
      'mbuya',
      'kumusha',
      'burning',
      'manual',
      'labor',
      'harvest',
      'groundnuts',
      'field',
    ],
    wikiTopics: ['Agriculture_in_Zimbabwe', 'Geography_of_Zimbabwe', 'Shona_people'],
    perspectives: [
      {
        title: "Land Preparation, Firebreaks & Seasonal Field Work ('Basa reMaoko') in Zimbabwe",
        content:
          "Before the summer rains arrive on the Zimbabwean plateau, rural farmers carry out intensive manual fieldwork ('basa remaoko')—clearing dry stalks, cutting firebreaks ('moto wekupisa'), and preparing ridges for planting. Controlled burning and ash fertilization ('rota') have long been regulated by traditional leaders ('masabhuku') and environmental guidelines to protect surrounding woodlands.",
      },
      {
        title: "Grandmothers ('Mbuya') & Groundnut ('Nzungu') Cultivation at the Rural Home ('Kumusha')",
        content:
          "In Shona rural homesteads ('kumusha'), grandmothers ('mbuya') are revered custodians of agricultural knowledge, especially the cultivation of groundnuts ('nzungu'), Bambara groundnuts ('nyimo'), and sweet potatoes ('mbambaira'). Groundnuts are roasted or ground on a stone ('guyo') into rich peanut butter ('dovi').",
      },
      {
        title: "Collective Work Parties ('Nhimbe' / 'Humwe') & Hard Work ('Kushanda neSimba')",
        content:
          "When heavy agricultural tasks arise—such as weeding, harvesting ('kukohwa goho rakanaka'), or threshing—Shona neighbours organize a 'nhimbe' (cooperative work party), sharing labour, song, and food so the work is completed swiftly together.",
      },
      {
        title: 'Agricultural Proverbs & the Ethic of Diligence in Shona Culture',
        content:
          "Shona oral literature celebrates manual diligence ('kushanda nesimba'), teaching that a bountiful harvest ('goho rakanaka') rewards steady preparation and community cooperation ('chara chimwe hachitswanyi inda'—one finger cannot crush a louse alone).",
      },
    ],
  },
  {
    keywords: [
      'mifananidzo',
      'mufananidzo',
      'fudzi',
      'musikana',
      'mukomana',
      'munhukadzi',
      'mukadzi',
      'murume',
      'pictures',
      'tattoo',
      'shoulder',
      'girl',
      'portrait',
    ],
    wikiTopics: ['Art_of_Zimbabwe', 'Shona_sculpture', 'Culture_of_Zimbabwe'],
    perspectives: [
      {
        title: "Visual Art, Portraiture ('Mifananidzo') & Contemporary Youth Expression in Zimbabwe",
        content:
          "In contemporary urban Zimbabwe, visual art ('mifananidzo') spans gallery painting at the National Gallery of Zimbabwe in Harare and Bulawayo, street murals, photography, and modern body art. The Shona noun 'mufananidzo' (plural 'mifananidzo', derived from '-fanana' = to resemble) refers to drawings, photographs, portraits, and symbolic emblems.",
      },
      {
        title: "Historical Body Adornment ('Nyora') & Symbolic Motifs in Shona Tradition",
        content:
          "Historically in Shona culture, decorative skin markings ('nyora') and beadwork patterns ('chuma') carried aesthetic and lineage significance. In modern times, graphic art and symbolic portraits ('mifananidzo yakanyorwa') among young urban Zimbabweans reflect global and pan-African artistic trends.",
      },
      {
        title: 'Describing Human Figures & Posture in Spoken ChiZezuru',
        content:
          "Spoken ChiZezuru is rich in observational detail when describing people—distinguishing age and gender terms such as 'musikana' (young woman/girl), 'mukomana' (young man/boy), 'munhukadzi' (woman), and anatomical landmarks like 'pafudzi' (on the shoulder) or 'kumeso' (on the face).",
      },
      {
        title: "Morphology of 'Mufananidzo': Reciprocal & Causative Extensions on '-fana'",
        content:
          "The word 'mufananidzo' ('picture / image / likeness') showcases Shona's expressive derivational morphology: combining Class 3 'mu-' (or Class 4 plural 'mi-') with '-fan-an-idz-o' ('that which causes things to resemble one another').",
      },
    ],
  },
];

async function fetchWikipediaSummary(wikiTitle: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const body = await fetchHttpsText(url, 8000);
    const parsed = JSON.parse(body);
    if (typeof parsed?.extract === 'string' && parsed.extract.trim().length > 60) {
      // Take first 2 sentences of the encyclopedic extract
      const sents = parsed.extract.trim().split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      return sents;
    }
  } catch {}
  return null;
}

export async function generateTextbookCulturalNotesAsync(
  shonaText: string,
  englishTranslation: string,
  lessonNumber: number,
  variationSeed = 0
): Promise<CulturalNote[]> {
  // 1. If Gemini API key is configured in .env, use Gemini to write a bespoke, well-researched cultural note
  if (getGeminiApiKey()) {
    const gemOut = await callGeminiJson(
      `You are writing a cultural, historical, geographical, or ethnographic note for Lesson ${lessonNumber} of an Assimil Shona (ChiZezuru) textbook.
Lesson Shona text: "${shonaText}"
Lesson English translation: "${englishTranslation}"
Variation angle: ${variationSeed}
Write ONE deeply researched, fascinating, concrete cultural/historical/geographical/material-culture note directly relevant to the specific subject in this text (e.g. Zimbabwean customs, history, geography, flora, architecture, cuisine, grooming, material culture, or sociolinguistics).
STRICT RULE: NEVER use generic boilerplate or filler phrases like "the speaker uses vivid ChiZezuru phrasing". Every sentence must contain real, specific cultural or historical facts about Zimbabwe and Shona life directly tied to the subject of this passage.
Return JSON: {"title": "...", "content": "..."}`
    );
    if (
      gemOut &&
      typeof gemOut.title === 'string' &&
      typeof gemOut.content === 'string' &&
      gemOut.content.trim().length > 40
    ) {
      return [{ title: gemOut.title.trim(), content: gemOut.content.trim() }];
    }
  }

  const kb = loadTextbookKnowledge();
  const norm = normalizeTextKey(shonaText);

  // 2. When variationSeed === 0, check curated per-sentence cultural encyclopedia first
  if (variationSeed === 0) {
    for (const [subKey, title, content] of kb.SENTENCE_CULTURAL_NOTES) {
      if (norm.includes(subKey.toLowerCase())) {
        return [{ title, content }];
      }
    }
  }

  // 3. Match specific cultural domains using whole-word & stem tokenization (never accidental substring!)
  const combinedTokens = new Set(
    `${norm} ${englishTranslation.toLowerCase()}`.match(/[a-z']+/g) || []
  );

  const matchedDomains: Array<{ score: number; domain: CulturalDomainEntry }> = [];
  for (const domain of ZIMBABWE_CULTURAL_ENCYCLOPEDIA) {
    let score = 0;
    for (const kw of domain.keywords) {
      const kwClean = kw.trim().toLowerCase();
      if (combinedTokens.has(kwClean)) {
        score += 3;
      } else {
        for (const tok of combinedTokens) {
          if (tok.length >= 5 && kwClean.length >= 5 && (tok.endsWith(kwClean) || tok.startsWith(kwClean))) {
            score += 2;
          }
        }
      }
    }
    if (score > 0) {
      matchedDomains.push({ score, domain });
    }
  }

  matchedDomains.sort((a, b) => b.score - a.score);

  if (matchedDomains.length > 0) {
    // Collect all perspectives from top matching domain(s)
    const primaryDomain = matchedDomains[0].domain;
    const allPerspectives = [...primaryDomain.perspectives];
    if (matchedDomains.length > 1 && matchedDomains[1].score >= 2) {
      allPerspectives.push(...matchedDomains[1].domain.perspectives);
    }

    // Also include curated match if present as one of the perspectives
    for (const [subKey, title, content] of kb.SENTENCE_CULTURAL_NOTES) {
      if (norm.includes(subKey.toLowerCase())) {
        allPerspectives.unshift({ title, content });
        break;
      }
    }

    const chosenPerspective = allPerspectives[variationSeed % allPerspectives.length];

    // If regenerating (variationSeed > 0) and online, enrich with live Wikipedia encyclopedic research on the matched topic
    if (variationSeed > 0 && primaryDomain.wikiTopics.length > 0) {
      const wikiTopic = primaryDomain.wikiTopics[variationSeed % primaryDomain.wikiTopics.length];
      const wikiExtract = await fetchWikipediaSummary(wikiTopic);
      if (wikiExtract && !chosenPerspective.content.includes(wikiExtract.slice(0, 30))) {
        return [
          {
            title: chosenPerspective.title,
            content: `${chosenPerspective.content}\n\nEncyclopedic Context (${wikiTopic.replace(/_/g, ' ')}): ${wikiExtract}`,
          },
        ];
      }
    }

    return [chosenPerspective];
  }

  // Check if any curated note matches even when variationSeed > 0
  for (const [subKey, title, content] of kb.SENTENCE_CULTURAL_NOTES) {
    if (norm.includes(subKey.toLowerCase())) {
      const wikiExtract =
        variationSeed > 0
          ? await fetchWikipediaSummary(
              ['Culture_of_Zimbabwe', 'Shona_people', 'History_of_Zimbabwe', 'Geography_of_Zimbabwe'][
                variationSeed % 4
              ]
            )
          : null;
      return [
        {
          title,
          content: wikiExtract ? `${content}\n\nHistorical & Cultural Background: ${wikiExtract}` : content,
        },
      ];
    }
  }

  return [];
}

export function generateTextbookCulturalNotes(
  shonaText: string,
  englishTranslation: string,
  lessonNumber: number,
  variationSeed = 0
): CulturalNote[] {
  const kb = loadTextbookKnowledge();
  const norm = normalizeTextKey(shonaText);

  if (variationSeed === 0) {
    for (const [subKey, title, content] of kb.SENTENCE_CULTURAL_NOTES) {
      if (norm.includes(subKey.toLowerCase())) {
        return [{ title, content }];
      }
    }
  }

  const combinedTokens = new Set(
    `${norm} ${englishTranslation.toLowerCase()}`.match(/[a-z']+/g) || []
  );
  const matchedDomains: Array<{ score: number; domain: CulturalDomainEntry }> = [];
  for (const domain of ZIMBABWE_CULTURAL_ENCYCLOPEDIA) {
    let score = 0;
    for (const kw of domain.keywords) {
      const kwClean = kw.trim().toLowerCase();
      if (combinedTokens.has(kwClean)) score += 3;
      else {
        for (const tok of combinedTokens) {
          if (tok.length >= 5 && kwClean.length >= 5 && (tok.endsWith(kwClean) || tok.startsWith(kwClean))) {
            score += 2;
          }
        }
      }
    }
    if (score > 0) matchedDomains.push({ score, domain });
  }
  matchedDomains.sort((a, b) => b.score - a.score);
  if (matchedDomains.length > 0) {
    const persp = matchedDomains[0].domain.perspectives;
    return [persp[variationSeed % persp.length]];
  }
  return [];
}

function rotateOptions(correct: string, distractors: string[], seed: number): string[] {
  const uniqueDist: string[] = [];
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

export function generateContextualExercises(
  shonaText: string,
  englishTranslation: string,
  lessonNumber: number,
  grammarNotes: GrammarNote[],
  literalGloss: WordGloss[],
  variationSeed = 0
): ExerciseItem[] {
  const kb = loadTextbookKnowledge();
  const lowerWords = new Set(shonaText.toLowerCase().match(/[A-Za-z']+/g) || []);

  const scoredPools: Array<[number, number, Array<any>]> = [];
  kb.THEMATIC_NEW_EXERCISES.forEach((pool, idx) => {
    const overlap = (pool.tags || []).filter((t) => lowerWords.has(t.toLowerCase())).length;
    scoredPools.push([overlap, -idx, pool.drills || []]);
  });
  scoredPools.sort((a, b) => (b[0] !== a[0] ? b[0] - a[0] : b[1] - a[1]));

  const candidateDrills: Array<any> = [];
  for (const [, , drills] of scoredPools) {
    for (const d of drills) {
      if (!candidateDrills.includes(d)) {
        candidateDrills.push(d);
      }
    }
  }

  const exercises: ExerciseItem[] = [];
  if (candidateDrills.length > 0) {
    const startOffset = (lessonNumber * 3 + variationSeed * 5) % candidateDrills.length;
    const step = variationSeed % 2 === 0 ? 7 : 11;
    for (let i = 0; i < 3; i++) {
      const drill = candidateDrills[(startOffset + i * step) % candidateDrills.length];
      const opts = rotateOptions(
        drill.correct,
        drill.distractors || [],
        lessonNumber * 5 + i * 3 + variationSeed * 2 + 1
      );
      let exType: 'multiple_choice' | 'fill_blank' | 'translate' =
        drill.type === 'translate' ? 'translate' : 'multiple_choice';
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

export async function generateContextualExercisesAsync(
  shonaText: string,
  englishTranslation: string,
  lessonNumber: number,
  grammarNotes: GrammarNote[],
  literalGloss: WordGloss[],
  variationSeed = 0
): Promise<ExerciseItem[]> {
  if (getGeminiApiKey()) {
    const gemOut = await callGeminiJson(
      `Create 3 varied Shona (ChiZezuru) exercises for Lesson ${lessonNumber} testing the vocabulary and grammar of this lesson on BRAND-NEW practice sentences (never asking for the already-shown translation of the lesson text).
Lesson Shona: "${shonaText}"
Lesson English: "${englishTranslation}"
Include a mix of "multiple_choice", "fill_blank" (using ______ in the prompt), and "translate". Each exercise must have 1 correct_answer, 3 plausible distractors, and a clear explanation.
Return JSON: {"exercises": [{"type": "multiple_choice"|"fill_blank"|"translate", "prompt": "...", "correct": "...", "distractors": ["...", "...", "..."], "explanation": "..."}]}`
    );
    if (gemOut && Array.isArray(gemOut.exercises) && gemOut.exercises.length >= 3) {
      return gemOut.exercises.slice(0, 3).map((ex: any, i: number) => {
        const opts = rotateOptions(
          String(ex.correct || ''),
          Array.isArray(ex.distractors) ? ex.distractors.map(String) : [],
          lessonNumber * 5 + i * 3 + variationSeed + 1
        );
        return {
          type:
            ex.type === 'fill_blank' || String(ex.prompt || '').includes('______')
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
  return generateContextualExercises(
    shonaText,
    englishTranslation,
    lessonNumber,
    grammarNotes,
    literalGloss,
    variationSeed
  );
}

export async function generateTextbookGrammarNotesAsync(
  shonaText: string,
  englishTranslation: string,
  lessonNumber: number,
  variationSeed = 0
): Promise<GrammarNote[]> {
  if (getGeminiApiKey()) {
    const gemOut = await callGeminiJson(
      `Write 3 detailed, beginner-friendly Shona (ChiZezuru) grammar notes for Lesson ${lessonNumber}, grounded directly in the exact words and grammatical concords of this text:
Shona: "${shonaText}"
English: "${englishTranslation}"
Variation seed: ${variationSeed}
Return JSON: {"grammar_notes": [{"title": "...", "content": "...", "rule": "..."}]}`
    );
    if (gemOut && Array.isArray(gemOut.grammar_notes) && gemOut.grammar_notes.length >= 3) {
      return gemOut.grammar_notes.slice(0, 3).map((g: any) => ({
        title: String(g.title || ''),
        content: String(g.content || ''),
        rule: String(g.rule || ''),
      }));
    }
  }
  return generateTextbookGrammarNotes(shonaText, englishTranslation, lessonNumber, variationSeed);
}

export function buildReviewForSevenLessons(
  sevenLessons: Record<string, any>[],
  reviewLessonNum: number
): {
  review_summary: { title: string; sections: { heading: string; points: string[] }[] };
  key_noun_classes_covered: string[];
  review_exercises: ExerciseItem[];
  reviewed_lessons: number[];
} {
  const kb = loadTextbookKnowledge();
  const blockIdx = Math.floor(reviewLessonNum / 7);
  const startNum = Math.max(1, reviewLessonNum - 6);
  const rangeStr = `Lessons ${startNum}–${reviewLessonNum}`;

  const vocabPoints: string[] = [];
  const grammarPoints: string[] = [];
  const culturePoints: string[] = [];
  const topicsCovered: string[] = [];

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
    if (
      cNotes.length > 0 &&
      typeof cNotes[0] === 'object' &&
      cNotes[0] !== null &&
      culturePoints.length < 4
    ) {
      const ct = String(cNotes[0].title || '');
      const cc = String(cNotes[0].content || '');
      const firstSent = cc ? `${cc.split('. ')[0]}.` : '';
      if (ct) culturePoints.push(`${ct}: ${firstSent}`);
    }
  }

  const bankKey = String(((blockIdx - 1) % 14) + 1);
  const rawBank = kb.REVIEW_BLOCK_NEW_EXERCISES[bankKey] || kb.REVIEW_BLOCK_NEW_EXERCISES['1'] || [];
  const reviewExercises: ExerciseItem[] = [];

  rawBank.forEach((item, idx) => {
    const opts = rotateOptions(item.correct, item.distractors || [], reviewLessonNum * 3 + idx);
    let promptText = item.prompt;
    if (blockIdx > 14 && promptText.startsWith(`Review ${bankKey} `)) {
      promptText = promptText.replace(`Review ${bankKey} `, `Review ${blockIdx} `);
    }
    let exType: 'multiple_choice' | 'fill_blank' | 'translate' =
      item.type === 'translate' ? 'translate' : 'multiple_choice';
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

export function calculateDifficultyScore(shonaText: string, durationSeconds: number): number {
  const words = shonaText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) return 999.0;
  const avgWordLen = words.reduce((acc, w) => acc + w.length, 0) / wordCount;
  return Number((wordCount * 1.8 + durationSeconds * 2.0 + avgWordLen * 1.2).toFixed(2));
}

export async function enrichClipObject(
  rawClip: Record<string, any>,
  lessonNumber: number,
  variationSeed = 0
): Promise<Record<string, any>> {
  const shonaText = String(rawClip.shona_text || rawClip.transcript || '').trim();
  const durationSeconds = Number(rawClip.duration_seconds || 5.0);

  const words = shonaText.split(/\s+/).filter(Boolean);
  const literalGloss = words.map((w) => analyzeMorphemesAndClass(w));
  const { englishTranslation, dialogue } = await resolveIdiomaticTranslationAndDialogue(
    shonaText,
    variationSeed
  );
  const grammarNotes = await generateTextbookGrammarNotesAsync(
    shonaText,
    englishTranslation,
    lessonNumber,
    variationSeed
  );
  const culturalNotes = await generateTextbookCulturalNotesAsync(
    shonaText,
    englishTranslation,
    lessonNumber,
    variationSeed
  );
  const activeExercises = await generateContextualExercisesAsync(
    shonaText,
    englishTranslation,
    lessonNumber,
    grammarNotes,
    literalGloss,
    variationSeed
  );
  const difficultyScore =
    rawClip.difficulty_score !== undefined
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
