"""Gemini Linguistic Enrichment with Disk Caching (pipeline/.cache/) & Authentic Zezuru Mock Generator."""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
from pathlib import Path
from typing import Any

import numpy as np

from ingest import compute_word_metrics, normalize_and_write_wav
from models import (
    ActiveExercise,
    Lesson,
    LessonEnrichment,
    LiteralGlossItem,
    NormalizedClip,
    ReviewEnrichment,
)

logger = logging.getLogger("shona_pipeline.enrich")


# Authentic Zezuru (Harare Standard) Noun Class Prefix & Concord Reference Table
ZEZURU_PREFIX_RULES: list[tuple[str, str, str, str]] = [
    ("ndinofungidzira", "ndi- (1sg) + -no- (pres.) + -fungidzir- (suspect/think) + -a", "1st Person Sg Subject Concord (ndi-)", "I think / suspect"),
    ("ndakazvitakura", "nda- (1sg past) + -ka- + -zvi- (Cl. 8 refl) + -takur- (carry) + -a", "1st Person Sg Past + Reflexive (-zvi-)", "I am pregnant (lit. I carried myself)"),
    ("ndingadawo", "ndi- (1sg) + -nga- (potential) + -d- (want) + -a + -wo (polite)", "1st Person Sg Potential Concord (ndinga-)", "I would also like"),
    ("ndingadewo", "ndi- (1sg) + -nga- (potential) + -d- (want) + -e + -wo (polite)", "1st Person Sg Potential Subjunctive (ndingade)", "I would politely like"),
    ("ndirikunzwa", "ndi- (1sg) + -ri (copula) + ku- (Cl. 15 inf) + -nzw- (feel/hear) + -a", "1st Person Sg Progressive (ndiri ku-)", "I am feeling / hearing"),
    ("ndino", "ndi- (1sg subj) + -no- (pres. hab.)", "1st Person Sg Subject Concord (ndi-)", "I habitually"),
    ("ndiri", "ndi- (1sg subj) + -ri (copula)", "1st Person Sg Copulative Concord (ndi-)", "I am"),
    ("ndicha", "ndi- (1sg subj) + -cha- (future)", "1st Person Sg Future Concord (ndicha-)", "I will"),
    ("ndaka", "ndi- (1sg subj) + -ka- (remote past)", "1st Person Sg Past Concord (ndaka-)", "I did"),
    ("nda", "nda- (1sg recent past)", "1st Person Sg Recent Past Concord (nda-)", "I have"),
    ("handi", "ha- (neg) + ndi- (1sg subj)", "1st Person Sg Negative Concord (handi-)", "I do not"),
    ("uno", "u- (2sg subj) + -no- (pres. hab.)", "2nd Person Sg Subject Concord (u-)", "you habitually"),
    ("uri", "u- (2sg subj) + -ri (copula)", "2nd Person Sg Copulative Concord (uri)", "you are"),
    ("waka", "wa- (2sg/Cl.1 past) + -ka-", "2nd Person Sg / Class 1 Past Concord (waka-)", "you / he / she did"),
    ("ma", "ma- (2pl/hon subj past)", "2nd Person Plural / Honorific Subject Concord (ma-)", "you (resp.) have"),
    ("tino", "ti- (1pl subj) + -no- (pres. hab.)", "1st Person Plural Subject Concord (ti-)", "we habitually"),
    ("taka", "ta- (1pl past) + -ka-", "1st Person Plural Past Concord (taka-)", "we did"),
    ("tiri", "ti- (1pl subj) + -ri (copula)", "1st Person Plural Copulative Concord (tiri)", "we are"),
    ("vano", "va- (Cl. 2 subj) + -no- (pres. hab.)", "Class 2 (va-) Subject Concord (zvivakashure)", "they / elders habitually"),
    ("vaka", "va- (Cl. 2 subj) + -ka- (remote past)", "Class 2 (va-) Past Subject Concord", "they did"),
    ("vari", "va- (Cl. 2 subj) + -ri (copula)", "Class 2 (va-) Copulative Concord", "they are"),
    ("ano", "a- (Cl. 1 subj) + -no- (pres. hab.)", "Class 1 (mu-) 3sg Subject Concord (a-)", "he/she habitually"),
    ("aka", "a- (Cl. 1 subj) + -ka- (remote past)", "Class 1 (mu-) 3sg Past Concord (aka-)", "he/she did"),
    ("ari", "a- (Cl. 1 subj) + -ri (copula)", "Class 1 (mu-) 3sg Copulative Concord (ari)", "he/she is"),
    ("iri", "i- (Cl. 9 subj) + -ri (copula)", "Mupanda 9 (i-) Copulative Concord (iri)", "it (Cl. 9) is"),
    ("ino", "i- (Cl. 9 subj) + -no- (pres.)", "Mupanda 9 (i-) Subject Concord (ino-)", "it (Cl. 9) habitually"),
    ("yaka", "ya- (Cl. 9 past) + -ka-", "Mupanda 9 (i-) Past Concord (yaka-)", "it (Cl. 9) did"),
    ("rino", "ri- (Cl. 5 subj) + -no-", "Mupanda 5 (ri-) Subject Concord (rino-)", "it (Cl. 5) habitually"),
    ("riri", "ri- (Cl. 5 subj) + -ri", "Mupanda 5 (ri-) Copulative Concord (riri)", "it (Cl. 5) is"),
    ("rwu", "rwu- (Cl. 11 subj)", "Mupanda 11 (ru-) Subject Concord (rwu-)", "it (Cl. 11) is"),
    ("zvi", "zvi- (Cl. 8 plural prefix / concord)", "Mupanda 8 Plural Prefix & Concord (zvi-)", "things / manner"),
    ("zvaka", "zva- (Cl. 8) + -ka- (stative)", "Mupanda 8 Adverbial/Stative Concord (zvaka-)", "in a manner that is"),
    ("chi", "chi- (Cl. 7 noun prefix / concord)", "Mupanda 7 Prefix & Concord (chi-)", "thing / short action"),
    ("mu", "mu- (Cl. 1 / Cl. 3 / Cl. 18 prefix)", "Mupanda 1/3/18 Prefix (mu-)", "person / singular / inside"),
    ("va", "va- (Cl. 2 plural / honorific prefix)", "Mupanda 2 Prefix (va-)", "people / elders"),
    ("ku", "ku- (Cl. 15 infinitive / Cl. 17 locative)", "Mupanda 15/17 Prefix (ku-)", "to (infinitive) / towards"),
    ("pa", "pa- (Cl. 16 locative prefix)", "Mupanda 16 Locative Prefix (pa-)", "at / on (specific point)"),
    ("ne", "ne- (associative/instrumental prefix)", "Associative / Conjunctive Prefix (ne-)", "with / and / by"),
]

