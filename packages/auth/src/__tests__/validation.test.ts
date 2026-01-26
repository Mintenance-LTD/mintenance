import { validateEmail } from '../validation';

describe('validateEmail', () => {
  it('should validate correct email formats', () => {
    // Test valid emails
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.uk')).toBe(true);
    expect(validateEmail('john+tag@company.org')).toBe(true);
  });

  it('should reject invalid email formats', () => {
    // Test invalid emails
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
    expect(validateEmail('spaces in@email.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('should handle error cases', () => {
    // Test error scenarios
  });
});