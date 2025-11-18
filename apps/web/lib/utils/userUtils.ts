/**
 * Utility functions for user-related operations
 */

interface User {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name?: string | null;
}

/**
 * Detects if a user is a test user based on email patterns and names
 * Test users are identified by:
 * - Email domains: @example.com, emails containing "test"
 * - Names: "Test User", "Test Contractor"
 * - Email patterns: testuser{timestamp}@example.com
 */
export function isTestUser(user: User): boolean {
  const email = user.email.toLowerCase();
  const firstName = (user.first_name || '').toLowerCase();
  const lastName = (user.last_name || '').toLowerCase();
  const companyName = (user.company_name || '').toLowerCase();
  const fullName = `${firstName} ${lastName}`.trim();

  // Check email domain
  if (email.includes('@example.com')) {
    return true;
  }

  // Check for "test" in email (common test email patterns)
  if (email.includes('test@') || email.includes('@test.') || email.startsWith('testuser')) {
    return true;
  }

  // Check for test names
  if (
    fullName === 'test user' ||
    fullName === 'test contractor' ||
    firstName === 'test' ||
    lastName === 'test'
  ) {
    return true;
  }

  // Check company name
  if (companyName.includes('test')) {
    return true;
  }

  return false;
}

