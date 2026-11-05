const http = require('http');
const assert = require('assert');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runEndToEndTests() {
  console.log('====================================================');
  console.log('       SMARTLAB FULL-STACK END-TO-END TESTS        ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] E2E ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] E2E ${total}: ${name}`);
      console.error(err);
    }
  }

  let facultyToken = null;
  let examId = null;
  let studentToken = null;
  let assignedSetNumberForStudent1 = null;

  // 1. Health check
  await test('Server Health Check (GET /api/health)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
  });

  // 2. Client Single-Page App delivery
  await test('Static Frontend Delivery (GET /)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/',
      method: 'GET'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.includes('SmartLab'), 'HTML contains SmartLab title');
  });

  // 3. Faculty Login
  await test('Faculty Login (POST /api/faculty/login)', async () => {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/faculty/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'faculty@smartlab.edu',
        password: 'Password@123'
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token, 'Token must be returned');
    facultyToken = res.body.token;
  });

  // 4. Dashboard Stats
  await test('Dashboard Stats Verification (GET /api/dashboard/stats)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.stats.totalStudents >= 72, 'Should have >= 72 seeded students');
    assert.ok(res.body.stats.totalSubjects >= 4, 'Should have >= 4 seeded subjects');
    assert.ok(res.body.stats.totalQuestionSets >= 6, 'Should have >= 6 seeded question sets');
  });

  // 5. Examinations Query
  await test('Examinations Query (GET /api/exams)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/exams',
      method: 'GET',
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.exams.length > 0, 'Must return seeded examination');
    // Find active exam with question sets
    const activeExam = res.body.exams.find(e => e.status === 'Active' && e.numQuestionSets > 0) || res.body.exams[0];
    examId = activeExam._id;
  });

  // 6. Question Sets Query
  await test('Question Sets Query (GET /api/question-sets/exam/:id)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/question-sets/exam/${examId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.questionSets.length, 6, 'Must return 6 question sets');
    res.body.questionSets.forEach((qs) => {
      assert.ok(qs.questions.length >= 3, 'Each set has questions');
    });
  });

  // 7. Balanced Assignments Distribution
  await test('Balanced Random Distribution Metrics (GET /api/assignments/distribution/:id)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/assignments/distribution/${examId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 200);
    const stats = res.body.stats;
    assert.strictEqual(stats.totalStudents, 72, '72 students assigned');
    assert.strictEqual(stats.difference, 0, 'Perfect balance: difference between max and min is 0');
    assert.strictEqual(stats.isBalanced, true);
    assert.strictEqual(stats.maxAssigned, 12);
    assert.strictEqual(stats.minAssigned, 12);
  });

  // 8. Student Login (23CS001)
  await test('Student Login (POST /api/students/login)', async () => {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/students/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        registerNumber: '23CS001',
        examId
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.student.registerNumber, '23CS001');
    assert.ok(res.body.assignedSet.setNumber >= 1 && res.body.assignedSet.setNumber <= 6);
    studentToken = res.body.token;
    assignedSetNumberForStudent1 = res.body.assignedSet.setNumber;
  });

  // 9. Student Access Assigned Question Set (GET /api/students/my-assignment)
  await test('Student View Only Assigned Question Set (GET /api/students/my-assignment)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/students/my-assignment',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.assignedSet.setNumber, assignedSetNumberForStudent1);
    assert.ok(res.body.assignedSet.questions.length >= 3, 'Questions are returned for student');
    assert.strictEqual(res.body.otherSets, undefined);
  });

  // 10. Student Refresh & Re-login Persistence Verification
  await test('Student Refresh Persistence: Always same set upon repeated access', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request({
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/students/my-assignment',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.body.assignedSet.setNumber, assignedSetNumberForStudent1);
    }
  });

  // 11. Student Activity Monitoring Check (GET /api/activity/:id)
  await test('Faculty Activity Monitoring (GET /api/activity/:id)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/activity/${examId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 200);
    const rec1 = res.body.records.find((r) => r.registerNumber === '23CS001');
    assert.ok(rec1, 'Student 23CS001 found in activity log');
    assert.strictEqual(rec1.hasLoggedIn, true, '23CS001 marked as logged in');
    assert.ok(rec1.accessCount >= 1, 'Access count tracked');
  });

  // 12. Security Test: Unauthorized access to faculty route by student token
  await test('Security: Student Token cannot access Faculty routes', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/exams',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 401, 'Student token must be rejected on faculty routes');
  });

  console.log('\n====================================================');
  console.log(`  E2E RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================\n');

  if (passed !== total) process.exit(1);
}

runEndToEndTests();
