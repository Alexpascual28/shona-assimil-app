# -*- coding: utf-8 -*-
import sys, os
sys.path.append("pipeline")
from scratch.test_41_match import NEW_41_TRANSLATIONS
from shona_textbook_data import VIBEVOICE_PASSAGE_TRANSLATIONS, SENTENCE_CULTURAL_NOTES
from enrich import build_deterministic_enrichment

# Temporarily append the 41 to test
for item in NEW_41_TRANSLATIONS:
    VIBEVOICE_PASSAGE_TRANSLATIONS.append({
        "match": item["match"],
        "full_english": item["full_english"],
        "sentences": item["sentences"],
    })
    SENTENCE_CULTURAL_NOTES.append(item["cultural"])

# Test L277 (maguru)
shona_maguru = "Chikafu chakaiswa mundiro. Chimwe chinoratidza kuti maguru emombe akabikwa zvineunyanzvi akaibva zvakanaka sezvo ane muto wakatsvukira unoratidza kuti wakaiswa madomasi nehanyanisi. Arimundiro yesimbi inemupendero mutema . Parutivi rwendiro iyi pane mhiripiri yakanyorwa kunzi jikichiri."
enrichment = build_deterministic_enrichment(shona_maguru, lesson_number=277)

print("Enrichment test for L277:")
print("English translation:", enrichment.english_translation)
print("Dialogue sentences count:", len(enrichment.dialogue))
print("First dialogue line:", enrichment.dialogue[0].shona, "->", enrichment.dialogue[0].english)
print("Grammar notes count:", len(enrichment.grammar_notes))
print("Cultural note title:", enrichment.cultural_notes[0].title)
print("Cultural note content:", enrichment.cultural_notes[0].content[:120])
print("Exercises count:", len(enrichment.active_exercises))
