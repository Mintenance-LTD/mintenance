/**
 * PostgREST filter-pattern sanitization.
 *
 * PostgREST's `.ilike()` / `.or()` methods accept a filter-DSL string
 * that is NOT pre-escaped by Supabase-js. Building such a string from
 * user input with a template literal is a filter-injection vector:
 *
 *   query.or(`title.ilike.%${search}%`)                       // VULNERABLE
 *   query.ilike('name', `%${search}%`)                        // VULNERABLE
 *
 * An attacker who controls `search` can:
 *   1. Inject extra `.or()` clauses via `,` separator, reading rows the
 *      caller should not see ("foo,status.eq.paid" → extra filter).
 *   2. Turn queries into unbounded wildcard scans (%%%%... = table scan).
 *   3. Escape column/operator boundaries with `)`, `(`, `,`, `&`.
 *
 * This helper keeps only `[A-Za-z0-9\s\-']`, caps length, and trims.
 * That is deliberately narrower than SQL identifier safety — it's built
 * for the common case of job-title / product-name / location search
 * where the user would never legitimately send punctuation-heavy input.
 *
 * The pattern mirrors the existing sanitization used in
 * apps/web/app/api/ai/search/route.ts (the reference safe implementation).
 */
export function sanitizeIlikePattern(input: string, maxLen = 80): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[^a-zA-Z0-9\s\-']/g, '')
    .slice(0, maxLen)
    .trim();
}
