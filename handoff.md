# Handoff & Progress Report: Shona Assimil Desktop Learning Application

## 1. Overarching Goal
The project objective is to build an authentic, textbook-quality offline desktop application (Electron + React + TypeScript + Tailwind) and automated Python ingestion pipeline for learning Shona (standardised on Zezuru) via the Assimil methodology:
1. **Lessons 1–100 Curriculum**:
   - Pedagogical and duration progression: `0–10s` (Lessons 1–44), `10–20s` (Lessons 45–72), and `20–30s` (Lessons 73–100), strictly capped at **30 seconds** for the first 100 lessons.
   - All base lessons from the initial syllabus that are `≤ 30.0s` (54 lessons) are kept intact with identical text, notes, glosses, translations, and exercises.
   - Any lesson `> 30.0s` from the original syllabus (11 lessons) and extra `0–10s` clips are preserved without deletion and moved to `app/public/expansion_pool.json` for future lesson generations.
   - Every 7th lesson (`7, 14, 21, ..., 98`) features a full passive lesson followed by a **7-lesson review unit** reviewing all 7 lessons (`num-6..num`).
   - Active phase begins at **Lesson 51** (`active_wave_start_lesson: 51`), pairing `Lesson 51 → Lesson 1` through `Lesson 100 → Lesson 50`.
2. **"+50 New Lessons" Expansion Engine (Tiered 100-Lesson Progression up to Lesson 600, then balanced up to 120s)**:
   - A button in `Sidebar.tsx` greyed out until all current lessons are 100% completed in both Passive (`1..N`) and Active (`1..N-50`) phases.
   - When unlocked, it appends 50 new lessons in the Active Phase (`active_wave_review_lesson: lesson_number - 50`):
     - **Lessons 101–200 (Band 1)**: 75% in `10.0s – 40.0s` (progressing from `10–25s` in `101–150` to `20–40s` in `151–200`) + 25% in `0.0s – 10.0s` sprinkled arbitrarily.
     - **Lessons 201–300 (Band 2)**: 75% in `20.0s – 50.0s` + 25% in `0.0s – 20.0s` sprinkled arbitrarily.
     - **Lessons 301–400 (Band 3)**: 75% in `30.0s – 60.0s` + 25% in `0.0s – 30.0s` sprinkled arbitrarily.
     - **Lessons 401–500 (Band 4)**: 75% in `40.0s – 70.0s` + 25% in `0.0s – 40.0s` sprinkled arbitrarily.
     - **Lessons 501–600 (Band 5)**: 75% in `50.0s – 80.0s` + 25% in `0.0s – 50.0s` sprinkled arbitrarily.
     - **Lessons 601+ (Band ≥ 6)**: Capped at **120 seconds (2 minutes)** with a balanced random mix across duration buckets (`0–20s`, `20–40s`, `40–60s`, `60–90s`, `90–120s`).
   - The button then greys out again until the newly added 50 lessons are completed.

---

## 2. Successfully Completed
1. **Pipeline & Model Configurations**:
   - `pipeline/datasets_config.yaml`: Updated `max_duration_seconds: 120.0` (2-minute ceiling).
   - `pipeline/models.py`: Updated `duration_seconds: float = Field(ge=2.0, le=120.0)`.
   - `pipeline/ingest.py`: Updated `_ingest_via_rows_api` to support paginated offsets (`offset=0, 100, 200...`) and up to 120s clips without hardcoded index limitations.
2. **Audio Ingestion & Normalization**:
   - Ingested 65 brand-new clean clips across `10s–120s` from `takuM23/shona-vibevoice-corpus` without English code-switching or noise markers.
   - Normalized 16kHz `.wav` files downloaded and stored in `app/public/audio/`.
   - Total ingested clips in `pipeline/.cache/all_ingested_clips.json` expanded to **260 clips**.
3. **Curriculum Enrichment & Cultural Data**:
   - Added bespoke idiomatic translations and sentence-by-sentence gloss breakdowns in `VIBEVOICE_LONG_PASSAGES` in `pipeline/shona_textbook_data.py` for all 65 new clips.
   - Added 65 rich, non-boilerplate cultural notes in `SENTENCE_CULTURAL_NOTES` in `pipeline/shona_textbook_data.py`. All 260 clips in the system now have **unique, non-boilerplate cultural note entries**.
