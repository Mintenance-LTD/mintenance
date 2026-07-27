// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { normalisePropertyType } from '../property-type';

/**
 * Regression: `properties_property_type_check` permits only
 * residential | commercial | rental, but no form offers those words —
 * updatePropertySchema accepts house / flat / apartment / … because that is
 * what people pick. PUT /api/properties/[id] wrote the client's word straight
 * to the column, so saving an edit from mobile (which posts the literal
 * 'house') violated the constraint and surfaced as "Database operation failed"
 * with nothing saved. POST normalised; PUT did not.
 *
 * These pin the mapping both routes now share.
 */
describe('normalisePropertyType', () => {
  const CHECK_ALLOWS = ['residential', 'commercial', 'rental'];

  it('maps every type the mobile form offers onto a permitted value', () => {
    // apps/mobile EditPropertyScreen / AddPropertyScreen chips.
    for (const t of ['house', 'flat', 'bungalow', 'maisonette', 'other']) {
      expect(CHECK_ALLOWS).toContain(normalisePropertyType(t));
    }
  });

  it('maps every type the web form offers onto a permitted value', () => {
    for (const t of ['house', 'apartment', 'condo', 'townhouse']) {
      expect(CHECK_ALLOWS).toContain(normalisePropertyType(t));
    }
  });

  it('passes canonical values through untouched', () => {
    expect(normalisePropertyType('residential')).toBe('residential');
    expect(normalisePropertyType('commercial')).toBe('commercial');
    // 'rental' must survive: only the edit screen can produce it, and
    // flattening it to 'residential' would silently discard the distinction
    // the properties list filters on.
    expect(normalisePropertyType('rental')).toBe('rental');
  });

  it('does not flatten commercial into residential', () => {
    expect(normalisePropertyType('commercial')).toBe('commercial');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(normalisePropertyType('House')).toBe('residential');
    expect(normalisePropertyType('  FLAT  ')).toBe('residential');
    expect(normalisePropertyType('Residential')).toBe('residential');
  });

  it('returns null for empty, missing or unrecognised input', () => {
    // Callers reject rather than write something the constraint will refuse.
    expect(normalisePropertyType('')).toBeNull();
    expect(normalisePropertyType('   ')).toBeNull();
    expect(normalisePropertyType(null)).toBeNull();
    expect(normalisePropertyType(undefined)).toBeNull();
    expect(normalisePropertyType('spaceship')).toBeNull();
    expect(normalisePropertyType(42 as unknown as string)).toBeNull();
  });

  it('never returns a value the CHECK would reject', () => {
    const everyInput = [
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
      'residential',
      'commercial',
      'rental',
    ];
    for (const t of everyInput) {
      const out = normalisePropertyType(t);
      expect(out).not.toBeNull();
      expect(CHECK_ALLOWS).toContain(out);
    }
  });
});
