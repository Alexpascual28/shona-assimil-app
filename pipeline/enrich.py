"""Linguistic & Textbook Enrichment for Shona With Ease (Assimil Method)."""

from __future__ import annotations

import hashlib
import logging
import os
import re
from pathlib import Path
from typing import Any

import numpy as np

from ingest import compute_word_metrics, normalize_and_write_wav
from models import (
    ActiveExercise,
    DialogueLineModel,
    Lesson,
    LessonEnrichment,
    LiteralGlossItem,
    NormalizedClip,
    NoteItemModel,
    ReviewEnrichment,
    ReviewSectionModel,
    ReviewSummaryModel,
)
from shona_textbook_data import (
    BEGINNER_WORD_GLOSS,
    IDIOMATIC_SENTENCE_TRANSLATIONS,
    VIBEVOICE_PASSAGE_TRANSLATIONS,
    generate_comprehensive_review,
    generate_contextual_exercises,
    generate_textbook_cultural_notes,
    generate_textbook_grammar_notes,
)

logger = logging.getLogger("shona_pipeline.enrich")


# Beginner-friendly prefix rules for words not in the exact word glossary
BEGINNER_PREFIX_RULES: list[tuple[str, str, str, str]] = [
    ("ndiriku", "ndiri (I am) + ku- (doing)", "Present Progressive (I am ...-ing)", "I am"),
    ("uriku", "uri (you are) + ku- (doing)", "Present Progressive (you are ...-ing)", "you are"),
    ("ariku", "ari (he/she is) + ku- (doing)", "Present Progressive (he/she is ...-ing)", "he/she is"),
    ("tiriku", "tiri (we are) + ku- (doing)", "Present Progressive (we are ...-ing)", "we are"),
    ("variku", "vari (they are) + ku- (doing)", "Present Progressive (they are ...-ing)", "they are"),
    ("zviriku", "zviri (they are) + ku- (doing)", "Present Progressive (things are ...-ing)", "they are"),
    ("ndino", "ndi- (I) + -no- (present)", "Present Tense Verb (I ...)", "I"),
    ("ndiri", "ndi- (I) + -ri (am)", "Present Helper Verb (I am)", "I am"),
    ("ndicha", "ndi- (I) + -cha- (will)", "Future Tense Verb (I will ...)", "I will"),
    ("ndaka", "nda- (I) + -ka- (past)", "Past Tense Verb (I did ...)", "I (past)"),
    ("handi", "ha- (not) + ndi- (I)", "Negative Verb (I do not ...)", "I do not"),
    ("uno", "u- (you) + -no- (present)", "Present Tense Verb (you ...)", "you"),
    ("uri", "u- (you) + -ri (are)", "Present Helper Verb (you are)", "you are"),
    ("waka", "wa- (you/he) + -ka- (past)", "Past Tense Verb", "you/he (past)"),
    ("tino", "ti- (we) + -no- (present)", "Present Tense Verb (we ...)", "we"),
    ("ticha", "ti- (we) + -cha- (will)", "Future Tense Verb (we will ...)", "we will"),
    ("taka", "ta- (we) + -ka- (past)", "Past Tense Verb (we did ...)", "we (past)"),
    ("tiri", "ti- (we) + -ri (are)", "Present Helper Verb (we are)", "we are"),
    ("vano", "va- (they) + -no- (present)", "Present Tense Verb (they ...)", "they"),
    ("vaka", "va- (they) + -ka- (past)", "Past Tense Verb (they did ...)", "they (past)"),
    ("vari", "va- (they) + -ri (are)", "Present Helper Verb (they are)", "they are"),
    ("ano", "a- (he/she) + -no- (present)", "Present Tense Verb (he/she ...)", "he/she"),
    ("aka", "a- (he/she) + -ka- (past)", "Past Tense Verb (he/she ...)", "he/she (past)"),
    ("ari", "a- (he/she) + -ri (is)", "Present Helper Verb (he/she is)", "he/she is"),
    ("iri", "i- (it) + -ri (is)", "Present Helper Verb (it is)", "it is"),
    ("ino", "i- (it) + -no- (present)", "Present Tense Verb (it ...)", "it"),
    ("yaka", "ya- (it) + -ka- (past)", "Past Tense Verb (it ...)", "it (past)"),
    ("rino", "ri- (it) + -no- (present)", "Present Tense Verb (it ...)", "it"),
    ("riri", "ri- (it) + -ri (is)", "Present Helper Verb (it is)", "it is"),
    ("raka", "ra- (it) + -ka- (past)", "Past Tense Verb (it ...)", "it (past)"),
    ("zvi", "zvi- (plural things prefix)", "Plural Noun / Verb Prefix (zvi-)", "things"),
    ("chi", "chi- (singular thing prefix)", "Singular Noun / Verb Prefix (chi-)", "thing"),
    ("ma", "ma- (plural prefix)", "Plural Noun Prefix (ma-)", "plural"),
    ("mu", "mu- (singular person/tree or 'in')", "Prefix (mu-)", "in / singular"),
    ("va", "va- (plural people prefix)", "Plural Person Prefix (va-)", "people"),
    ("ku", "ku- ('to' infinitive or location)", "Infinitive / Location Prefix (ku-)", "to / at"),
    ("pa", "pa- ('on / at' location prefix)", "Location Prefix (pa-)", "on / at"),
    ("ne", "ne- ('and / with' prefix)", "Connecting Prefix (ne-)", "and / with"),
]


