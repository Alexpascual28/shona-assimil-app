import json

with open("scratch/test_enriched_course.json", "r", encoding="utf-8") as f:
    lessons = json.load(f)["lessons"]

review_lessons = [l for l in lessons if l["lesson_number"] % 7 == 0 and l["lesson_number"] >= 251]
for rl in review_lessons:
    num = rl["lesson_number"]
    print(f"--- Lesson {num} (Review) ---")
    print(f"type: {rl.get('type')}, reviewed_lessons: {rl.get('reviewed_lessons')}")
    print(f"has review_summary: {'review_summary' in rl and bool(rl['review_summary'])}")
    print(f"has review_exercises: {'review_exercises' in rl and len(rl.get('review_exercises', [])) > 0}")
