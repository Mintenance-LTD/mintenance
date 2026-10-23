// Readiness audit runner: dummy credentials and a workspace-local temp directory.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const dotenv = require('dotenv');
const env = {};
for (const key of [
  'PATH',
  'Path',
  'SystemRoot',
  'WINDIR',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'COMSPEC',
  'PATHEXT',
  'NUMBER_OF_PROCESSORS',
])
  if (process.env[key]) env[key] = process.env[key];
for (const dir of ['.', 'apps/web', 'apps/mobile'])
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.env') && fs.statSync(path.join(dir, name)).isFile()) {
      for (const key of Object.keys(
        dotenv.parse(fs.readFileSync(path.join(dir, name)))
      ))
        env[key] = '';
    }
  }
const temp = path.resolve(__dirname, 'tmp');
fs.mkdirSync(temp, { recursive: true });
Object.assign(env, {
  TEMP: temp,
  TMP: temp,
  NODE_ENV: 'test',
  __NEXT_PROCESSED_ENV: 'true',
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'audit-local-anon-unconfigured',
  SUPABASE_SERVICE_ROLE_KEY: 'audit-local-service-unconfigured',
  JWT_SECRET: randomBytes(64).toString('base64'),
  CSRF_SECRET: randomBytes(32).toString('hex'),
  STRIPE_SECRET_KEY: 'sk_test_audit_unconfigured',
  STRIPE_WEBHOOK_SECRET: 'whsec_audit_unconfigured',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_audit_unconfigured',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3017',
  NODE_OPTIONS: '--max-old-space-size=8192',
});
const mobile = process.argv[2] === 'mobile';
const build = process.argv[2] === 'build';
const mobileExport = process.argv[2] === 'mobile-export';
// Expo boolean options reject empty strings; no local dotenv is loaded for exports.
if (mobileExport)
  for (const key of Object.keys(env)) if (env[key] === '') delete env[key];
if (build)
  Object.assign(env, {
    NODE_ENV: 'production',
    CI: 'true',
    SENTRY_DISABLE_AUTO_UPLOAD: 'true',
  });
if (mobileExport)
  Object.assign(env, {
    NODE_ENV: 'production',
    CI: 'true',
    EXPO_NO_DOTENV: '1',
    EXPO_OFFLINE: '1',
    EXPO_NO_TELEMETRY: '1',
    EAS_BUILD: 'true',
    SENTRY_DISABLE_AUTO_UPLOAD: 'true',
    EXPO_PUBLIC_SUPABASE_URL: 'https://audit.invalid',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'audit-local-anon-unconfigured',
    EXPO_PUBLIC_API_BASE_URL: 'https://audit.invalid',
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_auditunconfigured',
  });
const args = mobileExport
  ? [
      path.resolve('node_modules/expo/bin/cli'),
      'export',
      '--platform',
      'ios',
      '--platform',
      'android',
      '--max-workers',
      '2',
      '--output-dir',
      path.resolve(__dirname, 'tmp/mobile-export'),
    ]
  : build
    ? [path.resolve('node_modules/next/dist/bin/next'), 'build', '--webpack']
    : mobile
      ? [
          path.resolve('node_modules/jest/bin/jest.js'),
          '--config',
          'apps/mobile/jest.config.js',
          '--runInBand',
          ...process.argv.slice(3),
        ]
      : [
          path.resolve('apps/web/node_modules/vitest/vitest.mjs'),
          'run',
          '--config',
          path.resolve('apps/web/vitest.config.ts'),
          '--maxWorkers=2',
          ...process.argv.slice(3),
        ];
const child = spawn(process.execPath, args, {
  cwd: mobile
    ? process.cwd()
    : path.resolve(mobileExport ? 'apps/mobile' : 'apps/web'),
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));