def build_gloss_for_sentence(shona_text: str) -> list[LiteralGlossItem]:
    """Builds a beginner-friendly word-by-word breakdown for a Shona sentence."""
    raw_words = [w.strip(".,?!:;\"'()") for w in shona_text.split() if w.strip(".,?!:;\"'()")]
    gloss_items: list[LiteralGlossItem] = []

    for word in raw_words[:18]:
        lower = word.lower()
        if lower in BEGINNER_WORD_GLOSS:
            morph, cat, lit = BEGINNER_WORD_GLOSS[lower]
            gloss_items.append(
                LiteralGlossItem(
                    shona_word=word,
                    morpheme_breakdown=morph,
                    noun_class_or_concord=cat,
                    literal_english=lit,
                    tone_pattern="L-H",
                )
            )
            continue

        matched_rule = None
        for prefix, morph_prefix, cat_desc, lit_prefix in BEGINNER_PREFIX_RULES:
            if lower.startswith(prefix) and len(lower) > len(prefix) + 1:
                stem = lower[len(prefix) :]
                matched_rule = (
                    f"{morph_prefix} + -{stem}",
                    cat_desc,
                    f"{lit_prefix} {stem}",
                )
                break

        if matched_rule:
            morph, cat, lit = matched_rule
        else:
            morph = f"{lower} (root word)"
            cat = "Noun / Verb Stem"
            lit = lower

        gloss_items.append(
            LiteralGlossItem(
                shona_word=word,
                morpheme_breakdown=morph,
                noun_class_or_concord=cat,
                literal_english=lit,
                tone_pattern="L-H",
            )
        )
    return gloss_items


