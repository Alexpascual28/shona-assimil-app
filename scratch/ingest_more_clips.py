import json
import logging
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import yaml
from ingest import DatasetIngestor
from enrich import GeminiEnricher
from sequencer import AssimilSequencer
from models import NormalizedClip, Lesson, CourseData

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest_more")

pipeline_dir = Path("pipeline")
cache_dir = pipeline_dir / ".cache"
config_path = pipeline_dir / "datasets_config.yaml"
with open(config_path, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

# Load existing ingested clips
clips_cache = cache_dir / "all_ingested_clips.json"
existing_clips_raw = json.loads(clips_cache.read_text(encoding="utf-8"))
existing_ids = {c["clip_id"] for c in existing_clips_raw}
existing_texts = {(c.get("shona_text") or "").strip().lower() for c in existing_clips_raw}
print(f"Loaded {len(existing_clips_raw)} existing clips in cache.")

# Ingest 150 new clips from takuM23/shona-vibevoice-corpus
audio_dir = Path("app/public/audio")
audio_dir.mkdir(parents=True, exist_ok=True)
ingestor = DatasetIngestor(config_path=config_path, audio_output_dir=audio_dir, cache_dir=cache_dir)
new_clips = ingestor.ingest_hf_dataset(
    dataset_id="takuM23/shona-vibevoice-corpus",
    max_samples=250
)

added_clips = []
for c in new_clips:
    if c.clip_id not in existing_ids and c.shona_text.strip().lower() not in existing_texts:
        added_clips.append(c)
        existing_ids.add(c.clip_id)
        existing_texts.add(c.shona_text.strip().lower())

print(f"Found {len(added_clips)} brand new clips from takuM23/shona-vibevoice-corpus.")

# Merge and save back to all_ingested_clips.json
all_clips = existing_clips_raw + [c.model_dump() for c in added_clips]
clips_cache.write_text(json.dumps(all_clips, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Saved {len(all_clips)} total clips to all_ingested_clips.json.")

# Now enrich the new clips and add them to expansion_pool.json
enricher = GeminiEnricher(config=config, cache_dir=cache_dir)
new_lessons = enricher.enrich_all_lessons(added_clips, mock=False)

pool_path = Path("app/public/expansion_pool.json")
existing_pool = json.loads(pool_path.read_text(encoding="utf-8"))
existing_pool_ids = {l["clip_id"] for l in existing_pool}
existing_pool_texts = {(l.get("shona_text") or "").strip().lower() for l in existing_pool}

appended_count = 0
for nl in new_lessons:
    if nl.clip_id not in existing_pool_ids and nl.shona_text.strip().lower() not in existing_pool_texts:
        existing_pool.append(nl.model_dump())
        existing_pool_ids.add(nl.clip_id)
        existing_pool_texts.add(nl.shona_text.strip().lower())
        appended_count += 1

pool_path.write_text(json.dumps(existing_pool, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Added {appended_count} new enriched lessons to expansion_pool.json. Total now in pool: {len(existing_pool)}")
