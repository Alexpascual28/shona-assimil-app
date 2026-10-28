"""Assimil Syllabus Sequencer: Pedagogical Topic & Grammar Stage Ordering + 7th-Lesson Review Slotting."""

from __future__ import annotations

import logging
import random
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

    # Multi-sentence passages >= 20.0s belong in Stage 5; 10s-20s passages belong in Stage 4 (intermediate bridge)
    if duration_seconds >= 20.0:
        return 5
    if duration_seconds >= 10.0:
        return 4

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

    def select_clips_for_expansion_band(
        self,
        clips: list[NormalizedClip],
        existing_clip_ids: set[str] | None = None,
        existing_texts: set[str] | None = None,
        start_lesson_num: int = 101,
        batch_size: int = 50,
    ) -> list[NormalizedClip]:
        """Selects a batch of clips for the '+50 New Lessons' expansion button according to the
        100-lesson tiered duration progression:
        - Lessons 101-200 (band 1): 75% in 10-40s, 25% in 0-10s sprinkled arbitrarily
        - Lessons 201-300 (band 2): 75% in 20-50s, 25% in 0-20s sprinkled arbitrarily
        - Lessons 301-400 (band 3): 75% in 30-60s, 25% in 0-30s sprinkled arbitrarily
        - Lessons 401-500 (band 4): 75% in 40-70s, 25% in 0-40s sprinkled arbitrarily
        - Lessons 501-600 (band 5): 75% in 50-80s, 25% in 0-50s sprinkled arbitrarily
        - Lessons 601+ (band >= 6): capped at 120s, balanced mix of clip lengths at random
        """
        pool = self.score_and_deduplicate(
            clips=clips,
            existing_clip_ids=existing_clip_ids,
            existing_texts=existing_texts,
            max_regular_clips=None,
        )
        # Enforce 120s (2-minute) cap
        pool = [c for c in pool if (c.duration_seconds or 0.0) <= 120.0]
        if not pool:
            return []

        band_idx = max(1, (start_lesson_num - 1) // 100)
        rng = random.Random(start_lesson_num)

        if band_idx >= 6:
            # Lessons 601+: balanced mix of clip lengths up to 120s in randomized order
            buckets = [
                [c for c in pool if 0.0 <= c.duration_seconds < 15.0],
                [c for c in pool if 15.0 <= c.duration_seconds < 30.0],
                [c for c in pool if 30.0 <= c.duration_seconds < 50.0],
                [c for c in pool if 50.0 <= c.duration_seconds < 80.0],
                [c for c in pool if 80.0 <= c.duration_seconds <= 120.0],
            ]
            chosen: list[NormalizedClip] = []
            chosen_ids: set[str] = set()
            per_bucket = max(1, batch_size // len(buckets))
            for b in buckets:
                rng.shuffle(b)
                for c in b[:per_bucket]:
                    if c.clip_id not in chosen_ids:
                        chosen.append(c)
                        chosen_ids.add(c.clip_id)
            remainder = [c for c in pool if c.clip_id not in chosen_ids]
            rng.shuffle(remainder)
            chosen.extend(remainder[: max(0, batch_size - len(chosen))])
            rng.shuffle(chosen)
            return chosen[:batch_size]

        # Tiered 100-lesson band (band_idx = 1..5):
        # Primary range: [band_idx * 10, band_idx * 10 + 30] (75%)
        # Sprinkle range: [0, band_idx * 10) (25%)
        primary_min = float(band_idx * 10)
        primary_max = float(band_idx * 10 + 30)
        sprinkle_max = float(band_idx * 10)

        sprinkle_target = round(batch_size * 0.25)  # 12 for batch_size=50
        primary_target = batch_size - sprinkle_target  # 38 for batch_size=50

        primary_candidates = [
            c for c in pool if primary_min <= c.duration_seconds <= primary_max
        ]
        # Sort primary candidates by (pedagogical_stage, duration_seconds, difficulty_score)
        # so the two +50 batches in a 100-lesson band progress smoothly from primary_min to primary_max
        primary_candidates.sort(
            key=lambda c: (
                0 if c.duration_seconds < (primary_min + 10.0) else (1 if c.duration_seconds < (primary_min + 20.0) else 2),
                c.pedagogical_stage,
                c.difficulty_score,
                c.duration_seconds,
            )
        )

        # If primary_candidates is smaller than primary_target, supplement with nearest durations >= sprinkle_max
        chosen_primary = list(primary_candidates[:primary_target])
        chosen_ids = {c.clip_id for c in chosen_primary}
        if len(chosen_primary) < primary_target:
            fallback_longer = sorted(
                [c for c in pool if c.clip_id not in chosen_ids and c.duration_seconds >= sprinkle_max],
                key=lambda c: abs(c.duration_seconds - ((primary_min + primary_max) / 2.0)),
            )
            for fc in fallback_longer:
                if len(chosen_primary) >= primary_target:
                    break
                chosen_primary.append(fc)
                chosen_ids.add(fc.clip_id)

        sprinkle_candidates = [
            c for c in pool if c.clip_id not in chosen_ids and 0.0 <= c.duration_seconds < sprinkle_max
        ]
        # Sort sprinkle candidates by pedagogical_stage & difficulty, then sample arbitrarily
        sprinkle_candidates.sort(key=lambda c: (c.pedagogical_stage, c.difficulty_score, c.duration_seconds))
        chosen_sprinkle = list(sprinkle_candidates[:sprinkle_target])
        for sc in chosen_sprinkle:
            chosen_ids.add(sc.clip_id)

        # If either bucket is still short, fill from remaining pool
        while len(chosen_primary) + len(chosen_sprinkle) < batch_size:
            rem = [c for c in pool if c.clip_id not in chosen_ids]
            if not rem:
                break
            chosen_primary.append(rem[0])
            chosen_ids.add(rem[0].clip_id)

        # Keep primary clips in progressive order, and sprinkle the 25% shorter clips at arbitrary positions
        total_len = len(chosen_primary) + len(chosen_sprinkle)
        sprinkle_positions = set(
            rng.sample(range(total_len), k=min(len(chosen_sprinkle), total_len))
        )
        rng.shuffle(chosen_sprinkle)

        merged: list[NormalizedClip] = []
        p_idx = 0
        s_idx = 0
        for pos in range(total_len):
            if pos in sprinkle_positions and s_idx < len(chosen_sprinkle):
                merged.append(chosen_sprinkle[s_idx])
                s_idx += 1
            elif p_idx < len(chosen_primary):
                merged.append(chosen_primary[p_idx])
                p_idx += 1
            elif s_idx < len(chosen_sprinkle):
                merged.append(chosen_sprinkle[s_idx])
                s_idx += 1

        return merged[:batch_size]

    def distribute_and_resequence(
        self,
        existing_lessons: list[Lesson],
        new_lessons: list[Lesson],
    ) -> list[Lesson]:
        """Preserves all existing enriched lessons as-is, distributes the newly enriched lessons
        among them by (duration_band_for_1_to_100, pedagogical_stage, difficulty/duration), re-numbers 1..N,
        shifts Active Wave to start at self.active_wave_start (51 -> 1, ..., 100 -> 50), and assigns every
        7th slot as a 7-lesson review (covering num-6..num).
        """
        combined = list(existing_lessons) + list(new_lessons)
        for l in combined:
            l.pedagogical_stage = classify_pedagogical_stage(
                l.shona_text or "", float(l.duration_seconds or 0.0), l.source_dataset or ""
            )

        # Progression for Lessons 1-100:
        # 1) 0-10s clips ordered by pedagogical_stage (1 -> 2 -> 3 -> 4) and difficulty_score
        # 2) 10-20s clips ordered by difficulty_score and duration_seconds
        # 3) 20-30s clips ordered by duration_seconds and difficulty_score (capped at 30.0s)
        def _sort_key(l: Lesson) -> tuple[Any, ...]:
            dur = float(l.duration_seconds or 0.0)
            stg = int(l.pedagogical_stage or 3)
            diff = float(l.difficulty_score or 0.0)
            if dur < 10.0:
                band = 0
                return (band, stg, diff, dur, l.clip_id or "")
            elif dur < 20.0:
                band = 1
                return (band, stg, dur, diff, l.clip_id or "")
            else:
                band = 2
                return (band, dur, diff, l.clip_id or "")

        combined.sort(key=_sort_key)

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