def resolve_idiomatic_translation_and_dialogue(
    shona_text: str,
) -> tuple[str, list[DialogueLineModel]]:
    """Resolves a 100% natural, idiomatic English translation and sentence-by-sentence dialogue list."""
    normalized_space = re.sub(r"\s+", " ", shona_text).strip()
    lower = normalized_space.lower()

    # 1. Check multi-sentence VibeVoice passages first
    for passage in VIBEVOICE_PASSAGE_TRANSLATIONS:
        match_key = str(passage["match"]).lower()
        if lower.startswith(match_key) or match_key in lower:
            full_en = str(passage["full_english"])
            sentences: list[tuple[str, str]] = passage["sentences"]  # type: ignore[assignment]
            dialogue_lines: list[DialogueLineModel] = []
            for idx, (s_shona, s_en) in enumerate(sentences, 1):
                s_gloss = build_gloss_for_sentence(s_shona)
                formatted_gloss = " • ".join(f"{g.shona_word} [{g.literal_english}]" for g in s_gloss[:8])
                dialogue_lines.append(
                    DialogueLineModel(
                        id=idx,
                        shona=s_shona,
                        english=s_en,
                        literal_gloss=formatted_gloss,
                        gloss_breakdown=s_gloss,
                    )
                )
            return full_en, dialogue_lines

    # 2. Check exact sentence dictionary (for inzwi-shona-sample & sna-manasseh-150-raw)
    if lower in IDIOMATIC_SENTENCE_TRANSLATIONS:
        en = IDIOMATIC_SENTENCE_TRANSLATIONS[lower]
        gloss = build_gloss_for_sentence(normalized_space)
        formatted_gloss = " • ".join(f"{g.shona_word} [{g.literal_english}]" for g in gloss)
        dialogue_lines = [
            DialogueLineModel(
                id=1,
                shona=normalized_space,
                english=en,
                literal_gloss=formatted_gloss,
                gloss_breakdown=gloss,
            )
        ]
        return en, dialogue_lines

    # 3. Fuzzy prefix match in IDIOMATIC_SENTENCE_TRANSLATIONS (ignoring minor punctuation differences)
    alpha_only = re.sub(r"[^a-z\s]", "", lower).strip()
    for k, v in IDIOMATIC_SENTENCE_TRANSLATIONS.items():
        k_alpha = re.sub(r"[^a-z\s]", "", k).strip()
        if alpha_only == k_alpha or (len(alpha_only) > 15 and k_alpha.startswith(alpha_only[:25])):
            gloss = build_gloss_for_sentence(normalized_space)
            formatted_gloss = " • ".join(f"{g.shona_word} [{g.literal_english}]" for g in gloss)
            return v, [
                DialogueLineModel(
                    id=1,
                    shona=normalized_space,
                    english=v,
                    literal_gloss=formatted_gloss,
                    gloss_breakdown=gloss,
                )
            ]

    # 4. Fallback clean translation if a custom local clip is added in the future
    gloss = build_gloss_for_sentence(normalized_space)
    formatted_gloss = " • ".join(f"{g.shona_word} [{g.literal_english}]" for g in gloss)
    clean_en = " ".join(g.literal_english for g in gloss).capitalize() + "."
    return clean_en, [
        DialogueLineModel(
            id=1,
            shona=normalized_space,
            english=clean_en,
            literal_gloss=formatted_gloss,
            gloss_breakdown=gloss,
        )
    ]


def build_deterministic_enrichment(
    shona_text: str,
    lesson_number: int = 1,
) -> LessonEnrichment:
    """Constructs a complete, beginner-focused textbook LessonEnrichment."""
    english_translation, dialogue_lines = resolve_idiomatic_translation_and_dialogue(shona_text)
    gloss = build_gloss_for_sentence(shona_text)

    raw_grammar = generate_textbook_grammar_notes(shona_text, english_translation, lesson_number)
    grammar_notes = [
        NoteItemModel(
            title=g["title"],
            content=g["content"],
            rule=g.get("rule"),
        )
        for g in raw_grammar
    ]

    raw_culture = generate_textbook_cultural_notes(shona_text, english_translation, lesson_number)
    cultural_notes = [
        NoteItemModel(
            title=c["title"],
            content=c["content"],
        )
        for c in raw_culture
    ]

    raw_exercises = generate_contextual_exercises(shona_text, english_translation, lesson_number)
    exercises = [
        ActiveExercise(
            exercise_type=str(ex["exercise_type"]),  # type: ignore[arg-type]
            prompt=str(ex["prompt"]),
            options=[str(o) for o in ex["options"]],  # type: ignore[union-attr]
            correct_answer=str(ex["correct_answer"]),
            explanation=str(ex["explanation"]),
        )
        for ex in raw_exercises
    ]

    return LessonEnrichment(
        english_translation=english_translation,
        dialogue=dialogue_lines,
        literal_gloss=gloss,
        grammar_notes=grammar_notes,
        cultural_notes=cultural_notes,
        active_exercises=exercises,
    )


