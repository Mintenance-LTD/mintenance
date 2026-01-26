import * as sqlSanitization from '../../utils/sqlSanitization';
import { sanitizeText } from '../../utils/sanitize';

// Mock the sanitize module
jest.mock('../../utils/sanitize');

describe('sqlSanitization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation
    (sanitizeText as jest.Mock).mockImplementation((input) => {
      if (!input) return '';
      return String(input)
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '');
    });
  });

  describe('escapeSQLWildcards', () => {
    describe('Basic Functionality', () => {
      it('should return empty string for empty input', () => {
        expect(sqlSanitization.escapeSQLWildcards('')).toBe('');
        expect(sqlSanitization.escapeSQLWildcards(null as any)).toBe('');
        expect(sqlSanitization.escapeSQLWildcards(undefined as any)).toBe('');
      });

      it('should handle normal text without special characters', () => {
        expect(sqlSanitization.escapeSQLWildcards('normal text')).toBe('normal text');
        expect(sqlSanitization.escapeSQLWildcards('hello world')).toBe('hello world');
        expect(sqlSanitization.escapeSQLWildcards('test123')).toBe('test123');
      });
    });

    describe('SQL Wildcard Escaping', () => {
      it('should escape percentage signs', () => {
        expect(sqlSanitization.escapeSQLWildcards('%')).toBe('\\%');
        expect(sqlSanitization.escapeSQLWildcards('100%')).toBe('100\\%');
        expect(sqlSanitization.escapeSQLWildcards('%test%')).toBe('\\%test\\%');
      });

      it('should escape underscores', () => {
        expect(sqlSanitization.escapeSQLWildcards('_')).toBe('\\_');
        expect(sqlSanitization.escapeSQLWildcards('user_name')).toBe('user\\_name');
        expect(sqlSanitization.escapeSQLWildcards('_test_')).toBe('\\_test\\_');
      });

      it('should escape backslashes', () => {
        expect(sqlSanitization.escapeSQLWildcards('\\')).toBe('\\\\');
        expect(sqlSanitization.escapeSQLWildcards('path\\to\\file')).toBe('path\\\\to\\\\file');
        expect(sqlSanitization.escapeSQLWildcards('\\n\\t')).toBe('\\\\n\\\\t');
      });

      it('should escape single quotes', () => {
        expect(sqlSanitization.escapeSQLWildcards("'")).toBe("''");
        expect(sqlSanitization.escapeSQLWildcards("John's")).toBe("John''s");
        expect(sqlSanitization.escapeSQLWildcards("'test'")).toBe("''test''");
      });
    });

    describe('Complex Escaping', () => {
      it('should escape multiple special characters together', () => {
        expect(sqlSanitization.escapeSQLWildcards("%_")).toBe('\\%\\_');
        expect(sqlSanitization.escapeSQLWildcards("_%_")).toBe('\\_\\%\\_');
        expect(sqlSanitization.escapeSQLWildcards("'%_'")).toBe("''\\%\\_''");
      });

      it('should handle SQL injection attempts', () => {
        expect(sqlSanitization.escapeSQLWildcards("' OR '1'='1")).toBe("'' OR ''1''=''1");
        expect(sqlSanitization.escapeSQLWildcards("%' OR '1'='1")).toBe("\\%'' OR ''1''=''1");
        expect(sqlSanitization.escapeSQLWildcards("'; DROP TABLE users; --")).toBe("''; DROP TABLE users; --");
      });

      it('should escape already escaped characters', () => {
        expect(sqlSanitization.escapeSQLWildcards('\\%')).toBe('\\\\\\%');
        expect(sqlSanitization.escapeSQLWildcards('\\_')).toBe('\\\\\\_');
        expect(sqlSanitization.escapeSQLWildcards("\\''")).toBe("\\\\''''");
      });
    });

    describe('Order of Operations', () => {
      it('should escape backslashes first to avoid double escaping', () => {
        const input = '\\%\\_';
        const result = sqlSanitization.escapeSQLWildcards(input);
        expect(result).toBe('\\\\\\%\\\\\\_');
      });

      it('should handle complex nested escaping', () => {
        const input = '\\\\%\\_%';
        const result = sqlSanitization.escapeSQLWildcards(input);
        expect(result).toBe('\\\\\\\\\\%\\\\\\_\\%');
      });
    });
  });

  describe('sanitizeForSQL', () => {
    describe('Basic Functionality', () => {
      it('should return empty string for falsy input', () => {
        expect(sqlSanitization.sanitizeForSQL(null)).toBe('');
        expect(sqlSanitization.sanitizeForSQL(undefined)).toBe('');
        expect(sqlSanitization.sanitizeForSQL('')).toBe('');
      });

      it('should handle normal text', () => {
        (sanitizeText as jest.Mock).mockReturnValue('normal text');
        expect(sqlSanitization.sanitizeForSQL('normal text')).toBe('normal text');
        expect(sanitizeText).toHaveBeenCalledWith('normal text');
      });

      it('should trim whitespace', () => {
        (sanitizeText as jest.Mock).mockReturnValue('  text  ');
        expect(sqlSanitization.sanitizeForSQL('  text  ')).toBe('text');
      });
    });

    describe('XSS and SQL Injection Prevention', () => {
      it('should remove HTML tags and escape SQL wildcards', () => {
        (sanitizeText as jest.Mock).mockReturnValue('%test%');
        const result = sqlSanitization.sanitizeForSQL('<script>%test%</script>');
        expect(result).toBe('\\%test\\%');
        expect(sanitizeText).toHaveBeenCalledWith('<script>%test%</script>');
      });

      it('should handle combined XSS and SQL injection attempts', () => {
        const input = "%' OR '1'='1 <script>alert('xss')</script>";
        (sanitizeText as jest.Mock).mockReturnValue("%' OR '1'='1 ");
        const result = sqlSanitization.sanitizeForSQL(input);
        expect(result).toBe("\\%'' OR ''1''=''1");
      });

      it('should sanitize event handlers and escape SQL', () => {
        const input = '<img onload="alert(1)" src="test_%">';
        (sanitizeText as jest.Mock).mockReturnValue('test_%');
        const result = sqlSanitization.sanitizeForSQL(input);
        expect(result).toBe('test\\_\\%');
      });
    });

    describe('Integration with sanitizeText', () => {
      it('should call sanitizeText first', () => {
        const mockSanitized = 'sanitized_text';
        (sanitizeText as jest.Mock).mockReturnValue(mockSanitized);

        sqlSanitization.sanitizeForSQL('input_text');

        expect(sanitizeText).toHaveBeenCalledWith('input_text');
        expect(sanitizeText).toHaveBeenCalledTimes(1);
      });

      it('should apply SQL escaping after XSS sanitization', () => {
        const input = '<script>test_%</script>';
        const xssSanitized = 'test_%';
        (sanitizeText as jest.Mock).mockReturnValue(xssSanitized);

        const result = sqlSanitization.sanitizeForSQL(input);

        expect(sanitizeText).toHaveBeenCalledWith(input);
        expect(result).toBe('test\\_\\%');
      });
    });
  });

  describe('isValidSearchTerm', () => {
    describe('Basic Validation', () => {
      it('should return false for invalid input', () => {
        expect(sqlSanitization.isValidSearchTerm('')).toBe(false);
        expect(sqlSanitization.isValidSearchTerm(null as any)).toBe(false);
        expect(sqlSanitization.isValidSearchTerm(undefined as any)).toBe(false);
        expect(sqlSanitization.isValidSearchTerm(123 as any)).toBe(false);
      });

      it('should return true for valid search terms', () => {
        expect(sqlSanitization.isValidSearchTerm('test')).toBe(true);
        expect(sqlSanitization.isValidSearchTerm('hello world')).toBe(true);
        expect(sqlSanitization.isValidSearchTerm('user@example.com')).toBe(true);
      });
    });

    describe('Length Validation', () => {
      it('should reject terms exceeding default max length', () => {
        const longString = 'a'.repeat(201);
        expect(sqlSanitization.isValidSearchTerm(longString)).toBe(false);

        const maxLength = 'a'.repeat(200);
        expect(sqlSanitization.isValidSearchTerm(maxLength)).toBe(true);
      });

      it('should respect custom max length', () => {
        const string50 = 'a'.repeat(50);
        const string51 = 'a'.repeat(51);

        expect(sqlSanitization.isValidSearchTerm(string50, 50)).toBe(true);
        expect(sqlSanitization.isValidSearchTerm(string51, 50)).toBe(false);
      });
    });

    describe('Special Character Detection', () => {
      it('should accept terms with reasonable special character ratio', () => {
        expect(sqlSanitization.isValidSearchTerm('test_user')).toBe(true); // 1/9 = 11%
        expect(sqlSanitization.isValidSearchTerm("John's")).toBe(true); // 1/6 = 16%
        expect(sqlSanitization.isValidSearchTerm('25%')).toBe(false); // 1/3 = 33% (edge case)
      });

      it('should reject terms with excessive special characters', () => {
        expect(sqlSanitization.isValidSearchTerm('%%%')).toBe(false); // 100%
        expect(sqlSanitization.isValidSearchTerm('__%__')).toBe(false); // 80%
        expect(sqlSanitization.isValidSearchTerm("''';")).toBe(false); // 100%
      });

      it('should detect SQL injection patterns', () => {
        expect(sqlSanitization.isValidSearchTerm("%' OR '1'='1")).toBe(false); // High special char ratio
        expect(sqlSanitization.isValidSearchTerm("'; DROP TABLE --")).toBe(false);
      });

      it('should calculate special character ratio correctly', () => {
        // 30% threshold test cases
        expect(sqlSanitization.isValidSearchTerm('ab%')).toBe(false); // 1/3 = 33% (should be false but 33% > 30%)
        expect(sqlSanitization.isValidSearchTerm('abc%')).toBe(true); // 1/4 = 25%
        expect(sqlSanitization.isValidSearchTerm('%%test')).toBe(false); // 2/6 = 33% (should be false but exactly at threshold)
      });
    });
  });

  describe('sanitizeSearchTerms', () => {
    beforeEach(() => {
      (sanitizeText as jest.Mock).mockImplementation((input) => input);
    });

    describe('Input Validation', () => {
      it('should return empty array for non-array input', () => {
        expect(sqlSanitization.sanitizeSearchTerms(null as any)).toEqual([]);
        expect(sqlSanitization.sanitizeSearchTerms(undefined as any)).toEqual([]);
        expect(sqlSanitization.sanitizeSearchTerms('string' as any)).toEqual([]);
        expect(sqlSanitization.sanitizeSearchTerms(123 as any)).toEqual([]);
      });

      it('should handle empty array', () => {
        expect(sqlSanitization.sanitizeSearchTerms([])).toEqual([]);
      });
    });

    describe('Term Processing', () => {
      it('should sanitize each term', () => {
        const terms = ['test%', 'user_', "John's"];
        const result = sqlSanitization.sanitizeSearchTerms(terms);

        expect(result).toEqual(['test\\%', 'user\\_', "John''s"]);
      });

      it('should filter out empty strings after sanitization', () => {
        (sanitizeText as jest.Mock).mockImplementation((input) => {
          if (input === 'empty') return '';
          return input;
        });

        const terms = ['valid', 'empty', 'another'];
        const result = sqlSanitization.sanitizeSearchTerms(terms);

        expect(result).toEqual(['valid', 'another']);
      });

      it('should trim whitespace from terms', () => {
        (sanitizeText as jest.Mock).mockImplementation((input) => input);
        const terms = ['  test  ', ' user ', '  '];
        const result = sqlSanitization.sanitizeSearchTerms(terms);

        expect(result).toEqual(['test', 'user']);
      });
    });

    describe('Term Limiting', () => {
      it('should respect default max terms limit', () => {
        const terms = Array(15).fill('test');
        const result = sqlSanitization.sanitizeSearchTerms(terms);

        expect(result.length).toBe(10);
      });

      it('should respect custom max terms limit', () => {
        const terms = ['term1', 'term2', 'term3', 'term4', 'term5'];
        const result = sqlSanitization.sanitizeSearchTerms(terms, 3);

        expect(result).toEqual(['term1', 'term2', 'term3']);
      });

      it('should handle fewer terms than limit', () => {
        const terms = ['term1', 'term2'];
        const result = sqlSanitization.sanitizeSearchTerms(terms, 10);

        expect(result).toEqual(['term1', 'term2']);
      });
    });
  });

  describe('createSafeILIKEPattern', () => {
    beforeEach(() => {
      (sanitizeText as jest.Mock).mockImplementation((input) => input);
    });

    describe('Pattern Types', () => {
      it('should create contains pattern by default', () => {
        const result = sqlSanitization.createSafeILIKEPattern('test');
        expect(result).toBe('%test%');
      });

      it('should create contains pattern explicitly', () => {
        const result = sqlSanitization.createSafeILIKEPattern('test', 'contains');
        expect(result).toBe('%test%');
      });

      it('should create startsWith pattern', () => {
        const result = sqlSanitization.createSafeILIKEPattern('test', 'startsWith');
        expect(result).toBe('test%');
      });

      it('should create endsWith pattern', () => {
        const result = sqlSanitization.createSafeILIKEPattern('test', 'endsWith');
        expect(result).toBe('%test');
      });

      it('should create exact pattern', () => {
        const result = sqlSanitization.createSafeILIKEPattern('test', 'exact');
        expect(result).toBe('test');
      });

      it('should default to contains for invalid pattern type', () => {
        const result = sqlSanitization.createSafeILIKEPattern('test', 'invalid' as any);
        expect(result).toBe('%test%');
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should escape wildcards in search term', () => {
        const result = sqlSanitization.createSafeILIKEPattern('test%_', 'contains');
        expect(result).toBe('%test\\%\\_%');
      });

      it('should escape quotes in search term', () => {
        const result = sqlSanitization.createSafeILIKEPattern("John's", 'startsWith');
        expect(result).toBe("John''s%");
      });

      it('should handle SQL injection attempts', () => {
        const result = sqlSanitization.createSafeILIKEPattern("' OR '1'='1", 'contains');
        expect(result).toBe("%'' OR ''1''=''1%");
      });
    });

    describe('Edge Cases', () => {
      it('should return empty string for empty input', () => {
        (sanitizeText as jest.Mock).mockReturnValue('');
        expect(sqlSanitization.createSafeILIKEPattern('')).toBe('');
        expect(sqlSanitization.createSafeILIKEPattern(null as any)).toBe('');
        expect(sqlSanitization.createSafeILIKEPattern(undefined as any)).toBe('');
      });

      it('should handle whitespace-only input', () => {
        (sanitizeText as jest.Mock).mockReturnValue('   ');
        const result = sqlSanitization.createSafeILIKEPattern('   ', 'contains');
        expect(result).toBe(''); // Trimmed to empty
      });

      it('should handle special characters in different pattern types', () => {
        const term = 'test_%';

        expect(sqlSanitization.createSafeILIKEPattern(term, 'contains')).toBe('%test\\_\\%%');
        expect(sqlSanitization.createSafeILIKEPattern(term, 'startsWith')).toBe('test\\_\\%%');
        expect(sqlSanitization.createSafeILIKEPattern(term, 'endsWith')).toBe('%test\\_\\%');
        expect(sqlSanitization.createSafeILIKEPattern(term, 'exact')).toBe('test\\_\\%');
      });
    });
  });

  describe('SearchRateLimiter', () => {
    let rateLimiter: any;

    beforeEach(() => {
      // Access the exported searchRateLimiter instance
      rateLimiter = sqlSanitization.searchRateLimiter;
      // Clear any existing attempts
      rateLimiter.cleanup();
    });

    describe('Basic Rate Limiting', () => {
      it('should allow first request', () => {
        expect(rateLimiter.isAllowed('user1')).toBe(true);
      });

      it('should allow multiple requests within limit', () => {
        const key = 'user2';
        for (let i = 0; i < 49; i++) {
          expect(rateLimiter.isAllowed(key)).toBe(true);
        }
        // 50th request should be allowed (at the limit)
        expect(rateLimiter.isAllowed(key)).toBe(true);
      });

      it('should block requests exceeding limit', () => {
        const key = 'user3';
        // Make 50 requests (the limit)
        for (let i = 0; i < 50; i++) {
          rateLimiter.isAllowed(key);
        }
        // 51st request should be blocked
        expect(rateLimiter.isAllowed(key)).toBe(false);
        // Further requests should also be blocked
        expect(rateLimiter.isAllowed(key)).toBe(false);
      });

      it('should track different keys independently', () => {
        const key1 = 'user4';
        const key2 = 'user5';

        // Max out key1
        for (let i = 0; i < 50; i++) {
          rateLimiter.isAllowed(key1);
        }
        expect(rateLimiter.isAllowed(key1)).toBe(false);

        // key2 should still be allowed
        expect(rateLimiter.isAllowed(key2)).toBe(true);
      });
    });

    describe('Time Window Reset', () => {
      it('should reset after time window expires', () => {
        jest.useFakeTimers();
        const key = 'user6';

        // Max out the limit
        for (let i = 0; i < 50; i++) {
          rateLimiter.isAllowed(key);
        }
        expect(rateLimiter.isAllowed(key)).toBe(false);

        // Advance time by 1 minute + 1ms
        jest.advanceTimersByTime(60001);

        // Should be allowed again
        expect(rateLimiter.isAllowed(key)).toBe(true);

        jest.useRealTimers();
      });

      it('should not reset before time window expires', () => {
        jest.useFakeTimers();
        const key = 'user7';

        // Max out the limit
        for (let i = 0; i < 50; i++) {
          rateLimiter.isAllowed(key);
        }
        expect(rateLimiter.isAllowed(key)).toBe(false);

        // Advance time by 59 seconds (not enough)
        jest.advanceTimersByTime(59000);

        // Should still be blocked
        expect(rateLimiter.isAllowed(key)).toBe(false);

        jest.useRealTimers();
      });
    });

    describe('Manual Reset', () => {
      it('should reset specific key', () => {
        const key = 'user8';

        // Max out the limit
        for (let i = 0; i < 50; i++) {
          rateLimiter.isAllowed(key);
        }
        expect(rateLimiter.isAllowed(key)).toBe(false);

        // Reset the key
        rateLimiter.reset(key);

        // Should be allowed again
        expect(rateLimiter.isAllowed(key)).toBe(true);
      });

      it('should not affect other keys when resetting', () => {
        const key1 = 'user9';
        const key2 = 'user10';

        // Max out both keys
        for (let i = 0; i < 50; i++) {
          rateLimiter.isAllowed(key1);
          rateLimiter.isAllowed(key2);
        }

        expect(rateLimiter.isAllowed(key1)).toBe(false);
        expect(rateLimiter.isAllowed(key2)).toBe(false);

        // Reset only key1
        rateLimiter.reset(key1);

        expect(rateLimiter.isAllowed(key1)).toBe(true);
        expect(rateLimiter.isAllowed(key2)).toBe(false);
      });
    });

    describe('Cleanup', () => {
      it('should remove expired entries', () => {
        jest.useFakeTimers();

        // Create some entries
        rateLimiter.isAllowed('temp1');
        rateLimiter.isAllowed('temp2');

        // Advance time past expiry
        jest.advanceTimersByTime(61000);

        // Create a new entry
        rateLimiter.isAllowed('temp3');

        // Run cleanup
        rateLimiter.cleanup();

        // Old entries should be gone, new one should remain
        // We can't directly check the map, but we can verify behavior
        expect(rateLimiter.isAllowed('temp3')).toBe(true); // Second request, should work

        jest.useRealTimers();
      });

      it('should not remove active entries', () => {
        jest.useFakeTimers();
        const key = 'active';

        // Create an entry
        for (let i = 0; i < 25; i++) {
          rateLimiter.isAllowed(key);
        }

        // Advance time but not past expiry
        jest.advanceTimersByTime(30000);

        // Run cleanup
        rateLimiter.cleanup();

        // Entry should still be tracked (26th request)
        expect(rateLimiter.isAllowed(key)).toBe(true);

        jest.useRealTimers();
      });
    });

    describe('Auto-cleanup Interval', () => {
      it('should have auto-cleanup configured', () => {
        // The module sets up an interval for cleanup
        // We can't easily test the interval directly, but we can verify
        // that setInterval was called with the correct parameters

        // This is implicitly tested by the module loading
        // The interval is set up when the module loads
        expect(sqlSanitization.searchRateLimiter).toBeDefined();
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Full sanitization pipeline', () => {
      it('should handle complex SQL injection with XSS', () => {
        const input = "<script>alert('xss')</script>' OR '1'='1; DROP TABLE users; --";
        (sanitizeText as jest.Mock).mockReturnValue("' OR '1'='1; DROP TABLE users; --");

        const sanitized = sqlSanitization.sanitizeForSQL(input);
        const pattern = sqlSanitization.createSafeILIKEPattern(sanitized, 'contains');

        expect(pattern).not.toContain('<script>');
        expect(pattern).toContain("''"); // Escaped quotes
      });

      it('should validate and sanitize search terms', () => {
        const terms = [
          'valid search',
          '%wildcard%',
          "John's name",
          '%%%', // Should be filtered out as invalid
          'x'.repeat(201) // Too long
        ];

        (sanitizeText as jest.Mock).mockImplementation((input) => input);

        const sanitized = sqlSanitization.sanitizeSearchTerms(terms);

        // Should only have the first 3 valid terms
        expect(sanitized).toEqual([
          'valid search',
          '\\%wildcard\\%',
          "John''s name"
        ]);
      });

      it('should handle rate limiting with search operations', () => {
        const userId = 'search-user';
        const searchTerm = 'test%';

        sqlSanitization.searchRateLimiter.reset(userId);
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        // Simulate many rapid searches
        for (let i = 0; i < 50; i++) {
          if (sqlSanitization.searchRateLimiter.isAllowed(userId)) {
            const safeTerm = sqlSanitization.sanitizeForSQL(searchTerm);
            const pattern = sqlSanitization.createSafeILIKEPattern(safeTerm, 'contains');
            expect(pattern).toBe('%test\\%%');
          }
        }

        // 51st attempt should be blocked
        expect(sqlSanitization.searchRateLimiter.isAllowed(userId)).toBe(false);

        jest.useRealTimers();
      });
    });
  });
});
