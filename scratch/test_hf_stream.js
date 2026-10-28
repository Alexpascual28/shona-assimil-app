const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Beginner prefix rules for morpheme breakdown
const PREFIX_RULES = [
  ["ndiriku", "ndiri (I am) + ku- (doing)", "Present Progressive (I am ...-ing)", "I am"],
  ["uriku", "uri (you are) + ku- (doing)", "Present Progressive (you are ...-ing)", "you are"],
  ["ariku", "ari (he/she is) + ku- (doing)", "Present Progressive (he/she is ...-ing)", "he/she is"],
  ["tiriku", "tiri (we are) + ku- (doing)", "Present Progressive (we are ...-ing)", "we are"],
  ["variku", "vari (they are) + ku- (doing)", "Present Progressive (they are ...-ing)", "they are"],
  ["zviriku", "zviri (they are) + ku- (doing)", "Present Progressive (things are ...-ing)", "they are"],
  ["ndino", "ndi- (I) + -no- (present)", "Present Tense Verb (I ...)", "I"],
  ["ndiri", "ndi- (I) + -ri (am)", "Present Helper Verb (I am)", "I am"],
  ["ndicha", "ndi- (I) + -cha- (will)", "Future Tense Verb (I will ...)", "I will"],
  ["ndaka", "nda- (I) + -ka- (past)", "Past Tense Verb (I did ...)", "I (past)"],
  ["tino", "ti- (we) + -no- (present)", "Present Tense Verb (we ...)", "we"],
  ["ticha", "ti- (we) + -cha- (will)", "Future Tense Verb (we will ...)", "we will"],
  ["vano", "va- (they) + -no- (present)", "Present Tense Verb (they ...)", "they"],
  ["vaka", "va- (they) + -ka- (past)", "Past Tense Verb (they did ...)", "they (past)"],
  ["vari", "va- (they) + -ri (are)", "Present Helper Verb (they are)", "they are"],
  ["ano", "a- (he/she) + -no- (present)", "Present Tense Verb (he/she ...)", "he/she"],
  ["aka", "a- (he/she) + -ka- (past)", "Past Tense Verb (he/she ...)", "he/she (past)"],
  ["ari", "a- (he/she) + -ri (is)", "Present Helper Verb (he/she is)", "he/she is"],
  ["ino", "i- (it) + -no- (present)", "Present Tense Verb (it ...)", "it"],
  ["iri", "i- (it) + -ri (is)", "Present Helper Verb (it is)", "it is"],
  ["zvi", "zvi- (plural things prefix)", "Plural Noun / Verb Prefix (zvi-)", "things"],
  ["chi", "chi- (singular thing prefix)", "Singular Noun / Verb Prefix (chi-)", "thing"],
  ["ma", "ma- (plural prefix)", "Plural Noun Prefix (ma-)", "plural"],
  ["mu", "mu- (singular person or 'in')", "Prefix (mu-)", "in / singular"],
  ["va", "va- (plural people prefix)", "Plural Person Prefix (va-)", "people"],
  ["ku", "ku- ('to' infinitive or location)", "Infinitive / Location Prefix (ku-)", "to / at"],
  ["pa", "pa- ('on / at' location prefix)", "Location Prefix (pa-)", "on / at"],
  ["ne", "ne- ('and / with' prefix)", "Connecting Prefix (ne-)", "and / with"],
];

function buildGlossBreakdown(text) {
  const words = text.split(/\s+/).map(w => w.replace(/[.,?!:;"'()]/g, '')).filter(Boolean);
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
          tone_pattern: 'L-H'
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
        tone_pattern: 'L-H'
      });
    }
  }
  return items;
}

function synthesizeTranslation(text) {
  // Natural bilingual mapping generator for VibeVoice passage sentences
  return text; // For test
}

async function runTest() {
  console.log('Testing Hugging Face Rows fetch...');
  const res = await fetch('https://datasets-server.huggingface.co/rows?dataset=takuM23/shona-vibevoice-corpus&config=default&split=train&offset=350&length=5');
  const data = await res.json();
  console.log(`Received ${data.rows.length} rows.`);

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i].row;
    const text = String(row.text || '').trim();
    const audioSrc = row.audio && row.audio[0] ? row.audio[0].src : null;
    const clipId = crypto.createHash('md5').update(text).digest('hex').slice(0, 16);
    const gloss = buildGlossBreakdown(text);
    console.log(`[Row ${i + 1}] ID: ${clipId}, Words: ${text.split(' ').length}, Gloss items: ${gloss.length}`);
  }
}

runTest().catch(console.error);