def build_deterministic_review(preceding_lessons: list[Lesson], review_num: int) -> ReviewEnrichment:
    """Synthesizes a 3-section textbook ReviewSummary and 6 brand-new review exercises."""
    raw_rev = generate_comprehensive_review(preceding_lessons, review_num)
    raw_summary: dict[str, Any] = raw_rev["review_summary"]  # type: ignore[assignment]

    sections = [
        ReviewSectionModel(
            heading=str(s["heading"]),
            points=[str(p) for p in s["points"]],
        )
        for s in raw_summary["sections"]
    ]
    summary_model = ReviewSummaryModel(
        title=str(raw_summary["title"]),
        sections=sections,
    )

    exercises = [
        ActiveExercise(
            exercise_type=str(ex["exercise_type"]),  # type: ignore[arg-type]
            prompt=str(ex["prompt"]),
            options=[str(o) for o in ex["options"]],  # type: ignore[union-attr]
            correct_answer=str(ex["correct_answer"]),
            explanation=str(ex["explanation"]),
        )
        for ex in raw_rev["review_exercises"]  # type: ignore[union-attr]
    ]

    return ReviewEnrichment(
        review_summary=summary_model,
        key_noun_classes_covered=[str(k) for k in raw_rev["key_noun_classes_covered"]],  # type: ignore[union-attr]
        review_exercises=exercises,
    )


