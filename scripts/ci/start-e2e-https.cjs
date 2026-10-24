// Production-mode browser tests need HTTPS: Safari correctly rejects Secure
// __Host- cookies on HTTP localhost. This server is only for the disposable CI stack.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { execFileSync } = require('node:child_process');
const { validateE2EEnvironment } = require('./check-e2e-environment.cjs');

async function main() {
  validateE2EEnvironment(process.env);
  if (process.env.E2E_TESTING !== 'true' ||
      process.env.E2E_SUPABASE_URL !== 'http://127.0.0.1:56321' ||
      process.env.PLAYWRIGHT_TEST_BASE_URL !== 'https://localhost:3000') {
    throw new Error('HTTPS test server requires the disposable loopback E2E stack.');
  }
  process.env.NODE_ENV = 'production';
  const root = path.resolve(__dirname, '../..');
  const directory = path.join(root, 'output/e2e-stack');
  fs.mkdirSync(directory, { recursive: true });
  const key = path.join(directory, 'localhost.key');
  const cert = path.join(directory, 'localhost.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '2', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1'], { stdio: 'ignore' });
  fs.chmodSync(key, 0o600);
  const app = require('next')({ dev: false, dir: path.join(root, 'apps/web'),
    hostname: 'localhost', port: 3000 });
  await app.prepare();
  const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) },
    app.getRequestHandler());
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(3000, 'localhost', () => console.log('Disposable E2E HTTPS server ready.'));
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => server.close(() => app.close().finally(() => process.exit())));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
