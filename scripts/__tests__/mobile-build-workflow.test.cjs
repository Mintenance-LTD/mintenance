// Run: node --test scripts/__tests__/mobile-build-workflow.test.cjs
// Requires Bash on PATH, or BASH_PATH pointing to a Bash executable.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');

const root = path.resolve(__dirname, '../..');
const workflow = YAML.parse(fs.readFileSync(path.join(root, '.github/workflows/mobile-build.yml'), 'utf8'), { uniqueKeys: true });
const easConfig = JSON.parse(fs.readFileSync(path.join(root, 'apps/mobile/eas.json'), 'utf8'));
const profiles = ['development', 'staging', 'production'];
const select = workflow.jobs['pre-build-checks'].steps.find(step => step.id === 'determine-profile');
const consumers = ['android', 'ios'].map(platform => {
  const steps = workflow.jobs[`build-${platform}`].steps;
  return {
    platform,
    build: steps.find(step => step.name === (platform === 'android' ? 'Build Android APK/AAB' : 'Build iOS')),
    summary: steps.find(step => step.name === 'Post build summary'),
  };
});
const payloads = [
  '', 'preview', '--help', 'production --clear-cache',
  '$(printf injected > "$PROBE_FILE")',
  '`printf injected > "$PROBE_FILE"`',
  '"; printf injected > "$PROBE_FILE"; #',
  'production\nprofile=development',
];

function execute(step, env = {}, stubEas = false) {
  // Execute the actual YAML script, with a local EAS stub; never submit a build.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-workflow-'));
  const files = {
    GITHUB_OUTPUT: 'github output.txt', GITHUB_STEP_SUMMARY: 'github summary.txt',
    EAS_ARGS: 'eas args.txt', PROBE_FILE: 'injection marker.txt',
  };
  const fileEnv = Object.fromEntries(Object.entries(files).map(([key, name]) =>
    [key, path.join(dir, name).replaceAll('\\', '/')]));
  const read = key => fs.existsSync(fileEnv[key]) ? fs.readFileSync(fileEnv[key], 'utf8') : '';
  const stub = stubEas ? 'eas() { printf "%s\\0" "$@" > "$EAS_ARGS"; }\n' : '';
  try {
    const result = spawnSync(process.env.BASH_PATH || 'bash', ['--noprofile', '--norc', '-eo', 'pipefail'], {
      input: stub + step.run,
      encoding: 'utf8',
      timeout: 10000,
      cwd: dir,
      env: {
        PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
        GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', REQUESTED_PROFILE: '',
        ...fileEnv, ...env,
      },
    });
    assert.ifError(result.error);
    assert.equal(fs.existsSync(fileEnv.PROBE_FILE), false, 'Untrusted input executed a command');
    return { ...result, output: read('GITHUB_OUTPUT'), summary: read('GITHUB_STEP_SUMMARY'), args: read('EAS_ARGS') };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('profile values enter scripts through env, and match EAS build profiles', () => {
  assert.equal(select.env.REQUESTED_PROFILE, '${{ github.event.inputs.profile }}');
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.profile.options, profiles);
  for (const profile of profiles) assert.ok(easConfig.build[profile]);
  for (const { build, summary } of consumers) {
    for (const step of [build, summary]) {
      assert.equal(step.env.PROFILE, '${{ needs.pre-build-checks.outputs.build-profile }}');
    }
  }
  for (const step of [select, ...consumers.flatMap(({ build, summary }) => [build, summary])]) {
    assert.ok(!step.run.includes('${{'), `${step.name} embeds an expression in shell source`);
  }
});

for (const [event, ref, expected] of [
  ['push', 'refs/heads/Main', 'production'],
  ['push', 'refs/heads/main', 'production'],
  ['push', 'refs/heads/develop', 'staging'],
  ['pull_request', 'refs/pull/42/merge', 'development'],
  ['push', 'refs/heads/feature', 'development'],
  ['push', 'refs/heads/$(printf injected > "$PROBE_FILE")', 'development'],
]) {
  test(`select ${expected} for ${event} ${ref}`, () => {
    const result = execute(select, { GITHUB_EVENT_NAME: event, GITHUB_REF: ref });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, `profile=${expected}\n`);
  });
}

for (const profile of profiles) {
  test(`manual ${profile} flows into Android/iOS arguments and summaries`, () => {
    const selected = execute(select, { GITHUB_EVENT_NAME: 'workflow_dispatch', REQUESTED_PROFILE: profile });
    assert.equal(selected.status, 0, selected.stderr);
    assert.equal(selected.output, `profile=${profile}\n`);
    const selectedProfile = selected.output.trim().slice('profile='.length);
    for (const { platform, build, summary } of consumers) {
      const result = execute(build, { PROFILE: selectedProfile }, true);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.args.split('\0').slice(0, -1), [
        'build', '--platform', platform, '--profile', profile, '--non-interactive', '--no-wait',
      ]);
      const report = execute(summary, { PROFILE: selectedProfile });
      assert.equal(report.status, 0, report.stderr);
      assert.ok(report.summary.includes(`- Profile: ${profile}\n`));
      assert.ok(report.summary.includes(`- Platform: ${platform === 'ios' ? 'iOS' : 'Android'}\n`));
      assert.ok(report.summary.includes('- Status: Submitted to EAS\n'));
    }
  });
}

for (const payload of payloads) {
  test(`reject invalid profile ${JSON.stringify(payload)} before output or EAS invocation`, () => {
    const selected = execute(select, { GITHUB_EVENT_NAME: 'workflow_dispatch', REQUESTED_PROFILE: payload });
    assert.equal(selected.status, 1, selected.stderr);
    assert.equal(selected.output, '');
    assert.match(selected.stderr, /Invalid build profile/);
    for (const { build, summary } of consumers) {
      const result = execute(build, { PROFILE: payload }, true);
      assert.equal(result.status, 1, result.stderr);
      assert.equal(result.args, '');
      assert.match(result.stderr, /Invalid build profile/);
      const report = execute(summary, { PROFILE: payload });
      assert.equal(report.status, 0, report.stderr);
      assert.ok(report.summary.includes(`- Profile: ${payload}\n`), 'Summary must treat input as literal data');
    }
  });
}