4. **Sequencing Logic**:
   - `pipeline/sequencer.py`:
     - `classify_pedagogical_stage`: Updated so `10–20s` clips are classified as Stage 4 (intermediate bridge) and `20s+` as Stage 5 (multi-sentence passages).
     - `select_clips_for_expansion_band`: Implemented the exact 100-lesson tiered duration rules (Band 1..5: 75% primary duration band + 25% arbitrary shorter sprinkles; Band 6+: balanced random up to 120s).
     - `distribute_and_resequence`: Implemented balanced sorting for Lessons 1–100 (`0–10s` by pedagogy & difficulty → `10–20s` by difficulty & duration → `20–30s` by duration & difficulty, strictly `≤ 30.0s`).
5. **Course Builder (`pipeline/build_course.py`)**:
   - Preserves all already-enriched lessons from `pipeline/.cache/existing_65_course_data.json` and `expansion_pool.json`.
   - Assembles Lessons 1–100 strictly capped at `≤ 30.0s` (`44` in `0–10s`, `28` in `10–20s`, `28` in `20–30s`).
   - Moves `> 30.0s` lessons and remaining `0–10s` clips into `app/public/expansion_pool.json` without deleting any data.
   - Updated `--append` mode to use `select_clips_for_expansion_band`.
6. **Frontend & Electron Integration**:
   - `app/electron/main.ts`: Implemented offline tiered expansion band selection in `generate-more-lessons` matching `sequencer.py`.
   - `app/src/context/LessonContext.tsx`: Implemented browser/fallback tiered expansion band selection matching `main.ts`.
   - `app/src/components/layout/Sidebar.tsx`: Progress tracking and "+50 New Lessons" button logic already integrated.

---

## 3. What Was in the Middle of Executing
- Executing `python pipeline/build_course.py --distribute-new 35` to output the final `app/public/course_data.json` (100 lessons strictly `≤ 30.0s`, smooth progression `0–10s` → `10–20s` → `20–30s`) and `app/public/expansion_pool.json` (160 reserve lessons spanning `0–120s`).
- Running the build pipeline (`npm run build`) and packaging the updated Windows executables in `app/release/`.

---

## 4. Next 3 Steps to Complete the Task
1. **Generate Course Data & Expansion Pool**:
   Run the build script to output the 100-lesson curriculum and the 160-lesson reserve pool:
   ```powershell
   python pipeline/build_course.py --distribute-new 35
   ```
   Verify via python assertions that `app/public/course_data.json` has:
   - `total_lessons == 100`
   - Max duration `≤ 30.0s`
   - ~44 lessons in `0–10s`, ~28 lessons in `10–20s`, ~28 lessons in `20–30s`
   - Lessons 1–50 are Passive, Lessons 51–100 are Active (`active_wave_review_lesson = lesson_number - 50`)
   - Every 7th lesson has `reviewed_lessons == [num-6..num]`
   - `app/public/expansion_pool.json` contains 160 pre-enriched reserve lessons.

2. **Verify `--append` Expansion Functionality**:
   Test a simulated +50 lesson append on a test file to confirm Lessons 101–150 follow Band 1 (75% in `10–40s` + 25% in `0–10s` sprinkled):
   ```powershell
   python pipeline/build_course.py --append --max-new-lessons 50 --output-json pipeline/.cache/test_append_150.json
   ```
   Confirm lesson numbers 101–150 are created in Active phase reviewing lessons 51–100, and remove the test file.

3. **Compile & Package Windows Executables in `app/release`**:
   Build the React frontend and compile the Electron application into `app/release`:
   ```powershell
   $env:Path += ";C:\Program Files\nodejs"
   $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
   $outDir = "$env:TEMP\shona-assimil-release"
   Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue
   Set-Location "c:\Projects\Antigravity\shona-assimil-app\app"
   & "C:\Program Files\nodejs\npm.cmd" run build
   & "C:\Program Files\nodejs\npx.cmd" electron-builder --config.directories.output="$outDir"
   Copy-Item "$outDir\Shona Assimil ChiZezuru 1.0.0.exe", "$outDir\Shona Assimil ChiZezuru Setup 1.0.0.exe" -Destination "c:\Projects\Antigravity\shona-assimil-app\app\release\" -Force
   Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue
   ```
   Update `walkthrough.md` with final verification metrics and duration distribution tables.
