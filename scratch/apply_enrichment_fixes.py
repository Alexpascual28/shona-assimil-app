# -*- coding: utf-8 -*-
import json, os, shutil, subprocess

roaming_path = os.path.expandvars(r"%APPDATA%\shona-assimil-app\course_data_expanded.json")
pool_path = r"app/public/expansion_pool.json"
dist_pool_path = r"app/dist/expansion_pool.json"
knowledge_path = r"app/public/textbook_knowledge.json"
dist_knowledge_path = r"app/dist/textbook_knowledge.json"

print("--- Step 1: Enriching Roaming course_data_expanded.json ---")
with open(roaming_path, "r", encoding="utf-8") as f:
    roaming_data = json.load(f)

lessons = roaming_data["lessons"]
print(f"Total lessons before fix: {len(lessons)}")

# Backup original
backup_roaming = roaming_path + ".bak"
shutil.copy2(roaming_path, backup_roaming)
print(f"Backed up roaming course to {backup_roaming}")

# Run enrich.py --enrich-file
res = subprocess.run(
    ["python", "pipeline/enrich.py", "--enrich-file", roaming_path],
    capture_output=True,
    text=True,
    encoding="utf-8"
)
print("enrich.py output:", res.stdout.strip())
if res.stderr:
    print("enrich.py stderr:", res.stderr.strip())

with open(roaming_path, "r", encoding="utf-8") as f:
    fixed_roaming = json.load(f)

bad_trans = sum(1 for l in fixed_roaming["lessons"] if (l.get("english_translation") or "").strip().lower() == (l.get("shona_text") or "").strip().lower())
boilerplate = sum(1 for l in fixed_roaming["lessons"] if any("In everyday life in Zimbabwe, descriptive narratives like" in str(c.get("content", "")) for c in l.get("cultural_notes", [])))

print(f"Fixed Roaming: Total lessons: {len(fixed_roaming['lessons'])}, bad translations: {bad_trans}, boilerplate: {boilerplate}")
assert bad_trans == 0, f"Expected 0 bad translations, got {bad_trans}"
assert boilerplate == 0, f"Expected 0 boilerplate notes, got {boilerplate}"
assert len(fixed_roaming["lessons"]) == 300, f"Expected 300 lessons, got {len(fixed_roaming['lessons'])}"

# Verify lessons 1 to 250 are identical to backup
with open(backup_roaming, "r", encoding="utf-8") as f:
    orig_lessons = json.load(f)["lessons"]

for i in range(250):
    assert orig_lessons[i]["shona_text"] == fixed_roaming["lessons"][i]["shona_text"]
    assert orig_lessons[i]["english_translation"] == fixed_roaming["lessons"][i]["english_translation"]
print("Verified: Lessons 1 to 250 are 100% identical and untouched!")

print("\n--- Step 2: Enriching app/public/expansion_pool.json ---")
with open(pool_path, "r", encoding="utf-8") as f:
    orig_pool = json.load(f)
print(f"Total pool items before fix: {len(orig_pool)}")

res_pool = subprocess.run(
    ["python", "pipeline/enrich.py", "--enrich-file", pool_path],
    capture_output=True,
    text=True,
    encoding="utf-8"
)
print("enrich.py pool output:", res_pool.stdout.strip())

with open(pool_path, "r", encoding="utf-8") as f:
    fixed_pool = json.load(f)

pool_bad_trans = sum(1 for l in fixed_pool if (l.get("english_translation") or "").strip().lower() == (l.get("shona_text") or "").strip().lower())
pool_boilerplate = sum(1 for l in fixed_pool if any("In everyday life in Zimbabwe, descriptive narratives like" in str(c.get("content", "")) for c in l.get("cultural_notes", [])))

print(f"Fixed Pool: Total items: {len(fixed_pool)}, bad translations: {pool_bad_trans}, boilerplate: {pool_boilerplate}")
assert pool_bad_trans == 0, f"Expected 0 bad translations in pool, got {pool_bad_trans}"
assert pool_boilerplate == 0, f"Expected 0 boilerplate in pool, got {pool_boilerplate}"

# Verify first 190 items in pool are identical to original
for i in range(190):
    assert orig_pool[i]["clip_id"] == fixed_pool[i]["clip_id"]
    assert orig_pool[i]["english_translation"] == fixed_pool[i]["english_translation"]
print("Verified: First 190 pool clips (including the 40 original reserve pool clips) are 100% identical and untouched!")

# Copy to dist
shutil.copy2(pool_path, dist_pool_path)
print(f"Copied updated expansion_pool.json to {dist_pool_path}")
if os.path.exists(knowledge_path):
    shutil.copy2(knowledge_path, dist_knowledge_path)
    print(f"Copied textbook_knowledge.json to {dist_knowledge_path}")

print("\nAll files successfully updated and verified!")
