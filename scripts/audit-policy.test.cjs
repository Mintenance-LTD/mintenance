const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { npmAudit } = require('audit-ci');

const policy = require('jju').parse(
  fs.readFileSync(path.join(__dirname, '../audit-ci.jsonc'), 'utf8')
);
const advisory = 'GHSA-86w9-cpqp-85rv';
const leaf = `${advisory}|node-forge`;

// Use audit-ci's real npm-v2 parser and default fail/pass reporter, with a local
// npm executable fixture instead of a registry request. This test file runs in
// its own Node test worker; PATH is restored after each sequential invocation.
async function audit(
  t,
  { config = policy, id = advisory, name = 'node-forge', effect } = {}
) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mintenance-audit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const vulnerabilities = {
    [name]: {
      name,
      severity: 'high',
      isDirect: false,
      via: [
        {
          source: 1240912,
          name,
          severity: 'high',
          url: `https://github.com/advisories/${id}`,
        },
      ],
      effects: effect ? [effect] : [],
      nodes: [`node_modules/${name}`],
      range: '<=1.4.0',
      fixAvailable: false,
    },
  };
  if (effect)
    vulnerabilities[effect] = {
      name: effect,
      severity: 'high',
      isDirect: true,
      via: [name],
      effects: [],
    };
  const report = { auditReportVersion: 2, vulnerabilities, metadata: {} };
  const fixturePath = path.join(directory, 'report.cjs');
  fs.writeFileSync(
    fixturePath,
    `process.stdout.write(${JSON.stringify(JSON.stringify(report))});`
  );
  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(directory, 'npm.cmd'),
      `@echo off\r\n"${process.execPath}" "${fixturePath}"\r\n`
    );
  } else {
    const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
    fs.writeFileSync(
      path.join(directory, 'npm'),
      `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(fixturePath)}\n`,
      { mode: 0o700 }
    );
  }
  const previousPath = process.env.PATH;
  process.env.PATH = directory + path.delimiter + (previousPath ?? '');
  try {
    return await npmAudit({
      ...config,
      directory,
      'package-manager': 'npm',
      'report-type': 'summary',
      'show-not-found': false,
      'show-found': false,
    });
  } finally {
    process.env.PATH = previousPath;
  }
}

test('reproduces the CI failure with only the old Expo ancestry exceptions', async (t) => {
  const config = {
    ...policy,
    allowlist: policy.allowlist.filter((entry) => !entry[leaf]),
  };
  await assert.rejects(audit(t, { config }), /Failed security audit/);
});

test('accepts the reviewed advisory when npm v2 omits its transitive effects', async (t) => {
  const result = await audit(t);
  assert.deepEqual(result.failedLevelsFound, []);
  assert.ok(result.allowlistedPathsFound.includes(leaf));
});

test('a different advisory on node-forge still blocks the security gate', async (t) => {
  await assert.rejects(
    audit(t, { id: 'GHSA-2222-3333-4444' }),
    /Failed security audit/
  );
});

test('the same advisory on an unreviewed package still blocks', async (t) => {
  await assert.rejects(
    audit(t, { name: 'unreviewed-package' }),
    /Failed security audit/
  );
});

test('the same advisory through an unreviewed consumer still blocks', async (t) => {
  await assert.rejects(
    audit(t, { effect: 'unreviewed-consumer' }),
    /Failed security audit/
  );
});

test('expired or inactive leaf exceptions fail closed', async (t) => {
  for (const change of [{ expiry: '2000-01-01' }, { active: false }]) {
    const config = {
      ...policy,
      allowlist: policy.allowlist.map((entry) =>
        entry[leaf] ? { [leaf]: { ...entry[leaf], ...change } } : entry
      ),
    };
    await assert.rejects(audit(t, { config }), /Failed security audit/);
  }
});
