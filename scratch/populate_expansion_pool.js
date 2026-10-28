const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

async function populate() {
  const poolPath = path.join(__dirname, '../app/public/expansion_pool.json');
  const existingPool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
  console.log(`Current pool count: ${existingPool.length}`);

  const existingIds = new Set(existingPool.map(l => l.clip_id).filter(Boolean));
  const existingTexts = new Set(existingPool.map(l => String(l.shona_text || '').trim().toLowerCase()).filter(Boolean));

  const targetToAdd = 150;
  let offset = 300;
  const added = [];

  while (added.length < targetToAdd && offset < 5000) {
    console.log(`Fetching from HF offset ${offset}... (added ${added.length}/${targetToAdd})`);
    const url = `https://datasets-server.huggingface.co/rows?dataset=takuM23/shona-vibevoice-corpus&config=default&split=train&offset=${offset}&length=100`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`HF returned HTTP ${resp.status}`);
      break;
    }
    const data = await resp.json();
    const rows = Array.isArray(data.rows) ? data.rows : [];
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].row;
      const rawText = String(r.text || '').trim();
      if (!rawText || rawText.length < 15) continue;

      const normText = rawText.toLowerCase();
      if (existingTexts.has(normText)) continue;

      const clipId = `hf_vv_${offset}_${i}`;
      if (existingIds.has(clipId)) continue;

      let duration = typeof r.audio_duration === 'number' ? r.audio_duration : 0;
      if (!duration && r.audio && r.audio[0] && r.audio[0].src) {
        duration = Math.max(3.5, Math.min(120.0, Math.round((rawText.length / 13.0) * 10) / 10));
      }
      if (duration > 120.0) continue;

      const audioSrc = r.audio && r.audio[0] ? r.audio[0].src : null;
      const words = rawText.split(/\s+/).map((w) => w.replace(/[.,?!:;"'()]/g, '')).filter(Boolean);
      const glossBreakdown = buildGlossBreakdown(rawText);

      const rawClip = {
        clip_id: clipId,
        shona_text: rawText,
        duration_seconds: duration,
        audio_url: audioSrc || `/audio/clip_${clipId}.wav`,
      };

      added.push(rawClip);
      existingIds.add(clipId);
      existingTexts.add(normText);

      if (added.length >= targetToAdd) break;
    }

    offset += 100;
  }

  console.log(`Fetched ${added.length} raw clips. Enriching through pipeline/enrich.py...`);
  const tmpIn = path.join(__dirname, 'tmp_raw.json');
  const tmpOut = path.join(__dirname, 'tmp_enriched.json');
  fs.writeFileSync(tmpIn, JSON.stringify(added, null, 2), 'utf-8');
  require('child_process').execFileSync('python', ['pipeline/enrich.py', '--enrich-batch', tmpIn, '--output', tmpOut]);
  const enrichedClips = JSON.parse(fs.readFileSync(tmpOut, 'utf-8'));
  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);

  existingPool.push(...enrichedClips);
    }

    offset += 100;
  }

  fs.writeFileSync(poolPath, JSON.stringify(existingPool, null, 2), 'utf-8');
  console.log(`Successfully added ${added.length} lessons to expansion_pool.json! Total now: ${existingPool.length}`);
}

populate().catch(console.error);