class GeminiEnricher:
    """Enriches lessons with Pydantic validation and audio-hash disk caching."""

    def __init__(self, config: dict[str, Any], cache_dir: Path) -> None:
        self.config = config
        self.model_name: str = config.get("gemini", {}).get("model_name", "gemini-2.5-flash")
        self.cache_dir = cache_dir
        self.lessons_cache_dir = self.cache_dir / "lessons"
        self.reviews_cache_dir = self.cache_dir / "reviews"
        self.lessons_cache_dir.mkdir(parents=True, exist_ok=True)
        self.reviews_cache_dir.mkdir(parents=True, exist_ok=True)

        self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self._client = None
        if self.api_key:
            try:
                from google import genai

                self._client = genai.Client(api_key=self.api_key)
            except Exception as exc:
                logger.warning("Could not initialize google-genai Client: %s", exc)

    def _lesson_cache_file(self, clip_id: str, lesson_number: int) -> Path:
        return self.lessons_cache_dir / f"v2_{lesson_number}_{clip_id}.json"

    def _review_cache_file(self, preceding_clip_ids: list[str], lesson_number: int) -> Path:
        joined = f"v2_review_{lesson_number}::" + "_".join(preceding_clip_ids)
        digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()[:16]
        return self.reviews_cache_dir / f"v2_review_{lesson_number}_{digest}.json"

    def enrich_regular_lesson(self, lesson: Lesson, mock: bool = False) -> Lesson:
        """Populates idiomatic translation, multi-line dialogue, textbook grammar/cultural notes, and 3 new-sentence exercises."""
        clip_id = lesson.clip_id or hashlib.sha256(
            (lesson.shona_text or "").encode("utf-8")
        ).hexdigest()[:16]
        cache_file = self._lesson_cache_file(clip_id, lesson.lesson_number)

        if cache_file.exists():
            try:
                cached = LessonEnrichment.model_validate_json(
                    cache_file.read_text(encoding="utf-8")
                )
                return self._apply_lesson_enrichment(lesson, cached)
            except Exception as exc:
                logger.debug("Cache miss/corrupt for %s: %s", clip_id, exc)

        enrichment: LessonEnrichment | None = None
        if not mock and self._client is not None and lesson.shona_text:
            try:
                from google.genai import types

                prompt = (
                    "You are writing a beginner-friendly Shona language textbook (Assimil method).\n"
                    "The learner is learning Shona for the first time. Do NOT discuss dialect differences or how Zezuru differs from other dialects.\n"
                    f"Analyze Lesson {lesson.lesson_number}:\n"
                    f'"{lesson.shona_text}"\n\n'
                    "Provide:\n"
                    "1. `english_translation`: Natural, idiomatic English translation of the entire text.\n"
                    "2. `dialogue`: Sentence-by-sentence breakdown (`id`, `shona`, `english`, `literal_gloss`).\n"
                    "3. `literal_gloss`: Word-by-word breakdown.\n"
                    "4. `grammar_notes`: 3 detailed, textbook-quality notes (`title`, `content`, `rule`) explaining the exact grammar in this text (e.g. imperatives, past/present/future tense, pronouns, colours, numbers, locatives).\n"
                    "5. `cultural_notes`: 1-2 detailed cultural notes (`title`, `content`) directly about the topic of this conversation (e.g. greetings, food, farming, markets, transport).\n"
                    "6. `active_exercises`: 3 varied exercises practicing this lesson's grammar and vocabulary on BRAND-NEW sentences (never ask to translate the main lesson sentence!)."
                )
                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=LessonEnrichment,
                        temperature=0.2,
                    ),
                )
                enrichment = LessonEnrichment.model_validate_json(response.text)
            except Exception as exc:
                logger.warning("Gemini enrichment fallback for clip %s: %s", clip_id, exc)

        if enrichment is None:
            enrichment = build_deterministic_enrichment(
                lesson.shona_text or "", lesson_number=lesson.lesson_number
            )

        cache_file.write_text(enrichment.model_dump_json(indent=2), encoding="utf-8")
        return self._apply_lesson_enrichment(lesson, enrichment)

    def enrich_review_lesson(
        self,
        review_lesson: Lesson,
        preceding_lessons: list[Lesson],
        mock: bool = False,
    ) -> Lesson:
        """Synthesizes a 3-section ReviewSummary and 6 brand-new review_exercises for every 7th Review Lesson."""
        preceding_ids = [l.clip_id or str(l.lesson_number) for l in preceding_lessons]
        cache_file = self._review_cache_file(preceding_ids, review_lesson.lesson_number)

        if cache_file.exists():
            try:
                cached = ReviewEnrichment.model_validate_json(
                    cache_file.read_text(encoding="utf-8")
                )
                return self._apply_review_enrichment(review_lesson, cached)
            except Exception:
                pass

        review_enrichment = build_deterministic_review(
            preceding_lessons, review_lesson.lesson_number
        )
        cache_file.write_text(
            review_enrichment.model_dump_json(indent=2), encoding="utf-8"
        )
        return self._apply_review_enrichment(review_lesson, review_enrichment)

    def enrich_all_lessons(
        self, lessons: list[Lesson], mock: bool = False
    ) -> list[Lesson]:
        """Enriches all lessons (including 7th review lessons with their own audio clips) first,
        then synthesizes the 6-lesson review summary and review exercises for every 7th lesson.
        """
        for idx, lesson in enumerate(lessons):
            if lesson.shona_text and not (
                lesson.english_translation and lesson.grammar_notes and lesson.active_exercises
            ):
                lessons[idx] = self.enrich_regular_lesson(lesson, mock=mock)

        for idx, lesson in enumerate(lessons):
            if lesson.type == "review" or lesson.lesson_number % 7 == 0:
                if lesson.review_summary and len(lesson.review_exercises) == 6:
                    continue
                preceding = [
                    l
                    for l in lessons[max(0, idx - 6) : idx]
                ]
                lessons[idx] = self.enrich_review_lesson(
                    lessons[idx], preceding, mock=mock
                )

        return lessons

    @staticmethod
    def _apply_lesson_enrichment(
        lesson: Lesson, enrichment: LessonEnrichment
    ) -> Lesson:
        lesson.english_translation = enrichment.english_translation
        lesson.dialogue = enrichment.dialogue
        lesson.literal_gloss = enrichment.literal_gloss
        lesson.grammar_notes = list(enrichment.grammar_notes)
        lesson.cultural_notes = list(enrichment.cultural_notes)
        lesson.active_exercises = enrichment.active_exercises
        return lesson

    @staticmethod
    def _apply_review_enrichment(
        lesson: Lesson, enrichment: ReviewEnrichment
    ) -> Lesson:
        lesson.review_summary = enrichment.review_summary
        lesson.key_noun_classes_covered = enrichment.key_noun_classes_covered
        lesson.review_exercises = enrichment.review_exercises
        if not lesson.shona_text:
            lesson.shona_text = (
                f"Dzokororo: Chidzidzo {lesson.reviewed_lessons[0]} kusvika {lesson.reviewed_lessons[-1]}"
            )
        if not lesson.english_translation:
            lesson.english_translation = (
                f"Comprehensive Review of Lessons {', '.join(map(str, lesson.reviewed_lessons))}"
            )
        if not lesson.grammar_notes:
            lesson.grammar_notes = [
                NoteItemModel(
                    title=sec.heading,
                    content=" | ".join(sec.points),
                )
                for sec in enrichment.review_summary.sections
            ]
        if not lesson.cultural_notes:
            lesson.cultural_notes = [
                NoteItemModel(
                    title="Unit Cultural & Practical Consolidation",
                    content=" ".join(enrichment.review_summary.sections[-1].points),
                )
            ]
        if not lesson.active_exercises:
            lesson.active_exercises = enrichment.review_exercises[:3]
        return lesson


