/**
 * Example: Utility Function Testing with Vitest
 * Demonstrates testing pure functions and utilities
 */

import { describe, it, expect } from 'vitest';

// Example utility functions to test
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Tests
describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format GBP correctly', () => {
      expect(formatCurrency(150)).toBe('£150.00');
      expect(formatCurrency(1250.5)).toBe('£1,250.50');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('£0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-50)).toBe('-£50.00');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000)).toBe('£1,000,000.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(10.999)).toBe('£11.00');
      expect(formatCurrency(10.991)).toBe('£10.99');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between London and Paris', () => {
      const london = { lat: 51.5074, lng: -0.1278 };
      const paris = { lat: 48.8566, lng: 2.3522 };

      const distance = calculateDistance(london, paris);

      // Distance should be approximately 343 km
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    });

    it('should return 0 for same location', () => {
      const location = { lat: 51.5074, lng: -0.1278 };
      const distance = calculateDistance(location, location);

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const point1 = { lat: -33.8688, lng: 151.2093 }; // Sydney
      const point2 = { lat: 51.5074, lng: -0.1278 }; // London

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(16000); // ~17,000 km (approx)
    });

    it('should be symmetric', () => {
      const london = { lat: 51.5074, lng: -0.1278 };
      const paris = { lat: 48.8566, lng: 2.3522 };

      const distance1 = calculateDistance(london, paris);
      const distance2 = calculateDistance(paris, london);

      expect(distance1).toBeCloseTo(distance2, 2);
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('Fix Leaking Tap')).toBe('fix-leaking-tap');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! @World #123')).toBe('hello-world-123');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle already slugified text', () => {
      // Hyphens are not word characters, so they get removed
      expect(slugify('already-slugified')).toBe('alreadyslugified');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs truncation';
      expect(truncateText(text, 20)).toBe('This is a very long ...');
    });

    it('should not truncate short text', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe('Short text');
    });

    it('should handle exact length', () => {
      const text = 'Exactly twenty chars';
      expect(truncateText(text, 20)).toBe('Exactly twenty chars');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle zero maxLength', () => {
      expect(truncateText('Hello', 0)).toBe('...');
    });
  });
});

// Example: Testing async functions
describe('Async Utilities', () => {
  async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchUserName(userId: string): Promise<string> {
    await delay(100);
    return `User ${userId}`;
  }

  it('should wait for async operation', async () => {
    const result = await fetchUserName('123');
    expect(result).toBe('User 123');
  });

  it('should handle multiple async calls', async () => {
    const results = await Promise.all([
      fetchUserName('1'),
      fetchUserName('2'),
      fetchUserName('3'),
    ]);

    expect(results).toEqual(['User 1', 'User 2', 'User 3']);
  });
});

// Example: Testing error handling
describe('Error Handling', () => {
  function divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }

  it('should divide correctly', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should throw error on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  it('should throw Error instance', () => {
    expect(() => divide(10, 0)).toThrow(Error);
  });
});

// Example: Testing with different inputs (parameterized tests)
describe('Parameterized Tests', () => {
  describe.each([
    { input: 100, expected: '£100.00' },
    { input: 1500, expected: '£1,500.00' },
    { input: 0.99, expected: '£0.99' },
    { input: 0, expected: '£0.00' },
  ])('formatCurrency($input)', ({ input, expected }) => {
    it(`should format ${input} as ${expected}`, () => {
      expect(formatCurrency(input)).toBe(expected);
    });
  });
});

// Example: Testing edge cases
describe('Edge Cases', () => {
  it('should handle very large numbers', () => {
    const largeNumber = Number.MAX_SAFE_INTEGER;
    const result = formatCurrency(largeNumber);
    expect(result).toBeDefined();
    expect(result).toContain('£');
  });

  it('should handle very small decimal numbers', () => {
    expect(formatCurrency(0.001)).toBe('£0.00');
  });

  it('should handle special characters in slugify', () => {
    const text = '!@#$%^&*()_+-=[]{}|;:",.<>?/';
    const result = slugify(text);
    expect(result).not.toContain('!');
    expect(result).not.toContain('@');
  });
});
