import fs from 'fs';
import path from 'path';

const web = JSON.parse(fs.readFileSync('audit-reports/knip-web.json', 'utf8'));
const mobile = JSON.parse(fs.readFileSync('audit-reports/knip-mobile.json', 'utf8'));

const pkgFiles = [];
for (const entry of fs.readdirSync('audit-reports')) {
  if (entry.startsWith('knip-pkg-') && entry.endsWith('.json')) {
    const raw = fs.readFileSync(path.join('audit-reports', entry), 'utf8');
    if (raw.trim().length === 0) continue;
    try {
      pkgFiles.push({
        name: entry.replace('knip-pkg-', '').replace('.json', ''),
        data: JSON.parse(raw),
      });
    } catch {}
  }
}
pkgFiles.sort((a, b) => a.name.localeCompare(b.name));

function gatherDeps(d) {
  const out = { deps: [], devDeps: [], unlisted: [], exports: [], types: [], duplicates: [] };
  for (const issue of d.issues || []) {
    for (const x of issue.dependencies || []) out.deps.push(x.name);
    for (const x of issue.devDependencies || []) out.devDeps.push(x.name);
    for (const x of issue.unlisted || []) out.unlisted.push(x.name);
    for (const x of issue.exports || []) out.exports.push({ file: issue.file, name: x.name, line: x.line });
    for (const x of issue.types || []) out.types.push({ file: issue.file, name: x.name, line: x.line });
    for (const x of issue.duplicates || []) {
      out.duplicates.push({
        file: issue.file,
        names: Array.isArray(x) ? x.map(y => y.name || y).join(', ') : (x.name || String(x)),
      });
    }
  }
  return out;
}

const w = gatherDeps(web);
const m = gatherDeps(mobile);

const LABELS = {
  scripts: 'Scripts (dev utilities)',
  tests: 'Tests / fixtures',
  app: 'App components (non-page)',
  components: 'Components (shared UI)',
  'lib-services': 'lib/services',
  'lib-other': 'lib (other)',
  hooks: 'Hooks',
  middleware: 'Middleware',
  screens: 'Screens (mobile)',
  services: 'Services (mobile)',
  utils: 'Utils',
  config: 'Config',
  contexts: 'Contexts',
  navigation: 'Navigation',
  root: 'Root-level',
  other: 'Other',
};

