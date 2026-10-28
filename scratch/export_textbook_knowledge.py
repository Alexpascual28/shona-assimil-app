# -*- coding: utf-8 -*-
import json, sys
sys.path.append("pipeline")
from shona_textbook_data import (
    VIBEVOICE_PASSAGE_TRANSLATIONS,
    SENTENCE_CULTURAL_NOTES,
    IDIOMATIC_SENTENCE_TRANSLATIONS,
    BEGINNER_WORD_GLOSS,
)

data = {
    "passage_translations": VIBEVOICE_PASSAGE_TRANSLATIONS,
    "cultural_notes": [
        {"prefix": prefix, "title": title, "content": content}
        for prefix, title, content in SENTENCE_CULTURAL_NOTES
    ],
    "sentence_translations": IDIOMATIC_SENTENCE_TRANSLATIONS,
    "word_gloss": {
        k: {"morph": v[0], "category": v[1], "literal": v[2]}
        for k, v in BEGINNER_WORD_GLOSS.items()
    },
}

out_path = "app/public/textbook_knowledge.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Exported textbook knowledge to {out_path}:")
print(f"  Passage translations: {len(data['passage_translations'])}")
print(f"  Cultural notes: {len(data['cultural_notes'])}")
print(f"  Sentence translations: {len(data['sentence_translations'])}")
print(f"  Word glosses: {len(data['word_gloss'])}")
