#!/usr/bin/env node

/**
 * Script to test rate limiting implementation
 * Tests different endpoint types to verify rate limiting is working
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_ENDPOINTS = [
  {
    path: '/api/admin/users',
    method: 'GET',
    expectedLimit: 10,
    type: 'Admin endpoint'
  },
  {
    path: '/api/ai/analyze',
    method: 'POST',
    expectedLimit: 5,
    type: 'AI endpoint',
    body: { test: true }
  },
  {
    path: '/api/payments/history',
    method: 'GET',
    expectedLimit: 20,
    type: 'Payment endpoint'
  },
  {
    path: '/api/auth/session',
    method: 'GET',
    expectedLimit: 5,
    type: 'Auth endpoint'
  },
  {
    path: '/api/jobs',
    method: 'GET',
    expectedLimit: 30,
    type: 'General endpoint'
  }
];

async function testEndpoint(endpoint) {
  console.log(`\nTesting ${endpoint.type}: ${endpoint.path}`);
  console.log(`Expected rate limit: ${endpoint.expectedLimit} requests/minute`);

  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0,
    firstRateLimitAt: null
  };

  // Send rapid requests to trigger rate limiting
  const requestCount = endpoint.expectedLimit + 5; // Try to exceed limit
  const promises = [];

  for (let i = 0; i < requestCount; i++) {
    const promise = fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Request': 'true'
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
    }).then(response => {
      if (response.status === 429) {
        results.rateLimited++;
        if (!results.firstRateLimitAt) {
          results.firstRateLimitAt = i + 1;
        }

        // Check rate limit headers
        const headers = {
          limit: response.headers.get('X-RateLimit-Limit'),
          remaining: response.headers.get('X-RateLimit-Remaining'),
          reset: response.headers.get('X-RateLimit-Reset'),
          retryAfter: response.headers.get('Retry-After')
        };

        return { status: 429, headers };
      } else if (response.ok || response.status === 401 || response.status === 403) {
        // Count as success even if unauthorized (we're testing rate limiting, not auth)
        results.success++;
        return { status: response.status };
      } else {
        results.errors++;
        return { status: response.status, error: true };
      }
    }).catch(error => {
      results.errors++;
      return { status: 'error', message: error.message };
    });

    promises.push(promise);

    // Small delay between requests to avoid overwhelming
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const responses = await Promise.all(promises);

  // Analyze results
  console.log(`\nResults:`);
  console.log(`  ✅ Successful requests: ${results.success}`);
  console.log(`  🚫 Rate limited: ${results.rateLimited}`);
  console.log(`  ❌ Errors: ${results.errors}`);

  if (results.firstRateLimitAt) {
    console.log(`  📊 First rate limit at request #${results.firstRateLimitAt}`);

    // Find a rate limited response to show headers
    const rateLimitedResponse = responses.find(r => r.status === 429);
    if (rateLimitedResponse && rateLimitedResponse.headers) {
      console.log(`\n  Rate limit headers:`);
      console.log(`    - Limit: ${rateLimitedResponse.headers.limit}`);
      console.log(`    - Remaining: ${rateLimitedResponse.headers.remaining}`);
      console.log(`    - Reset: ${rateLimitedResponse.headers.reset}`);
      console.log(`    - Retry After: ${rateLimitedResponse.headers.retryAfter}s`);
    }
  }

  // Determine if test passed
  const passed = results.firstRateLimitAt && results.firstRateLimitAt <= endpoint.expectedLimit + 1;
  console.log(`\n  ${passed ? '✅ PASSED' : '❌ FAILED'}: Rate limiting is ${passed ? 'working correctly' : 'not working as expected'}`);

  return {
    endpoint: endpoint.path,
    type: endpoint.type,
    passed,
    results
  };
}

async function runTests() {
  console.log('=== RATE LIMITING TEST SUITE ===');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('Note: This test requires a running server\n');

  const testResults = [];

  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    testResults.push(result);

    // Wait between endpoint tests to reset rate limits
    console.log('\n  Waiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Summary
  console.log('\n=== TEST SUMMARY ===\n');
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;

  console.log(`Total tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.type}: ${r.endpoint}`);
    });
  }

  console.log(`\n${passed === testResults.length ? '✅ All tests passed!' : '❌ Some tests failed'}`);

  // Note about running server requirement
  if (testResults.every(r => r.results.errors === r.results.success + r.results.rateLimited + r.results.errors)) {
    console.log('\n⚠️  Warning: All requests resulted in errors.');
    console.log('   Make sure the server is running with: npm run dev');
  }
}

// Run tests
runTests().catch(console.error);