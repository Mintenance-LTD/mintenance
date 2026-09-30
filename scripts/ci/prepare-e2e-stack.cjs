const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve('output/e2e-stack');
if (fs.existsSync(target)) throw new Error('Disposable E2E directory already exists; refusing to overwrite it.');
fs.mkdirSync(path.join(target, 'supabase'), { recursive: true });
let config = fs.readFileSync('supabase/config.toml', 'utf8')
  .replace(/project_id = ".*"/, 'project_id = "mintenance-e2e-ci"')
  .replace(/543(\d\d)/g, '563$1')
  .replace(/(\[db.seed\]\s*[^[]*?enabled = )true/, '$1false');
for (const section of ['db.pooler', 'studio', 'analytics', 'edge_runtime']) {
  const escaped = section.replace('.', '\\.');
  config = config.replace(new RegExp('(\\[' + escaped + '\\]\\s*[^[]*?enabled = )true'), '$1false');
}
fs.writeFileSync(path.join(target, 'supabase/config.toml'), config);
fs.cpSync('supabase/migrations', path.join(target, 'supabase/migrations'), { recursive: true });
console.log('Prepared disposable E2E stack with repository migrations and no production data.');
