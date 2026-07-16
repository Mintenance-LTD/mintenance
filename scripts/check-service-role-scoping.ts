/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Service-role scoping check.
 *
 * Two related risks are covered:
 *
 * 1. (2026-04-30 audit P1) The `createRequestScopedClient(request) ?? serverSupabase`
 *    fallback: every `userDb` query MUST be scoped by a user/team column or
 *    guarded by an ownership check.
 *
 * 2. (2026-07 audit S1 — NEW) Direct `serverSupabase` usage bypasses RLS
 *    entirely, so authorization rests ONLY on hand-written app checks. The
 *    highest-risk shape is a lookup by a resource id that is NOT the caller's
 *    own id — e.g. `serverSupabase.from('jobs').select().eq('id', params.id)`
 *    — with no ownership predicate. That is a classic IDOR: any authenticated
 *    user can read/mutate another user's row. This guard flags such sites.
 *
 * Heuristic (both cases): a query is considered safe when the surrounding
 * ~30-line window contains at least one of:
 *   - `.eq('<user-scoped-column>', user.id)` style calls
 *   - `.or('payer_id.eq.${user.id},payee_id.eq.${user.id}')` patterns
 *   - `PropertyTeamService.authorize(...)` ownership-service calls
 *   - explicit `homeowner_id !== user.id` style checks
 *   - inserts where the payload sets `<user-scoped-column>: user.id`
 *
 * Admin / cron / webhook routes are exempt (different auth model — admins see
 * all by design; cron/webhook are not user-facing).
 *
 * BASELINE: direct-serverSupabase findings are compared against
 * `scripts/.service-role-scoping-baseline.json`. The guard fails ONLY on
 * findings not already in the baseline (a ratchet) — so it blocks NEW
 * IDOR-prone routes without forcing an annotation of every pre-existing one.
 * Regenerate the baseline with `--update-baseline` after an intentional,
 * reviewed change to the known set.
 *
 * Mark genuine exceptions inline with `// scoping-check: ok — <reason>`.
 *
 * Usage:
 *   npx tsx scripts/check-service-role-scoping.ts
 *   npx tsx scripts/check-service-role-scoping.ts --update-baseline
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROUTES_ROOT = path.join(REPO_ROOT, 'apps/web/app/api');
const BASELINE_PATH = path.join(
  REPO_ROOT,
  'scripts',
  '.service-role-scoping-baseline.json'
);

