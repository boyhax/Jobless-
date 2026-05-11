/**
 * ProSync API Test Suite
 * Tests for job-alerts, messages/conversations, and profile endpoints
 */

const BASE_URL = 'http://localhost:3000/api';

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: number;
  statusText: string;
  success: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: string,
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    const result: TestResult = {
      name,
      endpoint,
      method,
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      data,
    };

    if (!response.ok) {
      result.error = data.error || 'Unknown error';
    }

    results.push(result);
    return result;
  } catch (error) {
    const result: TestResult = {
      name,
      endpoint,
      method,
      status: 0,
      statusText: 'Network Error',
      success: false,
      error: (error as Error).message,
    };
    results.push(result);
    return result;
  }
}

async function runTests() {
  console.log('🧪 Starting ProSync API Tests...\n');

  const adminUserId = 'users:admin_root';
  const testUserId = 'users:ahmed';

  // Test 1: Health Check
  await testEndpoint('Health Check', 'GET', '/health');

  // Test 2: Job Alerts - Get user's alerts
  await testEndpoint('Job Alerts - Get', 'GET', `/job-alerts/${adminUserId}`);

  // Test 3: Job Alerts - Get with missing userId
  await testEndpoint('Job Alerts - Missing userId', 'GET', `/job-alerts/`);

  // Test 4: Job Alerts - Create alert
  await testEndpoint('Job Alerts - Create', 'POST', '/job-alerts', {
    user_id: adminUserId,
    keywords: ['cloud', 'architecture'],
    location: 'muscat',
    experience_level: 'senior',
  });

  // Test 5: Messages - Get conversations
  await testEndpoint('Messages - Conversations', 'GET', `/messages/conversations/${adminUserId}`);

  // Test 6: Messages - Get conversations with plain user ID
  await testEndpoint('Messages - Conversations (plain ID)', 'GET', `/messages/conversations/admin_root`);

  // Test 7: Messages - Get specific conversation
  await testEndpoint('Messages - Get Conversation', 'GET', `/messages/${adminUserId}/${testUserId}`);

  // Test 8: Messages - Send message
  await testEndpoint('Messages - Send', 'POST', '/messages', {
    sender_id: adminUserId,
    receiver_id: testUserId,
    content: 'Test message from automated test suite',
  });

  // Test 9: Profile - Get profile with viewer
  await testEndpoint('Profile - Get with Viewer', 'GET', `/profile/${testUserId}?viewerId=${adminUserId}`);

  // Test 10: Profile - Get profile without viewer
  await testEndpoint('Profile - Get', 'GET', `/profile/${testUserId}`);

  // Test 11: Profile - Get profile with plain ID
  await testEndpoint('Profile - Get (plain ID)', 'GET', `/profile/ahmed`);

  // Test 12: Profile - Update profile
  await testEndpoint('Profile - Update', 'PUT', '/profile', {
    user_id: adminUserId,
    headline: 'System Administrator',
    bio: 'Managing ProSync platform',
  });

  // Test 13: Profile - Missing userId in path
  await testEndpoint('Profile - Missing userId', 'GET', `/profile/`);

  // Print Results
  console.log('\n📊 Test Results:\n');
  console.log('┌─ Endpoint Status ─────────────────────────────────────────┐');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    console.log(`   ${result.method} ${result.endpoint}`);
    console.log(`   Status: ${result.status} ${result.statusText}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.success) {
      passed++;
    } else {
      failed++;
    }

    console.log();
  }

  console.log('└────────────────────────────────────────────────────────────┘');
  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed out of ${results.length} tests\n`);

  if (failed === 0) {
    console.log('✨ All tests passed! API is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
  }

  return { passed, failed, total: results.length };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests, testEndpoint };
