"""Pydantic data models for the Beginner-Focused Shona Assimil Ingestion & Syllabus Pipeline."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class DialectClassification(BaseModel):
    """Structured output for Shona dialect & code-switching classification."""

    dialect: Literal["Zezuru", "Manyika", "Karanga", "Ndau", "Korekore"] = Field(
        description="Classified Shona variety based on vocabulary, noun prefixes, and morphology."
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0 that the sentence belongs to standard Shona (Zezuru).",
    )
    code_switching_ratio: float = Field(
        ge=0.0,
        le=1.0,
        description="Proportion of words in the transcript that are unassimilated English code-switches (0.0 = pure Shona).",
    )


class DialectBatchItem(BaseModel):
    """Single item inside a batch dialect classification response."""

    index: int
    dialect: Literal["Zezuru", "Manyika", "Karanga", "Ndau", "Korekore"]
    confidence: float = Field(ge=0.0, le=1.0)
    code_switching_ratio: float = Field(ge=0.0, le=1.0)


class DialectBatchResponse(BaseModel):
    """Batch wrapper for Gemini structured output dialect classification."""

    results: list[DialectBatchItem]


class NormalizedClip(BaseModel):
    """Standardized intermediate representation produced by the ingestion adapter."""

    clip_id: str = Field(description="Deterministic 16-char SHA-256 hash of audio/transcript.")
    source_dataset: str = Field(description="Hugging Face dataset ID or local directory identifier.")
    audio_filename: str = Field(description="Normalized WAV filename inside /app/public/audio/.")
    audio_path: str = Field(description="Public path relative to web root, e.g. /audio/clip_xxx.wav.")
    duration_seconds: float = Field(ge=2.0, le=90.0)
    shona_text: str = Field(description="Cleaned Shona transcript.")
    word_count: int = Field(ge=2)
    avg_word_length: float = Field(ge=1.0)
    pedagogical_stage: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Pedagogical syllabus stage (1=Greetings/Commands, 2=Colours/Numbers/Food, 3=Home/Family/Progressive, 4=Past/Future/Nature, 5=Long Multi-Sentence Passages).",
    )
    difficulty_score: float = Field(
        default=0.0,
        description="(duration_seconds * 1.5) + (word_count * 2.0) + (avg_word_length * 3.0)",
    )
    dialect: str = Field(default="Zezuru")
    dialect_confidence: float = Field(default=1.0)
    code_switching_ratio: float = Field(default=0.0)


class LiteralGlossItem(BaseModel):
    """Word-by-word morphological breakdown for a Shona learner."""

    shona_word: str = Field(description="Surface word from the Shona sentence.")
    morpheme_breakdown: str = Field(
        description="Clear beginner-friendly breakdown of prefixes, tense markers, verb root, and suffixes."
    )
    noun_class_or_concord: str = Field(
        description="Shona grammatical category or noun class (e.g. 'Class 1/2 Person Noun', 'Past Tense Prefix')."
    )
    literal_english: str = Field(description="Literal word meaning in English.")
    tone_pattern: str = Field(
        default="L-H",
        description="Syllable pitch contour (H=High, L=Low).",
    )


class DialogueLineModel(BaseModel):
    """Individual sentence/utterance inside a lesson (especially useful for 30s-85s passages)."""

    id: int = Field(ge=1)
    shona: str
    english: str
    literal_gloss: str | None = None
    gloss_breakdown: list[LiteralGlossItem] | None = None


class NoteItemModel(BaseModel):
    """Detailed textbook-quality grammar or cultural note."""

    title: str = Field(description="Specific topic heading for this grammar or cultural note.")
    content: str = Field(
        description="Detailed, multi-sentence textbook explanation tailored to a first-time learner of Shona."
    )
    rule: str | None = Field(
        default=None,
        description="Clear grammatical formula or pattern summary with examples.",
    )


class ActiveExercise(BaseModel):
    """Interactive exercise testing the lesson's grammar and vocabulary on new sentences."""

    exercise_type: Literal["fill_in_the_blank", "concord_agreement", "translation", "multiple_choice", "fill_blank", "translate"]
    prompt: str = Field(description="Exercise question or new practice sentence.")
    options: list[str] = Field(
        default_factory=list,
        description="Multiple-choice options (4 items with shuffled correct answer position), or empty for free-text input.",
    )
    correct_answer: str = Field(description="Exact winning answer string.")
    explanation: str = Field(
        description="Clear beginner-friendly explanation of why this answer is correct."
    )


