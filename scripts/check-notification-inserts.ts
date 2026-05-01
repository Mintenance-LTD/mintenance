/* eslint-disable no-console -- CLI script; console output is the contract. */
/**
 * Notification direct-insert gate.
 *
 * 2026-05-01 audit follow-up: every notification insert in apps/web MUST
 * go through `NotificationService.createNotification(...)`. The previous
 * direct `serverSupabase.from('notifications').insert(...)` pattern
 * silently dropped push, bypassed user preferences + quiet hours, and
 * landed on a column (`data`) that no longer exists in production.
 *
 * Scope:
 *   - Scans apps/web for `.from('notifications')` chained with `.insert(`.
 *   - Allowlists exactly TWO call sites that must legitimately insert
 *     directly: NotificationService itself (the canonical insert) and
 *     NotificationProcessorService (the queue drain — re-routing it
 *     through createNotification would just re-enqueue forever).
 *   - Ignores tests under apps/web/__tests__/ (RLS tests deliberately
 *     poke the table directly to assert policies).
 *   - Ignores comments referencing the old pattern (we keep them around
 *     as breadcrumbs for future auditors).
 *
 * Exits 1 on any new caller. Exit 0 silent in CI when the inventory is
 * exactly the documented allowlist.
 *
 * Usage: npx tsx scripts/check-notification-inserts.ts
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_ROOT = path.join(REPO_ROOT, 'apps/web');

// Files allowed to call .from('notifications').insert(...) directly.
// Path is repo-relative, normalised to forward slashes.
const ALLOWLIST = new Set<string>([
  'apps/web/lib/services/notifications/NotificationService.ts',
  'apps/web/lib/services/notifications/NotificationProcessorService.ts',
]);

// Files we deliberately skip:
//   - tests (RLS policy tests poke the table directly)
//   - the gate itself (defensive, not actually under apps/web)
const SKIP_DIR_RE =
  /[\\/](__tests__|node_modules|\.next|coverage|dist|build)[\\/]/;

interface Finding {
  file: string;
  line: number;
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
      (full.endsWith('.ts') || full.endsWith('.tsx'))
    ) {
      out.push(full);
    }
  }
}

function toRepoRelative(p: string): string {
  return path.relative(REPO_ROOT, p).replaceAll('\\', '/');
}

/**
 * Find `.from('notifications')` chained with `.insert(` within a small
 * window (10 lines). Tolerant of whitespace + line breaks the way most
 * supabase-js fluent chains are written.
 */
function findInserts(
  content: string
): Array<{ line: number; snippet: string }> {
  const findings: Array<{ line: number; snippet: string }> = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!/\.from\(\s*['"]notifications['"]\s*\)/.test(line)) continue;
    // Skip pure comment lines like `* .from('notifications').insert(` —
    // those exist as breadcrumbs in NotificationService.ts, contracts
    // route, and threads/messages route to point future readers at the
    // canonical pattern.
    if (/^\s*(?:\/\/|\*)/.test(line)) continue;
    // Look at this line + the next 10 to find an `.insert(` call.
    const window = lines.slice(i, i + 10).join('\n');
    if (/\.insert\s*\(/.test(window)) {
      findings.push({
        line: i + 1,
        snippet: lines.slice(i, i + Math.min(4, lines.length - i)).join('\n'),
      });
    }
  }
  return findings;
}

async function main() {
  const files: string[] = [];
  await walk(SCAN_ROOT, files);

  const findings: Finding[] = [];
  for (const file of files) {
    const rel = toRepoRelative(file);
    if (ALLOWLIST.has(rel)) continue;
    const content = await fs.readFile(file, 'utf8');
    const hits = findInserts(content);
    for (const h of hits) {
      findings.push({ file: rel, line: h.line, snippet: h.snippet });
    }
  }

  if (findings.length === 0) {
    console.log(
      'check-notification-inserts: OK — all notification inserts route through NotificationService.'
    );
    process.exit(0);
  }

  console.error(
    `\ncheck-notification-inserts: FAIL — ${findings.length} direct .from('notifications').insert(...) caller(s) outside the allowlist.\n`
  );
  console.error(
    'These call sites silently drop push, bypass user preferences, and use a schema that no longer exists.\n'
  );
  console.error(
    'Fix: replace with NotificationService.createNotification({ userId, type, title, message, actionUrl, metadata }).\n'
  );
  console.error(
    'If the call site genuinely cannot use the service (e.g. you are extending the queue drain), add it to ALLOWLIST in scripts/check-notification-inserts.ts with a comment explaining why.\n'
  );
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}`);
    for (const line of f.snippet.split('\n')) {
      console.error(`    ${line}`);
    }
    console.error('');
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('check-notification-inserts crashed:', err);
  process.exit(2);
});