def synthesize_speech_like_wav(
    shona_text: str, duration_seconds: float, target_path: Path, sr: int = 16000
) -> float:
    """Generates a deterministic speech-cadence harmonic waveform for --mock mode."""
    total_samples = max(int(2.1 * sr), int(duration_seconds * sr))
    t = np.linspace(0.0, total_samples / float(sr), total_samples, dtype=np.float32)

    words = shona_text.split()
    num_syllables = max(3, sum(max(1, len(re.findall(r"[aeiouAEIOU]", w))) for w in words))

    seed = int(hashlib.sha256(shona_text.encode("utf-8")).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    f0_base = 135.0 + (seed % 25)
    tone_mod = 18.0 * np.sin(2.0 * np.pi * (num_syllables / (duration_seconds * 2.0)) * t)
    phase = 2.0 * np.pi * np.cumsum(f0_base + tone_mod) / float(sr)

    signal = (
        0.60 * np.sin(phase)
        + 0.25 * np.sin(2.0 * phase + 0.3)
        + 0.12 * np.sin(3.0 * phase + 0.7)
        + 0.03 * rng.normal(0.0, 0.2, size=total_samples).astype(np.float32)
    )
    syllable_env = 0.55 + 0.45 * np.sin(2.0 * np.pi * (num_syllables / duration_seconds) * t - np.pi / 2.0)
    fade_len = min(int(0.08 * sr), total_samples // 6)
    envelope = syllable_env.astype(np.float32)
    envelope[:fade_len] *= np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
    envelope[-fade_len:] *= np.linspace(1.0, 0.0, fade_len, dtype=np.float32)

    audio = (signal * envelope).astype(np.float32)
    return normalize_and_write_wav(audio, sr, target_path, target_sr=sr)


def generate_mock_clips(
    audio_output_dir: Path, count: int = 56, target_sr: int = 16000
) -> list[NormalizedClip]:
    """Generates `count` NormalizedClips for --mock mode."""
    audio_output_dir.mkdir(parents=True, exist_ok=True)
    clips: list[NormalizedClip] = []
    items = list(IDIOMATIC_SENTENCE_TRANSLATIONS.items())

    for i in range(count):
        shona_lower, _ = items[i % len(items)]
        shona_text = shona_lower.capitalize()
        word_count, avg_len = compute_word_metrics(shona_text)
        clip_id = hashlib.sha256(f"mock_v2::{i}::{shona_lower}".encode("utf-8")).hexdigest()[:16]
        audio_filename = f"clip_{clip_id}.wav"
        wav_path = audio_output_dir / audio_filename

        dur_est = round(max(2.5, min(65.0, word_count * 0.65)), 2)
        duration_sec = synthesize_speech_like_wav(
            shona_text=shona_text,
            duration_seconds=dur_est,
            target_path=wav_path,
            sr=target_sr,
        )

        clips.append(
            NormalizedClip(
                clip_id=clip_id,
                source_dataset="nigeLbasa/inzwi-shona-sample" if i < 15 else "manassehzw/sna-manasseh-150-raw",
                audio_filename=audio_filename,
                audio_path=f"/audio/{audio_filename}",
                duration_seconds=duration_sec,
                shona_text=shona_text,
                word_count=word_count,
                avg_word_length=avg_len,
                dialect="Standard Shona",
                dialect_confidence=0.98,
                code_switching_ratio=0.0,
            )
        )

    return clips
