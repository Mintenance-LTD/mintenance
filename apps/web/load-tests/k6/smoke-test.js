import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { readConfig, buildReport } from './smoke-config.mjs';

const config = readConfig(__ENV);
const durations = {};
const requests = {};
for (const name of ['version', 'stats', 'login', 'jobs']) {
  durations[name] = new Trend(`${name}_duration`, true);
  requests[name] = new Counter(`${name}_requests`);
}

export const options = {
  scenarios: {
    smoke: {
      executor: 'per-vu-iterations',
      vus: config.vus,
      iterations: 1,
      maxDuration: '30s',
      gracefulStop: '0s',
    },
  },
  setupTimeout: '30s',
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    version_duration: ['p(95)<200'],
    stats_duration: ['p(95)<500'],
    login_duration: ['p(95)<1000'],
    jobs_duration: ['p(95)<500'],
    version_requests: [`count>=${config.vus}`],
    stats_requests: [`count>=${config.vus}`],
    login_requests: ['count==1'],
    jobs_requests: [`count>=${config.vus}`],
  },
};

function params(name) {
  return { redirects: 0, timeout: '10s', tags: { name } };
}

function body(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

function record(name, response, valid) {
  durations[name].add(response.timings.duration);
  requests[name].add(1);
  return check(response, {
    [`${name} returned the expected authenticated/API response`]: () =>
      response.status === 200 && valid,
  });
}

export function setup() {
  const csrf = http.get(`${config.baseUrl}/api/csrf`, params('csrf'));
  const token = body(csrf)?.token;
  if (
    !check(csrf, {
      'CSRF token obtained': () =>
        csrf.status === 200 && typeof token === 'string' && token.length > 0,
    })
  ) {
    fail('CSRF setup failed; no credentials were submitted');
  }
  const login = http.post(
    `${config.baseUrl}/api/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_USER_EMAIL,
      password: __ENV.TEST_USER_PASSWORD,
    }),
    {
      ...params('login'),
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Origin: config.baseUrl,
      },
    }
  );
  const result = body(login);
  if (
    !record(
      'login',
      login,
      !!result?.user?.id && !result.requiresMfa && !result.requiresMfaSetup
    )
  ) {
    fail(
      'Staging login failed or requires MFA; authenticated coverage did not run'
    );
  }
  // k6 setup and VUs have separate cookie jars. Transfer only this origin's cookies.
  return { cookies: http.cookieJar().cookiesForURL(config.baseUrl) };
}

export default function (data) {
  for (const [name, values] of Object.entries(data.cookies)) {
    for (const value of values)
      http.cookieJar().set(config.baseUrl, name, value, { path: '/' });
  }
  const version = http.get(`${config.baseUrl}/api/version`, params('version'));
  record('version', version, typeof body(version)?.buildId === 'string');
  const stats = http.get(
    `${config.baseUrl}/api/stats/platform`,
    params('stats')
  );
  const statsBody = body(stats);
  record(
    'stats',
    stats,
    typeof statsBody?.activeContractors === 'number' &&
      typeof statsBody?.completedJobs === 'number'
  );
  const jobs = http.get(`${config.baseUrl}/api/jobs?limit=1`, params('jobs'));
  record('jobs', jobs, Array.isArray(body(jobs)?.jobs));
}

export function handleSummary(data) {
  const report = buildReport(data);
  return {
    'load-test-results.json': JSON.stringify(report, null, 2),
    stdout: `${JSON.stringify(report)}\n`,
  };
}
