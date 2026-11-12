import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkFile } from './check-internal-links';

test('dynamic prefixes are not complete URLs, while broken literals still fail', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'link-check-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'links.tsx');
  await writeFile(file, `
    <Link href={'/building-assessments/' + selected.id}>Open</Link>
    router.push('/jobs/' + id);
    <Link href="/does-not-exist">Broken</Link>
    <Link href="/jobs">Jobs</Link>
  `);
  const findings = await checkFile(file, ['/jobs', '/jobs/[id]', '/building-assessments/[id]']);
  assert.deepEqual(findings.map(f => f.url), ['/does-not-exist']);
});
