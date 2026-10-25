const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requiresNativeBuild } = require('./mobile-build-changes.cjs');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

test('test-only PR and workflow reporting edits do not request an EAS binary', () => {
  assert.equal(
    requiresNativeBuild([
      'apps/mobile/src/screens/home/__tests__/HomeownerDashboard.test.tsx',
      'apps/mobile/src/components/onboarding/__tests__/GettingStartedCard.test.tsx',
      'apps/mobile/src/card.spec.tsx',
      'apps/mobile/jest-setup.js',
      'packages/shared/src/__tests__/guides.test.ts',
      '.github/workflows/mobile-build.yml',
      '.github/workflows/mobile-tests.yml',
      'scripts/mobile-build-changes.cjs',
      'apps/web/__tests__/audit/property-loader-failures.test.tsx',
    ]),
    false
  );
});

test('runtime, dependency, native and unknown inputs require a build', () => {
  for (const file of [
    'apps/mobile/src/screens/home/HomeScreen.tsx',
    'apps/mobile/app.config.ts',
    'apps/mobile/eas.json',
    'apps/mobile/android/build.gradle',
    'apps/mobile/ios/Podfile',
    'apps/mobile/assets/icon.png',
    'apps/mobile/package.json',
    'packages/shared/src/guides.ts',
    'packages/shared/package.json',
    'tools/eas-cli/package-lock.json',
    'package-lock.json',
    'package.json',
    'apps/mobile/new-runtime-input',
  ])
    assert.equal(requiresNativeBuild([file]), true, file);
});

test('mixed changes retain builds, including deleted or renamed runtime paths', () => {
  assert.equal(
    requiresNativeBuild([
      'apps/mobile/src/old.ts',
      'apps/mobile/src/new.ts',
      'apps/mobile/src/new.test.ts',
    ]),
    true
  );
  assert.equal(requiresNativeBuild([]), false);
});

test('manual dispatch explicitly requests a build without needing diff refs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mobile-build-gate-'));
  try {
    const output = join(directory, 'output');
    const result = spawnSync(
      process.execPath,
      [require.resolve('./mobile-build-changes.cjs')],
      {
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: 'workflow_dispatch',
          GITHUB_OUTPUT: output,
          BASE_SHA: '',
          HEAD_SHA: '',
        },
        encoding: 'utf8',
      }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(output, 'utf8'), 'should-build=true\n');
  } finally {
    rmSync(join(directory, 'output'), { force: true });
    rmdirSync(directory);
  }
});
