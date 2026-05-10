#!/usr/bin/env node
/*
 * Block hardcoded non-GBP currency literals in `supabase/functions/`.
 *
 * Audit P0 (2026-05-10): four undeployed edge functions hardcoded
 * `currency: 'usd'` while the rest of the platform charges GBP. The
 * functions were deleted, but a copy-paste from any external Stripe
 * sample (which all use 'usd') would silently re-introduce the same
 * footgun. This guard fails the commit before that can happen.
 *
 * Allowed: 'gbp' (case-insensitive). Anything else under
 * `supabase/functions/` requires an explicit `// allow-currency: <reason>`
 * comment on the same line.
 */

const { readFileSync, readdirSync, statSync } = require('fs');
const path = require('path');

const FUNCTIONS_DIR = path.join(process.cwd(), 'supabase', 'functions');
const CURRENCY_RE =
  /currency\s*[:=]\s*['"]([a-zA-Z]{3})['"]|['"]?currency['"]?\s*:\s*['"]([a-zA-Z]{3})['"]/g;
const ALLOW_TAG = /\/\/\s*allow-currency:/i;

function listTsFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function check(file) {
  const offenders = [];
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    return offenders;
  }
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (ALLOW_TAG.test(line)) return;
    let m;
    CURRENCY_RE.lastIndex = 0;
    while ((m = CURRENCY_RE.exec(line)) !== null) {
      const code = (m[1] || m[2] || '').toLowerCase();
      if (code && code !== 'gbp') {
        offenders.push({
          file: rel,
          lineNumber: idx + 1,
          code,
          excerpt: line.trim(),
        });
      }
    }
  });
  return offenders;
}

function main() {
  const files = listTsFiles(FUNCTIONS_DIR);
  if (files.length === 0) return;

  const offenders = files.flatMap(check);
  if (offenders.length === 0) return;

  console.error('\n[X] Non-GBP currency literal in supabase/functions/:\n');
  for (const o of offenders) {
    console.error(
      `  ${o.file}:${o.lineNumber}  -> currency '${o.code}'\n    ${o.excerpt}`
    );
  }
  console.error(
    "\nPlatform is GBP. Use 'gbp' (or pass currency from the caller)." +
      '\nIf this is intentional, add `// allow-currency: <reason>` on the same line.\n'
  );
  process.exit(1);
}

main();