class ReviewSectionModel(BaseModel):
    """Section within a 7th-lesson comprehensive review summary."""

    heading: str
    points: list[str]


class ReviewSummaryModel(BaseModel):
    """Structured multi-section review summary for every 7th lesson."""

    title: str
    sections: list[ReviewSectionModel]


class LessonEnrichment(BaseModel):
    """Textbook linguistic annotations for a standard Shona Assimil lesson."""

    english_translation: str = Field(description="Natural, idiomatic English translation.")
    dialogue: list[DialogueLineModel] = Field(
        default_factory=list,
        description="Sentence-by-sentence bilingual breakdown for single or multi-sentence passages.",
    )
    literal_gloss: list[LiteralGlossItem] = Field(
        description="Word-by-word Shona breakdown."
    )
    grammar_notes: list[NoteItemModel] = Field(
        description="2-3 detailed textbook grammar notes explaining the exact structures in this lesson."
    )
    cultural_notes: list[NoteItemModel] = Field(
        description="Detailed cultural notes directly related to the topic of the current text."
    )
    active_exercises: list[ActiveExercise] = Field(
        min_length=3,
        max_length=3,
        description="3 varied exercises practicing the lesson's grammar and vocabulary on NEW sentences.",
    )


class ReviewEnrichment(BaseModel):
    """Comprehensive synthesis and brand-new exercises for every 7th Review Lesson."""

    review_summary: ReviewSummaryModel = Field(
        description="Structured 3-section textbook review covering vocabulary, grammar rules, and cultural context from the preceding 6 lessons."
    )
    key_noun_classes_covered: list[str] = Field(
        description="List of core grammar topics and noun classes practiced in this 6-lesson block."
    )
    review_exercises: list[ActiveExercise] = Field(
        min_length=6,
        max_length=6,
        description="6 brand-new review exercises testing retention across the preceding 6 lessons on fresh sentences.",
    )


class Lesson(BaseModel):
    """Unified lesson item written into /app/public/course_data.json."""

    lesson_number: int = Field(ge=1)
    type: Literal["regular", "review"]
    phase: Literal["passive", "active"] = Field(
        description="'passive' for Lessons 1-49; 'active' for Lesson 50+ (triggers Active Wave dual-lesson mode)."
    )
    active_wave_review_lesson: int | None = Field(
        default=None,
        description="When lesson_number >= 50, points to (lesson_number - 49) for the Assimil Second Wave active production drill.",
    )
    title: str
    source_dataset: str | None = None
    clip_id: str | None = None
    audio_url: str | None = None
    duration_seconds: float | None = None
    difficulty_score: float | None = None
    pedagogical_stage: int | None = None
    word_count: int | None = None
    avg_word_length: int | float | None = None
    dialect: str = "Standard Shona"
    dialect_confidence: float | None = None
    code_switching_ratio: float | None = None
    shona_text: str | None = None
    english_translation: str | None = None
    dialogue: list[DialogueLineModel] = Field(default_factory=list)
    literal_gloss: list[LiteralGlossItem] = Field(default_factory=list)
    grammar_notes: list[NoteItemModel | str] = Field(default_factory=list)
    cultural_notes: list[NoteItemModel] | str | None = None
    active_exercises: list[ActiveExercise] = Field(default_factory=list)

    # Review lesson specific fields (populated when type == 'review' on every 7th lesson)
    review_summary: ReviewSummaryModel | str | None = None
    key_noun_classes_covered: list[str] = Field(default_factory=list)
    review_exercises: list[ActiveExercise] = Field(default_factory=list)
    reviewed_lessons: list[int] = Field(default_factory=list)


class CourseData(BaseModel):
    """Top-level schema for /app/public/course_data.json."""

    course_title: str = "Shona With Ease — Assimil Method"
    target_dialect: str = "Standard Shona (Zezuru Standard)"
    version: str = "2.0.0"
    generated_at: str
    total_lessons: int
    regular_lessons_count: int
    review_lessons_count: int
    active_wave_start_lesson: int = 50
    source_datasets: list[str]
    lessons: list[Lesson]