function categorize(files, prefix) {
  const cats = {};
  for (const f of files) {
    let cat = 'other';
    if (f.includes('/scripts/')) cat = 'scripts';
    else if (/__tests__|__mocks__|\.test\.tsx?$|\.spec\.tsx?$|\/test\//.test(f)) cat = 'tests';
    else if (f.includes('/app/api/') || f.includes('/app/')) cat = 'app';
    else if (f.includes('/components/')) cat = 'components';
    else if (f.includes('/lib/services/')) cat = 'lib-services';
    else if (f.includes('/lib/')) cat = 'lib-other';
    else if (f.includes('/hooks/')) cat = 'hooks';
    else if (f.includes('/middleware/')) cat = 'middleware';
    else if (f.includes('/screens/')) cat = 'screens';
    else if (f.includes('/services/')) cat = 'services';
    else if (f.includes('/utils/') || f.includes('/helpers/')) cat = 'utils';
    else if (f.includes('/config/')) cat = 'config';
    else if (f.includes('/contexts/')) cat = 'contexts';
    else if (f.includes('/navigation/')) cat = 'navigation';
    else if (new RegExp('^' + prefix + '/[^/]+$').test(f)) cat = 'root';
    (cats[cat] = cats[cat] || []).push(f);
  }
  return cats;
}

const webCats = categorize(web.files, 'apps/web');
const mobileCats = categorize(mobile.files, 'apps/mobile');

const lines = [];
const P = (s = '') => lines.push(s);

P('# Dead Code Audit — Mintenance Monorepo');
P('');
P('**Date:** 2026-04-10');
P('**Tool:** knip v5.88.1 (TypeScript equivalent of Python ruff/vulture)');
P('**Scope:** apps/web (Next.js), apps/mobile (React Native), all 10 shared packages');
P('');
P('> **Caveat:** knip reports files unreachable from entry points (page/route/layout/middleware).');
P('> Some flagged files may be referenced only by dynamic imports or runtime strings — always verify before deleting.');
P('> Spot checks confirmed knip is accurate: flagged files are either unimported or part of dead chains.');
P('');

P('## Executive Summary');
P('');
P('| Area | Unused Files | Unused Exports | Unused Types | Unused Deps | Duplicate Exports |');
P('|------|--------------|----------------|--------------|-------------|-------------------|');
P(`| apps/web | ${web.files.length} | ${w.exports.length} | ${w.types.length} | ${w.deps.length} (+${w.devDeps.length} dev) | ${w.duplicates.length} |`);
P(`| apps/mobile | ${mobile.files.length} | ${m.exports.length} | ${m.types.length} | ${m.deps.length} (+${m.devDeps.length} dev) | ${m.duplicates.length} |`);
let pkgTotals = 0;
for (const p of pkgFiles) {
  const pd = gatherDeps(p.data);
  pkgTotals += p.data.files.length;
  P(`| packages/${p.name} | ${p.data.files.length} | ${pd.exports.length} | ${pd.types.length} | ${pd.deps.length} (+${pd.devDeps.length} dev) | ${pd.duplicates.length} |`);
}
const totalFiles = web.files.length + mobile.files.length + pkgTotals;
P(`| **TOTAL** | **${totalFiles}** | — | — | — | — |`);
P('');

P('## Deletion Priority Matrix');
P('');
P('### Tier A — Safe to delete (high confidence)');
P('');
P('1. **Root-level orphans** — fix-*.cjs test migration scripts, middleware-cache.ts, middleware-security.ts, version-checker.tsx');
P('2. **Commented-out imports** — `PerformanceDashboard` disabled in layout.tsx ("Temporarily disabled for testing")');
P('3. **Duplicate components** where both paths exist but only one is imported (e.g., `components/dashboard/JobCard.tsx` vs `components/cards/JobCard.tsx`)');
P('4. **Old middleware modules** — security-headers.ts (replaced by inline CSP), csrf-protection.ts (replaced by csrf.ts)');
P('5. **Unused production dependencies** — remove from package.json (listed below)');
P('');
P('### Tier B — Verify then delete (medium confidence)');
P('');
P('1. Files in dead chains — entire feature trees where the entry component is unused (AnalyticsClient + its chart deps)');
P('2. Hooks superseded by newer React Query hooks — useFeatureFlag, useLoadingState, useOnboardingTooltips, useAccessibility');
P('3. Design system duplicates — Card.unified.tsx vs Card.tsx, Badge.unified.tsx vs Badge.tsx, UnifiedButton vs Button');
P('4. Unused exports in `packages/design-tokens/src/unified-tokens.ts` — typography, spacing, borderRadius, etc.');
P('');
P('### Tier C — Keep or archive (low confidence)');
P('');
P('1. **Dev scripts** under apps/web/scripts — one-off utilities, useful as reference. Move to `tools/` or keep.');
P('2. **Test mocks/fixtures** — may be loaded implicitly by test runners.');
P('3. **Mobile feature stubs** — some services may be for planned features (e.g., FeedPostsService).');
P('4. **packages/ai-core deps** (openai, @google-cloud/vision) — FALSE POSITIVE: consumed by apps/web but declared in ai-core package');
P('');

P('## Unused Production Dependencies');
P('');
P('### apps/web (14 prod + 7 dev)');
P('');
P('**Production (remove from apps/web/package.json):**');
w.deps.forEach(d => P(`- \`${d}\``));
P('');
P('**Dev:**');
w.devDeps.forEach(d => P(`- \`${d}\``));
P('');

P('### apps/mobile (7 prod + 3 dev)');
P('');
P('**Production:**');
m.deps.forEach(d => P(`- \`${d}\``));
P('');
P('**Dev:**');
m.devDeps.forEach(d => P(`- \`${d}\``));
P('');

if (m.unlisted.length) {
  P('### ⚠️ Mobile unlisted dependencies (used but not declared in package.json)');
  P('');
  [...new Set(m.unlisted)].forEach(d => P(`- \`${d}\``));
  P('');
}

P('## Duplicate Exports (default + named of same value)');
P('');
P(`**${w.duplicates.length} in apps/web, ${m.duplicates.length} in apps/mobile**`);
P('');
P('Common React pattern where a component is exported as both `default` and as a named export.');
P('**Recommendation:** standardize on named exports only (better tree-shaking, avoids import inconsistency).');
P('');
P('Sample (first 15 in web):');
P('');
w.duplicates.slice(0, 15).forEach(d => P(`- \`${d.file.replace('apps/web/', '')}\`: ${d.names}`));
P('');

P('## Web App — Unused Files by Category');
P('');
const sortedWeb = Object.entries(webCats).sort((a, b) => b[1].length - a[1].length);
for (const [cat, files] of sortedWeb) {
  P(`### ${LABELS[cat] || cat} (${files.length})`);
  P('');
  files.forEach(f => P(`- \`${f.replace('apps/web/', '')}\``));
  P('');
}

P('## Mobile App — Unused Files by Category');
P('');
const sortedMobile = Object.entries(mobileCats).sort((a, b) => b[1].length - a[1].length);
for (const [cat, files] of sortedMobile) {
  P(`### ${LABELS[cat] || cat} (${files.length})`);
  P('');
  files.forEach(f => P(`- \`${f.replace('apps/mobile/', '')}\``));
  P('');
}

P('## Shared Packages');
P('');
for (const p of pkgFiles) {
  const pd = gatherDeps(p.data);
  const clean = p.data.files.length === 0 && pd.exports.length === 0 && pd.types.length === 0 && pd.deps.length === 0 && pd.devDeps.length === 0;
  if (clean) {
    P(`### packages/${p.name} — clean ✅`);
    P('');
    continue;
  }
  P(`### packages/${p.name}`);
  P('');
  if (p.data.files.length) {
    P('**Unused files:**');
    p.data.files.forEach(f => P(`- \`${f}\``));
    P('');
  }
  if (pd.deps.length) {
    P('**Unused deps:** ' + pd.deps.map(d => '`' + d + '`').join(', '));
    P('');
  }
  if (pd.devDeps.length) {
    P('**Unused devDeps:** ' + pd.devDeps.map(d => '`' + d + '`').join(', '));
    P('');
  }
  if (pd.exports.length) {
    P('**Unused exports:**');
    pd.exports.slice(0, 25).forEach(e => P(`- \`${e.file}\`:${e.line} → \`${e.name}\``));
    if (pd.exports.length > 25) P(`- ...and ${pd.exports.length - 25} more`);
    P('');
  }
  if (pd.types.length) {
    P('**Unused types:**');
    pd.types.slice(0, 25).forEach(t => P(`- \`${t.file}\`:${t.line} → \`${t.name}\``));
    if (pd.types.length > 25) P(`- ...and ${pd.types.length - 25} more`);
    P('');
  }
}

P('## Recommended Deletion Order');
P('');
P('1. **Remove unused dependencies** from package.json files (fastest, no code impact)');
P('   - 21 from apps/web (14 prod + 7 dev)');
P('   - 10 from apps/mobile (7 prod + 3 dev)');
P('2. **Delete duplicate components** where both copies exist (JobCard dashboard/ vs cards/)');
P('3. **Delete root-level orphans** (apps/web/fix-*.cjs, middleware-*.ts, version-checker.tsx)');
P('4. **Delete commented-out dead imports** (PerformanceDashboard)');
P('5. **Delete dead feature chains** (entire AnalyticsClient chain, resources/ duplicates)');
P('6. **Delete obsolete UI variants** (*.unified.tsx duplicates, old admin/ components)');
P('7. **Audit scripts/** manually — keep migration-relevant, archive one-offs');
P('8. **Mobile services/components** — verify feature status before deleting');
P('');
P('## Verification Steps Before Deletion');
P('');
P('```bash');
P('# 1. Search for imports by filename');
P('grep -rn "filename" apps/ packages/ --include="*.ts" --include="*.tsx"');
P('');
P('# 2. Check dynamic imports');
P('grep -rn "import(.*filename" apps/ packages/');
P('');
P('# 3. Check git history for recent relevance');
P('git log --all --oneline -- path/to/file.tsx | head');
P('');
P('# 4. After deletion, verify build');
P('npx tsc --noEmit --project apps/web/tsconfig.json');
P('npx tsc --noEmit --project apps/mobile/tsconfig.json');
P('```');
P('');
P('## Regenerate This Report');
P('');
P('```bash');
P('# Install knip if not present');
P('npm install --no-save knip@5');
P('');
P('# Run per-workspace (full monorepo scan OOMs at 4GB)');
P('NODE_OPTIONS="--max-old-space-size=8192" node_modules/.bin/knip --workspace apps/web --reporter json > audit-reports/knip-web.json');
P('NODE_OPTIONS="--max-old-space-size=8192" node_modules/.bin/knip --workspace apps/mobile --reporter json > audit-reports/knip-mobile.json');
P('# ...repeat for each packages/* workspace');
P('');
P('# Regenerate markdown');
P('node audit-reports/generate-report.mjs');
P('```');

fs.writeFileSync('audit-reports/DEAD_CODE_ANALYSIS.md', lines.join('\n'));
console.log(`Report written: ${lines.length} lines, ${fs.statSync('audit-reports/DEAD_CODE_ANALYSIS.md').size} bytes`);
