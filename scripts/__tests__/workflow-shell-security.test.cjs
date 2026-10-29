const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');
const root = path.resolve(__dirname, '../..');
const files = ['load-test.yml', 'ml-training-pipeline.yml'];
const workflows = files.map((name) =>
  YAML.parse(
    fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8')
  )
);
const shell = process.env.WORKFLOW_TEST_SHELL || 'bash';
for (const [index, workflow] of workflows.entries()) {
  test(`${files[index]} keeps expressions out of executable scripts and has valid shell syntax`, () => {
    for (const job of Object.values(workflow.jobs))
      for (const step of job.steps || []) {
        if (step.run) {
          assert.ok(!step.run.includes('${{'), step.name);
          const result = spawnSync(shell, ['-n'], {
            input: step.run,
            encoding: 'utf8',
          });
          assert.equal(
            result.status,
            0,
            `${step.name}: ${result.error || result.stderr}`
          );
        }
        if (step.uses?.startsWith('actions/github-script'))
          assert.ok(!step.with.script.includes('${{'));
      }
  });
}
// Exercise the current validator from the actual workflow, not the removed
// target-output step. Input remains environment data; no request is sent.
const smoke = workflows[0].jobs['smoke-test'];
const validation = smoke.steps.find(
  (step) => step.name === 'Validate staging configuration'
);
function validateTarget(value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-security-'));
  const marker = path.join(dir, 'injected');
  try {
    const result = spawnSync(shell, ['-c', validation.run], {
      encoding: 'utf8',
      cwd: path.join(root, validation['working-directory']),
      env: {
        ...process.env,
        BASE_URL: value,
        VUS: '1',
        TEST_USER_EMAIL: 'fixture@example.invalid',
        TEST_USER_PASSWORD: 'fixture-only',
        PROBE_FILE: marker.replaceAll('\\', '/'),
      },
    });
    assert.ifError(result.error);
    assert.equal(
      fs.existsSync(marker),
      false,
      'Target URL executed a shell command'
    );
    return result;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('staging validation receives target input through the job environment', () => {
  assert.equal(
    smoke.env.BASE_URL,
    '${{ inputs.target_url || secrets.STAGING_URL }}'
  );
  assert.ok(
    validation,
    'The workflow must validate the target before running k6'
  );
  assert.ok(
    smoke.steps.indexOf(validation) <
      smoke.steps.findIndex((step) => step.id === 'smoke')
  );
  for (const value of [
    'https://staging.example.invalid',
    'http://127.0.0.1:1234',
  ]) {
    const result = validateTarget(value);
    assert.equal(result.status, 0, result.stderr);
  }
});

for (const value of [
  'https://example.invalid/$(printf injected > "$PROBE_FILE")',
  'https://example.invalid/`printf injected > "$PROBE_FILE"`',
  'https://example.invalid/"; printf injected > "$PROBE_FILE"; #',
]) {
  test('rejects shell payload in target URL: ' + value, () => {
    const result = validateTarget(value);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /BASE_URL must be an HTTP/);
  });
}

test('rejects a multiline target URL before k6 execution', () => {
  const result = validateTarget(
    'https://example.invalid\nneeds_local_server=true'
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /BASE_URL must be an HTTP/);
});
