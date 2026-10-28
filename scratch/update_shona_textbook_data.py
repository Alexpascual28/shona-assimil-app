# -*- coding: utf-8 -*-
import os, sys
from test_41_match import NEW_41_TRANSLATIONS

target_file = r"pipeline/shona_textbook_data.py"
with open(target_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Format new VIBEVOICE_PASSAGE_TRANSLATIONS entries
passages_code = ""
for item in NEW_41_TRANSLATIONS:
    passages_code += "    {\n"
    passages_code += f'        "match": {repr(item["match"])},\n'
    passages_code += f'        "full_english": {repr(item["full_english"])},\n'
    passages_code += '        "sentences": [\n'
    for s_shona, s_en in item["sentences"]:
        passages_code += f'            ({repr(s_shona)}, {repr(s_en)}),\n'
    passages_code += '        ],\n'
    passages_code += "    },\n"

# 2. Format new SENTENCE_CULTURAL_NOTES entries
cultural_code = ""
for item in NEW_41_TRANSLATIONS:
    prefix_key, title, note_content = item["cultural"]
    cultural_code += "    (\n"
    cultural_code += f'        {repr(prefix_key)},\n'
    cultural_code += f'        {repr(title)},\n'
    cultural_code += f'        {repr(note_content)},\n'
    cultural_code += "    ),\n"

# Find insertion point for VIBEVOICE_PASSAGE_TRANSLATIONS
vv_start = content.find("VIBEVOICE_PASSAGE_TRANSLATIONS: list[dict[str, object]] = [")
vv_end = content.find("\n]\n\n\n# Beginner-friendly Shona word-by-word gloss", vv_start)
if vv_end == -1:
    vv_end = content.find("\n]\n\n# Beginner-friendly Shona word-by-word gloss", vv_start)
assert vv_end != -1, "Could not find end of VIBEVOICE_PASSAGE_TRANSLATIONS"

content = content[:vv_end] + "\n" + passages_code + content[vv_end:]

# Find insertion point for SENTENCE_CULTURAL_NOTES
sc_start = content.find("SENTENCE_CULTURAL_NOTES: list[tuple[str, str, str]] = [")
sc_end = content.find("\n]\n\n\ndef generate_textbook_cultural_notes(", sc_start)
if sc_end == -1:
    sc_end = content.find("\n]\n\ndef generate_textbook_cultural_notes(", sc_start)
assert sc_end != -1, "Could not find end of SENTENCE_CULTURAL_NOTES"

content = content[:sc_end] + "\n" + cultural_code + content[sc_end:]

with open(target_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully injected 41 translations and cultural notes into pipeline/shona_textbook_data.py!")
