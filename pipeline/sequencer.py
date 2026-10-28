"""Assimil Syllabus Sequencer: Pedagogical Topic & Grammar Stage Ordering + 7th-Lesson Review Slotting."""

from __future__ import annotations

import logging
import re
from typing import Any

from models import Lesson, NormalizedClip

logger = logging.getLogger("shona_pipeline.sequencer")


def compute_difficulty_score(
    duration_seconds: float,
    word_count: int,
    avg_word_length: float,
    duration_weight: float = 1.5,
    word_count_weight: float = 2.0,
    avg_word_length_weight: float = 3.0,
) -> float:
    """Computes the Assimil composite difficulty score.

    Formula:
        difficulty_score = (duration_seconds * 1.5) + (word_count * 2.0) + (avg_word_length * 3.0)
    """
    score = (
        (duration_seconds * duration_weight)
        + (word_count * word_count_weight)
        + (avg_word_length * avg_word_length_weight)
    )
    return round(score, 2)


def classify_pedagogical_stage(shona_text: str, duration_seconds: float, source_dataset: str) -> int:
    """Classifies a Shona clip into 1 of 5 progressive textbook stages based on topic and grammar:

    - Stage 1 (Lessons 1–10): Greetings, Courtesies, Polite Imperatives & Simple Everyday Phrases
      (e.g., Mangwanani, Mhoro, Manheru, Makadini, Makorokoto, Huyai, Uyai, Vhara, Tora, Chigara, Ndapota).
    - Stage 2 (Lessons 11–22): Colours, Numbers, Food, Everyday Household Items & Present Tense
      (e.g., tsvuku, nhema, hupfu, shuga, sadza, nyama, mvura, chingwa, munyu, bhuku, tafura, kapu, maminitsi).
    - Stage 3 (Lessons 23–34): Family, Home, School, Locatives (pa-, ku-, mu-) & Present Progressive (-ri ku-)
      (e.g., amai, baba, mbuya, mwana, hanzvadzi, shamwari, mudzidzisi, mumba, panze, kumusha).
    - Stage 4 (Lessons 36–45): Past Tense (-ka-), Future Tense (-cha-), Weather, Nature, Farming & Longer Clauses
      (e.g., mhepo, rwizi, makore, goho, munda, rwendo, cultural/historical narratives up to 15s).
    - Stage 5 (Lessons 46–65, including Active Wave 50+): Rich Multi-Sentence Descriptions & Long Listening Passages
      (20s to 85s / 1.4m passages from takuM23/shona-vibevoice-corpus covering colours, numbers, tools, markets, Great Zimbabwe, cities).
    """
    lower = shona_text.strip().lower()
    words = set(re.findall(r"[a-z']+", lower))

    # Multi-sentence long passages (16s to 90s) or takuM23/shona-vibevoice-corpus belong in Stage 5
    if duration_seconds >= 15.0 or "vibevoice" in source_dataset.lower():
        return 5

    # Stage 1: Greetings, congratulations, polite requests, and direct imperatives
    stage1_keywords = {
        "mangwanani", "mhoro", "manheru", "makadini", "makadii", "waswera",
        "makorokoto", "huyai", "uyai", "chiuya", "chigara", "vhara", "tora",
        "svika", "dzoka", "ndapota", "ndikumbirewo",
    }
    if words & stage1_keywords and duration_seconds <= 6.5:
        return 1

    # Stage 2: Colours, numbers, food & drink, household items, basic wants/questions
    stage2_keywords = {
        "tsvuku", "nhema", "chena", "hupfu", "shuga", "mafuta", "nemuriwo",
        "muriwo", "sadza", "neusavi", "nyama", "chingwa", "munyu", "mukaka",
        "nzara", "kapu", "tafura", "patafura", "bhuku", "mabhuku", "makiyi",
        "penzura", "maminitsi", "mashanu", "rechitatu", "mari",
    }
    if words & stage2_keywords and duration_seconds <= 6.5:
        return 2

    # Stage 3: Family, friends, school, home repairs, and ongoing actions (-ri ku-)
    stage3_keywords = {
        "amai", "baba", "mbuya", "mwana", "vana", "hanzvadzi", "shamwari",
        "mudzidzisi", "vakuru", "murwere", "chitofu", "hembe", "mbatya",
        "chikoro", "pachikoro", "bvunzo", "musangano", "basa",
    }
    if words & stage3_keywords and duration_seconds <= 6.8:
        return 3

    # Stage 4: Weather, nature, rivers, farming, travel, historical/cultural stories, and 7-15s complex sentences
    return 4


