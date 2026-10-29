import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  readConfig,
  buildReport,
} from '../apps/web/load-tests/k6/smoke-config.mjs';

const script = fileURLToPath(
  new URL('../apps/web/load-tests/k6/smoke-test.js', import.meta.url)
);
const credentials = {
  TEST_USER_EMAIL: 'smoke@example.invalid',
  TEST_USER_PASSWORD: 'fixture-password-only',
};

test('configuration rejects unsafe targets, missing credentials and unbounded VUs', () => {
  for (const BASE_URL of [
    '',
    'https://www.mintenance.co.uk',
    'https://mintenance.co.uk./',
    'http://remote.example',
    'https://user:secret@example.com',
    'https://example.com/path',
    'https://example.com?token=secret',
    'https://example.com:99999',
  ]) {
    assert.throws(() => readConfig({ ...credentials, BASE_URL }));
  }
  for (const VUS of ['0', '11', '1.5', 'abc'])
    assert.throws(() =>
      readConfig({ ...credentials, BASE_URL: 'http://127.0.0.1:1234', VUS })
    );
  assert.throws(() => readConfig({ BASE_URL: 'https://staging.example' }));
  assert.equal(
    readConfig({ ...credentials, BASE_URL: 'https://staging.example/' }).vus,
    10
  );
  assert.equal(buildReport({}).thresholdsPassed, false);
});

test('real k6 accepts correct API/session behavior and rejects false passes', async (t) => {
  for (const mode of [
    'healthy',
    'healthy-10vus',
    'csrf-rejected',
    'login-rejected',
    'mfa',
    'redirect',
    'html',
    'stats-error',
    'jobs-unauthorized',
    'slow-version',
  ]) {
    await t.test(mode, async () => {
      const seen = [];
      const healthy = mode.startsWith('healthy');
      const vus = mode === 'healthy-10vus' ? 10 : 1;
      const expectedRequests =
        mode === 'csrf-rejected'
          ? 1
          : ['login-rejected', 'mfa'].includes(mode)
            ? 2
            : 2 + 3 * vus;
      const server = http.createServer(async (request, response) => {
        seen.push(request.url);
        response.setHeader('Content-Type', 'application/json');
        if (request.url === '/api/csrf') {
          if (mode === 'csrf-rejected') response.statusCode = 403;
          response.setHeader(
            'Set-Cookie',
            'csrf-token=fixture-csrf; Path=/; HttpOnly'
          );
          response.end(JSON.stringify({ token: 'fixture-csrf' }));
        } else if (request.url === '/api/auth/login') {
          let data = '';
          for await (const chunk of request) data += chunk;
          const valid =
            request.method === 'POST' &&
            request.headers['x-csrf-token'] === 'fixture-csrf' &&
            request.headers.cookie?.includes('csrf-token=fixture-csrf') &&
            JSON.parse(data).password === credentials.TEST_USER_PASSWORD;
          if (!valid || mode === 'login-rejected') {
            response.statusCode = 401;
            response.end('{}');
          } else if (mode === 'mfa') {
            response.end(
              JSON.stringify({
                requiresMfa: true,
                preMfaToken: 'fixture-private-token',
              })
            );
          } else {
            response.setHeader(
              'Set-Cookie',
              'session=fixture-session; Path=/; HttpOnly'
            );
            response.end(JSON.stringify({ user: { id: 'fixture-user' } }));
          }
        } else if (request.url === '/api/version') {
          if (mode === 'slow-version')
            await new Promise((resolve) => setTimeout(resolve, 300));
          if (mode === 'redirect') {
            response.statusCode = 302;
            response.setHeader('Location', '/should-not-follow');
          }
          response.end(
            mode === 'html'
              ? '<html>Login</html>'
              : JSON.stringify({ buildId: 'fixture-build' })
          );
        } else if (request.url === '/api/stats/platform') {
          if (mode === 'stats-error') response.statusCode = 500;
          response.end(
            JSON.stringify({ activeContractors: 1, completedJobs: 1 })
          );
        } else if (request.url === '/api/jobs?limit=1') {
          if (
            !request.headers.cookie?.includes('session=fixture-session') ||
            mode === 'jobs-unauthorized'
          )
            response.statusCode = 401;
          response.end(JSON.stringify({ jobs: [], nextCursor: null }));
        } else {
          response.statusCode = 404;
          response.end('{}');
        }
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const directory = await mkdtemp(path.join(os.tmpdir(), 'mintenance-k6-'));
      try {
        const result = await new Promise((resolve, reject) => {
          const child = spawn(
            process.env.K6_BINARY || 'k6',
            ['run', '--no-usage-report', '--quiet', script],
            {
              cwd: directory,
              env: {
                PATH: process.env.PATH,
                SystemRoot: process.env.SystemRoot,
                TEMP: process.env.TEMP,
                TMP: process.env.TMP,
                ...credentials,
                BASE_URL: `http://127.0.0.1:${server.address().port}`,
                VUS: String(vus),
              },
              stdio: ['ignore', 'pipe', 'pipe'],
            }
          );
          let output = '';
          const timer = setTimeout(() => {
            child.kill();
            reject(new Error('k6 fixture timed out'));
          }, 30000);
          child.stdout.on('data', (chunk) => {
            output += chunk;
          });
          child.stderr.on('data', (chunk) => {
            output += chunk;
          });
          child.once('error', (error) => {
            clearTimeout(timer);
            reject(error);
          });
          child.once('close', (code) => {
            clearTimeout(timer);
            resolve({ code, output });
          });
        });
        const report = JSON.parse(
          await readFile(path.join(directory, 'load-test-results.json'), 'utf8')
        );
        assert.equal(
          seen.length,
          expectedRequests,
          'the intended fixture paths must actually execute'
        );
        assert.equal(
          result.code === 0,
          healthy,
          `Unexpected k6 exit for ${mode}`
        );
        assert.equal(report.thresholdsPassed, healthy);
        assert.ok(
          !seen.includes('/should-not-follow'),
          'redirects must not be followed'
        );
        assert.doesNotMatch(
          result.output + JSON.stringify(report),
          /fixture-password-only|fixture-session|fixture-private-token|fixture-csrf|smoke@example/
        );
        if (healthy) {
          assert.equal(report.totalRequests, expectedRequests);
          assert.equal(report.failedRequests, 0);
          assert.deepEqual(seen.slice(0, 2), ['/api/csrf', '/api/auth/login']);
          assert.deepEqual(
            [...new Set(seen)],
            [
              '/api/csrf',
              '/api/auth/login',
              '/api/version',
              '/api/stats/platform',
              '/api/jobs?limit=1',
            ]
          );
        }
        if (['login-rejected', 'mfa'].includes(mode))
          assert.equal(seen.length, 2);
      } finally {
        await new Promise((resolve) => server.close(resolve));
        // Remove only the uniquely created fixture directory under the OS temp root.
        assert.equal(
          path.dirname(path.resolve(directory)),
          path.resolve(os.tmpdir())
        );
        assert.ok(path.basename(directory).startsWith('mintenance-k6-'));
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});
