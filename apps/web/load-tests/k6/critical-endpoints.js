/**
 * K6 Load Test Script for Critical Endpoints
 * 
 * Tests performance of critical API endpoints under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },     // Ramp up to 50 users
    { duration: '2m', target: 100 },    // Stay at 100 users
    { duration: '1m', target: 50 },     // Ramp down to 50 users
    { duration: '30s', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1000ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.01'],                          // Custom error rate < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = {
  homeowner: {
    email: 'homeowner@test.com',
    password: 'TestPassword123!',
  },
  contractor: {
    email: 'contractor@test.com',
    password: 'TestPassword123!',
  },
};

export function setup() {
  // Setup: Create test users if needed, get auth tokens, etc.
  console.log('Setting up load test environment...');
  
  return {
    baseUrl: BASE_URL,
  };
}

export default function (data) {
  const baseUrl = data.baseUrl;

  // Test 1: Health check / API status
  let response = http.get(`${baseUrl}/api/health`, {
    tags: { name: 'HealthCheck' },
  });
  check(response, {
    'health check status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status !== 200);
  responseTime.add(response.timings.duration);
  sleep(1);

  // Test 2: Public endpoints (no auth required)
  response = http.get(`${baseUrl}/`, {
    tags: { name: 'LandingPage' },
  });
  check(response, {
    'landing page status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status !== 200);
  responseTime.add(response.timings.duration);
  sleep(1);

  // Test 3: Login endpoint
  const loginPayload = JSON.stringify({
    email: testUsers.homeowner.email,
    password: testUsers.homeowner.password,
  });
  response = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  });
  check(response, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  errorRate.add(response.status >= 500);
  responseTime.add(response.timings.duration);
  sleep(1);

  // Test 4: Jobs listing (may require auth)
  response = http.get(`${baseUrl}/api/jobs`, {
    tags: { name: 'JobsList' },
  });
  check(response, {
    'jobs list status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  errorRate.add(response.status >= 500);
  responseTime.add(response.timings.duration);
  sleep(1);

  // Test 5: Contractors listing
  response = http.get(`${baseUrl}/contractors`, {
    tags: { name: 'ContractorsPage' },
  });
  check(response, {
    'contractors page status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status >= 500);
  responseTime.add(response.timings.duration);
  sleep(1);
}

export function teardown(data) {
  // Cleanup: Remove test data if needed
  console.log('Tearing down load test environment...');
}

