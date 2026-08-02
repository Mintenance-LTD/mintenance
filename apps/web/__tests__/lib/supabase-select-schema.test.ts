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

/**
 * Strip PostgREST column aliasing: `alias:real_column` selects
 * `real_column` and renames it. Validate the REAL column, not the alias.
 * Also drops `::type` casts (`created_at::text`).
 */
function realColumn(part: string): string {
  const afterAlias = part.includes(':')
    ? part.slice(part.lastIndexOf(':') + 1)
    : part;
  return afterAlias.split('::')[0]!.trim();
}

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
      const col = realColumn(part);
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

// ---------------------------------------------------------------------------
// Flat selects: `.from('table')` … `.select('a,b,c')`
//
// The DBS outage was this shape, not an embedded one. Two deliberate limits:
//
//  1. Only STRING-LITERAL selects are checked. `.select(jobSelectFields)` or
//     a template literal with `${}` cannot be resolved statically, so they
//     are skipped rather than guessed at.
//  2. Only tables present in the snapshot are checked. Unlike embeds (7
//     tables, so an unknown one is a real gap worth failing on), flat selects
//     span 100+ tables; failing on every unsnapshotted one would make the
//     suite unmaintainable. Unknown tables are counted and reported instead,
//     so partial coverage stays visible rather than looking like a pass.
// ---------------------------------------------------------------------------

/**
 * Pre-existing invalid columns, verified against the live schema on
 * 2026-08-02. THESE ARE REAL BUGS, not test noise — every one of these
 * selects fails at PostgREST, so the feature reading it cannot work.
 * They are baselined only so this test can start guarding against NEW
 * breakage today rather than waiting on a multi-feature fix.
 *
 * Known clusters:
 *   - MFA (mfa_enabled/mfa_method/mfa_enrolled_at/totp_secret/phone_number)
 *     read from `profiles`, which has none of them — lib/mfa/service/*,
 *     api/auth/login, lib/payments/high-risk-checks.
 *   - Background checks (background_check_*) — same shape as the DBS bug
 *     fixed in d406f789b.
 *   - Payout tiers (payout_tier/payout_speed_hours) — PayoutTierService,
 *     PaymentEnforcement, api/payments/release-escrow.
 *   - Assorted: profiles.full_name, jobs.total_amount, jobs.metadata,
 *     bids.homeowner_id, properties.built_year (the real column is
 *     `year_built` — transposed).
 *
 * Each needs its own fix: the data may live on another table, or a
 * migration may never have been applied. DELETE entries as they are fixed —
 * the test fails if a listed entry stops appearing, so the list cannot rot.
 */
const KNOWN_BROKEN_FLAT_COLUMNS: readonly string[] = [
  'bids.homeowner_id',
  'jobs.metadata',
  'jobs.total_amount',
  'profiles.background_check_completed_at',
  'profiles.background_check_id',
  'profiles.background_check_provider',
  'profiles.background_check_result',
  'profiles.full_name',
  'profiles.payout_speed_hours',
  'profiles.payout_tier',
  'properties.built_year',
];

/** `.from('table')` followed by `.select('…')` before any other `.from(`. */
const FROM_RE = /\.from\(\s*'([a-z_]+)'\s*\)/g;

interface FlatSelect {
  file: string;
  table: string;
  columns: string[];
  raw: string;
}

function collectFlatSelects(): {
  checked: FlatSelect[];
  skippedNonLiteral: number;
  skippedUnknownTable: Set<string>;
} {
  const checked: FlatSelect[] = [];
  let skippedNonLiteral = 0;
  const skippedUnknownTable = new Set<string>();

  for (const root of SCAN_ROOTS) {
    for (const file of walk(root)) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('.from(')) continue;
      const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
      FROM_RE.lastIndex = 0;
      for (const m of src.matchAll(FROM_RE)) {
        const table = m[1];
        const after = src.slice(m.index! + m[0].length);
        // The select must come before the next .from( — otherwise it belongs
        // to a different query.
        const nextFrom = after.search(/\.from\(/);
        const selMatch = /\.select\(\s*(['"`])([\s\S]*?)\1/.exec(
          nextFrom === -1 ? after : after.slice(0, nextFrom)
        );
        if (!selMatch) continue;

        const quote = selMatch[1];
        const body = selMatch[2];
        // Template literal with interpolation, or a non-literal argument.
        if (quote === '`' && body.includes('${')) {
          skippedNonLiteral++;
          continue;
        }
        if (!(table in DB_SCHEMA_SNAPSHOT)) {
          skippedUnknownTable.add(table);
          continue;
        }
        // Embedded parts inside a flat select are covered by the embed pass.
        const columns = splitTopLevel(body)
          .filter((p) => !p.includes('('))
          .map(realColumn)
          .filter((c) => !NON_COLUMNS.has(c));
        if (columns.length === 0) continue;
        checked.push({
          file: rel,
          table,
          columns,
          raw: `${table}.select('${body.replace(/\s+/g, ' ').trim()}')`,
        });
      }
    }
  }
  return { checked, skippedNonLiteral, skippedUnknownTable };
}

const embeds = collectEmbeddedSelects();
const flat = collectFlatSelects();

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

describe('flat .from().select() pairs match the live schema', () => {
  it('finds flat selects to check (guards against the scanner silently breaking)', () => {
    expect(flat.checked.length).toBeGreaterThan(50);
  });

  it('introduces no NEW invalid columns, and shrinks the known-broken set', () => {
    const found = [
      ...new Set(
        flat.checked.flatMap((s) =>
          s.columns
            .filter((c) => !DB_SCHEMA_SNAPSHOT[s.table]!.includes(c))
            .map((c) => `${s.table}.${c}`)
        )
      ),
    ].sort();

    const added = found.filter((v) => !KNOWN_BROKEN_FLAT_COLUMNS.includes(v));
    const fixed = KNOWN_BROKEN_FLAT_COLUMNS.filter((v) => !found.includes(v));

    expect(
      added,
      `NEW invalid column(s) in a flat select. PostgREST rejects the whole ` +
        `query, so the endpoint fails outright.\n` +
        added
          .map(
            (v) =>
              `  ${v}\n` +
              flat.checked
                .filter((s) => s.columns.some((c) => `${s.table}.${c}` === v))
                .map((s) => `    ${s.file}\n      ${s.raw}`)
                .join('\n')
          )
          .join('\n')
    ).toEqual([]);

    expect(
      fixed,
      `These were fixed — remove them from KNOWN_BROKEN_FLAT_COLUMNS so the ` +
        `baseline keeps shrinking and cannot silently refill:\n  ${fixed.join('\n  ')}`
    ).toEqual([]);
  });

  it('reports coverage so partial checking never looks like a full pass', () => {
    // Not an assertion about correctness — a visible record of what is NOT
    // covered, so nobody mistakes this suite for exhaustive.
    const unknown = [...flat.skippedUnknownTable].sort();
    // eslint-disable-next-line no-console
    console.info(
      `[select-schema] checked ${flat.checked.length} flat selects across ` +
        `${Object.keys(DB_SCHEMA_SNAPSHOT).length} snapshotted tables; ` +
        `skipped ${flat.skippedNonLiteral} non-literal selects and ` +
        `${unknown.length} unsnapshotted tables` +
        (unknown.length ? `: ${unknown.slice(0, 15).join(', ')}` : '')
    );
    expect(flat.checked.length).toBeGreaterThan(0);
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
