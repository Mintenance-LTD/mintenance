import {
  escapeSQLWildcards,
  sanitizeForSQL,
  isValidSearchTerm,
  sanitizeSearchTerms,
  createSafeILIKEPattern,
} from '../sqlSanitization';

describe('sqlSanitization', () => {
  it('exposes sanitization helpers', () => {
    expect(escapeSQLWildcards).toBeDefined();
    expect(sanitizeForSQL).toBeDefined();
    expect(isValidSearchTerm).toBeDefined();
    expect(sanitizeSearchTerms).toBeDefined();
    expect(createSafeILIKEPattern).toBeDefined();
  });
});
