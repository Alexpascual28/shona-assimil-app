import os, json, subprocess

src = r"app/public/expansion_pool.json"
test_out = r"scratch/test_enriched_pool.json"

res = subprocess.run(
    ["python", "pipeline/enrich.py", "--enrich-file", src, "--output", test_out],
    capture_output=True,
    text=True,
    encoding="utf-8"
)
print("Return code:", res.returncode)
print("STDOUT:", res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)

with open(test_out, "r", encoding="utf-8") as f:
    pool = json.load(f)

bad_trans = sum(1 for l in pool if (l.get("english_translation") or "").strip().lower() == (l.get("shona_text") or "").strip().lower())
boilerplate = sum(1 for l in pool if any("In everyday life in Zimbabwe, descriptive narratives like" in str(c.get("content", "")) for c in l.get("cultural_notes", [])))

print(f"VERIFICATION: Total pool items: {len(pool)}")
print(f"Bad translations: {bad_trans}")
print(f"Boilerplate cultural notes: {boilerplate}")
