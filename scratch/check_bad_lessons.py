import json, os

p = os.path.expandvars(r'%APPDATA%\shona-assimil-app\course_data_expanded.json')
with open(p, 'r', encoding='utf-8') as f:
    d = json.load(f)

lessons = d['lessons']
print(f'Total lessons: {len(lessons)}')
bad = [l for l in lessons if (l.get('english_translation') or '').strip().lower() == (l.get('shona_text') or '').strip().lower()]
print(f'Total bad lessons: {len(bad)}')
for i, l in enumerate(bad):
    print(f"{i+1}. L{l.get('lesson_number')} (clip: {l.get('clip_id')}, dur: {l.get('duration_seconds')}s): {l.get('shona_text')}")
