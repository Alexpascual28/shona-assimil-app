const fs = require('fs');
const path = require('path');

const expCoursePath = path.join(process.env.APPDATA, 'shona-assimil-app', 'course_data_expanded.json');
const currentCourse = JSON.parse(fs.readFileSync(expCoursePath, 'utf-8'));
console.log('Current course lessons count:', currentCourse.lessons.length);

const poolPath = path.join(__dirname, '../app/public/expansion_pool.json');
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
console.log('Current pool lessons count:', pool.length);

const existingIds = new Set(currentCourse.lessons.map(l => l.clip_id).filter(Boolean));
const existingTexts = new Set(currentCourse.lessons.map(l => String(l.shona_text || '').trim().toLowerCase()).filter(Boolean));

const available = pool.filter(l => !existingIds.has(l.clip_id) && !existingTexts.has(String(l.shona_text || '').trim().toLowerCase()));
console.log('Available clips for next batch (251-300):', available.length);

if (available.length < 50) {
  throw new Error(`Expected at least 50 available clips, got ${available.length}`);
}

console.log('✓ Next 50-lesson expansion batch (251-300) has ample reserve clips available:', available.length);
