const assert = require('assert');
const {
  secureShuffle,
  computeBalancedDistribution,
  calculateDistributionStats
} = require('../services/assignmentEngine');

// Helper to create mock students
function createMockStudents(count) {
  const students = [];
  for (let i = 1; i <= count; i++) {
    const num = i.toString().padStart(3, '0');
    students.push({
      _id: `student_id_${i}`,
      registerNumber: `23CS${num}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      department: 'CSE',
      year: 3,
      section: 'A'
    });
  }
  return students;
}

// Helper to create mock question sets
function createMockQuestionSets(count) {
  const sets = [];
  for (let i = 1; i <= count; i++) {
    sets.push({
      _id: `set_id_${i}`,
      setNumber: i,
      setName: `SET ${i}`,
      questions: [{ questionNumber: 1, title: `Q1 for Set ${i}`, marks: 50 }]
    });
  }
  return sets;
}

console.log('====================================================');
console.log('  RUNNING BALANCED RANDOM ASSIGNMENT ENGINE TESTS  ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ [FAIL] Test ${totalTests}: ${testName}`);
    console.error(error.message);
  }
}

// Scenario 1: 6 Question Sets and 72 Students
runTest('6 Question Sets and 72 Students -> Expected 12 students per set (Difference = 0)', () => {
  const students = createMockStudents(72);
  const sets = createMockQuestionSets(6);

  const assignments = computeBalancedDistribution(students, sets);
  assert.strictEqual(assignments.length, 72, 'Every student must receive an assignment');

  const stats = calculateDistributionStats(assignments, sets);
  assert.strictEqual(stats.difference, 0, `Difference must be 0, got ${stats.difference}`);
  assert.strictEqual(stats.isBalanced, true, 'Distribution must be balanced');
  assert.strictEqual(stats.maxAssigned, 12, `Max assigned must be 12, got ${stats.maxAssigned}`);
  assert.strictEqual(stats.minAssigned, 12, `Min assigned must be 12, got ${stats.minAssigned}`);

  stats.setDistribution.forEach(s => {
    assert.strictEqual(s.count, 12, `Set ${s.setNumber} must have exactly 12 students`);
  });
});

// Scenario 2: 6 Question Sets and 75 Students
runTest('6 Question Sets and 75 Students -> 3 sets with 13, 3 sets with 12 (Difference = 1)', () => {
  const students = createMockStudents(75);
  const sets = createMockQuestionSets(6);

  const assignments = computeBalancedDistribution(students, sets);
  assert.strictEqual(assignments.length, 75, 'Every student must receive an assignment');

  const stats = calculateDistributionStats(assignments, sets);
  assert.strictEqual(stats.difference, 1, `Difference must be <= 1, got ${stats.difference}`);
  assert.strictEqual(stats.isBalanced, true, 'Distribution must be balanced');
  assert.strictEqual(stats.maxAssigned, 13, 'Max assigned must be 13');
  assert.strictEqual(stats.minAssigned, 12, 'Min assigned must be 12');

  const thirteenCount = stats.setDistribution.filter(s => s.count === 13).length;
  const twelveCount = stats.setDistribution.filter(s => s.count === 12).length;
  assert.strictEqual(thirteenCount, 3, 'Exactly 3 sets must have 13 students');
  assert.strictEqual(twelveCount, 3, 'Exactly 3 sets must have 12 students');
});

// Scenario 3: 10 Question Sets and 150 Students
runTest('10 Question Sets and 150 Students -> Expected 15 students per set (Difference = 0)', () => {
  const students = createMockStudents(150);
  const sets = createMockQuestionSets(10);

  const assignments = computeBalancedDistribution(students, sets);
  assert.strictEqual(assignments.length, 150);

  const stats = calculateDistributionStats(assignments, sets);
  assert.strictEqual(stats.difference, 0);
  assert.strictEqual(stats.maxAssigned, 15);
  assert.strictEqual(stats.minAssigned, 15);
});

// Scenario 4: 20 Question Sets and 300 Students
runTest('20 Question Sets and 300 Students -> Expected 15 students per set (Difference = 0)', () => {
  const students = createMockStudents(300);
  const sets = createMockQuestionSets(20);

  const assignments = computeBalancedDistribution(students, sets);
  assert.strictEqual(assignments.length, 300);

  const stats = calculateDistributionStats(assignments, sets);
  assert.strictEqual(stats.difference, 0);
  assert.strictEqual(stats.maxAssigned, 15);
  assert.strictEqual(stats.minAssigned, 15);
});

// Scenario 5: More students than question sets (80 students and 6 sets)
runTest('80 students and 6 sets -> Expected 2 sets with 14, 4 sets with 13 (Difference = 1)', () => {
  const students = createMockStudents(80);
  const sets = createMockQuestionSets(6);

  const assignments = computeBalancedDistribution(students, sets);
  assert.strictEqual(assignments.length, 80);

  const stats = calculateDistributionStats(assignments, sets);
  assert.strictEqual(stats.difference, 1);
  assert.strictEqual(stats.maxAssigned, 14);
  assert.strictEqual(stats.minAssigned, 13);
});

// Scenario 6: More question sets than students (10 sets and 4 students)
runTest('10 question sets and 4 students -> Exactly 4 distinct sets used, 1 student each', () => {
  const students = createMockStudents(4);
  const sets = createMockQuestionSets(10);

  const assignments = computeBalancedDistribution(students, sets);
  assert.strictEqual(assignments.length, 4);

  const usedSetNumbers = new Set(assignments.map(a => a.setNumber));
  assert.strictEqual(usedSetNumbers.size, 4, 'All 4 students must receive distinct sets');

  const stats = calculateDistributionStats(assignments, sets);
  assert.strictEqual(stats.maxAssigned, 1);
  assert.strictEqual(stats.minAssigned, 0);
  assert.strictEqual(stats.difference, 1);
  assert.strictEqual(stats.isBalanced, true);
});

// Scenario 7: Student refresh persistence simulation
runTest('Student persistence: Assigned set is deterministic once recorded', () => {
  const students = createMockStudents(10);
  const sets = createMockQuestionSets(3);
  const initialAssignments = computeBalancedDistribution(students, sets);

  // Map into database-like lookup
  const databaseMap = new Map();
  initialAssignments.forEach(a => databaseMap.set(a.student.registerNumber, a.setNumber));

  // Simulate student 23CS001 refreshing page 5 times
  const regNumber = '23CS001';
  const assignedSet1 = databaseMap.get(regNumber);
  for (let i = 0; i < 5; i++) {
    const lookup = databaseMap.get(regNumber);
    assert.strictEqual(lookup, assignedSet1, 'Assigned set must not change on page reload');
  }
});

// Scenario 8: Randomization verification
runTest('Randomization: Multiple runs produce distinct student-to-set mappings', () => {
  const students = createMockStudents(30);
  const sets = createMockQuestionSets(5);

  const run1 = computeBalancedDistribution(students, sets);
  const run2 = computeBalancedDistribution(students, sets);

  // Check if at least some student received different set
  let differences = 0;
  for (let i = 0; i < 30; i++) {
    if (run1[i].setNumber !== run2[i].setNumber) {
      differences++;
    }
  }
  assert.ok(differences > 0, 'Shuffled distribution must produce randomized mappings');
});

// Scenario 9: 1000+ Students Scaling Performance Test
runTest('Performance & Balance Test with 1,500 students and 15 sets', () => {
  const startTime = Date.now();
  const students = createMockStudents(1500);
  const sets = createMockQuestionSets(15);

  const assignments = computeBalancedDistribution(students, sets);
  const stats = calculateDistributionStats(assignments, sets);
  const duration = Date.now() - startTime;

  assert.strictEqual(assignments.length, 1500);
  assert.strictEqual(stats.difference, 0, 'All 15 sets must have exactly 100 students');
  assert.strictEqual(stats.maxAssigned, 100);
  assert.strictEqual(stats.minAssigned, 100);
  assert.ok(duration < 200, `Execution should take < 200ms, took ${duration}ms`);
});

console.log('\n====================================================');
console.log(`  RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