ZEZURU_CORE_LEXICON: dict[str, tuple[str, str, str, str]] = {
    "mangwanani": ("ma- (Cl. 6) + -ngwanani (morning)", "Mupanda 6 (ma-) Temporal Noun", "good morning / mornings", "L-L-H-L"),
    "masikati": ("ma- (Cl. 6) + -sikati (daytime)", "Mupanda 6 (ma-) Temporal Noun", "good afternoon / midday", "L-H-H-L"),
    "manheru": ("ma- (Cl. 6) + -nheru (evening)", "Mupanda 6 (ma-) Temporal Noun", "good evening", "L-H-L"),
    "makadii": ("ma- (2pl hon) + -ka- + -dii (be how)", "2nd Person Plural Honorific Concord (ma-)", "how are you (respectful)", "L-L-H"),
    "tiripo": ("ti- (1pl) + -ri- (be) + -po (Cl. 16 loc)", "1st Person Plural + Class 16 Enclitic (-po)", "we are well / here", "L-H-L"),
    "makadiiwo": ("ma- (2pl) + -ka- + -dii + -wo (also)", "Honorific Concord + Enclitic (-wo)", "and how are you too", "L-L-H-L"),
    "ndatenda": ("nda- (1sg recent past) + -tend- (thank) + -a", "1st Person Sg Past Concord (nda-)", "I have thanked / thank you", "L-H-L"),
    "maita": ("ma- (2pl) + -it- (do) + -a", "Honorific Concord (ma-)", "you have done (thank you)", "L-H-L"),
    "basa": ("Ø- (Cl. 5) + -basa (work)", "Mupanda 5 (ri-/ma-) Noun", "work / service", "H-L"),
    "zvakanaka": ("zvi- (Cl. 8) + -aka- (stative) + -nak- (be good) + -a", "Mupanda 8 Subject Concord (zva-)", "very well / it is good", "L-L-H-L"),
    "mwana": ("mu- (Cl. 1) + -ana (child)", "Mupanda 1 (mu-) Noun", "child", "L-H"),
    "vana": ("va- (Cl. 2) + -ana (children)", "Mupanda 2 (va-) Noun", "children", "L-H"),
    "mhuri": ("N- (Cl. 9) + -huri (family)", "Mupanda 9 (i-/dzi-) Noun", "family", "L-H"),
    "musha": ("mu- (Cl. 3) + -sha (home)", "Mupanda 3 (mu-/mi-) Noun", "home / village", "L-H"),
    "mvura": ("N- (Cl. 9) + -vura (water/rain)", "Mupanda 9 (i-) Noun", "water / rain", "H-L"),
    "sadza": ("Ø- (Cl. 5) + -sadza (thick maize porridge)", "Mupanda 5 (ri-) Noun", "staple maize meal", "L-H"),
    "chikoro": ("chi- (Cl. 7) + -koro (school)", "Mupanda 7 (chi-/zvi-) Noun", "school", "L-H-L"),
    "chishona": ("chi- (Cl. 7) + -Shona", "Mupanda 7 Language Prefix (chi-)", "Shona language / culture", "L-H-L"),
    "harare": ("Ø- (Cl. 1a/17) + Harare", "Proper Locative Noun (Cl. 17)", "in Harare", "L-H-L"),
    "huyai": ("huya (come) + -i (2pl imperative)", "2nd Person Plural Imperative Suffix (-i)", "come (plural / respectful)", "L-H-L"),
    "kuno": ("ku- (Cl. 17) + -no (proximal dem)", "Mupanda 17 Proximal Locative (kuno)", "here / this way", "H-L"),
    "nekukasira": ("ne- (with) + ku- (Cl. 15 inf) + -kasir- (hurry) + -a", "Associative + Mupanda 15 Infinitive (neku-)", "quickly / in a hurry", "L-L-H-H-L"),
    "makorokoto": ("ma- (Cl. 6) + -korokoto (congratulations)", "Mupanda 6 Plural Exclamation (ma-)", "congratulations", "L-L-H-H-L"),
    "amai": ("a- (Cl. 1a hon) + -mai (mother)", "Mupanda 1a/2a Honorific Kinship Noun", "mother (respectful)", "L-H-H"),
    "baba": ("Ø- (Cl. 1a) + -baba (father)", "Mupanda 1a/2a Honorific Kinship Noun", "father (respectful)", "L-H"),
    "mbuya": ("Ø- (Cl. 1a) + -mbuya (grandmother)", "Mupanda 1a/2a Honorific Kinship Noun", "grandmother / respected elder woman", "L-H"),
    "sekuru": ("Ø- (Cl. 1a) + -sekuru (grandfather/uncle)", "Mupanda 1a/2a Honorific Kinship Noun", "grandfather / maternal uncle", "L-H-L"),
    "mota": ("N- (Cl. 9) + -mota (motorcar)", "Mupanda 9 (i-/dzi-) Loan Noun", "car / automobile", "H-L"),
    "imbwa": ("N- (Cl. 9) + -mbwa (dog)", "Mupanda 9 (i-/dzi-) Animal Noun", "dog", "L-H"),
    "nyama": ("N- (Cl. 9) + -nyama (meat)", "Mupanda 9 (i-/dzi-) Mass Noun", "meat", "H-L"),
    "rwizi": ("ru- (Cl. 11) + -izi (river)", "Mupanda 11 (ru-) Labialized Prefix (rw-)", "river", "L-H"),
    "rwendo": ("ru- (Cl. 11) + -endo (journey)", "Mupanda 11 (ru-) Labialized Prefix (rw-)", "journey / trip", "L-H"),
    "mhepo": ("N- (Cl. 9) + -hepo (wind/breeze)", "Mupanda 9 (i-/dzi-) Natural Noun", "wind / air", "L-H"),
    "chiremba": ("chi- (Cl. 7) + -remba (doctor/healer)", "Mupanda 7/1a Title Noun", "doctor / physician", "L-H-L"),
    "mushonga": ("mu- (Cl. 3) + -shonga (medicine)", "Mupanda 3 (mu-/mi-) Noun", "medicine / remedy", "L-H-L"),
    "nhumbu": ("N- (Cl. 9) + -humbu (pregnancy/stomach)", "Mupanda 9 (i-/dzi-) Noun", "pregnancy / womb", "L-H"),
    "musoro": ("mu- (Cl. 3) + -soro (head)", "Mupanda 3 (mu-/mi-) Body Part Noun", "head", "L-H-L"),
    "makumbo": ("ma- (Cl. 6) + -gumbo (legs)", "Mupanda 6 Plural of Cl. 5 (gumbo)", "legs / feet", "L-H-L"),
}

