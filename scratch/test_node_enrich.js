const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sampleClips = [
  {
    clip_id: "test_clip_1",
    shona_text: "Chikafu chakaiswa mundiro. Chimwe chinoratidza kuti maguru emombe akabikwa zvineunyanzvi akaibva zvakanaka sezvo ane muto wakatsvukira unoratidza kuti wakaiswa madomasi nehanyanisi. Arimundiro yesimbi inemupendero mutema . Parutivi rwendiro iyi pane mhiripiri yakanyorwa kunzi jikichiri.",
    duration_seconds: 26.5
  },
  {
    clip_id: "test_clip_2",
    shona_text: "Shiri imwechete yakamhara pa sanifurawa. Inemavara arikuendera nepayakamhara, anosakanisira yero, zvitema nezvichena.",
    duration_seconds: 18.4
  }
];

const tmpIn = path.join(os.tmpdir(), 'shona_raw_test.json');
const tmpOut = path.join(os.tmpdir(), 'shona_enriched_test.json');
fs.writeFileSync(tmpIn, JSON.stringify(sampleClips), 'utf-8');

try {
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
  const pipelineScript = path.resolve(__dirname, '../pipeline/enrich.py');
  console.log('Running:', pythonBin, pipelineScript);
  execFileSync(pythonBin, [pipelineScript, '--enrich-batch', tmpIn, '--output', tmpOut], {
    encoding: 'utf-8',
    timeout: 30000
  });

  const enriched = JSON.parse(fs.readFileSync(tmpOut, 'utf-8'));
  console.log('Successfully enriched', enriched.length, 'clips via python:');
  for (const c of enriched) {
    console.log('Clip:', c.clip_id);
    console.log('  English:', c.english_translation);
    console.log('  Dialogue sentences:', c.dialogue.length);
    console.log('  Grammar notes:', c.grammar_notes.length);
    console.log('  Cultural note:', c.cultural_notes[0].title);
    console.log('  Exercises:', c.active_exercises.length);
  }
} catch (err) {
  console.error('Failed to run python enrichment:', err);
} finally {
  try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch {}
}
