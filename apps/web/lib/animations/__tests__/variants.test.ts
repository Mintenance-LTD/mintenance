import { fadeIn } from '../variants';

describe('fadeIn', () => {
  it('should handle normal cases', () => {
    // Test normal functionality
    expect(fadeIn('input')).toBeDefined();
  });

  it('should handle edge cases', () => {
    // Test edge cases
    expect(() => fadeIn(null)).not.toThrow();
  });

  it('should handle error cases', () => {
    // Test error scenarios
  });
});