LIVE_HF_ENGLISH_TRANSLATIONS: dict[str, str] = {
    "huyai kuno nekukasira!": "Come here quickly!",
    "takatenga hupfu, shuga, mafuta, nemuriwo.": "We bought maize meal, sugar, cooking oil, and vegetables.",
    'akadanidzira achiti, "batai mbavha iyo!"': 'He shouted saying, "Catch that thief!"',
    'amai vakati, "chiuya kuno undibatsire."': 'Mother said, "Come here now and help me."',
    "unofunga kuti mvura ichanaya here mangwana?": "Do you think it will rain tomorrow?",
    'vakuru vanoti, "chara chimwe hachitswanyi inda."': 'The elders say, "One finger cannot crush a louse."',
    "nyama iyi yakaoma chaizvo pakubikwa kwayo.": "This meat became very tough when it was cooked.",
    "kwedu kune makomo marefu anonakidza kuona.": "At our home region there are tall mountains that are lovely to see.",
    "ugosvika pano manhero kuti tigozodya tese.": "Be sure to arrive here in the evening so that we can eat together.",
    "ndeipi mota yaunoda kutenga, tsvuku kana nhema?": "Which car do you want to buy, the red one or the black one?",
    "mvura iri kunaya zvakanyanya kunze uko nhasi.": "It is raining heavily outside there today.",
    "makorokoto nekubudirira kwenyu!": "Congratulations on your success!",
    "imbwa iri kuhukura panze pamwe pane chayaoona.": "The dog is barking outside; perhaps there is something it has seen.",
    "vhara musuwo zvakasimba kana uchibuda mumba.": "Close the door firmly when you leave the house.",
    "rwendo rwacho rwakareba asi tichasvika hedu.": "The journey itself is long, but we will eventually arrive.",
    "rima munda wako zvakanaka kuti uwane goho guru.": "Cultivate your field well so that you obtain a bountiful harvest.",
    "mwana ari kuchema mumba nokuti arumwa nenyuchi.": "The child is crying in the house because he was stung by a bee.",
    "svika kumba nenguva nhasi tisati tadya manheru.": "Arrive home on time today before we eat dinner.",
    "ndinoda kudya sadza neusavi hwakanaka nhasi.": "I want to eat sadza with delicious relish today.",
    "dzoka kumusha nekukurumidza kana wapedza basa.": "Return home quickly when you finish work.",
    "gore rino kuchange kuine gohwo rakanaka, handiti?": "This year there will be a good harvest, isn't that so?",
    "makorokoto, wabudirira!": "Congratulations, you have succeeded!",
    "nekuda kwekushanda nesimba, akawana mubayiro.": "Because of working hard, he received a reward.",
    "baba vakaenda kuharare, asi vachadzoka mangwana.": "Father went to Harare, but he will return tomorrow.",
    "mudzidzisi akati tiunze mabhuku edu mangwana.": "The teacher told us to bring our books tomorrow.",
    "mbuya vangu, avo vanogara kumusha, vanorima nzungu.": "My grandmother, who lives in the rural home, farms groundnuts.",
    "mhepo yakavhuvhuta nesimba, miti ikazununguka.": "The wind blew strongly, and the trees swayed.",
    "kunyangwe zvainetsa, akakwanisa kupedza chikoro.": "Even though it was difficult, she managed to finish school.",
    "mvura yanaya nhasi, saka tinofanira kunonoka kuenda kumunda.": "It has rained today, so we should delay going to the field.",
}


def infer_english_from_gloss(shona_text: str, gloss: list[LiteralGlossItem]) -> str:
    """Produces a clean, natural English translation for live HF sentences when offline."""
    lower = shona_text.strip().lower()
    if lower in LIVE_HF_ENGLISH_TRANSLATIONS:
        return LIVE_HF_ENGLISH_TRANSLATIONS[lower]

    # Healthcare / maternal dialogue patterns from Zambezi_ECHO_v1
    if "ndakazvitakura" in lower or "nhumbu" in lower:
        if "makumbo" in lower or "kuzvimba" in lower:
            return "I am pregnant and my legs have been swelling lately; what could be causing this and how can I be helped?"
        if "musoro" in lower or "kutema" in lower:
            return "My head is aching severely during my pregnancy and is not getting better; what medicine can I safely take?"
        if "kurutsa" in lower:
            return "I am pregnant and vomiting constantly; I am worried and would like advice on what to do."
        if "kusununguka" in lower:
            return "My due date for delivery is approaching; I would like to know what signs to watch for before going to the clinic."
        if "zvekudya" in lower:
            return "I would like to know which nutritious foods are recommended for expectant mothers."
        if "mudumbu" in lower or "kurwadza" in lower:
            return "I am pregnant and have been feeling abdominal pain; should I visit the clinic for an examination?"
        return f"Expectant mother's health inquiry in Zezuru: '{shona_text[:80]}'"

    if "mwana wangu" in lower:
        if "kupisa muviri" in lower:
            return "My young child has had a high fever since yesterday; I would like to know how I can help bring the temperature down."
        if "kufema" in lower:
            return "My child is not breathing well and is breathing through the mouth; what urgent care is needed?"
        return f"Parent's pediatric inquiry in Zezuru: '{shona_text[:80]}'"

    if "chiremba" in lower or "mushonga" in lower or "madzimai" in lower:
        return f"Community health consultation in Zezuru: '{shona_text[:80]}'"

    gloss_words = [g.literal_english for g in gloss[:8]]
    return f"Zezuru utterance ({' / '.join(gloss_words)})"


