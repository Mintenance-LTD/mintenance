/**
 * Maps the property-type vocabularies the clients speak onto the three values
 * the database actually accepts.
 *
 * `properties.property_type` has CHECK (residential | commercial | rental), but
 * no form offers those words. The web add form asks house / apartment / condo /
 * townhouse; mobile asks house / flat / bungalow / maisonette / other. Both are
 * closer to what a person would say, so the mapping happens here rather than in
 * the UI.
 *
 * This used to live inline in POST /api/properties only. PUT wrote `type`
 * straight through, so editing a property from mobile — which posts the
 * literal 'house' — violated the CHECK and surfaced as "Database operation
 * failed" with nothing saved. Sharing one function is the point of this module:
 * the two paths cannot drift apart again.
 */

/** The only values the CHECK constraint permits. */
export type CanonicalPropertyType = 'residential' | 'commercial' | 'rental';

const CANONICAL = new Set<string>(['residential', 'commercial', 'rental']);

/**
 * Everything a client might call a home. Anything here becomes 'residential';
 * the distinction it was drawn from is not something the schema records.
 */
const RESIDENTIAL_SYNONYMS = new Set([
  'house',
  'flat',
  'apartment',
  'condo',
  'townhouse',
  'bungalow',
  'maisonette',
  'detached',
  'semi-detached',
  'terraced',
  'cottage',
  'other',
]);

/**
 * Normalise a client-supplied property type to a value the CHECK accepts.
 *
 * Already-canonical values pass through untouched, so 'rental' — which only the
 * edit screen can currently produce — is preserved rather than being flattened
 * into 'residential'.
 *
 * @returns the canonical value, or null when the input is empty or
 *   unrecognised. Callers decide what to do with null; writing an unrecognised
 *   value through would only fail at the constraint.
 */
export function normalisePropertyType(
  raw: string | null | undefined
): CanonicalPropertyType | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  if (CANONICAL.has(value)) return value as CanonicalPropertyType;
  if (RESIDENTIAL_SYNONYMS.has(value)) return 'residential';
  return null;
}
