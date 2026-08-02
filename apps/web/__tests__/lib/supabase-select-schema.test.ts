// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * Every EMBEDDED Supabase select must name columns that actually exist.
 *
 * PostgREST rejects the WHOLE select when one embedded column is unknown,
 * so a single typo does not degrade one field — it takes down the entire
 * endpoint. That shipped to production twice in 2026-08:
 *
 *   1. jobs → `property:properties!property_id(id,address_line1,city)`.
 *      `properties` has `address`. Every job list on web and mobile
 *      returned "Database operation failed" / 0 jobs while the database
 *      held 21 jobs.
 *   2. DBSCheckService → `profiles` select naming `date_of_birth`,
 *      `address_line1`, `address_line2`, `postal_code`. None exist, so
 *      every DBS attempt failed as a misleading "Contractor not found".
 *
 * Neither was caught by the existing suites because they mock the Supabase
 * client — select strings are never executed against a real schema. This
 * test closes that gap statically: it reads the source, extracts embedded
 * selects, and checks each column against a snapshot of the live schema.
 *
 * It deliberately does NOT hit the network, so it runs in CI offline. The
 * cost is that the snapshot must be regenerated after migrations — see
 * __tests__/fixtures/db-schema.snapshot.ts.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { DB_SCHEMA_SNAPSHOT } from '../fixtures/db-schema.snapshot';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SCAN_ROOTS = [
  join(REPO_ROOT, 'apps', 'web', 'lib'),
  join(REPO_ROOT, 'apps', 'web', 'app'),
  join(REPO_ROOT, 'apps', 'mobile', 'src'),
];
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '__tests__',
  '__mocks__',
]);

/**
 * Opening of an embedded select: `alias:table!fk(`.
 *
 * The body is then read with balanced-paren matching rather than a lazy
 * `[^)]*`, because embeds nest — `jobs!inner(id,escrow_transactions(amount))`
 * — and a regex that stops at the first `)` mis-reads the nested table as a
 * column. Nested embeds are parsed recursively so their columns get checked
 * too.
 */
const EMBED_OPEN_RE = /([a-z_]+):([a-z_]+)!([a-z_]+)\(/g;
/** A nested embed inside a body: `table(` or `alias:table(`. */
const NESTED_OPEN_RE = /^(?:[a-z_]+:)?([a-z_]+)\($/;

/** Read from `openIdx` (index of `(`) to its matching `)`. */
function readBalanced(
  src: string,
  openIdx: number
): { body: string; end: number } | null {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') {
      depth--;
      if (depth === 0) return { body: src.slice(openIdx + 1, i), end: i };
    }
  }
  return null; // unbalanced (e.g. truncated by a template expression)
}

/** Split on commas that are NOT inside nested parens. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Aggregates and wildcards are not columns. */
const NON_COLUMNS = new Set(['count', '*', '']);

interface Embedded {
  file: string;
  table: string;
  columns: string[];
  raw: string;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry))
      out.push(full);
  }
  return out;
}

/**
 * Record one embed and recurse into any nested embeds in its body, so
 * `jobs!inner(id,escrow_transactions(amount,status))` yields BOTH the jobs
 * columns and the escrow_transactions columns.
 */
function recordEmbed(
  file: string,
  table: string,
  body: string,
  raw: string,
  out: Embedded[]
): void {
  const columns: string[] = [];
  for (const part of splitTopLevel(body)) {
    const parenIdx = part.indexOf('(');
    if (parenIdx === -1) {
      const col = part.trim();
      if (!NON_COLUMNS.has(col)) columns.push(col);
      continue;
    }
    // Nested embed — recurse rather than treating it as a column.
    const head = part.slice(0, parenIdx + 1);
    const nested = NESTED_OPEN_RE.exec(head.replace(/!.*\($/, '('));
    const inner = readBalanced(part, parenIdx);
    if (nested && inner) {
      recordEmbed(file, nested[1], inner.body, part.replace(/\s+/g, ''), out);
    }
  }
  out.push({ file, table, columns, raw });
}

function collectEmbeddedSelects(): Embedded[] {
  const found: Embedded[] = [];
  for (const root of SCAN_ROOTS) {
    for (const file of walk(root)) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('!')) continue; // cheap pre-filter
      const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
      EMBED_OPEN_RE.lastIndex = 0;
      for (const m of src.matchAll(EMBED_OPEN_RE)) {
        const openIdx = m.index! + m[0].length - 1;
        const balanced = readBalanced(src, openIdx);
        if (!balanced) continue;
        recordEmbed(
          rel,
          m[2],
          balanced.body,
          src.slice(m.index!, balanced.end + 1).replace(/\s+/g, ''),
          found
        );
      }
    }
  }
  return found;
}

const embeds = collectEmbeddedSelects();

describe('embedded Supabase selects match the live schema', () => {
  it('finds embedded selects to check (guards against the scanner silently breaking)', () => {
    // If a refactor moves these files or changes the syntax, this test would
    // otherwise "pass" by checking nothing at all.
    expect(embeds.length).toBeGreaterThan(20);
  });

  it('references only tables present in the schema snapshot', () => {
    const unknown = [
      ...new Set(
        embeds
          .filter((e) => !(e.table in DB_SCHEMA_SNAPSHOT))
          .map((e) => `${e.table}  (${e.file})`)
      ),
    ];

    expect(
      unknown,
      `Embedded selects reference tables missing from the snapshot.\n` +
        `Add them to __tests__/fixtures/db-schema.snapshot.ts using the query in its header — ` +
        `do NOT delete this assertion.\n\n${unknown.join('\n')}`
    ).toEqual([]);
  });

  it('names only columns that exist on the target table', () => {
    const violations: string[] = [];

    for (const e of embeds) {
      const known = DB_SCHEMA_SNAPSHOT[e.table];
      if (!known) continue; // reported by the test above
      for (const col of e.columns) {
        if (!known.includes(col)) {
          violations.push(
            `${e.file}\n    ${e.raw}\n    -> "${e.table}.${col}" does not exist`
          );
        }
      }
    }

    expect(
      violations,
      `Embedded select(s) name columns that do not exist. PostgREST rejects the ` +
        `ENTIRE select when one embedded column is unknown, so this breaks the ` +
        `whole endpoint, not just the field.\n\n${violations.join('\n\n')}`
    ).toEqual([]);
  });
});

describe('regression: the exact selects that caused the outages', () => {
  it('the jobs->properties embed uses `address`, not `address_line1`', () => {
    const propertyEmbeds = embeds.filter((e) => e.table === 'properties');
    expect(propertyEmbeds.length).toBeGreaterThan(0);
    for (const e of propertyEmbeds) {
      expect(e.columns).not.toContain('address_line1');
    }
  });

  it('no embed selects a date_of_birth column (none exists anywhere)', () => {
    for (const e of embeds) {
      expect(e.columns).not.toContain('date_of_birth');
    }
  });
});