# Curated 60-sentence Zezuru Assimil progression (used in --mock mode and reference enrichment)
CURATED_ZEZURU_SYLLABUS: list[dict[str, Any]] = [
    # Lessons 1-6 (Short greetings & copulatives - inzwi-shona-sample style, 2.2s - 3.6s)
    {"shona": "Mangwanani akanaka.", "en": "Good morning.", "src": "nigeLbasa/inzwi-shona-sample", "dur": 2.2, "cult": "In Harare Zezuru culture, morning greetings ('Mangwanani') are exchanged before any conversation or transaction begins."},
    {"shona": "Masikati, makadii henyu?", "en": "Good afternoon, how are you?", "src": "nigeLbasa/inzwi-shona-sample", "dur": 2.6, "cult": "Using the plural possessive 'henyu' with 'makadii' shows hunhu/ubuntu respect even when addressing a single adult."},
    {"shona": "Tiripo makadiiwo.", "en": "We are well, if you are well too.", "src": "nigeLbasa/inzwi-shona-sample", "dur": 2.4, "cult": "The classic Zezuru reciprocal response literally means 'We exist here if you also exist well', emphasizing communal well-being."},
    {"shona": "Maita basa zvakanaka.", "en": "Thank you very much.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 2.7, "cult": "'Maita basa' (literally 'you have done work') is the standard everyday expression of gratitude across Mashonaland."},
    {"shona": "Ndinonzi Tendai.", "en": "My name is Tendai.", "src": "nigeLbasa/inzwi-shona-sample", "dur": 2.5, "cult": "The passive verb '-nzi' (to be called) paired with 1sg 'ndino-' is the universal way to introduce oneself."},
    {"shona": "Ndinogara muHarare.", "en": "I live in Harare.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 2.9, "cult": "Class 18 locative prefix 'mu-' attaches directly to city or building names to denote 'inside'."},
    # Lessons 8-13 (Basic requests, family, noun classes 1/2 & 7/8, 3.0s - 4.8s)
    {"shona": "Ndinoda kunwa mvura.", "en": "I want to drink water.", "src": "nigeLbasa/inzwi-shona-sample", "dur": 3.1, "cult": "Offering water ('mvura', Class 9) to a visitor is the first gesture of hospitality in a Shona household."},
    {"shona": "Mwana uyu anofara kwazvo.", "en": "This child is very happy.", "src": "nigeLbasa/inzwi-shona-sample", "dur": 3.5, "cult": "Demonstrates Class 1 alliterative concord: 'mwana' (mu-) governs the demonstrative 'uyu' and subject concord 'a-'."},
    {"shona": "Vana vari kuenda kuchikoro.", "en": "The children are going to school.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 3.8, "cult": "Class 2 plural 'vana' triggers the progressive copula 'vari' + Class 15 infinitive 'kuenda'."},
    {"shona": " Baba vari kurima mumunda.", "en": "Father is farming in the field.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 4.0, "cult": "Kinship terms in Class 1a ('baba', 'amai') always take Class 2 honorific plural concords ('vari') out of respect."},
    {"shona": "Amai vanobika sadza nemuriwo.", "en": "Mother cooks sadza and vegetables.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 4.2, "cult": "'Sadza nemuriwo' (maize meal with leafy greens) is the foundational evening meal in Zimbabwean homes."},
    {"shona": "Chikafu ichi chinonaka chaizvo.", "en": "This food tastes very delicious.", "src": "nigeLbasa/inzwi-shona-sample", "dur": 4.4, "cult": "Praising the host's cooking with Class 7 concords ('chikafu ichi chinonaka') is customary table etiquette."},
    # Lessons 15-20 (Market, travel, time & Class 5/6, 4.5s - 6.8s)
    {"shona": "Chinhu ichi chinodhura here?", "en": "Is this thing expensive?", "src": "manassehzw/sna-manasseh-150-raw", "dur": 4.6, "cult": "The interrogative particle 'here' at the end of a declarative clause turns it into a yes/no question with raised penultimate tone."},
    {"shona": "Zvinhu izvi zvachipa pamusika.", "en": "These things are cheap at the market.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 5.0, "cult": "Open-air markets ('pamusika', Class 16 'pa-') like Mbare Musika are central to fresh produce trade in Harare."},
    {"shona": " Tichaenda kumusha mangwana mangwanani.", "en": "We will go to the rural home tomorrow morning.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 5.4, "cult": "'Kumusha' refers to one's ancestral rural homestead, maintaining deep ties even for urban Harare residents."},
    {"shona": "Bhazi rinoenda kwaMutare riri kupi?", "en": "Where is the bus that goes to Mutare?", "src": "manassehzw/sna-manasseh-150-raw", "dur": 5.8, "cult": "Borrowed nouns like 'bhazi' enter Class 5 (ri-/ma-), governing the relative concord 'rino-' and copulative 'riri'."},
    {"shona": "Ndabva kubasa manheru ano.", "en": "I have come from work this evening.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 5.9, "cult": "Class 17 'ku-' marks source/origin with verbs of motion like '-bva' (come from: 'kubva kubasa')."},
    {"shona": "Mhuri yedu inogara murunyararo.", "en": "Our family lives in peace.", "src": "manassehzw/sna-manasseh-150-raw", "dur": 6.2, "cult": "Class 9 noun 'mhuri' governs the possessive concord 'ye-' ('yedu') and habitual concord 'ino-'."},
    # Lessons 22-27 (Past narratives, weather, applied/causative extensions, 6.5s - 9.5s)
    {"shona": "Nezuro kwakanaya mvura zhinji kwazvo muHarare.", "en": "Yesterday it rained heavily in Harare.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 6.8, "cult": "Rainfall ('mvura') is celebrated in Zimbabwe's agricultural calendar; Class 17 'kwa-' serves as weather expletive concord."},
    {"shona": "Sekuru vakatiudza ngano dzinonakidza паchoto.", "en": "Grandfather told us interesting folktales by the hearth.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 7.4, "cult": "Evening folktales ('ngano', Class 10) told by elders ('sekuru'/'ambuya') transmit moral values to youth."},
    {"shona": " Mukoma wangu anoshandira kambani huru mudhorobha.", "en": "My older brother works for a large company in town.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 7.8, "cult": "The applied verbal extension '-ir-' ('-shandira', work for) adds a beneficiary or purpose object to the verb."},
    {"shona": "Tinofanira kudzidzisa vana vedu kutaura ChiShona chakanaka.", "en": "We must teach our children to speak good Shona.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 8.5, "cult": "The causative extension '-is-' turns '-dzidza' (learn) into '-dzidzisa' (cause to learn / teach)."},
    {"shona": "Vakomana nevasikana vari kubatsirana kutsvaira pachivanze.", "en": "The boys and girls are helping each other sweep the yard.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 8.9, "cult": "The reciprocal extension '-an-' ('-batsirana', help one another) reflects collective household chores."},
    {"shona": "Kana ukaenda kumusika unonditengerawo michero mitete.", "en": "If you go to the market, please buy fresh fruit for me too.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 9.3, "cult": "Combines the conditional 'kana uka-' with object concord '-ndi-' + applied '-er-' + polite enclitic '-wo'."},
    # Lessons 29-34 (Intermediate conversational Zezuru - Zambezi_ECHO_v1 style, 9.5s - 13.0s)
    {"shona": "Mazuva ano vanhu vazhinji vari kushandisa nharembozha kutumira mari kumusha.", "en": "Nowadays many people are using mobile phones to send money to the rural home.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 10.2, "cult": "Coined Zezuru neologism 'nharembozha' (mobile phone) illustrates productive Class 9 compounding."},
    {"shona": " Murimi akangwara anodyara mbeu dzake mvura isati yatanga kunaya.", "en": "A wise farmer plants his seeds before the rain starts falling.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 10.8, "cult": "Illustrates the negative participial 'isati yatanga' ('before it has started') governed by Class 9 'mvura'."},
    {"shona": " Vabereki vanofara zvikuru kana vana vavo vakabudirira pabvunzo dzekuchikoro.", "en": "Parents rejoice greatly when their children succeed in school examinations.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 11.4, "cult": "Education is deeply prized across Zimbabwe; 'kubudirira' (to succeed/emerge for) uses a double applied extension."},
    {"shona": " Chiremba akarayira murwere kuti anwe mushonga wake katatu pazuva.", "en": "The doctor advised the patient to take his medicine three times a day.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 11.9, "cult": "Subjunctive mood ('kuti anwe', that he drink) shifts the final vowel of the verb from '-a' to '-e'."},
    {"shona": " Patakasvika pamusha pevavakidzani vedu, takatambirwa nemaoko maviri.", "en": "When we arrived at our neighbors' home, we were welcomed with open arms.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 12.4, "cult": "Idiomatic Zezuru expression 'kutambirwa nemaoko maviri' (received with two hands) signifies warm hospitality and passive voice '-w-'."},
    {"shona": " Kunyangwe zvazvo rurimi rweChiShona ruchitaurwa nematunhu akasiyana, tinonzwanana zvakanaka.", "en": "Although the Shona language is spoken across different regions, we understand one another well.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 13.0, "cult": "Class 11 'rurimi' (tongue/language) governs the participial concord 'ruchi-'; Zezuru serves as the mutually intelligible bridge."},
    # Lessons 36-41 (Complex clauses, proverbs, relative clauses, 13.2s - 16.5s)
    {"shona": " Vakuru vedu vanoti chara chimwe hachitswanyi inda, saka tinofanira kushanda pamwe chete.", "en": "Our elders say one finger cannot crush a louse, so we must work together.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 13.6, "cult": "Classic Zezuru proverb ('tsumo'): 'Chara chimwe hachitswanyi inda' teaches that community cooperation is essential."},
    {"shona": " Munhu wese anoremekedza tsika nemagariro emumatunhu ake anorarama upenyu hune chiremerera.", "en": "Everyone who respects the traditions and way of life of their community lives a dignified life.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 14.2, "cult": "Class 14 abstract noun 'upenyu' (life) governs the associative concord 'hune' (which has) + Class 7 'chiremerera' (dignity)."},
    {"shona": " Mauto emvura akaparadza zambuko diki raiyambuka rwizi rwaiva pedyo nemusha wedu.", "en": "Floodwaters destroyed the small bridge that crossed the river that was near our village.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 14.8, "cult": "Demonstrates Class 5 ('zambuko rai-') and Class 11 ('rwizi rwa-') past habitual/relative concords."},
    {"shona": " Hurumende iri kuvaka migwagwa mitsva kuitira kuti vatengi nevashambadzi vafambe nyore.", "en": "The government is building new roads so that buyers and traders may travel easily.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 15.3, "cult": "Purpose clause 'kuitira kuti ... vafambe' combines applied infinitive with Class 2 subjunctive."},
    {"shona": " Kana tichichengetedza masango nemiti yedu, tinodzivirira kukukurwa kwevhu nemvura.", "en": "When we conserve our forests and trees, we prevent the erosion of soil by rain.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 15.9, "cult": "Environmental stewardship is deeply tied to traditional land management; 'kukukurwa kwevhu' uses Class 15 passive verbal noun."},
    {"shona": " Musangano wevadzidzisi nevabereki wakakomekedza kukosha kwekuraira vana vachiri vadiki.", "en": "The meeting of teachers and parents emphasized the importance of guiding children while they are still young.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 16.4, "cult": "Echoes the proverb 'akweva sanzu akweva nemashizha aro'; 'vachiri vadiki' shows persistive aspect '-chi-ri'."},
    # Lessons 43-48 (Pre-Active Wave mastery: nuanced discourse & aspect, 16.8s - 19.8s)
    {"shona": " Vaenzi vakabva kure vakashamiswa nekunaka kwakaita makomo nemapani emunyika medu.", "en": "The visitors who came from afar were amazed by the beauty of the mountains and plains in our country.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 17.0, "cult": "Class 16/17/18 complex locative 'emunyika medu' (possessive 'e-' + locative 'mu-' + agreement 'medu')."},
    {"shona": " Musikana uya aive nehunhu hwakanaka akasarudzwa kutungamirira sangano revechidiki.", "en": "That young woman who had good character was chosen to lead the youth organization.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 17.5, "cult": "'Hunhu' (Class 14) is the moral cornerstone of Zezuru society, governing the concord 'hwa-' in 'hwakanaka'."},
    {"shona": " Kunyange hazvo Zuva rakanga rapisa masikati ese, mhepo inotonhorera yakavhuvhuta manheru.", "en": "Even though the sun had been hot all afternoon, a cool breeze blew in the evening.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 18.1, "cult": "Pluperfect compound tense 'rakanga rapisa' (Class 5 'zuva') contrasts with simple past 'yakavhuvhuta' (Class 9 'mhepo')."},
    {"shona": " Vanamazvikokota vezveutano vanokurudzira kuti vanhu vadye chikafu chine utano mazuva ese.", "en": "Health specialists encourage people to eat nutritious food every day.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 18.6, "cult": "Compound Class 2a noun 'vanamazvikokota' (experts/specialists) takes standard Class 2 concords."},
    {"shona": " Paakapedza zvidzidzo zvake payunivhesiti, akatanga bhizimisi rekugadzira midziyo yemumba.", "en": "When he finished his studies at university, he started a business making household furniture.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 19.2, "cult": "Temporal prefix 'pa-' ('paakapedza', when he finished) is one of the most frequent narrative connectors in Zezuru."},
    {"shona": " Nziyo dzekare dzaimbwa nemadzitateguru edu dzichiri kutidzidzisa ruzivo rwakadzama nhasi.", "en": "Traditional songs that were sung by our ancestors still teach us deep wisdom today.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 19.8, "cult": "Class 6 honorific plural 'madzitateguru' (ancestors) and Class 11 'ruzivo' (knowledge) with persistive 'dzichiri'."},
    # Lessons 50-55 & 57-60 (Active Wave Phase: rich Zezuru monologues & dialogues, 20.2s - 25.0s)
    {"shona": " Nhasi tave kupinda muchikamu chechipiri chekudzidza kwedu uko tichashandisa ChiShona chakanaka mukutaura nekunyora.", "en": "Today we are entering the second phase of our learning where we will actively use good Shona in speaking and writing.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 20.4, "cult": "Marks Lesson 50 — the start of the Assimil Active Wave (Second Wave), pairing new listening with active production of Lesson 1."},
    {"shona": " Kudzidza mutauro mutsva kunoda moyo murefu nekudzokorora zvidzidzo zuva nezuva pasina куneta.", "en": "Learning a new language requires patience and repeating lessons day by day without getting tired.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 20.9, "cult": "Idiomatic Class 3 phrase 'moyo murefu' (literally 'a long heart') means patience and perseverance."},
    {"shona": " Vatungamiriri vemunharaunda vakakoka vagari vese padare kuti vazeye nyaya dzebudiriro yemusha.", "en": "Community leaders invited all residents to the village council to deliberate on village development matters.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 21.5, "cult": "The traditional 'dare' (Class 5 council meeting place) remains a respected forum for consensus decision-making."},
    {"shona": " Mukadzi wese wechidiki kana wechikuru ane kodzero yekuita mabasa aanoshuvira muupenyu hwake.", "en": "Every young or older woman has the right to pursue the work she aspires to in her life.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 22.0, "cult": "Relative object clause 'mabasa aanoshuvira' (Class 6 antecedent with Class 1 relative subject concord 'aano-')."},
    {"shona": " Vaimbi vekuZimbabwe vanoridza mbira dzavadzimu nengoma dzinoita kuti vanhu vafarire tsika dzavo.", "en": "Zimbabwean musicians play the ancestral mbira and drums that make people appreciate their culture.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 22.6, "cult": "'Mbira dzavadzimu' is the iconic sacred lamellaphone of the Zezuru people, recognized by UNESCO as intangible heritage."},
    {"shona": " Kana tikabatana semhuri imwe chete, hapana dambudziko ratisingakwanisi kukunda munguva inotevera.", "en": "If we unite as one family, there is no problem that we cannot overcome in the coming time.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 23.2, "cult": "Negative relative potential clause 'ratisingakwanisi' (Class 5 'dambudziko' + negative '-si-nga-' + '-kwanisi')."},
    {"shona": " Rwendo rwedu rwekudzidza Zezuru ruri kuramba ruchifambira mberi sezvo tave kunzwisisa mipanda yemazita yese.", "en": "Our journey of learning Zezuru keeps moving forward as we now understand all the noun classes.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 23.8, "cult": "'Mipanda yemazita' (Class 4) is the indigenous grammatical term for the 21 Shona noun classes."},
    {"shona": " Vanhu vanokoshesa kuchengetedza rurimi rwaamai vanopa nhaka isingaperi kuchizvarwa chinotevera.", "en": "People who value preserving the mother tongue give an everlasting heritage to the next generation.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 24.3, "cult": "'Nhaka isingaperi' (Class 9 noun + negative participial relative 'isingaperi', unending inheritance)."},
    {"shona": " Tinokukorokotedzai nemoyo wese nekuti masvika padanho repamusoro rekutaura ChiShona cheZezuru nemazvo.", "en": "We congratulate you wholeheartedly because you have reached an advanced level of speaking Zezuru Shona accurately.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 24.8, "cult": "'Tinokukorokotedzai' embeds 1pl subject 'ti-' + present '-no-' + 2pl object '-ku-...-i' on the verb '-korokotedza' (congratulate)."},
    {"shona": " Rambai muchishingaira mukudzidzira matauriro echizvarwa chemuHarare kusvikira mava nyanzvi dzemutauro uyu.", "en": "Keep striving in practicing native Harare pronunciation until you become experts of this language.", "src": "tarirozw/Zambezi_ECHO_v1", "dur": 25.2, "cult": "Imperative plural 'Rambai muchishingaira' closes the initial 60-lesson cycle with encouragement toward full fluency."},
]


def synthesize_speech_like_wav(
    shona_text: str, duration_seconds: float, target_path: Path, sr: int = 16000
) -> float:
    """Generates a deterministic, pleasant speech-cadence harmonic waveform for --mock mode."""
    total_samples = max(int(2.1 * sr), int(duration_seconds * sr))
    t = np.linspace(0.0, total_samples / float(sr), total_samples, dtype=np.float32)

    words = shona_text.split()
    num_syllables = max(3, sum(max(1, len(re.findall(r"[aeiouAEIOU]", w))) for w in words))

    # Fundamental frequency contour simulating Zezuru High/Low tone melody (125Hz - 175Hz)
    seed = int(hashlib.sha256(shona_text.encode("utf-8")).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    f0_base = 135.0 + (seed % 25)
    tone_mod = 18.0 * np.sin(2.0 * np.pi * (num_syllables / (duration_seconds * 2.0)) * t)
    phase = 2.0 * np.pi * np.cumsum(f0_base + tone_mod) / float(sr)

    # Rich vowel-like harmonics + syllable envelope
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


def build_gloss_for_sentence(shona_text: str) -> list[LiteralGlossItem]:
    """Builds a detailed word-by-word Zezuru morphological breakdown when offline or in mock mode."""
    raw_words = [w.strip(".,?!:;\"'()") for w in shona_text.split() if w.strip(".,?!:;\"'()")]
    gloss_items: list[LiteralGlossItem] = []

    for word in raw_words:
        lower = word.lower()
        if lower in ZEZURU_CORE_LEXICON:
            morph, nclass, lit, tone = ZEZURU_CORE_LEXICON[lower]
            gloss_items.append(
                LiteralGlossItem(
                    shona_word=word,
                    morpheme_breakdown=morph,
                    noun_class_or_concord=nclass,
                    literal_english=lit,
                    tone_pattern=tone,
                )
            )
            continue

        matched_rule = None
        for prefix, morph_prefix, concord_desc, lit_prefix in ZEZURU_PREFIX_RULES:
            if lower.startswith(prefix) and len(lower) > len(prefix) + 1:
                stem = lower[len(prefix) :]
                matched_rule = (
                    f"{morph_prefix} + -{stem} (stem)",
                    concord_desc,
                    f"{lit_prefix} [{stem}]",
                )
                break

        syllable_count = max(1, len(re.findall(r"[aeiou]", lower)))
        tone_str = "-".join("H" if i % 2 == 0 else "L" for i in range(min(4, syllable_count)))

        if matched_rule:
            morph, nclass, lit = matched_rule
        else:
            morph = f"Ø- (Cl. 5/9) + -{lower} (root)"
            nclass = "Mupanda 5/9 Nominal or Verbal Stem"
            lit = lower

        gloss_items.append(
            LiteralGlossItem(
                shona_word=word,
                morpheme_breakdown=morph,
                noun_class_or_concord=nclass,
                literal_english=lit,
                tone_pattern=tone_str or "L-H",
            )
        )
    return gloss_items


def build_deterministic_enrichment(
    shona_text: str,
    english_hint: str | None = None,
    cultural_hint: str | None = None,
) -> LessonEnrichment:
    """Constructs a complete, schema-validated Zezuru LessonEnrichment (used by --mock or offline fallback)."""
    curated_by_shona = {item["shona"].strip().lower(): item for item in CURATED_ZEZURU_SYLLABUS}
    matched_curated = curated_by_shona.get(shona_text.strip().lower())

    gloss = build_gloss_for_sentence(shona_text)

    english_translation = (
        english_hint
        or (matched_curated["en"] if matched_curated else None)
        or infer_english_from_gloss(shona_text, gloss)
    )
    cultural_notes = (
        cultural_hint
        or (matched_curated["cult"] if matched_curated else None)
        or (
            "In Harare Zezuru standard speech, speakers maintain strict alliterative concord "
            "(zvivakashure) across noun classes while using respectful plural forms (hunhu)."
        )
    )

    # Extract words for exercises
    clean_words = [w.strip(".,?!:;\"'") for w in shona_text.split() if w.strip(".,?!:;\"'")]
    target_word = clean_words[-1] if clean_words else "zvakanaka"
    first_word = clean_words[0] if clean_words else "Mangwanani"
    blanked_sentence = re.sub(
        rf"\b{re.escape(target_word)}\b", "______", shona_text, count=1
    )
    if "______" not in blanked_sentence:
        blanked_sentence = f"{' '.join(clean_words[:-1])} ______."

    distractors = ["zvakanaka", "kwazvo", "kumusha", "muHarare", "mangwana"]
    options_ex1 = [target_word] + [d for d in distractors if d.lower() != target_word.lower()][:3]

    primary_concord = gloss[0].noun_class_or_concord if gloss else "Mupanda 1/2 Subject Concord"
    concord_options = [
        primary_concord,
        "Mupanda 14 Abstract Concord (hu-)",
        "Mupanda 11 Nominal Prefix (ru-)",
        "Mupanda 19 Diminutive Prefix (svi-)",
    ]
    # Deduplicate options while preserving order
    concord_options = list(dict.fromkeys(concord_options))[:4]

    translation_options = [
        english_translation,
        "We are going to the market tomorrow morning.",
        "The children are learning to speak good Shona at school.",
        "Good morning, how did you sleep at home?",
    ]
    translation_options = list(dict.fromkeys(translation_options))[:4]
    while len(translation_options) < 3:
        translation_options.append("Thank you very much for your work.")

    grammar_notes = [
        f"Concordial Agreement (Zvivakashure): Notice how '{first_word}' establishes the noun class/subject frame ({primary_concord}).",
        f"Agglutinative Morphology: '{target_word}' combines prefixal/suffixal morphemes ({gloss[-1].morpheme_breakdown if gloss else target_word}) with tone contour {gloss[-1].tone_pattern if gloss else 'L-H'}.",
        "Penultimate Lengthening: In Zezuru declarative sentences, the second-to-last syllable of the phrase carries natural vowel lengthening.",
    ]

    exercises = [
        ActiveExercise(
            exercise_type="fill_in_the_blank",
            prompt=f"Complete the Zezuru sentence: '{blanked_sentence}' ({english_translation})",
            options=options_ex1,
            correct_answer=target_word,
            explanation=f"'{target_word}' completes the clause with the proper Zezuru lexical and tonal pattern.",
        ),
        ActiveExercise(
            exercise_type="concord_agreement",
            prompt=f"Which Zezuru noun class or concord (chivakashure) governs '{first_word}' in '{shona_text}'?",
            options=concord_options,
            correct_answer=primary_concord,
            explanation=f"'{first_word}' operates under {primary_concord} in Central Shona (Harare standard).",
        ),
        ActiveExercise(
            exercise_type="translation",
            prompt=f"Select the most natural English translation for: '{shona_text}'",
            options=translation_options,
            correct_answer=english_translation,
            explanation=f"'{shona_text}' translates idiomatically as '{english_translation}'.",
        ),
    ]

    return LessonEnrichment(
        english_translation=english_translation,
        literal_gloss=gloss,
        grammar_notes=grammar_notes,
        cultural_notes=cultural_notes,
        active_exercises=exercises,
    )


def build_deterministic_review(preceding_lessons: list[Lesson], review_num: int) -> ReviewEnrichment:
    """Synthesizes a 6-exercise comprehensive review from the preceding 6 regular lessons."""
    lesson_nums = [l.lesson_number for l in preceding_lessons]
    sample_texts = [l.shona_text or "" for l in preceding_lessons if l.shona_text]
    classes_seen: list[str] = []
    for l in preceding_lessons:
        for g in l.literal_gloss:
            if g.noun_class_or_concord and g.noun_class_or_concord not in classes_seen:
                classes_seen.append(g.noun_class_or_concord)
    if not classes_seen:
        classes_seen = [
            "Mupanda 1/2 (mu-/va-) Personal Nouns",
            "Mupanda 7/8 (chi-/zvi-) Artifacts & Languages",
            "Mupanda 16/17/18 (pa-/ku-/mu-) Locatives",
        ]

    review_summary = (
        f"Comprehensive Review (Chidzidzo {review_num}) consolidates Lessons "
        f"{', '.join(map(str, lesson_nums))}. Key structures mastered in this block include "
        f"Zezuru alliterative subject/object concords (zvivakashure), agglutinative tense/aspect markers "
        f"(-no- habitual, -ka- past, -cha- future), and high/low tone patterns across: "
        f"{'; '.join(classes_seen[:4])}. Example utterances reviewed: "
        + " | ".join(f'"{t}"' for t in sample_texts[:3])
    )

    collected_exercises: list[ActiveExercise] = []
    for l in preceding_lessons:
        if l.active_exercises:
            collected_exercises.append(l.active_exercises[0])
    for l in preceding_lessons:
        if len(collected_exercises) >= 6:
            break
        if len(l.active_exercises) > 1:
            collected_exercises.append(l.active_exercises[1])

    while len(collected_exercises) < 6:
        collected_exercises.append(
            ActiveExercise(
                exercise_type="concord_agreement",
                prompt="In Zezuru Shona, which plural prefix pairs with Mupanda 1 (mu-) for human nouns?",
                options=["va- (Mupanda 2)", "mi- (Mupanda 4)", "ma- (Mupanda 6)", "zvi- (Mupanda 8)"],
                correct_answer="va- (Mupanda 2)",
                explanation="Human nouns in Class 1 (e.g., mwana, munhu) take Class 2 'va-' in the plural (vana, vanhu).",
            )
        )

    return ReviewEnrichment(
        review_summary=review_summary,
        key_noun_classes_covered=classes_seen[:6],
        review_exercises=collected_exercises[:6],
    )


class GeminiEnricher:
    """Enriches lessons via google-genai with Pydantic validation and audio-hash disk caching."""

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

    def _lesson_cache_file(self, clip_id: str) -> Path:
        return self.lessons_cache_dir / f"{clip_id}.json"

    def _review_cache_file(self, preceding_clip_ids: list[str], lesson_number: int) -> Path:
        joined = f"review_{lesson_number}::" + "_".join(preceding_clip_ids)
        digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()[:16]
        return self.reviews_cache_dir / f"review_{lesson_number}_{digest}.json"

    def enrich_regular_lesson(self, lesson: Lesson, mock: bool = False) -> Lesson:
        """Populates translation, literal_gloss, grammar_notes, cultural_notes, and 3 active_exercises."""
        clip_id = lesson.clip_id or hashlib.sha256(
            (lesson.shona_text or "").encode("utf-8")
        ).hexdigest()[:16]
        cache_file = self._lesson_cache_file(clip_id)

        # 1. Check disk cache by audio/clip hash first
        if cache_file.exists():
            try:
                cached = LessonEnrichment.model_validate_json(
                    cache_file.read_text(encoding="utf-8")
                )
                return self._apply_lesson_enrichment(lesson, cached)
            except Exception as exc:
                logger.debug("Cache miss/corrupt for %s: %s", clip_id, exc)

        # 2. If not mock and Gemini client is available, call Gemini structured output
        enrichment: LessonEnrichment | None = None
        if not mock and self._client is not None and lesson.shona_text:
            try:
                from google.genai import types

                prompt = (
                    "You are an expert professor of Central Shona (Zezuru dialect - Harare standard) "
                    "creating an Assimil-style language lesson.\n"
                    f"Analyze the following Zezuru sentence (Lesson {lesson.lesson_number}):\n"
                    f'"{lesson.shona_text}"\n\n'
                    "Provide:\n"
                    "1. `english_translation`: Natural idiomatic English translation.\n"
                    "2. `literal_gloss`: Word-by-word breakdown showing morphemes, Zezuru noun classes (mipanda yemazita 1-21) "
                    "and concords (zvivakashure), literal English meaning, and High/Low tone pattern (e.g. L-H-L).\n"
                    "3. `grammar_notes`: 3 concise bullet notes explaining the noun classes, concords, and verbal extensions present.\n"
                    "4. `cultural_notes`: Relevant Zimbabwean / Harare Zezuru cultural context (hunhu/ubuntu, register, etiquette).\n"
                    "5. `active_exercises`: Exactly 3 exercises (one 'fill_in_the_blank', one 'concord_agreement', one 'translation') "
                    "with 4 options each and a clear linguistic explanation."
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
                logger.warning(
                    "Gemini enrichment fallback for clip %s: %s", clip_id, exc
                )

        if enrichment is None:
            enrichment = build_deterministic_enrichment(lesson.shona_text or "")

        # Persist to disk cache by clip_id
        cache_file.write_text(enrichment.model_dump_json(indent=2), encoding="utf-8")
        return self._apply_lesson_enrichment(lesson, enrichment)

    def enrich_review_lesson(
        self,
        review_lesson: Lesson,
        preceding_lessons: list[Lesson],
        mock: bool = False,
    ) -> Lesson:
        """Synthesizes review_summary and 6 review_exercises for every 7th Review Lesson."""
        preceding_ids = [
            l.clip_id or str(l.lesson_number) for l in preceding_lessons
        ]
        cache_file = self._review_cache_file(preceding_ids, review_lesson.lesson_number)

        if cache_file.exists():
            try:
                cached = ReviewEnrichment.model_validate_json(
                    cache_file.read_text(encoding="utf-8")
                )
                return self._apply_review_enrichment(review_lesson, cached)
            except Exception:
                pass

        review_enrichment: ReviewEnrichment | None = None
        if not mock and self._client is not None and preceding_lessons:
            try:
                from google.genai import types

                digest_lines = "\n".join(
                    f"- Lesson {l.lesson_number}: '{l.shona_text}' -> '{l.english_translation}'"
                    for l in preceding_lessons
                )
                prompt = (
                    "You are an expert professor of Central Shona (Zezuru - Harare standard) "
                    f"writing Assimil Review Lesson {review_lesson.lesson_number}.\n"
                    "Synthesize the preceding 6 lessons:\n"
                    f"{digest_lines}\n\n"
                    "Generate:\n"
                    "1. `review_summary`: Comprehensive grammatical summary covering the noun classes (mipanda), "
                    "concords (zvivakashure), and tone patterns encountered across these 6 lessons.\n"
                    "2. `key_noun_classes_covered`: List of the primary Shona noun classes practiced.\n"
                    "3. `review_exercises`: Exactly 6 varied exercises ('fill_in_the_blank', 'concord_agreement', 'translation') "
                    "testing the learner's mastery of these 6 lessons."
                )
                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ReviewEnrichment,
                        temperature=0.2,
                    ),
                )
                review_enrichment = ReviewEnrichment.model_validate_json(response.text)
            except Exception as exc:
                logger.warning(
                    "Gemini review enrichment fallback for lesson %d: %s",
                    review_lesson.lesson_number,
                    exc,
                )

        if review_enrichment is None:
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
        """Enriches all regular lessons first, then synthesizes every 7th review lesson."""
        for idx, lesson in enumerate(lessons):
            if lesson.type == "regular":
                # Skip if already enriched (e.g., from --append existing lessons)
                if lesson.english_translation and lesson.literal_gloss and lesson.active_exercises:
                    continue
                lessons[idx] = self.enrich_regular_lesson(lesson, mock=mock)

        for idx, lesson in enumerate(lessons):
            if lesson.type == "review":
                if lesson.review_summary and len(lesson.review_exercises) == 6:
                    continue
                preceding = [
                    l
                    for l in lessons[max(0, idx - 6) : idx]
                    if l.type == "regular"
                ]
                lessons[idx] = self.enrich_review_lesson(
                    lesson, preceding, mock=mock
                )

        return lessons

    @staticmethod
    def _apply_lesson_enrichment(
        lesson: Lesson, enrichment: LessonEnrichment
    ) -> Lesson:
        lesson.english_translation = enrichment.english_translation
        lesson.literal_gloss = enrichment.literal_gloss
        lesson.grammar_notes = enrichment.grammar_notes
        lesson.cultural_notes = enrichment.cultural_notes
        lesson.active_exercises = enrichment.active_exercises
        return lesson

    @staticmethod
    def _apply_review_enrichment(
        lesson: Lesson, enrichment: ReviewEnrichment
    ) -> Lesson:
        lesson.review_summary = enrichment.review_summary
        lesson.key_noun_classes_covered = enrichment.key_noun_classes_covered
        lesson.review_exercises = enrichment.review_exercises
        # Also populate grammar_notes & cultural_notes for UI components expecting uniform fields
        lesson.shona_text = lesson.shona_text or "Dzokororo: Mipanda Yemazita neZvivakashure (Comprehensive Review)"
        lesson.english_translation = (
            lesson.english_translation
            or f"Comprehensive Review of Lessons {', '.join(map(str, lesson.reviewed_lessons))}"
        )
        lesson.grammar_notes = enrichment.key_noun_classes_covered
        lesson.cultural_notes = enrichment.review_summary
        lesson.active_exercises = enrichment.review_exercises[:3]
        return lesson


def generate_mock_clips(
    audio_output_dir: Path, count: int = 55, target_sr: int = 16000
) -> list[NormalizedClip]:
    """Generates `count` realistic Zezuru NormalizedClips and writes normalized .wav files for --mock mode."""
    audio_output_dir.mkdir(parents=True, exist_ok=True)
    clips: list[NormalizedClip] = []

    for i in range(count):
        template = CURATED_ZEZURU_SYLLABUS[i % len(CURATED_ZEZURU_SYLLABUS)]
        shona_text = template["shona"]
        if i >= len(CURATED_ZEZURU_SYLLABUS):
            shona_text = f"{shona_text} (Chidzidzo {i + 1})"

        word_count, avg_len = compute_word_metrics(shona_text)
        clip_id = hashlib.sha256(
            f"mock::{i}::{shona_text.lower()}".encode("utf-8")
        ).hexdigest()[:16]
        audio_filename = f"clip_{clip_id}.wav"
        wav_path = audio_output_dir / audio_filename

        duration_sec = synthesize_speech_like_wav(
            shona_text=shona_text,
            duration_seconds=float(template["dur"]),
            target_path=wav_path,
            sr=target_sr,
        )

        clips.append(
            NormalizedClip(
                clip_id=clip_id,
                source_dataset=template["src"],
                audio_filename=audio_filename,
                audio_path=f"/audio/{audio_filename}",
                duration_seconds=duration_sec,
                shona_text=shona_text,
                word_count=word_count,
                avg_word_length=avg_len,
                dialect="Zezuru",
                dialect_confidence=0.98,
                code_switching_ratio=0.0,
            )
        )

    return clips
