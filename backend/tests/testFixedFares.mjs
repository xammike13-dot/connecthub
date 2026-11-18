import {
  calculateFixedFare,
  isRouteSupported,
  isNightRateInNairobi,
  normalizeArea,
  APPROVED_PICKUPS,
  APPROVED_DESTINATIONS,
} from '../utils/rideFareCalculator.js';

console.log('=== RUNNING OLAFASTA FIXED FARE TESTS ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Daytime Tests (options.isNight = false)
console.log('--- 1. Daytime Fare Matrix Tests ---');
const dayTests = [
  { pickup: 'Stage', dest: 'Around Stage', expected: 40 },
  { pickup: 'Stage', dest: 'Around Mabs', expected: 50 },
  { pickup: 'Stage', dest: 'Around Cheba', expected: 60 },
  { pickup: 'Stage', dest: 'Around Kesses', expected: 80 },
  { pickup: 'Mabs', dest: 'Around Mabs', expected: 40 },
  { pickup: 'Cheba', dest: 'Around Cheba', expected: 40 },
  { pickup: 'Kesses', dest: 'Around Kesses', expected: 40 },
  { pickup: 'Kesses', dest: 'Around Cheba', expected: 30 },
];

for (const t of dayTests) {
  const result = calculateFixedFare(t.pickup, t.dest, { isNight: false });
  assert(
    result.totalFare === t.expected && result.baseFare === t.expected && result.fareType === 'day' && result.nightSurcharge === 0,
    `${t.pickup} → ${t.dest} = KSh ${result.totalFare} (expected ${t.expected})`
  );
}

// 2. Reverse Route Tests (options.isNight = false)
console.log('\n--- 2. Reverse Route Tests (Bidirectional) ---');
const reverseTests = [
  { pickup: 'Around Stage', dest: 'Stage', expected: 40 },
  { pickup: 'Around Mabs', dest: 'Stage', expected: 50 },
  { pickup: 'Around Cheba', dest: 'Stage', expected: 60 },
  { pickup: 'Around Kesses', dest: 'Stage', expected: 80 },
  { pickup: 'Around Cheba', dest: 'Kesses', expected: 30 },
];

for (const t of reverseTests) {
  const result = calculateFixedFare(t.pickup, t.dest, { isNight: false });
  assert(
    result.totalFare === t.expected && result.fareType === 'day',
    `Reverse: ${t.pickup} → ${t.dest} = KSh ${result.totalFare} (expected ${t.expected})`
  );
}

// 3. Night Tests (options.isNight = true) -> +20 KSh
console.log('\n--- 3. Nighttime Fare Matrix Tests (+KSh 20) ---');
const nightTests = [
  { pickup: 'Stage', dest: 'Around Stage', expected: 60 },
  { pickup: 'Stage', dest: 'Around Mabs', expected: 70 },
  { pickup: 'Stage', dest: 'Around Cheba', expected: 80 },
  { pickup: 'Stage', dest: 'Around Kesses', expected: 100 },
  { pickup: 'Mabs', dest: 'Around Mabs', expected: 60 },
  { pickup: 'Cheba', dest: 'Around Cheba', expected: 60 },
  { pickup: 'Kesses', dest: 'Around Kesses', expected: 60 },
  { pickup: 'Kesses', dest: 'Around Cheba', expected: 50 },
  // Reverse night
  { pickup: 'Around Cheba', dest: 'Kesses', expected: 50 },
  { pickup: 'Around Mabs', dest: 'Stage', expected: 70 },
  { pickup: 'Around Cheba', dest: 'Stage', expected: 80 },
  { pickup: 'Around Kesses', dest: 'Stage', expected: 100 },
];

for (const t of nightTests) {
  const result = calculateFixedFare(t.pickup, t.dest, { isNight: true });
  assert(
    result.totalFare === t.expected && result.nightSurcharge === 20 && result.fareType === 'night',
    `Night: ${t.pickup} → ${t.dest} = KSh ${result.totalFare} (expected ${t.expected})`
  );
}

// 4. Timezone-based day/night calculation tests
console.log('\n--- 4. Africa/Nairobi Timezone Tests ---');
// 14:00 (2:00 PM Nairobi) -> Day
const dayDate = new Date('2026-11-18T11:00:00Z'); // 11:00 UTC = 14:00 Nairobi
const dayResult = calculateFixedFare('Stage', 'Around Cheba', { time: dayDate });
assert(dayResult.fareType === 'day' && dayResult.totalFare === 60, '14:00 EAT is daytime (KSh 60)');

// 21:00 (9:00 PM Nairobi) -> Night
const nightDate = new Date('2026-11-18T18:00:00Z'); // 18:00 UTC = 21:00 Nairobi
const nightResult = calculateFixedFare('Stage', 'Around Cheba', { time: nightDate });
assert(nightResult.fareType === 'night' && nightResult.totalFare === 80, '21:00 EAT is nighttime (KSh 80)');

// 04:30 (4:30 AM Nairobi) -> Night
const earlyNightDate = new Date('2026-11-18T01:30:00Z'); // 01:30 UTC = 04:30 Nairobi
const earlyNightResult = calculateFixedFare('Stage', 'Around Cheba', { time: earlyNightDate });
assert(earlyNightResult.fareType === 'night' && earlyNightResult.totalFare === 80, '04:30 EAT is nighttime (KSh 80)');

// 05:00 (5:00 AM Nairobi) -> Day
const earlyDayDate = new Date('2026-11-18T02:00:00Z'); // 02:00 UTC = 05:00 Nairobi
const earlyDayResult = calculateFixedFare('Stage', 'Around Cheba', { time: earlyDayDate });
assert(earlyDayResult.fareType === 'day' && earlyDayResult.totalFare === 60, '05:00 EAT is daytime (KSh 60)');

// 5. Unsupported routes rejection
console.log('\n--- 5. Unsupported Route Rejection ---');
assert(!isRouteSupported('Mabs', 'Around Cheba'), 'Mabs -> Around Cheba is unsupported');
assert(!isRouteSupported('Mabs', 'Around Kesses'), 'Mabs -> Around Kesses is unsupported');

try {
  calculateFixedFare('Mabs', 'Around Cheba');
  assert(false, 'Should throw on unsupported route Mabs -> Around Cheba');
} catch (e) {
  assert(true, `Correctly threw on unsupported route: ${e.message}`);
}

// 6. Return structure validation
console.log('\n--- 6. Return Structure Validation ---');
const sample = calculateFixedFare('Stage', 'Around Cheba', { isNight: false });
assert(sample.pickup === 'Stage', 'pickup is Stage');
assert(sample.destination === 'Around Cheba', 'destination is Around Cheba');
assert(sample.fareType === 'day', 'fareType is day');
assert(sample.baseFare === 60, 'baseFare is 60');
assert(sample.nightSurcharge === 0, 'nightSurcharge is 0');
assert(sample.totalFare === 60, 'totalFare is 60');
assert(sample.currency === 'KES', 'currency is KES');
assert(sample.isFixedFare === true, 'isFixedFare is true');

console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
