import { calculateFare, MINIMUM_FARE } from './utils/rideFareCalculator.js';

console.log('=== FARE CALCULATION TEST CASES ===\n');

// Test Case 1: Distance 0.5 km (500 meters) - Minimum fare applies
console.log('Test Case 1: Distance = 0.5 km (500 m)');
const test1 = calculateFare(500, 60);
console.log('  Base Fare:', test1.baseFare, '(Expected: 25)');
console.log('  Platform Fee:', test1.platformFee, '(Expected: 2.5)');
console.log('  Customer Share:', test1.customerShare, '(Expected: 1.25)');
console.log('  Rider Share:', test1.riderShare, '(Expected: 1.25)');
console.log('  Customer Pays:', test1.totalFare, '(Expected: 26.25)');
console.log('  Rider Receives:', test1.riderReceives, '(Expected: 23.75)');
const pass1 = test1.baseFare === 25 && test1.platformFee === 2.5 && test1.riderReceives === 23.75;
console.log('  PASS:', pass1);
console.log();

// Test Case 2: Distance 1 km (1000 meters), Rate 60/km
console.log('Test Case 2: Distance = 1 km (1000 m), Rate = 60/km');
const test2 = calculateFare(1000, 60);
console.log('  Base Fare:', test2.baseFare, '(Expected: 60)');
console.log('  Platform Fee:', test2.platformFee, '(Expected: 6)');
console.log('  Customer Share:', test2.customerShare, '(Expected: 3)');
console.log('  Rider Share:', test2.riderShare, '(Expected: 3)');
console.log('  Customer Pays:', test2.totalFare, '(Expected: 63)');
console.log('  Rider Receives:', test2.riderReceives, '(Expected: 57)');
const pass2 = test2.baseFare === 60 && test2.totalFare === 63 && test2.riderReceives === 57;
console.log('  PASS:', pass2);
console.log();

// Test Case 3: Distance 2 km (2000 meters), Rate 60/km
console.log('Test Case 3: Distance = 2 km (2000 m), Rate = 60/km');
const test3 = calculateFare(2000, 60);
console.log('  Base Fare:', test3.baseFare, '(Expected: 120)');
console.log('  Platform Fee:', test3.platformFee, '(Expected: 12)');
console.log('  Customer Share:', test3.customerShare, '(Expected: 6)');
console.log('  Rider Share:', test3.riderShare, '(Expected: 6)');
console.log('  Customer Pays:', test3.totalFare, '(Expected: 126)');
console.log('  Rider Receives:', test3.riderReceives, '(Expected: 114)');
const pass3 = test3.baseFare === 120 && test3.totalFare === 126 && test3.riderReceives === 114;
console.log('  PASS:', pass3);
console.log();

// Test Case 4: Distance 10 km (10000 meters), Rate 60/km
console.log('Test Case 4: Distance = 10 km (10000 m), Rate = 60/km');
const test4 = calculateFare(10000, 60);
console.log('  Base Fare:', test4.baseFare, '(Expected: 600)');
console.log('  Platform Fee:', test4.platformFee, '(Expected: 60)');
console.log('  Customer Share:', test4.customerShare, '(Expected: 30)');
console.log('  Rider Share:', test4.riderShare, '(Expected: 30)');
console.log('  Customer Pays:', test4.totalFare, '(Expected: 630)');
console.log('  Rider Receives:', test4.riderReceives, '(Expected: 570)');
const pass4 = test4.baseFare === 600 && test4.totalFare === 630 && test4.riderReceives === 570;
console.log('  PASS:', pass4);
console.log();

console.log('=== SUMMARY ===');
console.log('Test 1 (0.5 km):', pass1 ? 'PASS' : 'FAIL');
console.log('Test 2 (1 km):', pass2 ? 'PASS' : 'FAIL');
console.log('Test 3 (2 km):', pass3 ? 'PASS' : 'FAIL');
console.log('Test 4 (10 km):', pass4 ? 'PASS' : 'FAIL');
console.log('ALL TESTS:', (pass1 && pass2 && pass3 && pass4) ? 'PASSED' : 'FAILED');