/**
 * XSS Prevention Tests
 *
 * Tests for dangerouslySetInnerHTML usage to ensure no XSS vulnerabilities
 */

/**
 * Copy of sanitizeForJsonLd from components/StructuredData.tsx
 */
function sanitizeForJsonLd(value) {
  if (!value) return '';
  return value
    .replace(/</g, '\u003c')
    .replace(/>/g, '\u003e')
    .replace(/\//g, '\u002f')
    .replace(/\/g, '\\')
    .replace(/"/g, '\\"');
}

/**
 * Copy of sanitizeObjectForJsonLd from components/StructuredData.tsx
 */
function sanitizeObjectForJsonLd(obj) {
  if (typeof obj === 'string') {
    return sanitizeForJsonLd(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectForJsonLd);
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectForJsonLd(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Copy of sanitizeGridArea from components/ui/ResponsiveGrid.tsx
 */
function sanitizeGridArea(area) {
  return area.replace(/[^a-zA-Z0-9\-_]/g, '');
}

describe('XSS Prevention - JSON-LD Structured Data', () => {
  describe('sanitizeForJsonLd', () => {
    test('should escape script tags', () => {
      const malicious = '<script>alert("XSS")</script>';
      const sanitized = sanitizeForJsonLd(malicious);

      expect(sanitized).toBe('\u003cscript\u003ealert(\\"XSS\\")\u003c\u002fscript\u003e');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    test('should escape img tags with onerror', () => {
      const malicious = '<img src=x onerror=alert(1)>';
      const sanitized = sanitizeForJsonLd(malicious);

      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('\u003c');
      expect(sanitized).toContain('\u003e');
    });

    test('should escape double quotes', () => {
      const input = 'Test "quoted" string';
      const sanitized = sanitizeForJsonLd(input);

      expect(sanitized).toBe('Test \\"quoted\\" string');
    });

    test('should escape forward slashes', () => {
      const malicious = '</script><script>alert(1)</script>';
      const sanitized = sanitizeForJsonLd(malicious);

      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('\u002f');
    });

    test('should handle undefined and empty strings', () => {
      expect(sanitizeForJsonLd(undefined)).toBe('');
      expect(sanitizeForJsonLd('')).toBe('');
    });
  });

  describe('sanitizeObjectForJsonLd', () => {
    test('should recursively sanitize nested objects', () => {
      const obj = {
        name: '<script>alert(1)</script>',
        nested: {
          value: '</script>',
        },
      };

      const sanitized = sanitizeObjectForJsonLd(obj);
      const jsonString = JSON.stringify(sanitized);

      expect(jsonString).not.toMatch(/<script>/);
      expect(jsonString).toContain('\u003c');
    });

    test('should sanitize arrays', () => {
      const obj = {
        services: [
          '<script>alert(1)</script>',
          'normal service',
        ],
      };

      const sanitized = sanitizeObjectForJsonLd(obj);
      const jsonString = JSON.stringify(sanitized);

      expect(jsonString).not.toContain('<script>');
      expect(jsonString).toContain('normal service');
    });
  });
});

describe('XSS Prevention - CSS Grid Areas', () => {
  describe('sanitizeGridArea', () => {
    test('should allow valid grid area names', () => {
      expect(sanitizeGridArea('header')).toBe('header');
      expect(sanitizeGridArea('main-content')).toBe('main-content');
      expect(sanitizeGridArea('widget_1')).toBe('widget_1');
    });

    test('should remove special characters', () => {
      expect(sanitizeGridArea('header<script>')).toBe('headerscript');
      expect(sanitizeGridArea('main;color:red')).toBe('maincolorred');
    });

    test('should prevent CSS injection', () => {
      const malicious = 'header; background: red';
      const sanitized = sanitizeGridArea(malicious);

      expect(sanitized).toBe('headerbackgroundred');
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain(':');
    });
  });
});
