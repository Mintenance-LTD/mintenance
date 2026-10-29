'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const YAML = require('yaml');

const root = path.resolve(__dirname, '../..');
const targets = {
  'mobile-build.yml': ['pre-build-checks', 'build-android', 'build-ios'],
  'ci-cd.yml': ['build-staging', 'build-production'],
  'deploy-staging.yml': ['build-mobile-staging'],
};

for (const [file, jobs] of Object.entries(targets)) {
  const workflow = YAML.parse(
    readFileSync(path.join(root, '.github/workflows', file), 'utf8'),
    { uniqueKeys: true }
  );
  for (const jobName of jobs) {
    test(`${file}/${jobName}: CPU install retains lifecycle scripts and verifies inference`, () => {
      const job = workflow.jobs[jobName];
      const installIndex = job.steps.findIndex(
        (step) => step.name === 'Install dependencies'
      );
      const install = job.steps[installIndex];
      assert.equal(install.run, 'npm ci --ignore-scripts=false');
      assert.equal(install.env.ONNXRUNTIME_NODE_INSTALL, 'skip');
      assert.equal(install['continue-on-error'], undefined);
      const verify = job.steps[installIndex + 1];
      assert.equal(verify.run, 'node scripts/ci/verify-onnx-cpu.cjs');
      assert.equal(verify['timeout-minutes'], 1);
      assert.equal(verify['continue-on-error'], undefined);
      // The override must not leak into EAS config/submission or remote builds.
      assert.equal(workflow.env?.ONNXRUNTIME_NODE_INSTALL, undefined);
      assert.equal(job.env?.ONNXRUNTIME_NODE_INSTALL, undefined);
      for (const step of job.steps.filter((step) => step !== install)) {
        assert.equal(step.env?.ONNXRUNTIME_NODE_INSTALL, undefined);
      }
    });
  }
}

for (const skip of [false, true]) {
  test(`real ONNX installer on simulated Linux: ${skip ? 'skip prevents download' : 'default requests optional CUDA download'}`, () => {
    // Exercise the installed upstream entrypoint in an isolated process. Replace
    // only platform discovery and the download boundary; no network or EAS calls.
    const script = `
      const os = require('node:os');
      os.platform = () => 'linux';
      os.arch = () => 'x64';
      const installer = require.resolve('onnxruntime-node/script/install.js');
      const path = require('node:path');
      const fs = require('node:fs');
      const exists = fs.existsSync;
      fs.existsSync = (file) => String(file).includes('bin/napi-v6/linux/x64') ? false : exists(file);
      const utils = require(path.join(path.dirname(installer), 'install-utils.js'));
      utils.installPackages = () => process.exit(97);
      require(installer);
    `;
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (/onnxruntime|npm_config_local_prefix|npm_package_json/i.test(key)) {
        delete env[key];
      }
    }
    if (skip) env.ONNXRUNTIME_NODE_INSTALL = 'skip';
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, skip ? 0 : 97, result.stderr);
  });
}
