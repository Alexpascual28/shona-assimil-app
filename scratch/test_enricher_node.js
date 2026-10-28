const { enrichSingleClipInProcess, enrichClipsWithPythonOrFallback } = require('../app/dist-electron/enricher.js');

async function test() {
  console.log('Testing node enricher...');

  const rawSample = [
    {
      clip_id: 'sample_1',
      shona_text: 'Chikafu chakaiswa mundiro. Chimwe chinoratidza kuti maguru emombe akabikwa zvineunyanzvi akaibva zvakanaka sezvo ane muto wakatsvukira unoratidza kuti wakaiswa madomasi nehanyanisi. Arimundiro yesimbi inemupendero mutema . Parutivi rwendiro iyi pane mhiripiri yakanyorwa kunzi jikichiri.',
      duration_seconds: 25.0
    },
    {
      clip_id: 'sample_2',
      shona_text: 'Mutambo wenhabvu urikutambwa pakati pezvikwata zviviri. Chikwata chokutanga chakapfeka yinifomu inoruvara rutsvuku. Chikwata chechipiri chakapfeka yinifomu inehembe dzoruvara rwendarama nezvikabudura zvoruvara rutema.',
      duration_seconds: 22.0
    }
  ];

  // Test in-process fallback directly
  console.log('\n--- Test 1: In-process fallback ---');
  const fallbackResult = rawSample.map((c, i) => enrichSingleClipInProcess(c, 250 + i));
  for (const c of fallbackResult) {
    console.log(`[${c.clip_id}] English: ${c.english_translation}`);
    console.log(`  Dialogue count: ${c.dialogue.length}`);
    console.log(`  Grammar notes: ${c.grammar_notes.length}`);
    console.log(`  Cultural note: ${c.cultural_notes[0].title}`);
    console.log(`  Exercises: ${c.active_exercises.length}`);
    if (c.english_translation === c.shona_text) {
      throw new Error(`English translation matches Shona text for ${c.clip_id}`);
    }
    if (c.cultural_notes[0].content.includes('In everyday life in Zimbabwe, descriptive narratives like')) {
      throw new Error(`Boilerplate detected in ${c.clip_id}`);
    }
  }

  // Test full enrichClipsWithPythonOrFallback
  console.log('\n--- Test 2: Full enrichClipsWithPythonOrFallback ---');
  const fullResult = await enrichClipsWithPythonOrFallback(rawSample, 250, (p, m) => console.log(`  [${p}%] ${m}`));
  for (const c of fullResult) {
    console.log(`[${c.clip_id}] English: ${c.english_translation}`);
    console.log(`  Dialogue count: ${c.dialogue.length}`);
    console.log(`  Grammar notes: ${c.grammar_notes.length}`);
    console.log(`  Cultural note: ${c.cultural_notes[0].title}`);
    console.log(`  Exercises: ${c.active_exercises.length}`);
  }

  console.log('\nAll enricher tests passed successfully!');
}

test().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
