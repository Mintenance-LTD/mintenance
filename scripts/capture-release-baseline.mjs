import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Read-only, dependency-free snapshot. Never reads environment files or credentials.
// Usage: node scripts/capture-release-baseline.mjs [path-to-audited-snapshot]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const hash = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');
const files = git('ls-files', '-z').split('\0').filter(Boolean);
const manifest = {
  capturedAt: new Date().toISOString(),
  commit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'),
  dirty: git('status', '--porcelain').length > 0,
  trackedFileCount: files.length,
  requiredNode: readFileSync(resolve(root, '.nvmrc'), 'utf8').trim(),
  lockfileSha256: hash('package-lock.json'),
  migrationFiles: files.filter((file) => /^supabase\/migrations\/.*\.sql$/.test(file))
    .map((file) => ({ file, sha256: hash(file) })),
};
if (process.argv[2]) {
  const snapshot = resolve(process.argv[2]);
  if (!existsSync(resolve(snapshot, 'package.json'))) throw new Error('Snapshot must contain package.json');
  const changed = [], missing = [];
  for (const file of files) {
    const other = resolve(snapshot, file);
    if (!existsSync(other)) { missing.push(file); continue; }
    const current = readFileSync(resolve(root, file));
    const previous = readFileSync(other);
    if (!current.equals(previous) && current.toString('utf8').replace(/\r\n/g, '\n') !== previous.toString('utf8').replace(/\r\n/g, '\n')) changed.push(file);
  }
  manifest.snapshotComparison = { changed, missing, lineEndingsIgnored: true };
}
console.log(JSON.stringify(manifest, null, 2));
