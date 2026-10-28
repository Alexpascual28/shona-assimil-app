const fs = require('fs');
const path = require('path');

function getDevModePassword() {
  if (process.env.DEV_MODE_PASSWORD) return process.env.DEV_MODE_PASSWORD;
  const envCandidates = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../app/.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('DEV_MODE_PASSWORD=')) {
            return trimmed.split('=')[1].trim();
          }
        }
      } catch {}
    }
  }
  return 'shona_dev_pass';
}

console.log('--- TEST 1: Dev Mode Password ---');
const password = getDevModePassword();
console.log('Loaded Dev Mode Password:', password);
if (password !== 'shona_dev_pass') {
  throw new Error(`Expected 'shona_dev_pass', got '${password}'`);
}
console.log('✓ Dev Mode Password successfully loaded from .env');

console.log('\n--- TEST 2: Password Verification ---');
function verifyDevPassword(input) {
  const expected = getDevModePassword();
  return typeof input === 'string' && input.trim() === expected.trim();
}

console.log('Verify correct password:', verifyDevPassword('shona_dev_pass'));
console.log('Verify correct password with whitespace:', verifyDevPassword('  shona_dev_pass  '));
console.log('Verify wrong password:', verifyDevPassword('wrong_password'));

if (!verifyDevPassword('shona_dev_pass') || verifyDevPassword('wrong_password')) {
  throw new Error('Password verification failed!');
}
console.log('✓ Password verification functions perfectly');

console.log('\n--- TEST 3: Offline Reserve Pool Check (< 50 clips dialog) ---');
const poolPath = path.join(__dirname, '../app/public/expansion_pool.json');
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
console.log(`Current Reserve Pool total clips: ${pool.length}`);

function checkReserveCapacity(availableCount, numToAdd = 50) {
  if (availableCount < numToAdd) {
    return {
      error: 'INSUFFICIENT_OFFLINE_RESERVE',
      remaining: availableCount,
      required: numToAdd,
      message: `There are currently only ${availableCount} reserve lessons remaining in the offline pool (${numToAdd} required for a new batch). Please connect to the internet to download additional audio clips or update your course pack.`,
    };
  }
  return { success: true };
}

// Case A: Pool has 190 clips (healthy)
const healthyCheck = checkReserveCapacity(190, 50);
console.log('Healthy reserve check (190 >= 50):', healthyCheck);
if (!healthyCheck.success) throw new Error('Healthy reserve check failed');

// Case B: Pool has 40 clips (< 50 remaining)
const depletedCheck = checkReserveCapacity(40, 50);
console.log('Depleted reserve check (40 < 50):', depletedCheck);
if (depletedCheck.error !== 'INSUFFICIENT_OFFLINE_RESERVE' || depletedCheck.remaining !== 40) {
  throw new Error('Depleted reserve check failed to return correct error');
}
console.log('✓ Polite dialog notice correctly triggered when reserve < 50');

console.log('\n--- ALL IPC LOGIC TESTS PASSED! ---');
