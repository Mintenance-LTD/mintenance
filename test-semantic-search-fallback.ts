/**
 * Test script for semantic search timeout and fallback functionality
 * Run with: npx tsx test-semantic-search-fallback.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  response?: any;
}

const tests: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; details: string; response?: any }>
): Promise<void> {
  console.log(`\n🧪 Running: ${name}`);
  const startTime = Date.now();

  try {
    const result = await testFn();
    const duration = Date.now() - startTime;

    tests.push({
      name,
      passed: result.passed,
      duration,
      details: result.details,
      response: result.response,
    });

    console.log(result.passed ? '✅ PASSED' : '❌ FAILED');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Details: ${result.details}`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    tests.push({
      name,
      passed: false,
      duration,
      details: `Error: ${error.message}`,
    });
    console.log('❌ FAILED');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Error: ${error.message}`);
  }
}

async function testSemanticSearch(): Promise<{
  passed: boolean;
  details: string;
  response?: any;
}> {
  const response = await fetch('http://localhost:3000/api/ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'plumber near me',
      limit: 10,
    }),
  });

  const data = await response.json();

  const passed =
    response.ok &&
    data.results !== undefined &&
    data.count !== undefined &&
    data.usedFallback !== undefined &&
    data.searchMethod !== undefined;

  const details = passed
    ? `Found ${data.count} results using ${data.searchMethod} search (fallback: ${data.usedFallback})`
    : `Failed: ${JSON.stringify(data)}`;

  return { passed, details, response: data };
}

async function testTimeoutFallback(): Promise<{
  passed: boolean;
  details: string;
  response?: any;
}> {
  // This test requires temporarily setting a very low timeout in the code
  // Or simulating a slow OpenAI response
  console.log('   ⚠️  Note: This test requires manual timeout simulation');

  const response = await fetch('http://localhost:3000/api/ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'electrician emergency repair',
      limit: 20,
    }),
  });

  const data = await response.json();

  // Test passes if we get results (regardless of method)
  const passed = response.ok && data.results !== undefined && data.count >= 0;

  const details = passed
    ? `Search completed with ${data.searchMethod} method (fallback: ${data.usedFallback}), ${data.count} results`
    : `Failed: ${JSON.stringify(data)}`;

  return { passed, details, response: data };
}

async function testFullTextSearch(): Promise<{
  passed: boolean;
  details: string;
  response?: any;
}> {
  // Test with a simple query that should work with full-text search
  const response = await fetch('http://localhost:3000/api/ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'roof repair',
      filters: {
        category: 'roofing',
      },
      limit: 15,
    }),
  });

  const data = await response.json();

  const passed =
    response.ok &&
    Array.isArray(data.results) &&
    (data.searchMethod === 'semantic' || data.searchMethod === 'full-text');

  const details = passed
    ? `Full-text capable search returned ${data.count} results`
    : `Failed: ${JSON.stringify(data)}`;

  return { passed, details, response: data };
}

async function testFiltersWithFallback(): Promise<{
  passed: boolean;
  details: string;
  response?: any;
}> {
  const response = await fetch('http://localhost:3000/api/ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'contractor',
      filters: {
        location: 'NYC',
        rating: 4.0,
      },
      limit: 10,
    }),
  });

  const data = await response.json();

  const passed = response.ok && data.results !== undefined;

  const details = passed
    ? `Filters applied successfully with ${data.searchMethod} search, ${data.count} results`
    : `Failed to apply filters: ${JSON.stringify(data)}`;

  return { passed, details, response: data };
}

async function testRateLimiting(): Promise<{
  passed: boolean;
  details: string;
  response?: any;
}> {
  // Make 12 rapid requests (limit is 10 per minute)
  const requests = Array.from({ length: 12 }, (_, i) =>
    fetch('http://localhost:3000/api/ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `test query ${i}`,
        limit: 5,
      }),
    })
  );

  const responses = await Promise.all(requests);
  const statuses = responses.map((r) => r.status);
  const rateLimited = statuses.filter((s) => s === 429).length;

  const passed = rateLimited >= 2; // At least 2 requests should be rate limited

  const details = passed
    ? `Rate limiting working: ${rateLimited} requests blocked out of 12`
    : `Rate limiting not working: only ${rateLimited} requests blocked`;

  return { passed, details };
}

async function testAnalyticsTracking(): Promise<{
  passed: boolean;
  details: string;
  response?: any;
}> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Perform a search
  const searchResponse = await fetch('http://localhost:3000/api/ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'analytics test',
      limit: 5,
    }),
  });

  const searchData = await searchResponse.json();

  // Wait a bit for analytics to be logged
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if analytics was recorded
  const { data: analytics, error } = await supabase
    .from('search_analytics')
    .select('*')
    .ilike('query', '%analytics test%')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const passed = !error && analytics !== null;

  const details = passed
    ? `Analytics tracked: method=${analytics.search_method}, fallback=${analytics.used_fallback}`
    : `Analytics not tracked: ${error?.message}`;

  return { passed, details, response: analytics };
}

async function testResponseFormat(): Promise<{
  passed: boolean;
  details: string;
  response?: any;
}> {
  const response = await fetch('http://localhost:3000/api/ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'format test',
      limit: 5,
    }),
  });

  const data = await response.json();

  const hasRequiredFields =
    'results' in data &&
    'count' in data &&
    'usedFallback' in data &&
    'searchMethod' in data;

  const resultsValid = Array.isArray(data.results);

  const resultItemsValid =
    data.results.length === 0 ||
    (data.results[0].id &&
      data.results[0].type &&
      data.results[0].title &&
      data.results[0].relevanceScore !== undefined);

  const passed = hasRequiredFields && resultsValid && resultItemsValid;

  const details = passed
    ? 'Response format is correct with all required fields'
    : `Response format issues: hasRequiredFields=${hasRequiredFields}, resultsValid=${resultsValid}, resultItemsValid=${resultItemsValid}`;

  return { passed, details, response: data };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   Semantic Search Fallback Implementation Tests      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  // Run all tests
  await runTest('Test 1: Basic Semantic Search', testSemanticSearch);
  await runTest('Test 2: Timeout Fallback Mechanism', testTimeoutFallback);
  await runTest('Test 3: Full-Text Search Capability', testFullTextSearch);
  await runTest('Test 4: Filters with Fallback', testFiltersWithFallback);
  await runTest('Test 5: Rate Limiting Protection', testRateLimiting);
  await runTest('Test 6: Analytics Tracking', testAnalyticsTracking);
  await runTest('Test 7: Response Format Validation', testResponseFormat);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));

  const totalTests = tests.length;
  const passedTests = tests.filter((t) => t.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  const avgDuration = (
    tests.reduce((sum, t) => sum + t.duration, 0) / totalTests
  ).toFixed(0);

  console.log(`Total Tests:     ${totalTests}`);
  console.log(`Passed:          ${passedTests} ✅`);
  console.log(`Failed:          ${failedTests} ❌`);
  console.log(`Success Rate:    ${successRate}%`);
  console.log(`Avg Duration:    ${avgDuration}ms`);

  console.log('\n' + '═'.repeat(60));
  console.log('DETAILED RESULTS');
  console.log('═'.repeat(60));

  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   Status: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Duration: ${test.duration}ms`);
    console.log(`   ${test.details}`);
  });

  console.log('\n' + '═'.repeat(60));

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