class AssimilSequencer:
    """Orders filtered clips by pedagogical textbook stage and difficulty, inserting a Review Lesson every 7th slot."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        seq_cfg = (config or {}).get("sequencer", {})
        self.duration_weight: float = float(seq_cfg.get("duration_weight", 1.5))
        self.word_count_weight: float = float(seq_cfg.get("word_count_weight", 2.0))
        self.avg_word_length_weight: float = float(seq_cfg.get("avg_word_length_weight", 3.0))
        self.review_interval: int = int(seq_cfg.get("review_interval", 7))
        self.active_wave_start: int = int(seq_cfg.get("active_wave_start_lesson", 51))

    def score_and_deduplicate(
        self,
        clips: list[NormalizedClip],
        existing_clip_ids: set[str] | None = None,
        existing_texts: set[str] | None = None,
        max_regular_clips: int | None = None,
    ) -> list[NormalizedClip]:
        """Computes pedagogical_stage and difficulty_score, deduplicates, and selects a balanced curriculum."""
        seen_ids = set(existing_clip_ids or set())
        seen_texts = {t.strip().lower() for t in (existing_texts or set())}
        unique_clips: list[NormalizedClip] = []

        for clip in clips:
            norm_text = clip.shona_text.strip().lower()
            if clip.clip_id in seen_ids or norm_text in seen_texts:
                continue
            seen_ids.add(clip.clip_id)
            seen_texts.add(norm_text)

            clip.pedagogical_stage = classify_pedagogical_stage(
                clip.shona_text, clip.duration_seconds, clip.source_dataset
            )
            clip.difficulty_score = compute_difficulty_score(
                duration_seconds=clip.duration_seconds,
                word_count=clip.word_count,
                avg_word_length=clip.avg_word_length,
                duration_weight=self.duration_weight,
                word_count_weight=self.word_count_weight,
                avg_word_length_weight=self.avg_word_length_weight,
            )
            unique_clips.append(clip)

        if not max_regular_clips or len(unique_clips) <= max_regular_clips:
            unique_clips.sort(
                key=lambda c: (c.pedagogical_stage, c.difficulty_score, c.duration_seconds)
            )
            return unique_clips

        # Group by pedagogical stage (1..5) so every stage of the textbook is well represented:
        # - Stage 1 (Greetings, Courtesies & Imperatives): ~9 regular lessons (Lessons 1-10)
        # - Stage 2 (Colours, Numbers, Food & Objects): ~10 regular lessons (Lessons 11-22)
        # - Stage 3 (Family, Home, Locatives & Progressive): ~9 regular lessons (Lessons 23-33)
        # - Stage 4 (Past/Future Tenses, Nature, Travel & 7-14s Clauses): ~10 regular lessons (Lessons 34-45)
        # - Stage 5 (20s to 85s Rich Multi-Sentence Descriptions from takuM23/shona-vibevoice-corpus): ~18 regular lessons (Lessons 46-65)
        by_stage: dict[int, list[NormalizedClip]] = {1: [], 2: [], 3: [], 4: [], 5: []}
        for c in unique_clips:
            by_stage.setdefault(c.pedagogical_stage, []).append(c)

        for stg, stg_list in by_stage.items():
            if stg == 5:
                # Sort Stage 5 primarily by duration_seconds ascending so audio progresses smoothly from ~16s -> 30s -> 60s -> 85s
                stg_list.sort(key=lambda c: (c.duration_seconds, c.difficulty_score))
            else:
                stg_list.sort(key=lambda c: (c.difficulty_score, c.duration_seconds))

        if max_regular_clips <= 40:
            stage_quotas = {
                1: 6,
                2: 5,
                3: 7,
                4: max(1, max_regular_clips - 26),
                5: 8,
            }
        else:
            stage_quotas = {
                1: 10,
                2: 12,
                3: 11,
                4: 11,
                5: max(21, max_regular_clips - 44),
            }

        selected: list[NormalizedClip] = []
        leftovers: list[NormalizedClip] = []

        for stg in [1, 2, 3, 4, 5]:
            quota = stage_quotas.get(stg, 10)
            stg_clips = by_stage.get(stg, [])
            if stg == 4 and len(stg_clips) > quota:
                # Pick a mix of shorter (~4.5s) and medium (7s-14s) clips for Stage 4 bridge
                half = quota // 2
                longer_stage4 = [c for c in stg_clips if c.duration_seconds >= 6.5]
                shorter_stage4 = [c for c in stg_clips if c.duration_seconds < 6.5]
                chosen_s4 = shorter_stage4[: quota - min(half, len(longer_stage4))] + longer_stage4[:half]
                chosen_ids = {c.clip_id for c in chosen_s4}
                selected.extend(chosen_s4)
                leftovers.extend([c for c in stg_clips if c.clip_id not in chosen_ids])
            elif stg == 5 and len(stg_clips) > quota:
                # Sample evenly across the full 20s -> 85s (1.4m) duration curve so Lessons 46-65
                # progress smoothly from ~20s to 30s-45s and culminate in 60s-85s (1m+) passages!
                step = (len(stg_clips) - 1) / float(max(1, quota - 1))
                chosen_indices = sorted({round(i * step) for i in range(quota)})
                while len(chosen_indices) < quota:
                    for cand_i in range(len(stg_clips)):
                        if cand_i not in chosen_indices:
                            chosen_indices.append(cand_i)
                            break
                chosen_indices.sort()
                chosen_s5 = [stg_clips[i] for i in chosen_indices[:quota]]
                chosen_ids = {c.clip_id for c in chosen_s5}
                selected.extend(chosen_s5)
                leftovers.extend([c for c in stg_clips if c.clip_id not in chosen_ids])
            else:
                selected.extend(stg_clips[:quota])
                leftovers.extend(stg_clips[quota:])

        if len(selected) < max_regular_clips:
            leftovers.sort(key=lambda c: (c.pedagogical_stage, c.difficulty_score))
            selected.extend(leftovers[: max_regular_clips - len(selected)])
        elif len(selected) > max_regular_clips:
            selected = selected[:max_regular_clips]

        # Final sort by (pedagogical_stage, duration/difficulty) so curriculum flows naturally
        selected.sort(
            key=lambda c: (
                c.pedagogical_stage,
                c.duration_seconds if c.pedagogical_stage == 5 else c.difficulty_score,
                c.duration_seconds,
            )
        )
        return selected

    def build_lesson_skeleton(
        self,
        sorted_clips: list[NormalizedClip],
        max_lessons: int = 65,
        existing_lessons: list[Lesson] | None = None,
    ) -> list[Lesson]:
        """Sequences sorted clips into Assimil lessons with a Review Lesson at every 7th slot."""
        lessons: list[Lesson] = list(existing_lessons or [])
        next_lesson_num = len(lessons) + 1
        clip_cursor = 0
        total_target = len(lessons) + max_lessons if existing_lessons else max_lessons

        while next_lesson_num <= total_target and clip_cursor < len(sorted_clips):
            phase = "active" if next_lesson_num >= self.active_wave_start else "passive"
            active_wave_ref = (
                next_lesson_num - (self.active_wave_start - 1)
                if next_lesson_num >= self.active_wave_start
                else None
            )

            clip = sorted_clips[clip_cursor]
            clip_cursor += 1
            preview_words = " ".join(clip.shona_text.split()[:6])
            if len(clip.shona_text.split()) > 6:
                preview_words += "..."

            if next_lesson_num % self.review_interval == 0:
                reviewed_seven = [
                    l.lesson_number
                    for l in lessons[max(0, len(lessons) - (self.review_interval - 1)) :]
                ] + [next_lesson_num]
                review_block_num = next_lesson_num // self.review_interval
                lessons.append(
                    Lesson(
                        lesson_number=next_lesson_num,
                        type="review",
                        phase=phase,
                        active_wave_review_lesson=active_wave_ref,
                        title=f"Chidzidzo {next_lesson_num}: {preview_words} (Dzokororo {review_block_num})",
                        source_dataset=clip.source_dataset,
                        clip_id=clip.clip_id,
                        audio_url=clip.audio_path,
                        duration_seconds=clip.duration_seconds,
                        difficulty_score=clip.difficulty_score,
                        pedagogical_stage=clip.pedagogical_stage,
                        word_count=clip.word_count,
                        avg_word_length=clip.avg_word_length,
                        dialect="Standard Shona",
                        dialect_confidence=clip.dialect_confidence,
                        code_switching_ratio=clip.code_switching_ratio,
                        shona_text=clip.shona_text,
                        reviewed_lessons=reviewed_seven,
                    )
                )
            else:
                lessons.append(
                    Lesson(
                        lesson_number=next_lesson_num,
                        type="regular",
                        phase=phase,
                        active_wave_review_lesson=active_wave_ref,
                        title=f"Chidzidzo {next_lesson_num}: {preview_words}",
                        source_dataset=clip.source_dataset,
                        clip_id=clip.clip_id,
                        audio_url=clip.audio_path,
                        duration_seconds=clip.duration_seconds,
                        difficulty_score=clip.difficulty_score,
                        pedagogical_stage=clip.pedagogical_stage,
                        word_count=clip.word_count,
                        avg_word_length=clip.avg_word_length,
                        dialect="Standard Shona",
                        dialect_confidence=clip.dialect_confidence,
                        code_switching_ratio=clip.code_switching_ratio,
                        shona_text=clip.shona_text,
                    )
                )

            next_lesson_num += 1

        logger.info(
            "Sequenced %d total lessons (%d regular, %d review with passive audio; Active Wave lessons >= %d: %d).",
            len(lessons),
            sum(1 for l in lessons if l.type == "regular"),
            sum(1 for l in lessons if l.type == "review"),
            self.active_wave_start,
            sum(1 for l in lessons if l.phase == "active"),
        )
        return lessons

    def distribute_and_resequence(
        self,
        existing_lessons: list[Lesson],
        new_lessons: list[Lesson],
    ) -> list[Lesson]:
        """Preserves all existing enriched lessons as-is, distributes the newly enriched lessons
        among them by (pedagogical_stage, difficulty/duration), re-numbers 1..N, shifts Active Wave
        to start at self.active_wave_start (51 -> 1, ..., 100 -> 50), and assigns every 7th slot
        as a 7-lesson review (covering num-6..num).
        """
        combined = list(existing_lessons) + list(new_lessons)
        combined.sort(
            key=lambda l: (
                l.pedagogical_stage or 3,
                (l.duration_seconds or 0.0)
                if (l.pedagogical_stage or 3) == 5
                else (l.difficulty_score or 0.0),
                l.duration_seconds or 0.0,
                l.clip_id or "",
            )
        )

        for idx, lesson in enumerate(combined):
            new_num = idx + 1
            lesson.lesson_number = new_num
            lesson.phase = "active" if new_num >= self.active_wave_start else "passive"
            lesson.active_wave_review_lesson = (
                new_num - (self.active_wave_start - 1)
                if new_num >= self.active_wave_start
                else None
            )

            words = (lesson.shona_text or "").split()
            preview_words = " ".join(words[:6]) + ("..." if len(words) > 6 else "")

            if new_num % self.review_interval == 0:
                review_block_num = new_num // self.review_interval
                lesson.type = "review"
                lesson.title = f"Chidzidzo {new_num}: {preview_words} (Dzokororo {review_block_num})"
                lesson.reviewed_lessons = list(
                    range(max(1, new_num - (self.review_interval - 1)), new_num + 1)
                )
                # Clear stale review summary so enrich_all_lessons synthesizes the exact 7-lesson block (new_num-6..new_num)
                lesson.review_summary = None
                lesson.key_noun_classes_covered = []
                lesson.review_exercises = []
            else:
                lesson.type = "regular"
                lesson.title = f"Chidzidzo {new_num}: {preview_words}"
                lesson.review_summary = None
                lesson.key_noun_classes_covered = []
                lesson.review_exercises = []
                lesson.reviewed_lessons = []

        return combined
