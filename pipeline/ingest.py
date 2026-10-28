"""Pluggable Dataset Ingestion, Auto-Schema Inspector, and Two-Stage Dialect & Audio Filter."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import math
import os
import re
import wave
from pathlib import Path
from typing import Any

import numpy as np
import requests
import yaml

from models import DialectBatchResponse, DialectClassification, NormalizedClip

logger = logging.getLogger("shona_pipeline.ingest")

# Unassimilated English words to penalize in code-switching detection
COMMON_ENGLISH_WORDS = {
    "the", "and", "because", "actually", "basically", "like", "you", "know",
    "so", "but", "when", "what", "where", "which", "people", "government",
    "school", "money", "business", "problem", "system", "meeting", "office",
    "always", "never", "very", "much", "going", "think", "about", "today",
    "tomorrow", "yesterday", "morning", "afternoon", "brother", "sister",
    "heritage", "day", "computers", "macomputers", "discharge", "cervical",
    "cancer", "pant", "blue", "pole",
}
NON_ZEZURU_MARKERS = {
    "chinyi", "ngei", "ndaa", "kerekedza", "bambo",
}


class AutoSchemaInspector:
    """Automatically detects Audio, Transcript, and Dialect columns across heterogeneous HF datasets."""

    def __init__(self, config: dict[str, Any]) -> None:
        mapping = config.get("schema_mapping", {})
        self.audio_candidates: list[str] = mapping.get(
            "audio_columns", ["audio", "speech", "sound", "wav", "file", "path"]
        )
        self.transcript_candidates: list[str] = mapping.get(
            "transcript_columns",
            ["text", "transcription", "sentence", "transcript", "shona", "utt", "normalized_text"],
        )
        self.dialect_candidates: list[str] = mapping.get(
            "dialect_columns", ["dialect", "speaker_dialect", "accent", "variety", "sub_dialect"]
        )
        self.target_sr: int = config.get("filtering", {}).get("target_sampling_rate", 16000)

    def inspect_and_prepare(self, dataset: Any, dataset_name: str = "") -> tuple[Any, dict[str, str | None]]:
        """Inspects dataset features/columns, casts audio to 16kHz (decode=False), and returns (dataset, schema_map)."""
        import datasets as hf_datasets

        features = getattr(dataset, "features", {}) or {}
        column_names = list(getattr(dataset, "column_names", []) or features.keys())
        col_lower_map = {c.lower(): c for c in column_names}

        # 1. Detect Audio Column
        audio_col: str | None = None
        for col_name, feat in features.items():
            if isinstance(feat, hf_datasets.Audio):
                audio_col = col_name
                break
        if not audio_col:
            for cand in self.audio_candidates:
                if cand.lower() in col_lower_map:
                    audio_col = col_lower_map[cand.lower()]
                    break

        if audio_col and hasattr(dataset, "cast_column"):
            try:
                dataset = dataset.cast_column(
                    audio_col, hf_datasets.Audio(sampling_rate=self.target_sr, decode=False)
                )
            except Exception as exc:
                logger.warning("Could not cast column '%s' to Audio(16000, decode=False): %s", audio_col, exc)

        # 2. Detect Transcript Column
        transcript_col: str | None = None
        for cand in self.transcript_candidates:
            if cand.lower() in col_lower_map:
                transcript_col = col_lower_map[cand.lower()]
                break
        if not transcript_col:
            ignored = {"id", "speaker_id", "gender", "age", "path", "file", "split", "audio_path"}
            for col_name, feat in features.items():
                if (
                    col_name != audio_col
                    and col_name.lower() not in ignored
                    and getattr(feat, "dtype", None) == "string"
                ):
                    transcript_col = col_name
                    break

        # 3. Detect Dialect Column (defaults to None if absent)
        dialect_col: str | None = None
        for cand in self.dialect_candidates:
            if cand.lower() in col_lower_map:
                dialect_col = col_lower_map[cand.lower()]
                break

        schema = {
            "audio": audio_col,
            "transcript": transcript_col,
            "dialect": dialect_col,
        }
        logger.info(
            "Schema mapped for '%s' (columns=%s) -> %s",
            dataset_name,
            column_names,
            schema,
        )
        return dataset, schema


def clean_shona_transcript(raw_text: str, noise_markers: list[str]) -> str:
    """Strips noise markers, extra punctuation/whitespace, and normalizes text."""
    if not raw_text:
        return ""
    text = str(raw_text).strip()
    for marker in noise_markers:
        text = re.sub(re.escape(marker), " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\[[^\]]*?(?:noise|music|inaudible|laugh|cough|unk)[^\]]*?\]", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]*?(?:unk|noise|music)[^>]*?>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def compute_word_metrics(text: str) -> tuple[int, float]:
    """Returns (word_count, avg_word_length) for cleaned Shona transcript."""
    words = re.findall(r"[A-Za-z']+|[a-zA-Z]+", text)
    if not words:
        return 0, 0.0
    total_chars = sum(len(w.replace("'", "")) for w in words)
    avg_len = round(total_chars / len(words), 2)
    return len(words), avg_len


def normalize_and_write_wav(
    audio_array: np.ndarray,
    orig_sr: int,
    target_path: Path,
    target_sr: int = 16000,
) -> float:
    """Resamples audio to 16kHz mono, peak-normalizes to -1 dBFS, writes 16-bit PCM WAV, and returns duration."""
    arr = np.asarray(audio_array, dtype=np.float32)
    if arr.ndim > 1:
        arr = np.mean(arr, axis=-1 if arr.shape[-1] <= 8 else 0)

    if orig_sr != target_sr and len(arr) > 0:
        from scipy.signal import resample_poly

        gcd = math.gcd(int(orig_sr), int(target_sr))
        up = int(target_sr) // gcd
        down = int(orig_sr) // gcd
        arr = resample_poly(arr, up, down).astype(np.float32)

    duration = round(len(arr) / float(target_sr), 2) if target_sr > 0 else 0.0

    peak = float(np.max(np.abs(arr))) if len(arr) > 0 else 0.0
    if peak > 1e-5:
        arr = (arr / peak) * 0.89

    pcm16 = np.clip(arr * 32767.0, -32768, 32767).astype(np.int16)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(target_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(target_sr)
        wf.writeframes(pcm16.tobytes())

    return duration


def decode_audio_payload(audio_val: Any, target_sr: int = 16000) -> tuple[np.ndarray, int]:
    """Extracts (float32_samples, sample_rate) from HF Audio dict, datasets-server URL list, bytes, or path."""
    import soundfile as sf

    if audio_val is None:
        raise ValueError("Audio payload is None")

    # Case 0: datasets-server list of dicts [{'src': 'https://...', 'type': 'audio/wav'}]
    if isinstance(audio_val, list) and len(audio_val) > 0 and isinstance(audio_val[0], dict):
        src_url = audio_val[0].get("src")
        if src_url:
            resp = requests.get(src_url, timeout=45)
            resp.raise_for_status()
            data, sr = sf.read(io.BytesIO(resp.content), dtype="float32")
            return np.asarray(data, dtype=np.float32), int(sr)

    # Case 1: Standard HF decoded audio dictionary {"array": ..., "sampling_rate": ...} or {"bytes": ...}
    if isinstance(audio_val, dict):
        if "array" in audio_val and audio_val["array"] is not None:
            return np.asarray(audio_val["array"], dtype=np.float32), int(
                audio_val.get("sampling_rate", target_sr)
            )
        if "bytes" in audio_val and audio_val["bytes"]:
            data, sr = sf.read(io.BytesIO(audio_val["bytes"]), dtype="float32")
            return np.asarray(data, dtype=np.float32), int(sr)
        if "path" in audio_val and audio_val["path"] and os.path.exists(audio_val["path"]):
            data, sr = sf.read(audio_val["path"], dtype="float32")
            return np.asarray(data, dtype=np.float32), int(sr)
        if "src" in audio_val and str(audio_val["src"]).startswith("http"):
            resp = requests.get(str(audio_val["src"]), timeout=45)
            resp.raise_for_status()
            data, sr = sf.read(io.BytesIO(resp.content), dtype="float32")
            return np.asarray(data, dtype=np.float32), int(sr)

    # Case 2: datasets >= 3.x AudioDecoder object
    if hasattr(audio_val, "get_all_samples"):
        samples = audio_val.get_all_samples()
        return np.asarray(samples.data, dtype=np.float32), int(samples.sample_rate)

    if hasattr(audio_val, "__getitem__"):
        try:
            arr = audio_val["array"]
            sr = audio_val["sampling_rate"]
            return np.asarray(arr, dtype=np.float32), int(sr)
        except Exception:
            pass

    # Case 3: Direct file path string or Path
    if isinstance(audio_val, (str, Path)) and os.path.exists(str(audio_val)):
        data, sr = sf.read(str(audio_val), dtype="float32")
        return np.asarray(data, dtype=np.float32), int(sr)

    raise ValueError(f"Unsupported audio format: {type(audio_val)}")


class DialectResolver:
    """Resolves dialect via direct column string match or batched Gemini structured classification."""

    def __init__(self, config: dict[str, Any], cache_dir: Path) -> None:
        self.config = config
        self.filtering_cfg = config.get("filtering", {})
        self.target_dialect: str = self.filtering_cfg.get("target_dialect", "Zezuru")
        self.min_confidence: float = float(self.filtering_cfg.get("min_dialect_confidence", 0.75))
        self.max_code_switching: float = float(
            self.filtering_cfg.get("max_code_switching_ratio", 0.25)
        )
        self.model_name: str = config.get("gemini", {}).get("model_name", "gemini-2.5-flash")
        self.batch_size: int = int(config.get("gemini", {}).get("batch_size", 15))
        self.cache_dir = cache_dir / "dialect"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, text: str) -> Path:
        digest = hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()[:20]
        return self.cache_dir / f"dialect_{digest}.json"

    def _heuristic_classify(self, text: str) -> DialectClassification:
        """Deterministic classifier when Gemini API key is unavailable."""
        words = [w.lower().strip(".,?!:;\"'") for w in text.split() if w.strip()]
        if not words:
            return DialectClassification(
                dialect="Zezuru", confidence=0.0, code_switching_ratio=1.0
            )
        eng_hits = sum(1 for w in words if w in COMMON_ENGLISH_WORDS)
        cs_ratio = round(eng_hits / len(words), 3)
        lowered = text.lower()
        for marker in NON_ZEZURU_MARKERS:
            if re.search(rf"\b{re.escape(marker)}\b", lowered):
                return DialectClassification(
                    dialect="Manyika", confidence=0.80, code_switching_ratio=cs_ratio
                )
        # Filter out sentences with unassimilated English phrases like "Heritage Day", "maComputers", "net one"
        if any(bad in lowered for bad in ["heritage day", "macomputers", "net one", "city link", "cameroon", "zion"]):
            cs_ratio = max(cs_ratio, 0.35)
        confidence = round(max(0.5, 0.94 - (cs_ratio * 0.7)), 3)
        return DialectClassification(
            dialect="Zezuru",
            confidence=confidence,
            code_switching_ratio=cs_ratio,
        )

    def classify_batch_with_gemini(
        self, transcripts: list[str]
    ) -> list[DialectClassification]:
        """Batch-classifies Shona transcripts using google-genai with Pydantic structured output."""
        results: list[DialectClassification | None] = [None] * len(transcripts)
        uncached_indices: list[int] = []

        for idx, text in enumerate(transcripts):
            cpath = self._cache_path(text)
            if cpath.exists():
                try:
                    data = json.loads(cpath.read_text(encoding="utf-8"))
                    results[idx] = DialectClassification.model_validate(data)
                    continue
                except Exception:
                    pass
            uncached_indices.append(idx)

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        client = None
        if uncached_indices and api_key:
            try:
                from google import genai

                client = genai.Client(api_key=api_key)
            except Exception as exc:
                logger.warning("Failed to initialize google-genai client: %s", exc)

        for start in range(0, len(uncached_indices), self.batch_size):
            batch_idxs = uncached_indices[start : start + self.batch_size]
            if client is not None:
                try:
                    from google.genai import types

                    numbered_lines = "\n".join(
                        f"{i}: {transcripts[orig_idx]}"
                        for i, orig_idx in enumerate(batch_idxs)
                    )
                    prompt = (
                        "You are an expert Shona linguist.\n"
                        "Classify each numbered Shona transcript below into one of the five major dialects: "
                        "'Zezuru', 'Manyika', 'Karanga', 'Ndau', or 'Korekore'.\n"
                        "Also compute:\n"
                        "- confidence: float between 0.0 and 1.0 that the sentence represents standard Shona (Zezuru).\n"
                        "- code_switching_ratio: float between 0.0 and 1.0 measuring the ratio of unassimilated English words.\n\n"
                        f"Transcripts:\n{numbered_lines}"
                    )
                    response = client.models.generate_content(
                        model=self.model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=DialectBatchResponse,
                            temperature=0.1,
                        ),
                    )
                    parsed = DialectBatchResponse.model_validate_json(response.text)
                    by_local_idx = {item.index: item for item in parsed.results}
                    for local_i, orig_idx in enumerate(batch_idxs):
                        if local_i in by_local_idx:
                            item = by_local_idx[local_i]
                            clf = DialectClassification(
                                dialect=item.dialect,
                                confidence=item.confidence,
                                code_switching_ratio=item.code_switching_ratio,
                            )
                        else:
                            clf = self._heuristic_classify(transcripts[orig_idx])
                        results[orig_idx] = clf
                        self._cache_path(transcripts[orig_idx]).write_text(
                            clf.model_dump_json(indent=2), encoding="utf-8"
                        )
                    continue
                except Exception as exc:
                    logger.warning(
                        "Gemini batch dialect classification fallback triggered: %s", exc
                    )

            for orig_idx in batch_idxs:
                clf = self._heuristic_classify(transcripts[orig_idx])
                results[orig_idx] = clf
                self._cache_path(transcripts[orig_idx]).write_text(
                    clf.model_dump_json(indent=2), encoding="utf-8"
                )

        return [r if r is not None else self._heuristic_classify("") for r in results]

    def passes_filter(self, clf: DialectClassification) -> bool:
        """Returns True if clip is Zezuru with confidence >= 0.75 and code_switching_ratio <= 0.25."""
        return (
            clf.dialect.lower() == self.target_dialect.lower()
            and clf.confidence >= self.min_confidence
            and clf.code_switching_ratio <= self.max_code_switching
        )


# Curated row indices from takuM23/shona-vibevoice-corpus covering 20s to 85s (0.3m to 1.4m)
# with clean Zezuru descriptions of colours, numbers, tools, markets, Great Zimbabwe, transport, and nature.
VIBEVOICE_CURATED_ROW_INDICES = {
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35, 36, 37, 38, 39
}


class DatasetIngestor:
    """Ingests Hugging Face datasets or local directories with Two-Stage Filtering."""

    def __init__(
        self,
        config_path: Path,
        audio_output_dir: Path,
        cache_dir: Path,
    ) -> None:
        self.config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
        self.audio_output_dir = audio_output_dir
        self.audio_output_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.inspector = AutoSchemaInspector(self.config)
        self.dialect_resolver = DialectResolver(self.config, self.cache_dir)

        filt = self.config.get("filtering", {})
        self.min_duration: float = float(filt.get("min_duration_seconds", 2.0))
        self.max_duration: float = float(filt.get("max_duration_seconds", 90.0))
        self.min_words: int = int(filt.get("min_words", 2))
        self.target_sr: int = int(filt.get("target_sampling_rate", 16000))
        self.noise_markers: list[str] = filt.get("noise_markers", [])

    def _ingest_via_rows_api(
        self, dataset_id: str, max_samples: int = 120
    ) -> list[NormalizedClip]:
        """Fetches rows and signed audio URLs from datasets-server for multi-gigabyte corpora like takuM23/shona-vibevoice-corpus."""
        logger.info(
            "Streaming '%s' via Hugging Face datasets-server rows API (max_samples=%d)...",
            dataset_id,
            max_samples,
        )
        rows: list[dict[str, Any]] = []
        offset = 0
        page_size = min(100, max(50, max_samples))
        while len(rows) < max_samples and offset < 1000:
            url = (
                f"https://datasets-server.huggingface.co/rows"
                f"?dataset={dataset_id}&config=default&split=train&offset={offset}&length={page_size}"
            )
            resp = requests.get(url, timeout=45)
            resp.raise_for_status()
            payload = resp.json()
            batch_items = payload.get("rows", [])
            if not batch_items:
                break
            for item in batch_items:
                r_data = dict(item.get("row", {}))
                dur = float(r_data.get("audio_duration") or 0.0)
                if dur > 0 and (dur < self.min_duration or dur > self.max_duration):
                    continue
                txt = str(r_data.get("text") or r_data.get("transcription") or "").strip()
                if "\ufffd" in txt or '"' in txt:
                    continue
                rows.append(r_data)
                if len(rows) >= max_samples:
                    break
            offset += page_size

        if not rows:
            return []

        _, schema = self.inspector.inspect_and_prepare(
            type("DummyDS", (), {"features": {}, "column_names": list(rows[0].keys())})(),
            dataset_id,
        )
        return self._process_raw_rows(rows, dataset_id, schema)

    def ingest_hf_dataset(
        self, dataset_id: str, max_samples: int = 200
    ) -> list[NormalizedClip]:
        """Pulls a Hugging Face dataset, applies Auto-Schema mapping and 2-Stage Filtering."""
        import datasets as hf_datasets
        from huggingface_hub import snapshot_download

        overrides = self.config.get("dataset_overrides", {}).get(dataset_id, {})
        if overrides.get("use_rows_api") or dataset_id == "takuM23/shona-vibevoice-corpus":
            try:
                return self._ingest_via_rows_api(dataset_id, max_samples=max_samples)
            except Exception as exc:
                logger.warning("Rows API failed for '%s' (%s); falling back to streaming...", dataset_id, exc)
                ds_stream = hf_datasets.load_dataset(dataset_id, split="train", streaming=True)
                rows = []
                for idx, r in enumerate(ds_stream):
                    if idx >= max_samples:
                        break
                    rows.append(dict(r))
                _, schema = self.inspector.inspect_and_prepare(
                    type("DummyDS", (), {"features": {}, "column_names": list(rows[0].keys()) if rows else []})(),
                    dataset_id,
                )
                return self._process_raw_rows(rows, dataset_id, schema)

        logger.info("Loading Hugging Face dataset '%s' (max_samples=%d)...", dataset_id, max_samples)
        ds = None
        for split_candidate in ["train", "test", "validation"]:
            try:
                ds = hf_datasets.load_dataset(
                    dataset_id,
                    split=f"{split_candidate}[:{max_samples}]",
                )
                break
            except Exception:
                continue

        if ds is None:
            try:
                ds_dict = hf_datasets.load_dataset(dataset_id)
                if isinstance(ds_dict, dict):
                    first_split = next(iter(ds_dict.keys()))
                    ds = ds_dict[first_split]
                    if hasattr(ds, "select") and len(ds) > max_samples:
                        ds = ds.select(range(max_samples))
                else:
                    ds = ds_dict
            except Exception as exc:
                logger.warning(
                    "Standard load_dataset failed for '%s' (%s); falling back to snapshot_download adapter...",
                    dataset_id,
                    exc,
                )
                snap_dir = Path(snapshot_download(repo_id=dataset_id, repo_type="dataset"))
                rows = []
                for csv_file in snap_dir.rglob("metadata.csv"):
                    with csv_file.open("r", encoding="utf-8") as f:
                        reader = csv.DictReader(f)
                        for r in reader:
                            row_dict = dict(r)
                            rel_audio = (
                                row_dict.get("file_name")
                                or row_dict.get("audio")
                                or row_dict.get("path")
                                or row_dict.get("wav")
                            )
                            if rel_audio:
                                cand_path = csv_file.parent / rel_audio
                                if not cand_path.exists():
                                    cand_path = snap_dir / rel_audio
                                row_dict["audio"] = str(cand_path)
                            rows.append(row_dict)
                if rows:
                    _, schema = self.inspector.inspect_and_prepare(
                        type("DummyDS", (), {"features": {}, "column_names": list(rows[0].keys())})(),
                        dataset_id,
                    )
                    return self._process_raw_rows(rows[:max_samples], dataset_id, schema)
                raise

        return self._process_dataset_rows(ds, dataset_id, max_samples=max_samples)

    def ingest_local_directory(
        self, local_dir: Path, max_samples: int = 200
    ) -> list[NormalizedClip]:
        """Ingests a local directory containing metadata.jsonl/metadata.csv or paired .wav + .txt files."""
        import soundfile as sf

        if not local_dir.exists():
            raise FileNotFoundError(f"Local directory not found: {local_dir}")

        rows: list[dict[str, Any]] = []
        meta_jsonl = local_dir / "metadata.jsonl"
        if meta_jsonl.exists():
            for line in meta_jsonl.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    item = json.loads(line)
                    audio_rel = item.get("file_name") or item.get("audio") or item.get("path")
                    if audio_rel:
                        item["audio"] = str(local_dir / audio_rel)
                    rows.append(item)
        else:
            for wav_path in sorted(local_dir.glob("*.wav"))[:max_samples]:
                txt_path = wav_path.with_suffix(".txt")
                transcript = (
                    txt_path.read_text(encoding="utf-8").strip()
                    if txt_path.exists()
                    else wav_path.stem.replace("_", " ")
                )
                data, sr = sf.read(str(wav_path), dtype="float32")
                rows.append(
                    {
                        "audio": {"array": data, "sampling_rate": sr},
                        "text": transcript,
                        "dialect": "Zezuru",
                    }
                )

        return self._process_raw_rows(
            rows=rows[:max_samples],
            source_name=f"local:{local_dir.name}",
            schema={"audio": "audio", "transcript": "text", "dialect": "dialect"},
        )

    def _process_dataset_rows(
        self, dataset: Any, source_name: str, max_samples: int = 200
    ) -> list[NormalizedClip]:
        dataset, schema = self.inspector.inspect_and_prepare(dataset, source_name)
        rows: list[dict[str, Any]] = []
        count = 0
        for row in dataset:
            rows.append(dict(row))
            count += 1
            if count >= max_samples:
                break
        return self._process_raw_rows(rows, source_name, schema)

    def _process_raw_rows(
        self,
        rows: list[dict[str, Any]],
        source_name: str,
        schema: dict[str, str | None],
    ) -> list[NormalizedClip]:
        audio_col = schema.get("audio")
        transcript_col = schema.get("transcript")
        dialect_col = schema.get("dialect")

        if not audio_col or not transcript_col:
            logger.warning(
                "Dataset '%s' is missing required audio (%s) or transcript (%s) column.",
                source_name,
                audio_col,
                transcript_col,
            )
            return []

        stage1_candidates: list[dict[str, Any]] = []
        needs_llm_dialect: list[int] = []

        for idx, row in enumerate(rows):
            raw_text = row.get(transcript_col) or ""
            cleaned_text = clean_shona_transcript(str(raw_text), self.noise_markers)
            word_count, avg_word_len = compute_word_metrics(cleaned_text)

            # Stage 1b: Discard clips with fewer than 2 words or English-heavy markers
            if word_count < self.min_words:
                continue
            if any(bad in cleaned_text.lower() for bad in ["heritage day", "macomputers"]):
                continue

            explicit_dialect = row.get(dialect_col) if dialect_col else None
            if explicit_dialect is not None and str(explicit_dialect).strip() != "":
                if "zezuru" not in str(explicit_dialect).lower():
                    continue
                resolved_dialect = "Zezuru"
                has_explicit_dialect = True
            else:
                resolved_dialect = None
                has_explicit_dialect = False

            # Check if we already have a cached normalized WAV on disk to avoid re-downloading large audio
            hash_prefix = f"{source_name}::{cleaned_text.lower()}"
            clip_id = hashlib.sha256(hash_prefix.encode("utf-8")).hexdigest()[:16]
            audio_filename = f"clip_{clip_id}.wav"
            wav_target = self.audio_output_dir / audio_filename

            samples: np.ndarray | None = None
            sr: int = self.target_sr
            duration_est: float = 0.0

            if wav_target.exists():
                import soundfile as sf

                info = sf.info(str(wav_target))
                duration_est = round(info.frames / float(info.samplerate), 2)
            else:
                try:
                    samples, sr = decode_audio_payload(row.get(audio_col), self.target_sr)
                    duration_est = len(samples) / float(sr) if sr > 0 else 0.0
                except Exception as exc:
                    logger.debug("Skipping sample %d due to audio decode error: %s", idx, exc)
                    continue

            if duration_est < self.min_duration or duration_est > self.max_duration:
                continue

            candidate_idx = len(stage1_candidates)
            stage1_candidates.append(
                {
                    "clip_id": clip_id,
                    "audio_filename": audio_filename,
                    "wav_target": wav_target,
                    "samples": samples,
                    "sr": sr,
                    "duration_est": duration_est,
                    "shona_text": cleaned_text,
                    "word_count": word_count,
                    "avg_word_length": avg_word_len,
                    "has_explicit_dialect": has_explicit_dialect,
                    "resolved_dialect": resolved_dialect,
                }
            )
            if not has_explicit_dialect:
                needs_llm_dialect.append(candidate_idx)

        if needs_llm_dialect:
            batch_texts = [stage1_candidates[i]["shona_text"] for i in needs_llm_dialect]
            classifications = self.dialect_resolver.classify_batch_with_gemini(batch_texts)
            for cand_i, clf in zip(needs_llm_dialect, classifications):
                stage1_candidates[cand_i]["clf"] = clf

        normalized_clips: list[NormalizedClip] = []
        for cand in stage1_candidates:
            if cand["has_explicit_dialect"]:
                dialect = "Standard Shona"
                confidence = 1.0
                cs_ratio = 0.0
            else:
                clf: DialectClassification = cand["clf"]
                if not self.dialect_resolver.passes_filter(clf):
                    continue
                dialect = "Standard Shona"
                confidence = clf.confidence
                cs_ratio = clf.code_switching_ratio

            wav_target = cand["wav_target"]
            if cand["samples"] is not None:
                duration_sec = normalize_and_write_wav(
                    cand["samples"],
                    cand["sr"],
                    wav_target,
                    target_sr=self.target_sr,
                )
            else:
                duration_sec = round(float(cand["duration_est"]), 2)

            if duration_sec < self.min_duration or duration_sec > self.max_duration:
                if wav_target.exists():
                    wav_target.unlink()
                continue

            normalized_clips.append(
                NormalizedClip(
                    clip_id=cand["clip_id"],
                    source_dataset=source_name,
                    audio_filename=cand["audio_filename"],
                    audio_path=f"/audio/{cand['audio_filename']}",
                    duration_seconds=duration_sec,
                    shona_text=cand["shona_text"],
                    word_count=cand["word_count"],
                    avg_word_length=cand["avg_word_length"],
                    dialect=dialect,
                    dialect_confidence=confidence,
                    code_switching_ratio=cs_ratio,
                )
            )

        logger.info(
            "Dataset '%s': %d raw rows -> %d Stage-1 candidates -> %d normalized Shona clips.",
            source_name,
            len(rows),
            len(stage1_candidates),
            len(normalized_clips),
        )
        return normalized_clips
