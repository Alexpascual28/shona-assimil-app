#!/usr/bin/env python3
"""Main CLI Orchestrator for the Shona (Zezuru) Assimil Data Ingestion & Syllabus Pipeline.

Examples:
    # 1. Generate 60 mock lessons + WAV files immediately
    python pipeline/build_course.py --mock --max-lessons 60

    # 2. Pull live Hugging Face datasets and build up to 65 lessons
    python pipeline/build_course.py \
      --hf-datasets nigeLbasa/inzwi-shona-sample manassehzw/sna-manasseh-150-raw takuM23/shona-vibevoice-corpus \
      --max-samples 200 --max-Lessons 65

    # 3. Append from a local directory without overwriting completed lessons
    python pipeline/build_course.py --local-dir ./raw-data --append
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

# Ensure /pipeline is on sys.path when invoked from workspace root or /pipeline
PIPELINE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_DIR.parent
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

from enrich import GeminiEnricher, generate_mock_clips
from ingest import DatasetIngestor
from models import CourseData, Lesson, NormalizedClip
from sequencer import AssimilSequencer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("shona_pipeline.cli")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the Shona (Zezuru) Assimil syllabus (course_data.json + normalized .wav files)."
    )
    parser.add_argument(
        "--hf-datasets",
        nargs="+",
        default=None,
        help="One or more Hugging Face dataset IDs to pull and merge.",
    )
    parser.add_argument(
        "--local-dir",
        type=str,
        default=None,
        help="Path to a local directory containing audio clips and transcripts.",
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=200,
        help="Maximum candidate samples to inspect per dataset (default: 200).",
    )
    parser.add_argument(
        "--max-lessons",
        "--max-Lessons",
        dest="max_lessons",
        type=int,
        default=100,
        help="Maximum total lessons (regular + 7th-slot reviews) to generate (default: 100).",
    )
    parser.add_argument(
        "--distribute-new",
        type=int,
        default=None,
        help="Preserve all existing lessons in course_data.json as-is, enrich N new dataset clips, distribute/sort them together, and recalculate 7th-lesson reviews (1-7, 8-14, etc.) and Active Wave (51+).",
    )
    parser.add_argument(
        "--max-new-lessons",
        type=int,
        default=50,
        help="When used with --append, number of brand-new Active Phase lessons to append (default: 50).",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append new lessons to an existing /app/public/course_data.json without overwriting completed lessons.",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Generate deterministic Zezuru Assimil mock lessons and synthesized .wav files.",
    )
    parser.add_argument(
        "--fill-to-max",
        action="store_true",
        default=True,
        help="If live HF datasets yield fewer filtered clips than needed for --max-lessons, supplement with curated Zezuru clips so Lesson 50+ Active Wave is always reachable.",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=str(PIPELINE_DIR / "datasets_config.yaml"),
        help="Path to datasets_config.yaml.",
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default=str(PROJECT_ROOT / "app" / "public" / "course_data.json"),
        help="Output path for course_data.json (default: /app/public/course_data.json).",
    )
    parser.add_argument(
        "--audio-dir",
        type=str,
        default=str(PROJECT_ROOT / "app" / "public" / "audio"),
        help="Output directory for normalized 16kHz .wav files (default: /app/public/audio).",
    )
    return parser.parse_args(argv)


def load_existing_course(output_json_path: Path) -> tuple[list[Lesson], list[str]]:
    """Loads existing lessons and source datasets when --append is passed."""
    if not output_json_path.exists():
        return [], []
    try:
        raw = json.loads(output_json_path.read_text(encoding="utf-8"))
        course = CourseData.model_validate(raw)
        logger.info(
            "Loaded %d existing lessons from %s for --append.",
            len(course.lessons),
            output_json_path,
        )
        return course.lessons, course.source_datasets
    except Exception as exc:
        logger.warning("Could not parse existing course_data.json (%s); starting fresh.", exc)
        return [], []


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    config_path = Path(args.config).resolve()
    config = yaml.safe_load(config_path.read_text(encoding="utf-8"))

    output_json_path = Path(args.output_json).resolve()
    audio_dir = Path(args.audio_dir).resolve()
    cache_dir = (PROJECT_ROOT / config.get("gemini", {}).get("cache_dir", "pipeline/.cache")).resolve()

    output_json_path.parent.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)

    existing_lessons: list[Lesson] = []
    existing_sources: list[str] = []
    if args.append or args.distribute_new:
        existing_lessons, existing_sources = load_existing_course(output_json_path)

    existing_clip_ids = {l.clip_id for l in existing_lessons if l.clip_id}
    existing_texts = {l.shona_text.strip().lower() for l in existing_lessons if l.shona_text}

    # Every lesson (including every 7th review lesson) now receives its own dataset audio clip for the Passive Phase
    review_interval = int(config.get("sequencer", {}).get("review_interval", 7))
    if args.distribute_new:
        needed_regular_clips = args.distribute_new
    elif args.append:
        needed_regular_clips = args.max_new_lessons
    else:
        needed_regular_clips = args.max_lessons

    collected_clips: list[NormalizedClip] = []
    source_datasets: list[str] = list(existing_sources)

    cached_ingested_file = cache_dir / "all_ingested_clips.json"
    if not args.mock and not args.local_dir and cached_ingested_file.exists():
        try:
            raw_cached = json.loads(cached_ingested_file.read_text(encoding="utf-8"))
            collected_clips = [NormalizedClip.model_validate(item) for item in raw_cached]
            for ds_name in config.get("default_datasets", []):
                if ds_name not in source_datasets:
                    source_datasets.append(ds_name)
            logger.info("Loaded %d pre-ingested dataset clips from %s", len(collected_clips), cached_ingested_file)
        except Exception as exc:
            logger.warning("Failed to read cached clips (%s); falling back to live ingest.", exc)
            collected_clips = []

    if args.mock:
        logger.info("Running in --mock mode: generating %d lessons (%d regular clips)...", args.max_lessons, needed_regular_clips)
        collected_clips = generate_mock_clips(
            audio_output_dir=audio_dir,
            count=needed_regular_clips + 4,
            target_sr=int(config.get("filtering", {}).get("target_sampling_rate", 16000)),
        )
        for ds_name in config.get("default_datasets", []):
            if ds_name not in source_datasets:
                source_datasets.append(ds_name)
    elif not collected_clips:
        ingestor = DatasetIngestor(
            config_path=config_path,
            audio_output_dir=audio_dir,
            cache_dir=cache_dir,
        )

        hf_list = args.hf_datasets
        if not hf_list and not args.local_dir:
            hf_list = config.get("default_datasets", [])

        if hf_list:
            for ds_id in hf_list:
                if ds_id not in source_datasets:
                    source_datasets.append(ds_id)
                try:
                    ds_clips = ingestor.ingest_hf_dataset(ds_id, max_samples=args.max_samples)
                    collected_clips.extend(ds_clips)
                except Exception as exc:
                    logger.error("Failed to ingest HF dataset '%s': %s", ds_id, exc)

        if args.local_dir:
            local_path = Path(args.local_dir).resolve()
            src_tag = f"local:{local_path.name}"
            if src_tag not in source_datasets:
                source_datasets.append(src_tag)
            try:
                local_clips = ingestor.ingest_local_directory(
                    local_path, max_samples=args.max_samples
                )
                collected_clips.extend(local_clips)
            except Exception as exc:
                logger.error("Failed to ingest local directory '%s': %s", local_path, exc)

        # If strict Zezuru + duration filtering across small sample datasets yields fewer clips than
        # needed to reach --max-lessons (e.g., Lesson 51+ Active Wave), supplement with curated Zezuru clips.
        if args.fill_to_max and len(collected_clips) < needed_regular_clips:
            shortfall = needed_regular_clips - len(collected_clips)
            logger.info(
                "Ingested %d live filtered Zezuru clips; supplementing with %d curated Zezuru clips to reach %d total lessons.",
                len(collected_clips),
                shortfall,
                needed_regular_clips,
            )
            supplement = generate_mock_clips(
                audio_output_dir=audio_dir,
                count=needed_regular_clips + 4,
                target_sr=int(config.get("filtering", {}).get("target_sampling_rate", 16000)),
            )
            collected_clips.extend(supplement)

    # 3. Sequence & Score
    sequencer = AssimilSequencer(config)
    enricher = GeminiEnricher(config=config, cache_dir=cache_dir)

    expansion_pool_path = output_json_path.parent / "expansion_pool.json"
    preserved_by_id: dict[str, Lesson] = {}
    for src_lesson in existing_lessons:
        if src_lesson.clip_id:
            preserved_by_id[src_lesson.clip_id] = src_lesson
    if expansion_pool_path.exists():
        try:
            raw_pool = json.loads(expansion_pool_path.read_text(encoding="utf-8"))
            for item in raw_pool:
                pl = Lesson.model_validate(item)
                if pl.clip_id and pl.clip_id not in preserved_by_id:
                    preserved_by_id[pl.clip_id] = pl
        except Exception as exc:
            logger.warning("Could not load existing expansion_pool.json: %s", exc)
    orig_65_path = cache_dir / "existing_65_course_data.json"
    orig_65_lessons: list[Lesson] = []
    if orig_65_path.exists():
        try:
            orig_course = CourseData.model_validate(json.loads(orig_65_path.read_text(encoding="utf-8")))
            orig_65_lessons = orig_course.lessons
            for ol in orig_65_lessons:
                if ol.clip_id:
                    preserved_by_id[ol.clip_id] = ol
        except Exception as exc:
            logger.warning("Could not load existing_65_course_data.json: %s", exc)

    if args.distribute_new and existing_lessons:
        base_seed_lessons = orig_65_lessons if orig_65_lessons else existing_lessons
        # Keep all base lessons <= 30.0s in Lessons 1-100; move > 30.0s lessons intact to the reserve pool
        kept_under_30 = [
            l for l in base_seed_lessons if float(l.duration_seconds or 0.0) <= 30.0
        ]
        kept_ids = {l.clip_id for l in kept_under_30 if l.clip_id}
        kept_texts = {(l.shona_text or "").strip().lower() for l in kept_under_30 if l.shona_text}

        target_total_100 = 100
        needed_to_reach_100 = max(0, target_total_100 - len(kept_under_30))
        logger.info(
            "Preserving %d original lessons <= 30.0s (moving %d lessons > 30.0s intact to reserve pool) and distributing %d additional 10-30s lessons...",
            len(kept_under_30),
            len(base_seed_lessons) - len(kept_under_30),
            needed_to_reach_100,
        )

        all_candidate_clips = sequencer.score_and_deduplicate(
            clips=collected_clips,
            existing_clip_ids=kept_ids,
            existing_texts=kept_texts,
            max_regular_clips=None,
        )
        cands_10_20 = sorted(
            [c for c in all_candidate_clips if 10.0 <= c.duration_seconds < 20.0],
            key=lambda c: (c.duration_seconds, c.difficulty_score),
        )
        cands_20_30 = sorted(
            [c for c in all_candidate_clips if 20.0 <= c.duration_seconds <= 30.0],
            key=lambda c: (c.duration_seconds, c.difficulty_score),
        )
        cands_0_10 = sorted(
            [c for c in all_candidate_clips if c.duration_seconds < 10.0],
            key=lambda c: (c.pedagogical_stage, c.difficulty_score, c.duration_seconds),
        )

        # Target balanced distribution for Lessons 1-100: ~44 in 0-10s, ~28 in 10-20s, ~28 in 20-30s (all <= 30.0s)
        existing_10_20_count = sum(1 for l in kept_under_30 if 10.0 <= (l.duration_seconds or 0.0) < 20.0)
        existing_20_30_count = sum(1 for l in kept_under_30 if 20.0 <= (l.duration_seconds or 0.0) <= 30.0)
        want_10_20 = max(0, 28 - existing_10_20_count)
        want_20_30 = max(0, 28 - existing_20_30_count)

        chosen_new_clips: list[NormalizedClip] = []
        chosen_new_clips.extend(cands_10_20[:want_10_20])
        chosen_new_clips.extend(cands_20_30[:want_20_30])
        chosen_new_ids = {c.clip_id for c in chosen_new_clips}

        if len(chosen_new_clips) < needed_to_reach_100:
            rem_under_30 = [
                c
                for c in (cands_10_20 + cands_20_30 + cands_0_10)
                if c.clip_id not in chosen_new_ids and c.duration_seconds <= 30.0
            ]
            chosen_new_clips.extend(rem_under_30[: needed_to_reach_100 - len(chosen_new_clips)])
        elif len(chosen_new_clips) > needed_to_reach_100:
            chosen_new_clips = chosen_new_clips[:needed_to_reach_100]

        temp_new_lessons: list[Lesson] = []
        for nc in chosen_new_clips:
            if nc.clip_id in preserved_by_id and preserved_by_id[nc.clip_id].grammar_notes:
                temp_new_lessons.append(preserved_by_id[nc.clip_id].model_copy(deep=True))
            else:
                skel = sequencer.build_lesson_skeleton(
                    sorted_clips=[nc], max_lessons=1, existing_lessons=None
                )[0]
                enriched_nl = enricher.enrich_regular_lesson(skel, mock=args.mock)
                preserved_by_id[nc.clip_id] = enriched_nl
                temp_new_lessons.append(enriched_nl)

        # Distribute new lessons with kept_under_30, re-number 1..100, and compute 7-lesson reviews (1-7, 8-14, ...)
        combined_lessons = sequencer.distribute_and_resequence(
            existing_lessons=kept_under_30,
            new_lessons=temp_new_lessons,
        )
        enriched_lessons = enricher.enrich_all_lessons(combined_lessons, mock=args.mock)

        # Export ALL remaining unused dataset clips (including the > 30s lessons from the original 65 and unused 0-10s lessons)
        # to expansion_pool.json without deleting any clip or lesson data!
        used_ids = {l.clip_id for l in enriched_lessons if l.clip_id}
        used_txts = {(l.shona_text or "").strip().lower() for l in enriched_lessons if l.shona_text}
        reserve_clips = sequencer.score_and_deduplicate(
            clips=collected_clips,
            existing_clip_ids=used_ids,
            existing_texts=used_txts,
            max_regular_clips=None,
        )
        reserve_lessons: list[Lesson] = []
        for rc in reserve_clips:
            if rc.clip_id in preserved_by_id and preserved_by_id[rc.clip_id].grammar_notes:
                rl_copy = preserved_by_id[rc.clip_id].model_copy(deep=True)
            else:
                skel_r = sequencer.build_lesson_skeleton(
                    sorted_clips=[rc], max_lessons=1, existing_lessons=None
                )[0]
                rl_copy = enricher.enrich_regular_lesson(skel_r, mock=args.mock)
            rl_copy.type = "regular"
            rl_copy.review_summary = None
            rl_copy.review_exercises = []
            rl_copy.reviewed_lessons = []
            reserve_lessons.append(rl_copy)

        expansion_pool_path.write_text(
            json.dumps([rl.model_dump() for rl in reserve_lessons], indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        logger.info("Exported %d pre-enriched reserve dataset lessons to %s", len(reserve_lessons), expansion_pool_path)
    elif args.append and existing_lessons:
        start_lesson_num = len(existing_lessons) + 1
        selected_band_clips = sequencer.select_clips_for_expansion_band(
            clips=collected_clips,
            existing_clip_ids=existing_clip_ids,
            existing_texts=existing_texts,
            start_lesson_num=start_lesson_num,
            batch_size=needed_regular_clips,
        )
        lessons = list(existing_lessons)
        for bc in selected_band_clips:
            next_num = len(lessons) + 1
            active_ref = next_num - (sequencer.active_wave_start - 1) if next_num >= sequencer.active_wave_start else None
            phase = "active" if next_num >= sequencer.active_wave_start else "passive"
            words = (bc.shona_text or "").split()
            preview_words = " ".join(words[:6]) + ("..." if len(words) > 6 else "")
            if bc.clip_id in preserved_by_id and preserved_by_id[bc.clip_id].grammar_notes:
                nl = preserved_by_id[bc.clip_id].model_copy(deep=True)
            else:
                skel = sequencer.build_lesson_skeleton(
                    sorted_clips=[bc], max_lessons=1, existing_lessons=None
                )[0]
                nl = enricher.enrich_regular_lesson(skel, mock=args.mock)
            nl.lesson_number = next_num
            nl.phase = phase
            nl.active_wave_review_lesson = active_ref
            if next_num % sequencer.review_interval == 0:
                rev_block = next_num // sequencer.review_interval
                nl.type = "review"
                nl.title = f"Chidzidzo {next_num}: {preview_words} (Dzokororo {rev_block})"
                nl.reviewed_lessons = list(range(max(1, next_num - (sequencer.review_interval - 1)), next_num + 1))
                nl.review_summary = None
                nl.key_noun_classes_covered = []
                nl.review_exercises = []
            else:
                nl.type = "regular"
                nl.title = f"Chidzidzo {next_num}: {preview_words}"
                nl.review_summary = None
                nl.key_noun_classes_covered = []
                nl.review_exercises = []
                nl.reviewed_lessons = []
            lessons.append(nl)
        enriched_lessons = enricher.enrich_all_lessons(lessons, mock=args.mock)
    else:
        sorted_clips = sequencer.score_and_deduplicate(
            clips=collected_clips,
            existing_clip_ids=existing_clip_ids,
            existing_texts=existing_texts,
            max_regular_clips=needed_regular_clips,
        )
        lessons = sequencer.build_lesson_skeleton(
            sorted_clips=sorted_clips,
            max_lessons=needed_regular_clips,
            existing_lessons=existing_lessons if args.append else None,
        )
        enriched_lessons = enricher.enrich_all_lessons(lessons, mock=args.mock)

    regular_count = sum(1 for l in enriched_lessons if l.type == "regular")
    review_count = sum(1 for l in enriched_lessons if l.type == "review")

    course_data = CourseData(
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_lessons=len(enriched_lessons),
        regular_lessons_count=regular_count,
        review_lessons_count=review_count,
        active_wave_start_lesson=int(
            config.get("sequencer", {}).get("active_wave_start_lesson", 51)
        ),
        source_datasets=source_datasets,
        lessons=enriched_lessons,
    )

    output_json_path.write_text(
        course_data.model_dump_json(indent=2),
        encoding="utf-8",
    )

    # Also sync to app/dist/course_data.json if app/dist exists so production builds stay in sync
    dist_json = PROJECT_ROOT / "app" / "dist" / "course_data.json"
    if dist_json.parent.exists():
        dist_json.write_text(
            course_data.model_dump_json(indent=2),
            encoding="utf-8",
        )

    logger.info(
        "Successfully wrote %d lessons (%d regular, %d review) to %s",
        course_data.total_lessons,
        regular_count,
        review_count,
        output_json_path,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
