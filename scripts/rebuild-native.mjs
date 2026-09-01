import { spawnSync } from 'node:child_process';

const packages = [
  'esbuild',
  'sharp',
  '@sentry/cli',
  'onnxruntime-node',
  'protobufjs',
  'core-js',
  'fsevents',
  'msw',
  'detox',
];

// npm exposes the active CLI path during lifecycle scripts. Calling it via
// Node avoids shell-specific redirection and `true` syntax, so `npm ci` works
// consistently on Windows cmd.exe and Unix CI runners.
const npmExecPath = process.env.npm_execpath;
const command = npmExecPath?.endsWith('.js') ? process.execPath : npmExecPath || 'npm';
const prefix = npmExecPath?.endsWith('.js') ? [npmExecPath] : [];

for (const packageName of packages) {
  const result = spawnSync(command, [...prefix, 'rebuild', packageName], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error || result.status !== 0) {
    console.warn(`Optional native rebuild skipped for ${packageName}.`);
  }
}
