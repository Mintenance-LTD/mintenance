import { describe, it, expect } from 'vitest';
import { safeNavigationUrl } from '../navigation-url';

describe('safeNavigationUrl', () => {
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>', '//evil.example', '/\\evil.example',
    ' https://example.com', 'https://user:password@example.com', 'file:///etc/passwd'])
    ('rejects executable or ambiguous destinations: %s', value => {
      expect(safeNavigationUrl(value)).toBeNull();
    });
  it.each(['/jobs/123', '/jobs?q=repair', '#details', '?page=2', 'https://example.com/document.pdf'])
    ('preserves supported destinations: %s', value => {
      expect(safeNavigationUrl(value)).toBe(value);
    });
});
