const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');
const root = path.resolve(__dirname, '../..');
const files = ['load-test.yml', 'ml-training-pipeline.yml'];
const workflows = files.map(name => YAML.parse(fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8')));
const shell = process.env.WORKFLOW_TEST_SHELL || 'bash';
for (const [index, workflow] of workflows.entries()) {
  test(`${files[index]} keeps expressions out of executable scripts and has valid shell syntax`, () => {
    for (const job of Object.values(workflow.jobs)) for (const step of job.steps || []) {
      if (step.run) {
        assert.ok(!step.run.includes('${{'), step.name);
        const result = spawnSync(shell, ['-n'], { input: step.run, encoding: 'utf8' });
        assert.equal(result.status, 0, `${step.name}: ${result.error || result.stderr}`);
      }
      if (step.uses?.startsWith('actions/github-script')) assert.ok(!step.with.script.includes('${{'));
    }
  });
}
const target = workflows[0].jobs['smoke-test'].steps.find(step => step.id === 'target');
for (const value of ['https://example.invalid/$(id)', 'https://example.invalid/`id`', 'https://example.invalid/";id;#']) {
  test(`target URL remains literal: ${value}`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-security-'));
    try {
      const output = path.join(dir, 'output').replaceAll('\\', '/');
      const result = spawnSync(shell, ['-c', target.run], { encoding: 'utf8', cwd: dir,
        env: { ...process.env, INPUTS_TARGET_URL: value, SECRETS_STAGING_URL: '', GITHUB_OUTPUT: output } });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.readFileSync(output, 'utf8').trim(), `url=${value}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
test('rejects output-file injection through a multiline URL', () => {
  const result = spawnSync(shell, ['-c', target.run], { encoding: 'utf8',
    env: { ...process.env, INPUTS_TARGET_URL: 'https://example.invalid\nneeds_local_server=true', SECRETS_STAGING_URL: '' } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /single HTTP/);
});
