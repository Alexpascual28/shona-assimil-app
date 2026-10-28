const fs = require('fs');
const path = require('path');

const appData = path.join(process.env.APPDATA, 'shona-assimil-app');
const expandedPath = path.join(appData, 'course_data_expanded.json');
const progressPath = path.join(appData, 'user_progress.json');

console.log('1. Checking AppData runtime cache:');
console.log('   - course_data_expanded.json exists:', fs.existsSync(expandedPath));
console.log('   - user_progress.json exists:', fs.existsSync(progressPath));

console.log('\n2. Checking Base Public Course:');
const coursePath = path.join(__dirname, '../app/public/course_data.json');
const course = JSON.parse(fs.readFileSync(coursePath, 'utf-8'));
console.log('   - Course total lessons:', course.lessons.length);
console.log('   - First lesson:', course.lessons[0].title, `(${course.lessons[0].duration_seconds}s)`);
console.log('   - Last lesson:', course.lessons[course.lessons.length - 1].title, `(${course.lessons[course.lessons.length - 1].duration_seconds}s)`);

console.log('\n3. Checking Reserve Pool:');
const poolPath = path.join(__dirname, '../app/public/expansion_pool.json');
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
console.log('   - Reserve pool items:', pool.length);

if (!fs.existsSync(expandedPath) && course.lessons.length === 100 && pool.length === 190) {
  console.log('\n[PASS] Clean reset verified! The application will load exactly 100 lessons and 190 reserve pool lessons.');
} else {
  console.error('\n[FAIL] Verification did not match expected clean state.');
  process.exit(1);
}
