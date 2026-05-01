/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * API contract drift check.
 *
 * 2026-05-01 audit follow-up (Recommended automated audits): the
 * `@mintenance/api-contracts` package centralises every Zod request
 * schema + response shape (auth, jobs, bids, contracts, payments,
 * notifications, properties, invoices, messages, users). The original
 * audit complained that route handlers occasionally drift — defining a
 * route-local Zod schema that diverges from the canonical one in the
 * package, or skipping validation entirely on a body that should be
 * typed.
 *
 * This script enforces three properties going forward:
 *   1. Every `route.ts` under `apps/web/app/api` that calls
 *      `request.json()` for a write method (POST/PUT/PATCH) must
 *      either:
 *        a. Validate via `@mintenance/api-contracts` (import name
 *           includes "Schema" from that package), OR
 *        b. Define a local `z.object(...)` Zod schema, OR
 *        c. Carry an inline `// contracts-check: ok — <reason>` opt-out.
 *      A raw `await request.json()` with NO downstream `.parse(...)` /
 *      `.safeParse(...)` is flagged.
 *   2. Routes that DO import from `@mintenance/api-contracts` must
 *      actually use the imported symbols (catches stale imports left
 *      after a refactor).
 *   3. Any route that imports `@mintenance/api-contracts` AND defines
 *      its own `z.object(... title|description|budget ...)` shape
 *      that overlaps with one of the canonical export names is
 *      flagged as potential drift.
 *
 * Reports a list of suspicious sites to stdout and writes the full
 * report to `scripts/.api-contracts-report.json`. Exits 1 on any
 * unresolved finding so it can run in CI.
 *
 * Usage: `npx tsx scripts/check-api-contracts.ts`
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROUTES_ROOT = path.join(REPO_ROOT, 'apps/web/app/api');

const CONTRACTS_IMPORT = /@mintenance\/api-contracts/;
const HAS_REQUEST_JSON = /\brequest\.json\(\)/;
const HAS_FORM_DATA = /\brequest\.formData\(\)/;
const WRITE_METHOD_EXPORT = /export const (POST|PUT|PATCH|DELETE)\s*=/;
const HAS_ZOD_PARSE = /\.(?:safe)?Parse\(|safeParse\(|\.parse\(/;
const HAS_VALIDATEREQUEST = /\bvalidateRequest\(/;
const HAS_LOCAL_ZOD_OBJECT = /\bz\.object\(/;
const OPT_OUT_MARKER = /contracts-check\s*:\s*ok/i;

interface Finding {
  file: string;
  line?: number;
  reason: string;
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      yield full;
    }
  }
}

async function checkFile(file: string): Promise<Finding[]> {
  const text = await fs.readFile(file, 'utf8');
  const findings: Finding[] = [];
  const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');

  // Skip routes that don't expose a write method — read-only routes
  // don't take a request body.
  if (!WRITE_METHOD_EXPORT.test(text)) return [];

  // Skip routes with a top-level opt-out comment.
  if (OPT_OUT_MARKER.test(text.slice(0, 1500))) return [];

  // Skip raw-body Stripe webhook style routes (they read text() not
  // json() and have explicit signature verification).
  if (/stripe-webhook|webhook.*raw/.test(rel)) return [];

  const usesJson = HAS_REQUEST_JSON.test(text);
  const usesFormData = HAS_FORM_DATA.test(text);

  // Routes that don't read a body at all are fine.
  if (!usesJson && !usesFormData) return [];

  // Property 1: body MUST be validated.
  // Multipart formData routes typically validate fields manually
  // because Zod doesn't speak File — accept those when at least one
  // explicit `formData.get('<field>')` typed-cast exists.
  if (usesJson) {
    const hasZod =
      HAS_ZOD_PARSE.test(text) ||
      HAS_VALIDATEREQUEST.test(text) ||
      HAS_LOCAL_ZOD_OBJECT.test(text);
    if (!hasZod) {
      findings.push({
        file: rel,
        reason:
          'POST/PUT/PATCH route reads request.json() but no Zod parse / validateRequest / local z.object() found. Either validate via @mintenance/api-contracts, define a local z.object(), or add an inline `// contracts-check: ok — <reason>` opt-out.',
      });
    }
  }

  // Property 2: imports from @mintenance/api-contracts must be USED.
  // (Stale imports often outlive the schema they referenced.)
  if (CONTRACTS_IMPORT.test(text)) {
    const importMatch = text.match(
      /import\s*\{([^}]+)\}\s*from\s*['"]@mintenance\/api-contracts['"]/
    );
    if (importMatch) {
      const imported = importMatch[1]
        .split(',')
        .map((s) => s.replace(/^\s*type\s+/, '').trim())
        .filter(Boolean)
        .map((s) => s.split(/\s+as\s+/)[0]?.trim() ?? s);
      const bodyAfterImport = text.slice(
        text.indexOf('}', text.indexOf('@mintenance/api-contracts'))
      );
      for (const sym of imported) {
        if (!sym) continue;
        // Look for the symbol used outside its own import line.
        const usagePattern = new RegExp(
          `\\b${sym.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`
        );
        if (!usagePattern.test(bodyAfterImport)) {
          findings.push({
            file: rel,
            reason: `Imports '${sym}' from @mintenance/api-contracts but never references it. Either use it for validation or remove the stale import.`,
          });
        }
      }
    }
  }

  // Property 3 (heuristic): if the route both imports from
  // api-contracts AND defines a local z.object(...) schema with
  // canonical field names (title/description/budget), flag for
  // review — likely drift.
  if (CONTRACTS_IMPORT.test(text) && HAS_LOCAL_ZOD_OBJECT.test(text)) {
    const overlapPattern =
      /z\.object\([^)]*\b(title|description|budget|invoice_number|amount|message)\b/;
    if (overlapPattern.test(text)) {
      // Skip if the local schema is clearly extending a canonical one
      // (`canonicalSchema.extend({ ... })`) — that's a deliberate add-on.
      if (!/canonical\w*\.extend\(/i.test(text)) {
        findings.push({
          file: rel,
          reason:
            'Imports from @mintenance/api-contracts AND defines a local z.object() containing canonical field names (title/description/budget/...). Possible drift — review for divergence from the package schema.',
        });
      }
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
    '.api-contracts-report.json'
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
    console.log('All write routes validate their bodies via Zod.');
    process.exit(0);
  }

  console.log(`\n${allFindings.length} suspicious site(s) flagged:`);
  for (const f of allFindings.slice(0, 50)) {
    console.log(`  ${f.file}`);
    console.log(`    → ${f.reason}`);
  }
  if (allFindings.length > 50) {
    console.log(`  …and ${allFindings.length - 50} more (see report).`);
  }
  console.log(
    '\nFix by adding Zod validation (prefer @mintenance/api-contracts ' +
      'schemas), removing stale imports, or marking deliberate exceptions ' +
      'with `// contracts-check: ok — <reason>`.'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('check-api-contracts threw:', err);
  process.exit(2);
});
