# -*- coding: utf-8 -*-
import json, os

roaming_path = os.path.expandvars(r"%APPDATA%\shona-assimil-app\course_data_expanded.json")
public_course_path = r"app/public/course_data.json"
pool_path = r"app/public/expansion_pool.json"
dist_pool_path = r"app/dist/expansion_pool.json"

boilerplate_phrase = "In everyday life in Zimbabwe, descriptive narratives like"

datasets = [
    ("Roaming expanded course (300 lessons)", roaming_path),
    ("Public course (100 lessons)", public_course_path),
    ("Public expansion pool (340 clips)", pool_path),
    ("Dist expansion pool (340 clips)", dist_pool_path),
]

all_passed = True
for name, p in datasets:
    if not os.path.exists(p):
        print(f"[FAIL] {name}: file not found at {p}")
        all_passed = False
        continue

    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data if isinstance(data, list) else data.get("lessons", [])

    bad_trans = []
    boilerplate_items = []
    missing_dialogue = []
    missing_notes = []

    for idx, item in enumerate(items):
        shona = str(item.get("shona_text") or "").strip().lower()
        en = str(item.get("english_translation") or "").strip().lower()

        if (not en) or (en == shona):
            bad_trans.append((item.get("lesson_number", idx), item.get("clip_id"), shona[:40]))

        c_notes = item.get("cultural_notes", [])
        if any(boilerplate_phrase in str(c.get("content", "")) for c in c_notes):
            boilerplate_items.append((item.get("lesson_number", idx), item.get("clip_id")))

        if not item.get("dialogue"):
            missing_dialogue.append((item.get("lesson_number", idx), item.get("clip_id")))

        if not item.get("grammar_notes") or not item.get("cultural_notes"):
            missing_notes.append((item.get("lesson_number", idx), item.get("clip_id")))

    print(f"\nAuditing {name}:")
    print(f"  Total items: {len(items)}")
    print(f"  Bad translations (English == Shona or empty): {len(bad_trans)}")
    print(f"  Boilerplate cultural notes: {len(boilerplate_items)}")
    print(f"  Missing dialogue breakdowns: {len(missing_dialogue)}")
    print(f"  Missing grammar/cultural notes: {len(missing_notes)}")

    if bad_trans or boilerplate_items or missing_dialogue or missing_notes:
        all_passed = False
        print(f"  [ERROR] Audit failed for {name}!")
    else:
        print(f"  [PASS] 100% textbook quality, zero boilerplate, all valid!")

if all_passed:
    print("\n==========================================")
    print("ALL DATASETS PASSED COMPLETE VERIFICATION!")
    print("==========================================")
else:
    print("\n==========================================")
    print("VERIFICATION FAILED! SEE DETAILS ABOVE.")
    print("==========================================")
    exit(1)
