const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real entrypoint without invoking external tools or touching
// installed dependencies. A failed prerequisite must prevent app compilation.
const source = fs.readFileSync(path.join(__dirname, 'vercel-build.js'), 'utf8');
function simulate(fail) {
  const commands = [];
  let exitCode;
  const stopped = new Error('build stopped');
  try {
    vm.runInNewContext(source, {
      require(name) {
        assert.equal(name, 'child_process');
        return { execSync(command) {
          commands.push(command);
          if (fail?.(command)) throw Object.assign(new Error('failed'), { status: 7 });
        } };
      },
      console: { log() {} },
      process: { version: process.version, exit(code) { exitCode = code; throw stopped; } },
    });
  } catch (error) {
    if (error !== stopped) throw error;
  }
  return { commands, exitCode };
}

test('explicit security preparation precedes compilation even with lifecycle scripts disabled', () => {
  const { commands, exitCode } = simulate();
  assert.equal(exitCode, undefined);
  assert.equal(commands[0], 'node scripts/apply-security-patches.cjs');
  assert.equal(commands.at(-1), 'npx next build');
});

for (const [stage, matches] of [
  ['security patch', (s) => s.includes('apply-security-patches')],
  ['shared package', (s) => s.includes('--workspace=packages/types')],
  ['public assets', (s) => s.startsWith('cp ')],
  ['type check', (s) => s === 'npx tsc --noEmit'],
  ['lint', (s) => s.startsWith('npx eslint')],
]) {
  test(`${stage} failure blocks the application build`, () => {
    const { commands, exitCode } = simulate(matches);
    assert.equal(exitCode, 7);
    assert.equal(commands.includes('npx next build'), false);
    assert.ok(matches(commands.at(-1)));
  });
}
