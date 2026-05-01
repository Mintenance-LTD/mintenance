/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Route-link crawler.
 *
 * 2026-04-30 audit P1 (Confirmed Dead Or Broken Button/Link Actions):
 * the audit listed eight internal `href` / `router.push` targets that
 * pointed at routes which don't exist. All eight were fixed manually;
 * this script enforces the property going forward in CI.
 *
 * Strategy:
 *  - Walk every `.tsx`/`.ts` under `apps/web/app` and
 *    `apps/web/components`.
 *  - Pull every internal route literal from `href="/foo"`,
 *    `router.push('/foo')`, `router.replace('/foo')`,
 *    `redirect('/foo')`, and Next.js `<Link href="/foo">` patterns.
 *  - Walk every directory under `apps/web/app` and build the set of
 *    real Next.js route paths (resolving `[id]` and `[...slug]`
 *    segments to a runtime-matching glob).
 *  - For each extracted link, check it matches at least one real
 *    route. Report mismatches.
 *  - Skip dynamic paths (template literals with ${}) — we can't
 *    statically resolve those.
 *  - Skip external URLs and anchors.
 *
 * Exits 1 on any unresolved finding so the script can run in CI.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const APP_ROOT = path.join(REPO_ROOT, 'apps/web/app');
const COMPONENTS_ROOT = path.join(REPO_ROOT, 'apps/web/components');

// Regex sources to scan. Each captures the literal path string.
const PATH_PATTERNS: RegExp[] = [
  /\bhref\s*=\s*\{?['"](\/[^'"#?]+)['"]\}?/g,
  /\brouter\.(?:push|replace|prefetch)\(\s*['"](\/[^'"]+)['"]/g,
  /\bredirect\(\s*['"](\/[^'"]+)['"]/g,
  /\bpathname\s*:\s*['"](\/[^'"]+)['"]/g,
];

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === 'dist' ||
      entry.name === '__tests__'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))
    ) {
      yield full;
    }
  }
}

async function collectRoutes(): Promise<string[]> {
  const routes: string[] = [];

  async function recurse(dir: string, segs: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let hasPage = false;
    for (const entry of entries) {
      if (
        entry.name === 'page.tsx' ||
        entry.name === 'page.ts' ||
        entry.name === 'page.jsx' ||
        entry.name === 'page.js'
      ) {
        hasPage = true;
      }
    }
    if (hasPage) {
      const route = '/' + segs.filter(Boolean).join('/');
      routes.push(route === '/' ? '/' : route);
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const seg = entry.name;
      let pieceForPath = seg;
      if (seg.startsWith('(') && seg.endsWith(')')) {
        pieceForPath = '';
      }
      await recurse(path.join(dir, seg), [...segs, pieceForPath]);
    }
  }

  await recurse(APP_ROOT, []);
  return routes;
}

function urlMatchesRoute(url: string, route: string): boolean {
  const cleanUrl = url.split(/[?#]/)[0] ?? url;
  const lhs = cleanUrl.replace(/\/+$/, '') || '/';
  const rhs = route.replace(/\/+$/, '') || '/';

  const lhsSegs = lhs === '/' ? [''] : lhs.split('/');
  const rhsSegs = rhs === '/' ? [''] : rhs.split('/');

  for (let i = 0; i < rhsSegs.length; i++) {
    const r = rhsSegs[i] ?? '';
    if (r.startsWith('[...') && r.endsWith(']')) {
      return lhsSegs.length >= i;
    }
    const l = lhsSegs[i];
    if (l === undefined) return false;
    if (r.startsWith('[') && r.endsWith(']')) continue;
    if (r !== l) return false;
  }

  return lhsSegs.length === rhsSegs.length;
}

interface Finding {
  file: string;
  line: number;
  url: string;
  reason: string;
}

/**
 * True when the byte at `index` falls inside a single-line `//`
 * comment or a block comment. References in code comments are
 * documentation, not runtime navigation, so we skip them.
 */
function isInsideComment(text: string, index: number): boolean {
  // Single-line comment heuristic: `//` earlier on the same line.
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const linePrefix = text.slice(lineStart, index);
  if (/(^|[^:'"`])\/\//.test(linePrefix)) return true;

  // Block comment: nearest `/*` is closer than nearest `*/`.
  const lastOpen = text.lastIndexOf('/*', index);
  if (lastOpen === -1) return false;
  const lastClose = text.lastIndexOf('*/', index);
  return lastOpen > lastClose;
}

async function checkFile(file: string, routes: string[]): Promise<Finding[]> {
  const text = await fs.readFile(file, 'utf8');
  const findings: Finding[] = [];

  for (const pattern of PATH_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text))) {
      const url = m[1] ?? '';
      if (url.startsWith('/api/')) continue;
      if (url.startsWith('/_next/') || url.startsWith('/.well-known/'))
        continue;
      // Repo-relative doc paths (e.g. /docs/RETENTION_ROADMAP.md).
      // These are GitHub markdown links, not runtime Next.js routes.
      if (url.startsWith('/docs/') || /\.md(\?|$)/.test(url)) continue;
      if (url.includes('${')) continue;
      if (/^[a-z]+:/i.test(url)) continue;

      const idx = m.index ?? 0;
      // Skip references inside code comments — they're documentation,
      // not runtime navigation.
      if (isInsideComment(text, idx)) continue;

      const matches = routes.some((r) => urlMatchesRoute(url, r));
      if (!matches) {
        const line = text.slice(0, idx).split('\n').length;
        findings.push({
          file: path.relative(REPO_ROOT, file).replace(/\\/g, '/'),
          line,
          url,
          reason: 'Internal URL does not match any registered Next.js route',
        });
      }
    }
  }

  return findings;
}

async function main() {
  console.log('Collecting Next.js route patterns…');
  const routes = await collectRoutes();
  console.log(`  ${routes.length} routes registered.`);

  const allFindings: Finding[] = [];
  let filesScanned = 0;

  for (const root of [APP_ROOT, COMPONENTS_ROOT]) {
    for await (const file of walk(root)) {
      filesScanned++;
      const findings = await checkFile(file, routes);
      allFindings.push(...findings);
    }
  }

  const reportPath = path.join(
    REPO_ROOT,
    'scripts',
    '.internal-links-report.json'
  );
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        filesScanned,
        routesRegistered: routes.length,
        findings: allFindings,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\nScanned ${filesScanned} source files.`);
  console.log(`Report written to ${reportPath}`);

  if (allFindings.length === 0) {
    console.log('All internal links resolve.');
    process.exit(0);
  }

  const dedupKey = (f: Finding) => `${f.file}:${f.line}:${f.url}`;
  const dedupedMap = new Map<string, Finding>();
  for (const f of allFindings) dedupedMap.set(dedupKey(f), f);
  const deduped = Array.from(dedupedMap.values());

  console.log(`\n${deduped.length} broken internal link(s) flagged:`);
  for (const f of deduped.slice(0, 50)) {
    console.log(`  ${f.file}:${f.line}  ->  ${f.url}`);
  }
  if (deduped.length > 50) {
    console.log(`  ...and ${deduped.length - 50} more (see report).`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('check-internal-links threw:', err);
  process.exit(2);
});
