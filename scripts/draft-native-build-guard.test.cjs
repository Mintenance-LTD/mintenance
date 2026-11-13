const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const workflow = (name) =>
  yaml.load(
    readFileSync(path.join(__dirname, '../.github/workflows', name), 'utf8')
  );
function runs(expression, event, draft = false, ref = 'refs/pull/1/merge', vars = {}) {
  const github = {
    event_name: event,
    ref,
    event: { pull_request: { draft }, inputs: { platform: 'all' } },
  };
  const needs = {
    'e2e-secrets-gate': { outputs: { 'has-staging': 'true' } },
    'pre-build-checks': { outputs: { 'should-build': 'true' } },
    'native-build-changes': { outputs: { 'should-build': 'true' } },
  };
  // Evaluate the checked-in boolean gate with deliberately enabled secrets and changed native inputs.
  expression = expression.replace(
    /\.(e2e-secrets-gate|has-staging|pre-build-checks|should-build|native-build-changes)/g,
    '["$1"]'
  );
  return Function('github', 'needs', 'vars', `return (${expression});`)(github, needs, vars);
}
test('draft PR skips every native build job, even with staging credentials and native changes', () => {
  for (const [file, jobs] of [
    ['ci-cd.yml', ['mobile-pr-smoke', 'build-production', 'build-staging']],
    ['mobile-tests.yml', ['e2e-android', 'e2e-ios']],
    ['mobile-build.yml', ['build-android', 'build-ios']],
  ]) {
    const config = workflow(file);
    for (const name of jobs) {
      assert.ok(config.jobs[name], `${file}/${name} exists`);
      assert.equal(
        Boolean(runs(config.jobs[name].if, 'pull_request', true)),
        false,
        `${file}/${name}`
      );
    }
  }
});
test('ready PR retains Detox coverage; EAS remains excluded on all PRs', () => {
  assert.equal(
    runs(workflow('ci-cd.yml').jobs['mobile-pr-smoke'].if, 'pull_request'),
    true
  );
  for (const name of ['e2e-android', 'e2e-ios'])
    assert.equal(
      runs(workflow('mobile-tests.yml').jobs[name].if, 'pull_request'),
      true
    );
  for (const name of ['build-android', 'build-ios'])
    assert.equal(
      runs(workflow('mobile-build.yml').jobs[name].if, 'pull_request'),
      false
    );
});
test('main retains native tests but no longer automatically creates store builds', () => {
  for (const [file, name, expected] of [
    ['mobile-tests.yml', 'e2e-android', true],
    ['mobile-build.yml', 'build-android', false],
    ['mobile-build.yml', 'build-ios', false],
    ['ci-cd.yml', 'build-production', false],
  ]) {
    assert.equal(
      runs(workflow(file).jobs[name].if, 'push', false, 'refs/heads/main'),
      expected
    );
    assert.ok(
      !workflow(file).on.push.branches.includes(
        'feat/property-views-albums-oct30'
      )
    );
  }
});

test('manual native builds remain available and legacy automatic store builds require explicit opt-in', () => {
  for (const name of ['build-android', 'build-ios']) {
    assert.equal(runs(workflow('mobile-build.yml').jobs[name].if, 'workflow_dispatch'), true);
  }
  const gate = workflow('ci-cd.yml').jobs['build-production'].if;
  const enabled = { ENABLE_AUTOMATIC_STORE_BUILDS: 'true' };
  assert.equal(runs(gate, 'push', false, 'refs/heads/main', enabled), true);
  assert.equal(runs(gate, 'pull_request', true, 'refs/pull/1/merge', enabled), false);
  assert.equal(runs(gate, 'push', false, 'refs/heads/feature', enabled), false);
});

test('aggregate gates still execute when draft native jobs are skipped', () => {
  for (const [file, job] of [
    ['ci-cd.yml', 'pr-quality-gate'],
    ['mobile-tests.yml', 'quality-gate'],
  ]) {
    assert.equal(
      workflow(file).jobs[job].if,
      "always() && github.event_name == 'pull_request'"
    );
    assert.ok(
      workflow(file).on.pull_request.types.includes('ready_for_review')
    );
  }
});