const SCOPING_PATTERNS: RegExp[] = [
  /\.eq\(\s*['"](?:user_id|owner_id|contractor_id|homeowner_id|payer_id|payee_id|reviewer_id|reviewee_id|sender_id|receiver_id|recipient_id|client_id|created_by|payee_user_id|payer_user_id|user)['"]\s*,\s*user\.id\s*\)/,
  /\.or\(\s*[`'"][^)]*(?:_id\.eq\.\$\{user\.id\}|_id\.eq\.user\.id)[^)]*[`'"]/,
  /PropertyTeamService\.(?:authorize|getRole|canPerform)\(/,
  /[a-zA-Z_]+(?:_id|_owner|_user)\s*(?:===|!==)\s*user\.id/,
  /(?:user_id|owner_id|contractor_id|homeowner_id|payer_id|payee_id|reviewer_id|sender_id|client_id|created_by)\s*:\s*user\.id/,
];

// A lookup by `id` or `<x>_id` whose value is NOT `user.id` — the IDOR shape.
const RISKY_ID_LOOKUP =
  /\.eq\(\s*['"](?:id|[a-z_]+_id)['"]\s*,\s*(?!user[.?])/;

const OPT_OUT_MARKER = /scoping-check\s*:\s*ok/i;

// Routes whose auth model makes per-row ownership scoping N/A.
function isExemptRoute(relFile: string): boolean {
  return (
    relFile.includes('/api/admin/') ||
    relFile.includes('/api/cron/') ||
    relFile.includes('/api/webhooks/') ||
    relFile.includes('/webhook/') ||
    relFile.endsWith('/api/health/route.ts')
  );
}

interface Finding {
  file: string;
  line: number;
  snippet: string;
  kind: 'userDb' | 'serverSupabase';
  reason: string;
}

function findingKey(f: Finding): string {
  return `${f.file}::${f.snippet}`;
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      yield full;
    }
  }
}

function isScopingPresent(window: string): boolean {
  if (OPT_OUT_MARKER.test(window)) return true;
  return SCOPING_PATTERNS.some((re) => re.test(window));
}

async function checkFile(file: string): Promise<Finding[]> {
  const text = await fs.readFile(file, 'utf8');
  const relFile = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
  const usesUserDb = text.includes('createRequestScopedClient');
  const usesServerSupabase = /\bserverSupabase\b/.test(text);
  if (!usesUserDb && !usesServerSupabase) return [];
  if (isExemptRoute(relFile)) return [];

  const lines = text.split(/\r?\n/);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const isUserDbSite =
      /\b(userDb|userClient|scopedDb)\b/.test(line) && /\.from\(/.test(line);
    const isServerSupabaseSite =
      /\bserverSupabase\b/.test(line) &&
      /\.from\(/.test(line) &&
      // Object-storage ops (serverSupabase.storage.from('bucket')) are not
      // table reads and carry their own path-based auth — not an IDOR shape.
      !/\.storage\.from\(/.test(line);
    if (!isUserDbSite && !isServerSupabaseSite) continue;

    const start = Math.max(0, i - 5);
    const end = Math.min(lines.length, i + 25);
    const window = lines.slice(start, end).join('\n');

    if (isUserDbSite) {
      if (!isScopingPresent(window)) {
        findings.push({
          file: relFile,
          line: i + 1,
          snippet: line.trim(),
          kind: 'userDb',
          reason:
            'userDb query with no user-scope filter / ownership check within 30-line window',
        });
      }
      continue;
    }

    // serverSupabase site: only flag the IDOR shape (lookup by a non-own id)
    // that has no scoping in the window.
    if (RISKY_ID_LOOKUP.test(window) && !isScopingPresent(window)) {
      findings.push({
        file: relFile,
        line: i + 1,
        snippet: line.trim(),
        kind: 'serverSupabase',
        reason:
          'serverSupabase lookup by resource id (not user.id) with no ownership check — RLS is bypassed, so this is IDOR-prone',
      });
    }
  }

  return findings;
}

async function loadBaseline(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(BASELINE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { keys?: string[] };
    return new Set(parsed.keys ?? []);
  } catch {
    return new Set();
  }
}

async function main() {
  const updateBaseline = process.argv.includes('--update-baseline');
  const allFindings: Finding[] = [];
  let filesChecked = 0;

  for await (const file of walk(ROUTES_ROOT)) {
    filesChecked++;
    allFindings.push(...(await checkFile(file)));
  }

  await fs.writeFile(
    path.join(REPO_ROOT, 'scripts', '.service-role-scoping-report.json'),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), filesChecked, findings: allFindings },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Scanned ${filesChecked} route files.`);

  if (updateBaseline) {
    const keys = allFindings.map(findingKey).sort();
    await fs.writeFile(
      BASELINE_PATH,
      JSON.stringify(
        {
          note: 'Known service-role scoping findings. The guard fails only on findings NOT listed here. Regenerate with `npx tsx scripts/check-service-role-scoping.ts --update-baseline` after an intentional, reviewed change.',
          generatedAt: new Date().toISOString(),
          count: keys.length,
          keys,
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`Baseline updated: ${keys.length} known finding(s) recorded.`);
    process.exit(0);
  }

  const baseline = await loadBaseline();
  const newFindings = allFindings.filter((f) => !baseline.has(findingKey(f)));

  console.log(
    `${allFindings.length} total finding(s); ${baseline.size} baselined; ${newFindings.length} new.`
  );

  if (newFindings.length === 0) {
    console.log('No new unscoped service-role query sites. OK.');
    process.exit(0);
  }

  console.log(`\n${newFindings.length} NEW unscoped query site(s):`);
  for (const f of newFindings.slice(0, 50)) {
    console.log(`  [${f.kind}] ${f.file}:${f.line}`);
    console.log(`    ${f.snippet}`);
    console.log(`    → ${f.reason}`);
  }
  if (newFindings.length > 50) {
    console.log(`  …and ${newFindings.length - 50} more (see report).`);
  }
  console.log(
    '\nFix by adding an explicit ownership filter (e.g. `.eq(\'homeowner_id\', user.id)`)\n' +
      'or an ownership check before the query, OR an inline `// scoping-check: ok — <reason>`\n' +
      'comment when the scoping happens via a helper this script cannot see. If this is an\n' +
      'intentional, reviewed addition to the known set, regenerate the baseline with\n' +
      '`npx tsx scripts/check-service-role-scoping.ts --update-baseline`.'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('check-service-role-scoping threw:', err);
  process.exit(2);
});
