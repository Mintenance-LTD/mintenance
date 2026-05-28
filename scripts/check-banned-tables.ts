/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Banned-tables gate.
 *
 * 2026-05-02 audit follow-up (review pass 6): once a phantom or retired
 * Supabase table has been removed from production, runtime code MUST
 * NOT reach for it again. The classic regression is `contractor_invoices`,
 * which was retired during the invoice unification (only `invoices`
 * exists now) but kept showing up in mobile + web call sites long after
 * — the queries silently 404'd and pages displayed empty state without
 * any error visible to the user.
 *
 * This gate scans the source tree for Supabase fluent calls
 * (`.from('<banned-table>')`) outside comments + migration notes, and
 * fails CI if any non-allowlisted caller reintroduces them.
 *
 * Add new banned tables to BANNED_TABLES with a short rationale comment
 * pointing at the canonical replacement.
 *
 * Allowlist policy: only files that intentionally reference the banned
 * name (audit docs, this script itself, migration history) belong in
 * ALLOWLIST. The default position is "no exceptions."
 *
 * Usage: npx tsx scripts/check-banned-tables.ts
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');

interface BannedTable {
  name: string;
  reason: string;
  canonicalReplacement: string;
}

/**
 * Tables runtime code MUST NOT call. Each one needs a one-liner of
 * historical context so future maintainers know WHY it's banned and
 * what to use instead.
 */
const BANNED_TABLES: BannedTable[] = [
  {
    name: 'contractor_invoices',
    reason:
      'Retired during invoice unification 2026-04. Live DB has only `invoices`. ' +
      'Old name 404s silently in production, leaving pages with empty state.',
    canonicalReplacement: 'invoices',
  },
  {
    name: 'connections',
    reason:
      'Removed with social features in supabase/migrations/007_remove_social_features.sql. ' +
      'Any runtime SELECT/INSERT 404s and bricks the surrounding feature.',
    canonicalReplacement:
      'Do not query this table — return zero or remove the connections UI.',
  },
  {
    name: 'call_participants',
    reason:
      'No active migration creates this table; mobile video-call participant ' +
      'writes fail at runtime. Live video calls are gated off behind ' +
      'LIVE_VIDEO_CALLS_ENABLED until a real schema lands.',
    canonicalReplacement:
      'Disable live video joining or build a real API-backed participant schema.',
  },
];

/** Repo-relative paths that may reference banned names without running them. */
const ALLOWLIST = new Set<string>([
  // The gate itself documents the names.
  'scripts/check-banned-tables.ts',
]);

/** Roots scanned (relative to repo root). */
const SCAN_ROOTS = ['apps/web', 'apps/mobile', 'packages'];

/** Directory names anywhere in the path that we skip wholesale. */
const SKIP_DIR_RE =
  /[\\/](node_modules|\.next|coverage|dist|build|\.turbo|__generated__|migrations)[\\/]/;

interface Finding {
  file: string;
  line: number;
  bannedTable: string;
  snippet: string;
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (SKIP_DIR_RE.test(full)) continue;
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (
      entry.isFile() &&
      (full.endsWith('.ts') ||
        full.endsWith('.tsx') ||
        full.endsWith('.js') ||
        full.endsWith('.jsx'))
    ) {
      out.push(full);
    }
  }
}

function toRepoRelative(p: string): string {
  return path.relative(REPO_ROOT, p).replaceAll('\\', '/');
}

/**
 * Find `.from('<table>')` references that are NOT inside a comment.
 * "Inside a comment" means the matching line begins with `//` or with
 * a JSDoc-style ` * `, OR the match itself is wrapped in a `/* … *​/`
 * block on the same line. We don't try to track multi-line block
 * comments — the call-site convention everywhere in this codebase is
 * single-line `// …` inline comments.
 */
function findBannedReferences(
  content: string,
  bannedTables: BannedTable[]
): Array<{ line: number; bannedTable: string; snippet: string }> {
  const findings: Array<{
    line: number;
    bannedTable: string;
    snippet: string;
  }> = [];
  const lines = content.split(/\r?\n/);

  for (const banned of bannedTables) {
    // Case-sensitive exact-table-name match. Allow either single or
    // double quotes and arbitrary inner whitespace.
    const pattern = new RegExp(
      String.raw`\.from\(\s*['"]` + banned.name + String.raw`['"]\s*\)`
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (!pattern.test(line)) continue;
      // Skip lines that are clearly comments (// or *).
      if (/^\s*(?:\/\/|\*)/.test(line)) continue;
      findings.push({
        line: i + 1,
        bannedTable: banned.name,
        snippet: lines.slice(i, i + Math.min(3, lines.length - i)).join('\n'),
      });
    }
  }

  return findings;
}

async function main() {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    await walk(path.join(REPO_ROOT, root), files);
  }

  const findings: Finding[] = [];
  for (const file of files) {
    const rel = toRepoRelative(file);
    if (ALLOWLIST.has(rel)) continue;
    const content = await fs.readFile(file, 'utf8');
    const hits = findBannedReferences(content, BANNED_TABLES);
    for (const h of hits) {
      findings.push({
        file: rel,
        line: h.line,
        bannedTable: h.bannedTable,
        snippet: h.snippet,
      });
    }
  }

  if (findings.length === 0) {
    console.log(
      `check-banned-tables: OK — no runtime references to banned tables (${BANNED_TABLES.map(
        (b) => b.name
      ).join(', ')}).`
    );
    process.exit(0);
  }

  console.error(
    `\ncheck-banned-tables: FAIL — ${findings.length} runtime reference(s) to banned table(s).\n`
  );
  for (const finding of findings) {
    const banned = BANNED_TABLES.find((b) => b.name === finding.bannedTable);
    console.error(
      `  ${finding.file}:${finding.line}  → ${finding.bannedTable}`
    );
    if (banned) {
      console.error(`    why banned : ${banned.reason}`);
      console.error(`    use instead: .from('${banned.canonicalReplacement}')`);
    }
    for (const snippetLine of finding.snippet.split('\n')) {
      console.error(`    ${snippetLine}`);
    }
    console.error('');
  }
  console.error(
    'If a reference is genuinely intentional (audit doc, migration note),'
  );
  console.error(
    'add the file to ALLOWLIST in scripts/check-banned-tables.ts with a'
  );
  console.error('comment explaining why.\n');
  process.exit(1);
}

main().catch((err) => {
  console.error('check-banned-tables crashed:', err);
  process.exit(2);
});
