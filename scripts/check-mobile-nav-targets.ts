/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Mobile navigation target validator.
 *
 * 2026-04-30 audit P0 (Mobile Navigation Contains Unregistered Modal
 * Routes): the audit listed seven `navigation.navigate(...)` calls
 * pointing at React Navigation routes that aren't registered. All
 * seven were fixed manually; this script enforces the property
 * going forward in CI.
 *
 * Strategy:
 *  - Parse `apps/mobile/src/navigation/types.ts` for every screen
 *    name across all ParamLists.
 *  - Walk every `.tsx`/`.ts` under `apps/mobile/src` and pull every
 *    literal first argument to `*.navigate(...)`.
 *  - Verify each extracted name appears in the union.
 *  - Skip dynamic strings (template literals, variables) and
 *    references inside code comments.
 *
 * Exits 1 on any unresolved target so the script can run in CI.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const MOBILE_SRC = path.join(REPO_ROOT, 'apps/mobile/src');
const NAV_TYPES = path.join(MOBILE_SRC, 'navigation', 'types.ts');

const NAV_PATTERNS: RegExp[] = [
  /\.navigate\(\s*['"]([A-Z][A-Za-z0-9_]+)['"]/g,
  /\.navigate\(\s*['"]([A-Z][A-Za-z0-9_]+)['"]\s*as\s+never\s*[),]/g,
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
      entry.name === 'dist' ||
      entry.name === '__tests__' ||
      entry.name === '.expo' ||
      entry.name === '.tamagui'
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

function isInsideComment(text: string, index: number): boolean {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  const linePrefix = text.slice(lineStart, index);
  if (/(^|[^:'"`])\/\//.test(linePrefix)) return true;
  const lastOpen = text.lastIndexOf('/*', index);
  if (lastOpen === -1) return false;
  const lastClose = text.lastIndexOf('*/', index);
  return lastOpen > lastClose;
}

async function collectScreenNames(): Promise<Set<string>> {
  const text = await fs.readFile(NAV_TYPES, 'utf8');
  const names = new Set<string>();
  const lineRe = /^\s+([A-Z][A-Za-z0-9_]+)\s*:\s*[^;]+;/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(text))) {
    if (m[1]) names.add(m[1]);
  }
  return names;
}

interface Finding {
  file: string;
  line: number;
  target: string;
  reason: string;
}

async function checkFile(
  file: string,
  registered: Set<string>
): Promise<Finding[]> {
  const text = await fs.readFile(file, 'utf8');
  const findings: Finding[] = [];

  for (const pattern of NAV_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text))) {
      const target = m[1] ?? '';
      if (!target) continue;
      if (registered.has(target)) continue;

      const idx = m.index ?? 0;
      if (isInsideComment(text, idx)) continue;

      const line = text.slice(0, idx).split('\n').length;
      findings.push({
        file: path.relative(REPO_ROOT, file).replace(/\\/g, '/'),
        line,
        target,
        reason: `'${target}' is not registered in any ParamList in apps/mobile/src/navigation/types.ts`,
      });
    }
  }

  return findings;
}

async function main() {
  console.log('Collecting registered React Navigation screens...');
  const registered = await collectScreenNames();
  console.log(`  ${registered.size} screen names registered.`);

  const allFindings: Finding[] = [];
  let filesScanned = 0;

  for await (const file of walk(MOBILE_SRC)) {
    filesScanned++;
    const findings = await checkFile(file, registered);
    allFindings.push(...findings);
  }

  const reportPath = path.join(
    REPO_ROOT,
    'scripts',
    '.mobile-nav-targets-report.json'
  );
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        filesScanned,
        screensRegistered: registered.size,
        findings: allFindings,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\nScanned ${filesScanned} mobile source files.`);
  console.log(`Report written to ${reportPath}`);

  if (allFindings.length === 0) {
    console.log('All mobile navigation targets are registered.');
    process.exit(0);
  }

  const dedupKey = (f: Finding) => `${f.file}:${f.line}:${f.target}`;
  const dedupedMap = new Map<string, Finding>();
  for (const f of allFindings) dedupedMap.set(dedupKey(f), f);
  const deduped = Array.from(dedupedMap.values());

  console.log(`\n${deduped.length} unregistered navigation target(s):`);
  for (const f of deduped.slice(0, 50)) {
    console.log(`  ${f.file}:${f.line}  ->  ${f.target}`);
  }
  if (deduped.length > 50) {
    console.log(`  ...and ${deduped.length - 50} more (see report).`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('check-mobile-nav-targets threw:', err);
  process.exit(2);
});
