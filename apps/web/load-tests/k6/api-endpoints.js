/**
 * K6 Load Test Script for API Endpoints
 * 
 * Focused load testing for API routes
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    api_response_time: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test API endpoints
  const endpoints = [
    { path: '/api/jobs', method: 'GET', name: 'GetJobs' },
    { path: '/api/contractor/profile-data', method: 'GET', name: 'GetContractorProfile' },
    { path: '/api/analytics/insights', method: 'GET', name: 'GetAnalytics' },
  ];

  for (const endpoint of endpoints) {
    const response = http.request(
      endpoint.method,
      `${BASE_URL}${endpoint.path}`,
      null,
      {
        tags: { name: endpoint.name },
      }
    );

    check(response, {
      [`${endpoint.name} status is acceptable`]: (r) =>
        r.status === 200 || r.status === 401 || r.status === 403,
    });

    errorRate.add(response.status >= 500);
    apiResponseTime.add(response.timings.duration);
    sleep(0.5);
  }
}

