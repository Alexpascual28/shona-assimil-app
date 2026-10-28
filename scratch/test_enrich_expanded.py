import os, json, subprocess

src = os.path.expandvars(r"%APPDATA%\shona-assimil-app\course_data_expanded.json")
test_out = r"scratch/test_enriched_course.json"

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
    d = json.load(f)
lessons = d["lessons"]
bad_trans = sum(1 for l in lessons if (l.get("english_translation") or "").strip().lower() == (l.get("shona_text") or "").strip().lower())
boilerplate = sum(1 for l in lessons if any("In everyday life in Zimbabwe, descriptive narratives like" in str(c.get("content", "")) for c in l.get("cultural_notes", [])))

print(f"VERIFICATION: Total lessons: {len(lessons)}")
print(f"Bad translations: {bad_trans}")
print(f"Boilerplate cultural notes: {boilerplate}")

# Check sample lesson (e.g. L277)
l277 = next(l for l in lessons if l["lesson_number"] == 277)
print("L277 English:", l277["english_translation"])
print("L277 Dialogue sentences:", len(l277["dialogue"]))
print("L277 Cultural note:", l277["cultural_notes"][0]["title"], "->", l277["cultural_notes"][0]["content"][:80])
