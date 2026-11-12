const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real entrypoint without invoking external tools or touching
// installed dependencies. A failed prerequisite must prevent app compilation.
const source = fs.readFileSync(path.join(__dirname, 'vercel-build.js'), 'utf8');
test('legacy dashboard shell command delegates to the checked entrypoint', () => {
  const wrapper = fs.readFileSync(
    path.join(__dirname, 'vercel-build.sh'),
    'utf8'
  );
  assert.match(wrapper, /exec node scripts\/vercel-build\.js/);
  assert.doesNotMatch(wrapper, /next build|non-fatal/);
});
function simulate(fail) {
  const commands = [];
  const options = [];
  let exitCode;
  const stopped = new Error('build stopped');
  try {
    vm.runInNewContext(source, {
      require(name) {
        assert.equal(name, 'child_process');
        return {
          execSync(command, opts) {
            commands.push(command);
            options.push(opts);
            if (fail?.(command))
              throw Object.assign(new Error('failed'), { status: 7 });
          },
        };
      },
      console: { log() {} },
      process: {
        version: process.version,
        env: {
          NODE_ENV: 'production',
          VERCEL: '1',
          PATH: '/usr/bin',
          OPENAI_API_KEY: 'synthetic-deployment-key',
          AUTO_VALIDATION_ENABLED: 'true',
          SUPABASE_SERVICE_ROLE_KEY: 'synthetic-database-key',
        },
        exit(code) {
          exitCode = code;
          throw stopped;
        },
      },
    });
  } catch (error) {
    if (error !== stopped) throw error;
  }
  return { commands, options, exitCode };
}

test('unit tests use test mode while Next compilation inherits the deployment environment', () => {
  const { commands, options } = simulate();
  const tests =
    options[commands.findIndex((command) => command.includes('vitest run'))];
  assert.equal(tests.env.NODE_ENV, 'test');
  assert.equal(tests.env.PATH, '/usr/bin');
  assert.deepEqual(Object.keys(tests.env).sort(), ['NODE_ENV', 'PATH']);
  assert.equal(options.at(-1).env, undefined);
});

test('explicit security preparation precedes compilation even with lifecycle scripts disabled', () => {
  const { commands, exitCode } = simulate();
  assert.equal(exitCode, undefined);
  assert.equal(commands[0], 'node scripts/apply-security-patches.cjs');
  assert.equal(commands.at(-1), 'npx next build');
});

for (const [stage, matches] of [
  ['security patch', (s) => s.includes('apply-security-patches')],
  ['missing migration', (s) => s.includes('check-release-migrations')],
  ['shared package', (s) => s.includes('--workspace=packages/types')],
  ['public assets', (s) => s.startsWith('cp ')],
  ['type check', (s) => s === 'npx tsc --noEmit'],
  ['lint', (s) => s.startsWith('npx eslint')],
  ['internal links', (s) => s.includes('check-internal-links')],
  ['web tests', (s) => s.startsWith('npx vitest run')],
]) {
  test(`${stage} failure blocks the application build`, () => {
    const { commands, exitCode } = simulate(matches);
    assert.equal(exitCode, 7);
    assert.equal(commands.includes('npx next build'), false);
    assert.ok(matches(commands.at(-1)));
  });
}
