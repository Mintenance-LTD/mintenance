const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const target = path.join(root, 'output/readiness-stack');
if (fs.existsSync(target))
  throw new Error(
    'Readiness stack already exists; refusing to overwrite local data.'
  );
const migrations = path.join(root, 'supabase/migrations');
const files = fs
  .readdirSync(migrations)
  .filter((name) => name.endsWith('.sql'))
  .sort();
let config = fs
  .readFileSync(path.join(root, 'supabase/config.toml'), 'utf8')
  .replace(/^project_id = ".*"/m, 'project_id = "mintenance-readiness"')
  .replace(/543(\d\d)/g, '573$1');
for (const section of [
  'db.seed',
  'db.pooler',
  'studio',
  'analytics',
  'edge_runtime',
]) {
  const escaped = section.replaceAll('.', '\\.');
  config = config.replace(
    new RegExp('(\\[' + escaped + '\\]\\s*[^[]*?enabled = )true'),
    '$1false'
  );
}
fs.mkdirSync(path.join(target, 'supabase'), { recursive: true });
fs.writeFileSync(path.join(target, 'supabase/config.toml'), config);
fs.cpSync(migrations, path.join(target, 'supabase/migrations'), {
  recursive: true,
});
const hash = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest = {
  createdAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  workingTreeChanges: execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  })
    .trim()
    .split('\n'),
  node: fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim(),
  packageManager: JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  ).packageManager,
  supabaseCli: '2.119.0',
  lockfileSha256: hash(path.join(root, 'package-lock.json')),
  projectId: 'mintenance-readiness',
  apiUrl: 'http://127.0.0.1:57321',
  seeded: false,
  migrations: files.map((name) => ({
    name,
    sha256: hash(path.join(migrations, name)),
  })),
};
fs.writeFileSync(
  path.join(target, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);
console.log(
  `Prepared isolated readiness stack: ${files.length} migrations, no seed data, API port 57321.`
);
