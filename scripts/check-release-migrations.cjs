const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function digest(source) {
  return createHash('sha256')
    .update(source.replace(/\r\n/g, '\n'))
    .digest('hex');
}

function requiredMigrations(root) {
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, 'supabase/release-baseline.json'), 'utf8')
  );
  const directory = path.join(root, 'supabase/migrations');
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const required = [];
  for (const file of files) {
    const match = /^(\d+)_(.+)\.sql$/.exec(file);
    if (!match) throw new Error('Invalid migration filename: ' + file);
    if (Object.hasOwn(baseline.files, file)) {
      if (
        digest(fs.readFileSync(path.join(directory, file), 'utf8')) !==
        baseline.files[file]
      )
        throw new Error(
          'Historical migration changed; add a new migration: ' + file
        );
    } else {
      if (
        files.filter(
          (other) => other.slice(other.indexOf('_') + 1, -4) === match[2]
        ).length !== 1
      )
        throw new Error('Duplicate migration name: ' + file);
      required.push({ version: match[1], name: match[2] });
    }
  }
  for (const file of Object.keys(baseline.files))
    if (!files.includes(file))
      throw new Error('Historical migration removed: ' + file);
  return [...baseline.required, ...required];
}

function verifyApplied(required, rows) {
  if (
    !Array.isArray(rows) ||
    !rows.every(
      (row) => typeof row.version === 'string' && typeof row.name === 'string'
    )
  )
    throw new Error('Invalid migration response');
  // Supabase MCP records its own timestamp. A unique descriptive name is
  // accepted as well as the original file version, which must have the same name.
  const missing = required.filter(
    (item) =>
      !rows.some(
        (row) =>
          row.name === item.name &&
          (row.version === item.version ||
            rows.filter((other) => other.name === item.name).length === 1)
      )
  );
  if (missing.length)
    throw new Error(
      'Database migrations missing: ' +
        missing.map((item) => item.name).join(', ')
    );
  return required.length;
}

async function checkRelease({
  env = process.env,
  root = path.resolve(__dirname, '..'),
  request = fetch,
} = {}) {
  const production = env.VERCEL_ENV === 'production';
  if (!production && env.REQUIRE_SCHEMA_CHECK !== 'true')
    return { skipped: true };
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');
  const expected = production
    ? 'ukrjudtlvapiajkjbcrd.supabase.co'
    : 'pzothyoipifjwnypzcuv.supabase.co';
  if (
    url.protocol !== 'https:' ||
    url.hostname !== expected ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Release database target mismatch');
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('Missing release database credential');
  const required = requiredMigrations(root);
  const response = await request(
    new URL('/rest/v1/rpc/release_migration_status', url),
    {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
    }
  );
  if (!response.ok)
    throw new Error(
      'Migration preflight unavailable (HTTP ' + response.status + ')'
    );
  return {
    checked: verifyApplied(required, await response.json()),
    target: expected,
  };
}
module.exports = { checkRelease, requiredMigrations, verifyApplied, digest };
if (require.main === module)
  checkRelease()
    .then((result) => {
      console.log(
        result.skipped
          ? 'Schema check: non-production build (not requested)'
          : 'Schema check passed: ' +
              result.checked +
              ' required migrations on ' +
              result.target
      );
    })
    .catch((error) => {
      // Do not print provider bodies, credentials, or fetch causes.
      console.error(
        'Release blocked: ' +
          (/fetch|network/i.test(error.message)
            ? 'database preflight failed'
            : error.message)
      );
      process.exitCode = 1;
    });
