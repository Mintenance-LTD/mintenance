import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const nodeModules = join(root, 'node_modules');
const isWindows = process.platform === 'win32';

function bin(name) {
  const candidate = join(nodeModules, '.bin', `${name}${isWindows ? '.cmd' : ''}`);
  if (!existsSync(candidate)) throw new Error(`Missing workspace binary: ${candidate}`);
  return candidate;
}

function run(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env: { ...process.env, ...(options.env || {}) },
    stdio: 'inherit',
    // Windows exposes npm-installed command shims as .cmd files. Running the
    // workspace-local shim through the platform shell keeps this command
    // portable while never interpolating user input into the command line.
    shell: isWindows,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('Web TypeScript', bin('tsc'), ['--noEmit', '-p', 'apps/web/tsconfig.json']);
run('Mobile TypeScript', bin('tsc'), ['--noEmit', '-p', 'apps/mobile/tsconfig.json']);
run('Web lint', bin('eslint'), ['.'], { cwd: join(root, 'apps/web') });
run('Mobile lint', bin('eslint'), ['.'], { cwd: join(root, 'apps/mobile') });
run('Web unit tests', bin('vitest'), ['run', '--config', 'vitest.config.ts', '--passWithNoTests'], {
  cwd: join(root, 'apps/web'),
});
run('Mobile unit tests', bin('jest'), ['--config', 'jest.config.js', '--watchAll=false', '--passWithNoTests', '--forceExit'], {
  cwd: join(root, 'apps/mobile'),
});
run('Web production build', bin('next'), ['build', '--webpack'], {
  cwd: join(root, 'apps/web'),
  env: { NODE_OPTIONS: '--max-old-space-size=8192' },
});
run('Mobile Android export', bin('expo'), ['export', '--platform', 'android', '--output-dir', './.expo/phase2-export'], {
  cwd: join(root, 'apps/mobile'),
});
run('Unauthenticated E2E smoke', bin('playwright'), ['test', '--config', 'playwright.smoke.config.ts']);

console.log('\nPhase 2 validation completed successfully.');
