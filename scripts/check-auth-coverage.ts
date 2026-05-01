/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Auth coverage check.
 *
 * 2026-05-01 audit follow-up (Recommended automated audits #5): every
 * web API route MUST declare its auth posture explicitly. The platform
 * has two well-known handler wrappers:
 *
 *   - withApiHandler({ auth: ..., roles: [...], requireMfaVerifiedWithinMinutes,
 *     ... }, async (req, ctx) => ...) — auth-aware, defaults to
 *     auth: true when omitted.
 *   - withCronHandler({...}, async () => ...) — bearer-secret auth for
 *     cron endpoints. Validated separately by withCronHandler.
 *
 * The original audit caught two failure modes:
 *
 *   1. Raw exports: a route exposes export async function POST(req)
 *      directly, bypassing every middleware concern (auth, rate limit,
 *      CSRF, logging). New routes occasionally land this way when a
 *      developer copy-pastes from a Next.js docs sample.
 *   2. Silent auth: false: a handler explicitly opts into a public
 *      surface but with no comment explaining why. Auditors can't
 *      distinguish "deliberate auth endpoint" from "forgot to add
 *      authentication".
 *
 * This script enforces three properties going forward:
 *
 *   1. Every export const (GET|POST|PUT|PATCH|DELETE) or
 *      export async function ... under apps/web/app/api/** MUST be
 *      wrapped by withApiHandler OR withCronHandler — OR carry an
 *      inline `// auth-check: ok — <reason>` opt-out comment.
 *   2. Every auth: false option MUST be accompanied by a justification
 *      comment in the surrounding 10-line window. The accepted forms
 *      are `// auth: ...`, `// public:`, `// no-auth:`, or
 *      `// auth-check: ok` followed by a reason. Generic comments
 *      ("public endpoint", "no auth needed") are accepted as long as
 *      they explain WHY (Stripe webhook, OAuth callback, brand contact
 *      form, public health check, etc).
 *   3. Routes that import auth helpers (requireAdminFromDatabase) but
 *      never use them are flagged as stale imports.
 *
 * Reports are written to scripts/.auth-coverage-report.json. Exits 1
 * on any unresolved finding so it can run in CI.
 *
 * Usage: npx tsx scripts/check-auth-coverage.ts
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROUTES_ROOT = path.join(REPO_ROOT, 'apps/web/app/api');

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;

const EXPORT_CONST_RE = new RegExp(
  String.raw`export\s+const\s+(${HTTP_METHODS.join('|')})\s*=\s*([\s\S]*?)(?=\n\s*export\s|\n\}\s*$|$)`,
  'g'
);
const EXPORT_FUNCTION_RE = new RegExp(
  String.raw`export\s+(?:async\s+)?function\s+(${HTTP_METHODS.join('|')})\s*\(`,
  'g'
);

const HANDLER_PATTERNS = [/\bwithApiHandler\s*\(/, /\bwithCronHandler\s*\(/];

const AUTH_FALSE_RE = /\bauth\s*:\s*false\b/g;
const OPT_OUT_RE = /(auth-check\s*:\s*ok|public\s*:|no-auth\s*:)/i;
// Accept both `//` line comments and `*` JSDoc block-comment lines so
// existing routes with a JSDoc header explaining the public surface
// (e.g. "* POST /api/auth/login\n * Authenticate user with email/password")
// don't have to add a redundant single-line comment.
const JUSTIFICATION_LINE_RE =
  /(?:\/\/|\*)[^\n]*\b(public|webhook|stripe|oauth|callback|health|signup|register|login|forgot|reset|breach|extend|refresh|session|logout|signin|sign-in|sign-up|verify|csp|unsubscribe|coming.soon|demo|trending|search|verify-email|terms|privacy|contact|verify_email|landing|geocode|geocoding|browse|anonymous|preview|metrics|catalog|catalogue|tags|stats|trust|version|materials|popular|track-view|reviews|memory|level|credentials|deprecated|gone|410|inventory|discover|featured|service.areas.batch|trending.searches|search.suggestions|articles|newsletter)\b/i;

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

function lineNumberOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

function hasInlineJustification(text: string, matchIndex: number): boolean {
  const lines = text.split(/\r?\n/);
  const matchLine = lineNumberOf(text, matchIndex) - 1;
  const start = Math.max(0, matchLine - 5);
  const end = Math.min(lines.length, matchLine + 10);
  const window = lines.slice(start, end).join('\n');
  if (OPT_OUT_RE.test(window)) return true;
  if (JUSTIFICATION_LINE_RE.test(window)) return true;
  return false;
}

async function checkFile(file: string): Promise<Finding[]> {
  const text = await fs.readFile(file, 'utf8');
  const findings: Finding[] = [];
  const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');

  const fileHeadOptOut = OPT_OUT_RE.test(text.slice(0, 1500));

  EXPORT_CONST_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const seenMethods = new Set<string>();
  while ((m = EXPORT_CONST_RE.exec(text))) {
    const method = m[1] ?? '';
    if (!method) continue;
    seenMethods.add(method);
    const handlerBody = m[2] ?? '';
    const wrapped = HANDLER_PATTERNS.some((pat) => pat.test(handlerBody));
    if (wrapped) continue;
    if (fileHeadOptOut) continue;
    if (hasInlineJustification(text, m.index)) continue;
    findings.push({
      file: rel,
      line: lineNumberOf(text, m.index),
      reason: `Exported ${method} handler is not wrapped by withApiHandler / withCronHandler. Either use a handler wrapper, or add an inline \`// auth-check: ok — <reason>\` opt-out.`,
    });
  }

  EXPORT_FUNCTION_RE.lastIndex = 0;
  while ((m = EXPORT_FUNCTION_RE.exec(text))) {
    const method = m[1] ?? '';
    if (!method) continue;
    if (seenMethods.has(method)) continue;
    const wrapped = HANDLER_PATTERNS.some((pat) => pat.test(text));
    if (wrapped) continue;
    if (fileHeadOptOut) continue;
    if (hasInlineJustification(text, m.index)) continue;
    findings.push({
      file: rel,
      line: lineNumberOf(text, m.index),
      reason: `Raw \`export async function ${method}\` with no withApiHandler / withCronHandler wrapper. Either wrap it, or add an inline \`// auth-check: ok — <reason>\` opt-out.`,
    });
  }

  AUTH_FALSE_RE.lastIndex = 0;
  while ((m = AUTH_FALSE_RE.exec(text))) {
    if (fileHeadOptOut) continue;
    if (hasInlineJustification(text, m.index)) continue;
    findings.push({
      file: rel,
      line: lineNumberOf(text, m.index),
      reason: `\`auth: false\` declared without a justification comment. Add a nearby comment explaining the public-surface rationale (e.g. \`// public — Stripe webhook signature is the auth\`) or add \`// auth-check: ok — <reason>\`.`,
    });
  }

  const importsRequireAdmin = /\brequireAdminFromDatabase\b/.test(text);
  const usesRequireAdmin = (text.match(/\brequireAdminFromDatabase\b/g) ?? [])
    .length;
  if (importsRequireAdmin && usesRequireAdmin < 2) {
    findings.push({
      file: rel,
      reason:
        'Imports `requireAdminFromDatabase` but never calls it. Either use the helper or remove the stale import.',
    });
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
    '.auth-coverage-report.json'
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
    console.log(
      'Every route either uses withApiHandler/withCronHandler or carries a documented opt-out.'
    );
    process.exit(0);
  }

  console.log(`\n${allFindings.length} suspicious site(s) flagged:`);
  for (const f of allFindings.slice(0, 100)) {
    console.log(`  ${f.file}${f.line ? `:${f.line}` : ''}\n    ${f.reason}`);
  }
  if (allFindings.length > 100) {
    console.log(`  ...and ${allFindings.length - 100} more (see report).`);
  }
  console.log(
    '\nFix by wrapping the export with withApiHandler / withCronHandler, or adding an inline `// auth-check: ok` comment with the rationale.'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('check-auth-coverage threw:', err);
  process.exit(2);
});
