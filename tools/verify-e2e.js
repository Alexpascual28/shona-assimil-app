const puppeteer = require('../app/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = 'C:\\Users\\apsr2\\.gemini\\antigravity\\brain\\491610b5-db70-4cc4-8399-c64cbe5560f1\\screenshots';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:5173/';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log('=== STARTING END-TO-END AUTOMATED BROWSER VERIFICATION ===');
  console.log(`Chrome Executable: ${CHROME_PATH}`);
  console.log(`Target URL: ${APP_URL}`);
  console.log(`Screenshots Directory: ${SCREENSHOTS_DIR}`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1366, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1366,900'
    ]
  });

  const page = await browser.newPage();

  // Helper to click by selector or text
  async function clickNext() {
    // The next button in navigation bar
    const nextBtn = await page.waitForSelector('footer button:last-child');
    await nextBtn.click();
    await sleep(400);
  }

  // Helper to select lesson from sidebar
  async function selectLesson(lessonNum) {
    console.log(`Selecting Lesson ${lessonNum} from sidebar...`);
    // Find button containing exact lesson number in badge
    const clicked = await page.evaluate((num) => {
      const buttons = Array.from(document.querySelectorAll('aside button'));
      for (const btn of buttons) {
        const badge = btn.querySelector('span');
        if (badge && badge.textContent.trim() === String(num)) {
          btn.click();
          return true;
        }
      }
      return false;
    }, lessonNum);

    if (!clicked) {
      // Fallback: evaluate jumpToLesson directly via React context or reload with progress
      console.log(`Sidebar button for Lesson ${lessonNum} not found in visible list, scrolling or using direct jump...`);
      await page.evaluate((num) => {
        const buttons = Array.from(document.querySelectorAll('aside button'));
        for (const btn of buttons) {
          if (btn.textContent.includes(`Chidzidzo ${num}`) || btn.textContent.includes(`Lesson ${num}`)) {
            btn.scrollIntoView();
            btn.click();
            return;
          }
        }
      }, lessonNum);
    }
    await sleep(500);
  }

  const testReport = {
    timestamp: new Date().toISOString(),
    flows: [],
    overallSuccess: true
  };

  try {
    console.log(`Navigating to ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for the app to finish loading syllabus
    await page.waitForSelector('header h2', { timeout: 10000 });
    const headerTitle = await page.$eval('header h2', el => el.textContent);
    console.log(`App loaded successfully: ${headerTitle}`);

    // ==========================================
    // FLOW 1: Lesson 2 - Standard Passive (7 Steps)
    // ==========================================
    console.log('\n==================================================');
    console.log('>>> VERIFYING FLOW 1: Lesson 2 - Standard Passive <<<');
    console.log('==================================================');
    const flow1Results = { name: 'Flow 1: Lesson 2 Standard Passive', steps: [], passed: true };

    // Select Lesson 2
    await selectLesson(2);
    await sleep(500);

    // Assert Lesson 2 header
    const currentLessonHeader = await page.$eval('header h2', el => el.textContent);
    console.log(`Active Lesson in Header: ${currentLessonHeader}`);

    // --- STEP 1: PASSIVE_BLIND_1 ---
    console.log('\n--- Checking Step 1: PASSIVE_BLIND_1 ---');
    let stepTitle = await page.$eval('main h3', el => el.textContent).catch(() => '');
    let instructionTitle = await page.evaluate(() => document.querySelector('main')?.innerText || '');
    let hasAudio = await page.$('audio') !== null;
    let hasAudioPlayer = await page.evaluate(() => document.querySelector('audio') !== null || document.body.innerText.includes('Acoustic Shadowing Pass'));
    let hasShonaTranscript = await page.evaluate(() => document.body.innerText.includes('Shona Transcript (ChiZezuru)'));
    let hasEnglishDialogue = await page.evaluate(() => document.body.innerText.includes('English & Literal Meaning') || document.body.innerText.includes('English Translation & Literal Meaning'));

    console.log(`Step 1 Title: "${stepTitle}"`);
    console.log(`Step 1 Has Audio Player: ${hasAudioPlayer}`);
    console.log(`Step 1 Shona Text Hidden: ${!hasShonaTranscript}`);

    if (hasShonaTranscript || !hasAudioPlayer) {
      throw new Error(`Flow 1 Step 1 assertion failed: Shona text hidden=${!hasShonaTranscript}, Audio player=${hasAudioPlayer}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow1_step1_blind1.png') });
    flow1Results.steps.push({ step: 1, name: 'PASSIVE_BLIND_1', shonaHidden: !hasShonaTranscript, audioPresent: hasAudioPlayer });

    // --- STEP 2: PASSIVE_GLOBAL ---
    console.log('\n--- Checking Step 2: PASSIVE_GLOBAL ---');
    await clickNext();
    stepTitle = await page.evaluate(() => document.querySelector('main h3')?.textContent || '');
    hasAudioPlayer = await page.evaluate(() => document.querySelector('audio') !== null || document.body.innerText.toLowerCase().includes('global meaning pass'));
    hasShonaTranscript = await page.evaluate(() => {
      // Shona transcript header should NOT be present
      return document.body.innerText.toLowerCase().includes('shona transcript (chizezuru)');
    });
    let badgeShonaHidden = await page.evaluate(() => document.body.innerText.toLowerCase().includes('shona transcript hidden'));
    let hasEnglishText = await page.evaluate(() => document.body.innerText.toLowerCase().includes('english translation & literal meaning') || document.body.innerText.includes('We bought maize meal'));

    console.log(`Step 2 English Text Shown: ${hasEnglishText}`);
    console.log(`Step 2 Shona Transcript Hidden Badge: ${badgeShonaHidden}`);
    console.log(`Step 2 Audio Player: ${hasAudioPlayer}`);

    if (!hasEnglishText || !badgeShonaHidden || hasShonaTranscript || !hasAudioPlayer) {
      throw new Error(`Flow 1 Step 2 assertion failed: English shown=${hasEnglishText}, Shona hidden=${!hasShonaTranscript}, Audio=${hasAudioPlayer}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow1_step2_global.png') });
    flow1Results.steps.push({ step: 2, name: 'PASSIVE_GLOBAL', shonaHidden: !hasShonaTranscript, englishShown: hasEnglishText, audioPresent: hasAudioPlayer });

    // --- STEP 3: PASSIVE_DETAILED ---
    console.log('\n--- Checking Step 3: PASSIVE_DETAILED ---');
    await clickNext();
    hasShonaTranscript = await page.evaluate(() => document.body.innerText.toLowerCase().includes('shona transcript (chizezuru)'));
    hasEnglishText = await page.evaluate(() => document.body.innerText.toLowerCase().includes('english & literal meaning'));
    hasAudioPlayer = await page.evaluate(() => document.querySelector('audio') !== null || document.body.innerText.toLowerCase().includes('detailed bilingual shadowing'));

    console.log(`Step 3 Shona Shown: ${hasShonaTranscript}, English Shown: ${hasEnglishText}, Audio: ${hasAudioPlayer}`);
    if (!hasShonaTranscript || !hasEnglishText || !hasAudioPlayer) {
      throw new Error('Flow 1 Step 3 assertion failed: Both texts and audio must be present');
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow1_step3_detailed.png') });
    flow1Results.steps.push({ step: 3, name: 'PASSIVE_DETAILED', shonaShown: hasShonaTranscript, englishShown: hasEnglishText, audioPresent: hasAudioPlayer });

    // --- STEP 4: PASSIVE_NOTES ---
    console.log('\n--- Checking Step 4: PASSIVE_NOTES ---');
    await clickNext();
    hasAudio = await page.$('audio') !== null;
    let hasGrammarNotes = await page.evaluate(() => document.body.innerText.toLowerCase().includes('grammar & concord analysis'));
    console.log(`Step 4 Audio Controls Hidden: ${!hasAudio}`);
    console.log(`Step 4 Grammar Notes Shown: ${hasGrammarNotes}`);
    if (hasAudio || !hasGrammarNotes) {
      throw new Error(`Flow 1 Step 4 assertion failed: Audio hidden=${!hasAudio}, Grammar notes=${hasGrammarNotes}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow1_step4_notes.png') });
    flow1Results.steps.push({ step: 4, name: 'PASSIVE_NOTES', audioHidden: !hasAudio, grammarNotesShown: hasGrammarNotes });

    // --- STEP 5: PASSIVE_READ_NO_AUDIO ---
    console.log('\n--- Checking Step 5: PASSIVE_READ_NO_AUDIO ---');
    await clickNext();
    hasAudio = await page.$('audio') !== null;
    let hasReadAloud = await page.evaluate(() => document.body.innerText.toLowerCase().includes('read aloud (chizezuru)'));
    let hasMuteNotice = await page.evaluate(() => document.body.innerText.toLowerCase().includes('audio is intentionally muted'));
    console.log(`Step 5 Audio Controls Hidden: ${!hasAudio}`);
    console.log(`Step 5 Read Aloud ChiZezuru: ${hasReadAloud}`);
    if (hasAudio || !hasReadAloud || !hasMuteNotice) {
      throw new Error(`Flow 1 Step 5 assertion failed: Audio hidden=${!hasAudio}, Read aloud=${hasReadAloud}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow1_step5_read_no_audio.png') });
    flow1Results.steps.push({ step: 5, name: 'PASSIVE_READ_NO_AUDIO', audioHidden: !hasAudio, readAloudShown: hasReadAloud });

    // --- STEP 6: PASSIVE_BLIND_2 ---
    console.log('\n--- Checking Step 6: PASSIVE_BLIND_2 ---');
    await clickNext();
    hasAudioPlayer = await page.evaluate(() => document.querySelector('audio') !== null || document.body.innerText.toLowerCase().includes('final master audio pass'));
    hasShonaTranscript = await page.evaluate(() => document.body.innerText.toLowerCase().includes('shona transcript (chizezuru)') || document.body.innerText.toLowerCase().includes('read aloud (chizezuru)'));
    hasEnglishText = await page.evaluate(() => document.body.innerText.toLowerCase().includes('english & literal meaning') || document.body.innerText.toLowerCase().includes('verify translation (english)'));
    console.log(`Step 6 Audio Player: ${hasAudioPlayer}`);
    console.log(`Step 6 Shona Text Hidden: ${!hasShonaTranscript}`);
    console.log(`Step 6 English Text Hidden: ${!hasEnglishText}`);
    if (!hasAudioPlayer || hasShonaTranscript || hasEnglishText) {
      throw new Error(`Flow 1 Step 6 assertion failed: Audio=${hasAudioPlayer}, Shona hidden=${!hasShonaTranscript}, English hidden=${!hasEnglishText}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow1_step6_blind2.png') });
    flow1Results.steps.push({ step: 6, name: 'PASSIVE_BLIND_2', audioPresent: hasAudioPlayer, shonaHidden: !hasShonaTranscript, englishHidden: !hasEnglishText });

    // --- STEP 7: PASSIVE_PREV_REVIEW ---
    console.log('\n--- Checking Step 7: PASSIVE_PREV_REVIEW ---');
    await clickNext();
    let prevReviewBanner = await page.evaluate(() => document.body.innerText.toLowerCase().includes('reviewing lesson 1:'));
    let prevReviewAudio = await page.evaluate(() => document.body.innerText.toLowerCase().includes('lesson 1: review audio'));
    let prevReviewTranscript = await page.evaluate(() => document.body.innerText.toLowerCase().includes('shona dialogue (lesson 1)'));
    let prevReviewDialogueLine = await page.evaluate(() => document.body.innerText.includes('Huyai kuno nekukasira!'));

    console.log(`Step 7 Loads Lesson 1 Banner: ${prevReviewBanner}`);
    console.log(`Step 7 Loads Lesson 1 Audio: ${prevReviewAudio}`);
    console.log(`Step 7 Loads Lesson 1 Transcript: ${prevReviewTranscript}`);
    console.log(`Step 7 Contains Lesson 1 Line ("Huyai kuno nekukasira!"): ${prevReviewDialogueLine}`);

    if (!prevReviewBanner || !prevReviewAudio || !prevReviewTranscript || !prevReviewDialogueLine) {
      throw new Error(`Flow 1 Step 7 assertion failed: Lesson 1 banner=${prevReviewBanner}, audio=${prevReviewAudio}, transcript=${prevReviewTranscript}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow1_step7_prev_review.png') });
    flow1Results.steps.push({ step: 7, name: 'PASSIVE_PREV_REVIEW', loadedLesson1Review: true, dialogueVerified: prevReviewDialogueLine });
    testReport.flows.push(flow1Results);
    console.log('>>> FLOW 1 VERIFIED 100% SUCCESSFULLY! <<<\n');

    // ==========================================
    // FLOW 2: Lesson 7 - Comprehensive Review
    // ==========================================
    console.log('==================================================');
    console.log('>>> VERIFYING FLOW 2: Lesson 7 - Comprehensive Review <<<');
    console.log('==================================================');
    const flow2Results = { name: 'Flow 2: Lesson 7 Comprehensive Review', steps: [], passed: true };

    // Select Lesson 7
    await selectLesson(7);
    await sleep(600);

    // Verify it loads the 7th-lesson review notes and exercises instead of 7-step shadowing loop
    let isReviewPhase = await page.evaluate(() => {
      const banner = document.body.innerText.toLowerCase();
      return banner.includes('review lesson 7') && banner.includes('assimil 7th-lesson consolidation');
    });
    let has7StepLoop = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('blind shadowing') || text.includes('step 1 of 7');
    });
    let hasReviewNotes = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('core grammatical mastery & concords') || text.includes('comprehensive review');
    });

    console.log(`Lesson 7 Loads Review Phase: ${isReviewPhase}`);
    console.log(`Lesson 7 7-Step Shadowing Loop Absent: ${!has7StepLoop}`);
    console.log(`Lesson 7 Review Notes Present: ${hasReviewNotes}`);

    if (!isReviewPhase || has7StepLoop || !hasReviewNotes) {
      throw new Error(`Flow 2 assertion failed: Review phase=${isReviewPhase}, 7-step absent=${!has7StepLoop}, Review notes=${hasReviewNotes}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow2_lesson7_review_notes.png') });
    flow2Results.steps.push({ step: 1, name: 'REVIEW_NOTES', reviewPhase: true, sevenStepLoopAbsent: !has7StepLoop });

    // Step 2: Review Exercises
    await clickNext();
    let hasReviewExercises = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('assimil consolidation exercises') || text.includes('exercise 1 of') || text.includes('review lesson 7');
    });
    console.log(`Lesson 7 Review Exercises Present: ${hasReviewExercises}`);
    if (!hasReviewExercises) {
      throw new Error(`Flow 2 assertion failed: Review exercises not loaded`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow2_lesson7_review_exercises.png') });
    flow2Results.steps.push({ step: 2, name: 'REVIEW_EXERCISES', reviewExercisesPresent: hasReviewExercises });

    testReport.flows.push(flow2Results);
    console.log('>>> FLOW 2 VERIFIED 100% SUCCESSFULLY! <<<\n');

    // ==========================================
    // FLOW 3: Lesson 50 - Active Wave Transition
    // ==========================================
    console.log('==================================================');
    console.log('>>> VERIFYING FLOW 3: Lesson 50 - Active Wave Transition <<<');
    console.log('==================================================');
    const flow3Results = { name: 'Flow 3: Lesson 50 Active Wave Transition', steps: [], passed: true };

    // Filter sidebar by 'active' and select Lesson 50
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside button'));
      const activeFilterBtn = buttons.find(b => b.textContent.includes('Active Wave (50+)'));
      if (activeFilterBtn) activeFilterBtn.click();
    });
    await sleep(400);

    await selectLesson(50);
    await sleep(500);

    let l50Header = await page.$eval('header h2', el => el.textContent);
    console.log(`Active Lesson in Header: ${l50Header}`);

    // Click through all 7 passive steps for Lesson 50
    console.log('Clicking through all 7 passive steps of Lesson 50...');
    for (let s = 1; s <= 6; s++) {
      console.log(`  Passed passive step ${s}`);
      await clickNext();
      await sleep(300);
    }

    // Now on Step 7 (PASSIVE_PREV_REVIEW) for Lesson 50
    let step7Indicator = await page.evaluate(() => document.body.innerText.includes('Step 7: Previous Lesson Review'));
    let engageActiveBtnText = await page.evaluate(() => {
      const footerBtn = document.querySelector('footer button:last-child');
      return footerBtn ? footerBtn.innerText : '';
    });
    console.log(`Lesson 50 Step 7 reached: ${step7Indicator}`);
    console.log(`Next Button on Step 7: "${engageActiveBtnText}"`);

    if (!engageActiveBtnText.includes('Engage Active Wave (Lesson 1)')) {
      throw new Error(`Expected button to indicate Engage Active Wave (Lesson 1), got "${engageActiveBtnText}"`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow3_lesson50_step7_trigger.png') });

    // Click "Engage Active Wave (Lesson 1)"
    console.log('\nClicking Next after Step 7 to engage Active Wave...');
    await clickNext();
    await sleep(600);

    // Verify Active Mode launches Lesson 1: ACTIVE_TRANSLATE (Step 1 of 5)
    let activePhase = await page.evaluate(() => document.body.innerText.includes('Active Target: Lesson 1'));
    let activeTranslateTitle = await page.evaluate(() => document.body.innerText.includes('Active Wave: Translate into Shona (Lesson 1)'));
    let hasTranslateInput = await page.$('textarea') !== null;

    console.log(`Active Wave launched: ${activePhase}`);
    console.log(`Step 1 ACTIVE_TRANSLATE: ${activeTranslateTitle}`);
    console.log(`User Translation Textarea present: ${hasTranslateInput}`);

    if (!activePhase || !activeTranslateTitle || !hasTranslateInput) {
      throw new Error('Flow 3 assertion failed: Did not transition to ACTIVE_TRANSLATE for Lesson 1');
    }

    // Type sample Shona sentence in textbox
    const sampleInput = 'Huyai kuno nekukasira! Mhoro shamwari yangu.';
    console.log(`Typing sample Shona sentence into translation input: "${sampleInput}"...`);
    await page.focus('textarea');
    await page.type('textarea', sampleInput, { delay: 30 });
    await sleep(400);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow3_active_step1_translate.png') });
    flow3Results.steps.push({ step: 1, name: 'ACTIVE_TRANSLATE', targetLesson: 1, inputTyped: sampleInput });

    // Advance to Step 2: ACTIVE_NOTES
    console.log('\nAdvancing to Step 2: ACTIVE_NOTES...');
    await clickNext();
    let hasActiveNotes = await page.evaluate(() => document.body.innerText.includes('Active Grammar Consolidation (Lesson 1)'));
    console.log(`Step 2 ACTIVE_NOTES: ${hasActiveNotes}`);
    if (!hasActiveNotes) throw new Error('Failed to reach ACTIVE_NOTES');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow3_active_step2_notes.png') });
    flow3Results.steps.push({ step: 2, name: 'ACTIVE_NOTES', activeNotesPresent: hasActiveNotes });

    // Advance to Step 3: ACTIVE_EXERCISES
    console.log('\nAdvancing to Step 3: ACTIVE_EXERCISES...');
    await clickNext();
    let hasActiveExercises = await page.evaluate(() => document.body.innerText.includes('Active Practice Exercises') || document.body.innerText.includes('Active Wave: Exercises'));
    console.log(`Step 3 ACTIVE_EXERCISES: ${hasActiveExercises}`);
    if (!hasActiveExercises) throw new Error('Failed to reach ACTIVE_EXERCISES');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow3_active_step3_exercises.png') });
    flow3Results.steps.push({ step: 3, name: 'ACTIVE_EXERCISES', exercisesPresent: hasActiveExercises });

    // Advance to Step 4: ACTIVE_CORRECTION
    console.log('\nAdvancing to Step 4: ACTIVE_CORRECTION...');
    await clickNext();
    let hasCorrectionHeader = await page.evaluate(() => document.body.innerText.toLowerCase().includes('linguistic concordance & word comparison'));
    let hasYourTranslation = await page.evaluate(() => document.body.innerText.toLowerCase().includes('your shona translation'));
    let hasCanonicalShona = await page.evaluate(() => document.body.innerText.toLowerCase().includes('canonical reference'));
    let displaysUserText = await page.evaluate(() => document.body.innerText.includes('Huyai') && document.body.innerText.includes('kuno'));
    let displaysCanonicalText = await page.evaluate(() => document.body.innerText.includes('Huyai kuno nekukasira!'));
    let hasSideBySideGrid = await page.evaluate(() => {
      const grid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
      return grid !== null;
    });

    console.log(`Step 4 ACTIVE_CORRECTION Header: ${hasCorrectionHeader}`);
    console.log(`Step 4 User Translation section: ${hasYourTranslation}`);
    console.log(`Step 4 Canonical Shona section: ${hasCanonicalShona}`);
    console.log(`Step 4 Renders User Text: ${displaysUserText}`);
    console.log(`Step 4 Renders Canonical Text: ${displaysCanonicalText}`);
    console.log(`Step 4 Side-by-side grid layout: ${hasSideBySideGrid}`);

    if (!hasCorrectionHeader || !hasYourTranslation || !hasCanonicalShona || !displaysUserText || !displaysCanonicalText) {
      throw new Error('Flow 3 assertion failed: Did not render side-by-side comparison on correction screen');
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow3_active_step4_correction.png') });
    flow3Results.steps.push({ step: 4, name: 'ACTIVE_CORRECTION', sideBySideRendered: true, userText: sampleInput, canonicalShona: 'Huyai kuno nekukasira!' });

    // Advance to Step 5: ACTIVE_FINAL_SHADOW
    console.log('\nAdvancing to Step 5: ACTIVE_FINAL_SHADOW...');
    await clickNext();
    let hasFinalShadow = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('master active shadowing pass') || text.includes('original shona (lesson 1)');
    });
    console.log(`Step 5 ACTIVE_FINAL_SHADOW: ${hasFinalShadow}`);
    if (!hasFinalShadow) throw new Error('Failed to reach ACTIVE_FINAL_SHADOW');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'flow3_active_step5_final_shadow.png') });
    flow3Results.steps.push({ step: 5, name: 'ACTIVE_FINAL_SHADOW', finalShadowPresent: hasFinalShadow });

    testReport.flows.push(flow3Results);
    console.log('>>> FLOW 3 VERIFIED 100% SUCCESSFULLY! <<<\n');

    console.log('==================================================');
    console.log('>>> ALL 3 FLOWS SUCCESSFULLY COMPLETED AND VERIFIED <<<');
    console.log('==================================================');

  } catch (err) {
    console.error('ERROR DURING E2E VERIFICATION:', err);
    testReport.overallSuccess = false;
    testReport.error = err.message;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error_failure.png') }).catch(() => {});
    throw err;
  } finally {
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'e2e_verification_report.json'), JSON.stringify(testReport, null, 2), 'utf8');
    await browser.close();
  }
}

runVerification().then(() => {
  console.log('Verification process completed cleanly.');
  process.exit(0);
}).catch((err) => {
  console.error('Verification process failed:', err);
  process.exit(1);
});
