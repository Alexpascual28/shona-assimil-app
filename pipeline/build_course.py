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
        default=65,
        help="Maximum total lessons (regular + 7th-slot reviews) to generate (default: 65).",
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
    if args.append:
        existing_lessons, existing_sources = load_existing_course(output_json_path)

    existing_clip_ids = {l.clip_id for l in existing_lessons if l.clip_id}
    existing_texts = {l.shona_text.strip().lower() for l in existing_lessons if l.shona_text}

    # Calculate how many regular clips are needed to reach max_lessons (since every 7th slot is a review)
    review_interval = int(config.get("sequencer", {}).get("review_interval", 7))
    needed_regular_clips = args.max_lessons - (args.max_lessons // review_interval)

    collected_clips: list[NormalizedClip] = []
    source_datasets: list[str] = list(existing_sources)

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
    else:
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
        # needed to reach --max-lessons (e.g., Lesson 50+ Active Wave), supplement with curated Zezuru clips.
        if args.fill_to_max and len(collected_clips) < needed_regular_clips:
            shortfall = needed_regular_clips - len(collected_clips)
            logger.info(
                "Ingested %d live filtered Zezuru clips; supplementing with %d curated Zezuru clips to reach %d total lessons (Active Wave Lesson 50+).",
                len(collected_clips),
                shortfall,
                args.max_lessons,
            )
            supplement = generate_mock_clips(
                audio_output_dir=audio_dir,
                count=needed_regular_clips + 4,
                target_sr=int(config.get("filtering", {}).get("target_sampling_rate", 16000)),
            )
            collected_clips.extend(supplement)

    # 3. Sequence & Score
    sequencer = AssimilSequencer(config)
    sorted_clips = sequencer.score_and_deduplicate(
        clips=collected_clips,
        existing_clip_ids=existing_clip_ids,
        existing_texts=existing_texts,
        max_regular_clips=needed_regular_clips,
    )
    lessons = sequencer.build_lesson_skeleton(
        sorted_clips=sorted_clips,
        max_lessons=args.max_lessons,
        existing_lessons=existing_lessons if args.append else None,
    )

    # 4. Linguistic Enrichment (Disk-cached in pipeline/.cache/)
    enricher = GeminiEnricher(config=config, cache_dir=cache_dir)
    enriched_lessons = enricher.enrich_all_lessons(lessons, mock=args.mock)

    regular_count = sum(1 for l in enriched_lessons if l.type == "regular")
    review_count = sum(1 for l in enriched_lessons if l.type == "review")

    course_data = CourseData(
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_lessons=len(enriched_lessons),
        regular_lessons_count=regular_count,
        review_lessons_count=review_count,
        active_wave_start_lesson=int(
            config.get("sequencer", {}).get("active_wave_start_lesson", 50)
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
