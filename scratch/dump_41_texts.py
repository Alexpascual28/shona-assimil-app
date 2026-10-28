import json, os

p = os.path.expandvars(r'%APPDATA%\shona-assimil-app\course_data_expanded.json')
with open(p, 'r', encoding='utf-8') as f:
    d = json.load(f)

lessons = d['lessons']
bad = [l for l in lessons if (l.get('english_translation') or '').strip().lower() == (l.get('shona_text') or '').strip().lower()]
print(f'Found {len(bad)} bad lessons:')
for i, l in enumerate(bad):
    print(f"--- [{i+1}] Lesson {l['lesson_number']} (clip: {l['clip_id']}) ---")
    print(f"Shona: {l['shona_text']}")
