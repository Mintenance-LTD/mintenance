/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Service-role-fallback scoping check.
 *
 * 2026-04-30 audit P1 (Service Role Fallback Requires Route-Level
 * Discipline): every route that does
 *   const userDb = createRequestScopedClient(request) ?? serverSupabase;
 * MUST follow it with queries that explicitly scope by a user/team
 * column (or perform an ownership check before mutating). This script
 * walks every `route.ts` under `apps/web/app/api`, finds each `userDb` query, and
 * flags any that doesn't appear to be scoped.
 *
 * Heuristic: a query is considered scoped when the surrounding 30-line
 * window contains at least one of:
 *   - `.eq('<user-scoped-column>', user.id)` style calls
 *   - `.or('payer_id.eq.${user.id},payee_id.eq.${user.id}')` patterns
 *   - `PropertyTeamService.authorize(...)` ownership-service calls
 *   - explicit `homeowner_id !== user.id` style checks
 *   - inserts where the payload sets `<user-scoped-column>: user.id`
 *
 * Reports a list of suspicious sites to stdout and writes the full
 * report to `scripts/.service-role-scoping-report.json`. Exits 1 on
 * any unresolved finding so it can run in CI.
 *
 * Usage: `npx tsx scripts/check-service-role-scoping.ts`
 *
 * NOTE: this is a heuristic. False positives are possible (e.g. a
 * helper function does the scoping). Mark genuine exceptions inline
 * with `// scoping-check: ok — <reason>` and the script will skip
 * the site.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROUTES_ROOT = path.join(REPO_ROOT, 'apps/web/app/api');

const SCOPING_PATTERNS: RegExp[] = [
  // .eq('<user-scoped-column>', user.id) and similar
  /\.eq\(\s*['"](?:user_id|owner_id|contractor_id|homeowner_id|payer_id|payee_id|reviewer_id|reviewee_id|sender_id|receiver_id|recipient_id|client_id|created_by|payee_user_id|payer_user_id|user)['"]\s*,\s*user\.id\s*\)/,
  // .or('foo_id.eq.${user.id},bar_id.eq.${user.id}')
  /\.or\(\s*[`'"][^)]*(?:_id\.eq\.\$\{user\.id\}|_id\.eq\.user\.id)[^)]*[`'"]/,
  // PropertyTeamService.authorize(user.id, …)
  /PropertyTeamService\.(?:authorize|getRole|canPerform)\(/,
  // Inline ownership check: `=== user.id` / `!== user.id`
  /[a-zA-Z_]+(?:_id|_owner|_user)\s*(?:===|!==)\s*user\.id/,
  // Insert payload that sets <col>: user.id
  /(?:user_id|owner_id|contractor_id|homeowner_id|payer_id|payee_id|reviewer_id|sender_id|client_id|created_by)\s*:\s*user\.id/,
  // .in('<col>', ids) where ids was previously user-scoped (covered by
  // the earlier query on the same path — heuristic: presence of an
  // earlier .eq is checked separately at the file level)
];

const OPT_OUT_MARKER = /scoping-check\s*:\s*ok/i;

interface Finding {
  file: string;
  line: number;
  snippet: string;
  reason: string;
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
  if (!text.includes('createRequestScopedClient')) return [];

  const lines = text.split(/\r?\n/);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    // Find every `userDb.from(...)` mutation/read.
    // We're looking for queries that follow the userDb pattern and
    // therefore inherit the service-role-fallback risk.
    if (
      !/\b(userDb|userClient|scopedDb)\b/.test(line) ||
      !/\.from\(/.test(line)
    ) {
      continue;
    }
    // Build a 30-line window around the query.
    const start = Math.max(0, i - 5);
    const end = Math.min(lines.length, i + 25);
    const window = lines.slice(start, end).join('\n');

    if (!isScopingPresent(window)) {
      findings.push({
        file: path.relative(REPO_ROOT, file).replace(/\\/g, '/'),
        line: i + 1,
        snippet: line.trim(),
        reason:
          'No user-scope filter / ownership check / PropertyTeamService call detected within 30-line window',
      });
    }
  }

  return findings;
}

async function main() {
  const allFindings: Finding[] = [];
  let filesChecked = 0;

  for await (const file of walk(ROUTES_ROOT)) {
    filesChecked++;
    const findings = await checkFile(file);
    allFindings.push(...findings);
  }

  const reportPath = path.join(
    REPO_ROOT,
    'scripts',
    '.service-role-scoping-report.json'
  );
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        filesChecked,
        findings: allFindings,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Scanned ${filesChecked} route files.`);
  console.log(`Report written to ${reportPath}`);

  if (allFindings.length === 0) {
    console.log('All `userDb` queries are scoped or opted out.');
    process.exit(0);
  }

  console.log(`\n${allFindings.length} unscoped query site(s) flagged:`);
  for (const f of allFindings.slice(0, 50)) {
    console.log(`  ${f.file}:${f.line}`);
    console.log(`    ${f.snippet}`);
    console.log(`    → ${f.reason}`);
  }
  if (allFindings.length > 50) {
    console.log(`  …and ${allFindings.length - 50} more (see report).`);
  }
  console.log(
    '\nFix by adding an explicit user-scope filter (e.g. ' +
      "`.eq('contractor_id', user.id)`), an ownership check, OR an " +
      'inline `// scoping-check: ok — <reason>` comment when the ' +
      "scoping happens via a helper this script can't see."
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('check-service-role-scoping threw:', err);
  process.exit(2);
});
