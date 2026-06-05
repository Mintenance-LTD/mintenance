/**
 * Tests for Data Validation Utilities
 */

import {
  ValidationError,
  validateRequired,
  validateStringLength,
  validateEmail,
  validatePhone,
  validatePositiveNumber,
  validateRating,
  validateUser,
  validateJob,
  validateBid,
  validateMessage,
  validateContractorProfile,
  validateJobForm,
  validateBidForm,
  validateRegistrationForm,
  sanitizeString,
  sanitizeHtml,
  sanitizeNumber,
  ValidationSchemas,
} from '../validation';
import DefaultSchemas from '../validation';

describe('ValidationError', () => {
  it('should create error with field and value', () => {
    const error = new ValidationError('Invalid input', 'email', 'bad@');
    expect(error.message).toBe('Invalid input');
    expect(error.field).toBe('email');
    expect(error.value).toBe('bad@');
    expect(error.name).toBe('ValidationError');
  });
});

describe('validateRequired', () => {
  it('should pass when all required fields are present', () => {
    const obj = { name: 'John', email: 'john@example.com' };
    const result = validateRequired(obj, ['name', 'email']);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when required fields are missing', () => {
    const obj = { name: 'John' };
    const result = validateRequired(obj, ['name', 'email']);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('email is required');
  });

  it('should fail when required fields are empty strings', () => {
    const obj = { name: '', email: 'test@test.com' };
    const result = validateRequired(obj, ['name', 'email']);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('name is required');
  });

  it('should fail when required fields are null', () => {
    const obj = { name: null, email: undefined };
    const result = validateRequired(obj, ['name', 'email']);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});

describe('validateStringLength', () => {
  it('should pass when string length is within bounds', () => {
    const result = validateStringLength('test', 'field', 2, 10);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when string is too short', () => {
    const result = validateStringLength('ab', 'field', 5);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('at least 5 characters');
  });

  it('should fail when string is too long', () => {
    const result = validateStringLength('verylongstring', 'field', 1, 5);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('not exceed 5 characters');
  });

  it('should pass when maxLength is not specified', () => {
    const result = validateStringLength('anylengthstring', 'field', 5);
    expect(result.isValid).toBe(true);
  });
});

describe('validateEmail', () => {
  it('should pass for valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
    ];

    validEmails.forEach((email) => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
    });
  });

  it('should fail for invalid email addresses', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user @example.com',
      'user@domain',
    ];

    invalidEmails.forEach((email) => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBe('Invalid email format');
    });
  });
});

describe('validatePhone', () => {
  it('should pass for valid phone numbers', () => {
    const validPhones = [
      '1234567890',
      '+1 (555) 123-4567',
      '555-123-4567',
      '+44 20 7946 0958',
    ];

    validPhones.forEach((phone) => {
      const result = validatePhone(phone);
      expect(result.isValid).toBe(true);
    });
  });

  it('should fail for too short phone numbers', () => {
    const result = validatePhone('123456789');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('10-15 digits');
  });

  it('should fail for too long phone numbers', () => {
    const result = validatePhone('1234567890123456');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('10-15 digits');
  });
});

describe('validatePositiveNumber', () => {
  it('should pass for positive numbers', () => {
    const result = validatePositiveNumber(42, 'amount');
    expect(result.isValid).toBe(true);
  });

  it('should fail for zero', () => {
    const result = validatePositiveNumber(0, 'amount');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('positive number');
  });

  it('should fail for negative numbers', () => {
    const result = validatePositiveNumber(-5, 'amount');
    expect(result.isValid).toBe(false);
  });

  it('should fail for non-finite numbers', () => {
    const result = validatePositiveNumber(Infinity, 'amount');
    expect(result.isValid).toBe(false);
  });
});

describe('validateRating', () => {
  it('should pass for valid ratings 1-5', () => {
    [1, 2, 3, 4, 5].forEach((rating) => {
      const result = validateRating(rating);
      expect(result.isValid).toBe(true);
    });
  });

  it('should fail for ratings below 1', () => {
    const result = validateRating(0);
    expect(result.isValid).toBe(false);
  });

  it('should fail for ratings above 5', () => {
    const result = validateRating(6);
    expect(result.isValid).toBe(false);
  });

  it('should fail for non-integer ratings', () => {
    const result = validateRating(3.5);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('integer');
  });
});

describe('validateUser', () => {
  const validUser = {
    id: 'user123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'contractor' as const,
  };

  it('should pass for valid user', () => {
    const result = validateUser(validUser);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when required fields are missing', () => {
    const result = validateUser({ email: 'test@test.com' });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should fail for invalid email', () => {
    const result = validateUser({ ...validUser, email: 'bademail' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('email'))).toBe(true);
  });

  it('should fail for invalid role', () => {
    const result = validateUser({ ...validUser, role: 'admin' as any });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Role'))).toBe(true);
  });

  it('should validate phone number if provided', () => {
    const result = validateUser({ ...validUser, phone: '12345' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Phone'))).toBe(true);
  });

  it('should validate rating if provided', () => {
    const result = validateUser({ ...validUser, rating: 10 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Rating'))).toBe(true);
  });
});

describe('validateJob', () => {
  const validJob = {
    id: 'job123',
    title: 'Fix kitchen sink',
    description: 'Need plumber to fix leaking kitchen sink',
    location: '123 Main St',
    homeownerId: 'user123',
    budget: 150,
    status: 'posted' as const,
  };

  it('should pass for valid job', () => {
    const result = validateJob(validJob);
    expect(result.isValid).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const result = validateJob({ title: 'Test' });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should fail for title too short', () => {
    const result = validateJob({ ...validJob, title: 'Fix' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('title'))).toBe(true);
  });

  it('should fail for invalid budget', () => {
    const result = validateJob({ ...validJob, budget: -50 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('budget'))).toBe(true);
  });

  it('should fail for invalid status', () => {
    const result = validateJob({ ...validJob, status: 'invalid' as any });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('status'))).toBe(true);
  });

  it('should fail for invalid priority', () => {
    const result = validateJob({ ...validJob, priority: 'urgent' as any });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Priority'))).toBe(true);
  });

  it('should fail for too many photos', () => {
    const result = validateJob({
      ...validJob,
      photos: Array(11).fill('photo.jpg'),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('photos'))).toBe(true);
  });
});

describe('validateBid', () => {
  const validBid = {
    id: 'bid123',
    jobId: 'job123',
    contractorId: 'user123',
    amount: 150,
    description: 'I can complete this job within 2 days',
    status: 'pending' as const,
  };

  it('should pass for valid bid', () => {
    const result = validateBid(validBid);
    expect(result.isValid).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const result = validateBid({ amount: 100 });
    expect(result.isValid).toBe(false);
  });

  it('should fail for invalid amount', () => {
    const result = validateBid({ ...validBid, amount: 0 });
    expect(result.isValid).toBe(false);
  });

  it('should fail for description too short', () => {
    const result = validateBid({ ...validBid, description: 'short' });
    expect(result.isValid).toBe(false);
  });

  it('should fail for invalid status', () => {
    const result = validateBid({ ...validBid, status: 'invalid' as any });
    expect(result.isValid).toBe(false);
  });
});

describe('validateMessage', () => {
  const validMessage = {
    id: 'msg123',
    jobId: 'job123',
    senderId: 'user1',
    receiverId: 'user2',
    messageText: 'Hello, how are you?',
    messageType: 'text' as const,
  };

  it('should pass for valid message', () => {
    const result = validateMessage(validMessage);
    expect(result.isValid).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const result = validateMessage({ messageText: 'test' });
    expect(result.isValid).toBe(false);
  });

  it('should fail for message text too long', () => {
    const result = validateMessage({
      ...validMessage,
      messageText: 'x'.repeat(1001),
    });
    expect(result.isValid).toBe(false);
  });

  it('should fail for invalid message type', () => {
    const result = validateMessage({
      ...validMessage,
      messageType: 'invalid' as any,
    });
    expect(result.isValid).toBe(false);
  });
});

describe('validateContractorProfile', () => {
  const validProfile = {
    id: 'user123',
    email: 'contractor@example.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'contractor' as const,
    hourlyRate: 50,
    yearsExperience: 10,
    serviceRadius: 25,
    availability: 'immediate' as const,
  };

  it('should pass for valid contractor profile', () => {
    const result = validateContractorProfile(validProfile);
    expect(result.isValid).toBe(true);
  });

  it('should fail for invalid hourly rate', () => {
    const result = validateContractorProfile({
      ...validProfile,
      hourlyRate: -5,
    });
    expect(result.isValid).toBe(false);
  });

  it('should fail for invalid years of experience', () => {
    const result = validateContractorProfile({
      ...validProfile,
      yearsExperience: 60,
    });
    expect(result.isValid).toBe(false);
  });

  it('should fail for too many portfolio images', () => {
    const result = validateContractorProfile({
      ...validProfile,
      portfolioImages: Array(21).fill('image.jpg'),
    });
    expect(result.isValid).toBe(false);
  });

  it('should fail for invalid availability', () => {
    const result = validateContractorProfile({
      ...validProfile,
      availability: 'never' as any,
    });
    expect(result.isValid).toBe(false);
  });
});

describe('validateJobForm', () => {
  const validForm = {
    title: 'Fix kitchen sink',
    description: 'Need plumber to fix leaking kitchen sink',
    location: '123 Main St',
    budget: 150,
  };

  it('should pass for valid job form', () => {
    const result = validateJobForm(validForm);
    expect(result.isValid).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const result = validateJobForm({ title: 'Test' });
    expect(result.isValid).toBe(false);
  });

  it('should validate all field constraints', () => {
    const result = validateJobForm({ ...validForm, title: 'abc', budget: -10 });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateBidForm', () => {
  const validForm = {
    amount: 150,
    description: 'I can complete this job within 2 days',
  };

  it('should pass for valid bid form', () => {
    const result = validateBidForm(validForm);
    expect(result.isValid).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const result = validateBidForm({ amount: 100 });
    expect(result.isValid).toBe(false);
  });

  it('should validate amount and description', () => {
    const result = validateBidForm({ amount: -10, description: 'short' });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateRegistrationForm', () => {
  const validForm = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'contractor',
  };

  it('should pass for valid registration form', () => {
    const result = validateRegistrationForm(validForm);
    expect(result.isValid).toBe(true);
  });

  it('should fail for weak password', () => {
    const result = validateRegistrationForm({ ...validForm, password: 'weak' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('password'))).toBe(true);
  });

  it('should require password complexity', () => {
    const result = validateRegistrationForm({
      ...validForm,
      password: 'alllowercase',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
  });

  it('should fail for invalid email', () => {
    const result = validateRegistrationForm({
      ...validForm,
      email: 'bademail',
    });
    expect(result.isValid).toBe(false);
  });

  it('should fail for invalid role', () => {
    const result = validateRegistrationForm({ ...validForm, role: 'admin' });
    expect(result.isValid).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('should trim whitespace', () => {
    expect(sanitizeString('  test  ')).toBe('test');
  });

  it('should remove angle brackets', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe(
      'scriptalert("xss")/script'
    );
  });

  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('');
  });
});

describe('sanitizeHtml', () => {
  it('should escape HTML characters', () => {
    expect(sanitizeHtml('<div>Test</div>')).toBe(
      '&lt;div&gt;Test&lt;&#x2F;div&gt;'
    );
  });

  it('should escape quotes', () => {
    expect(sanitizeHtml('"double" and \'single\'')).toBe(
      '&quot;double&quot; and &#x27;single&#x27;'
    );
  });

  it('should escape forward slashes', () => {
    expect(sanitizeHtml('path/to/file')).toBe('path&#x2F;to&#x2F;file');
  });
});

describe('sanitizeNumber', () => {
  it('should convert valid numbers', () => {
    expect(sanitizeNumber('42')).toBe(42);
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber('3.14')).toBe(3.14);
  });

  it('should return null for invalid numbers', () => {
    expect(sanitizeNumber('not a number')).toBeNull();
    expect(sanitizeNumber(undefined)).toBeNull();
    // Note: Number(null) returns 0, not NaN
    expect(sanitizeNumber(null)).toBe(0);
  });

  it('should handle zero', () => {
    expect(sanitizeNumber('0')).toBe(0);
    expect(sanitizeNumber(0)).toBe(0);
  });

  it('should parse negative and scientific notation', () => {
    expect(sanitizeNumber('-7')).toBe(-7);
    expect(sanitizeNumber('1e3')).toBe(1000);
  });

  it('should return null for NaN-producing objects', () => {
    expect(sanitizeNumber({})).toBeNull();
    expect(sanitizeNumber('12abc')).toBeNull();
  });
});

// =============================================
// BRANCH-COVERAGE EXTENSIONS
// These exercise the "skipped optional field" (falsy-guard) branches
// that the happy/sad-path tests above don't reach.
// =============================================

describe('validateStringLength — boundary equality', () => {
  it('passes when length is exactly minLength', () => {
    const result = validateStringLength('abcde', 'field', 5, 10);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passes when length is exactly maxLength', () => {
    const result = validateStringLength('abcde', 'field', 1, 5);
    expect(result.isValid).toBe(true);
  });

  it('reports both too-short and is unaffected by absent maxLength', () => {
    const result = validateStringLength('a', 'field', 5);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});

describe('validatePositiveNumber — NaN branch', () => {
  it('fails for NaN', () => {
    const result = validatePositiveNumber(NaN, 'amount');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('positive number');
  });

  it('fails for -Infinity', () => {
    const result = validatePositiveNumber(-Infinity, 'amount');
    expect(result.isValid).toBe(false);
  });

  it('passes for a small positive fraction', () => {
    const result = validatePositiveNumber(0.01, 'amount');
    expect(result.isValid).toBe(true);
  });
});

describe('validateRating — boundaries', () => {
  it('fails for negative ratings', () => {
    const result = validateRating(-1);
    expect(result.isValid).toBe(false);
  });

  it('fails for NaN', () => {
    const result = validateRating(NaN);
    expect(result.isValid).toBe(false);
  });
});

describe('validateUser — optional fields skipped (falsy guards)', () => {
  it('passes with only required fields, no optionals present', () => {
    // No email-format check beyond presence, no phone, no rating — exercises
    // the falsy branch of each optional guard.
    const result = validateUser({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'homeowner',
    });
    expect(result.isValid).toBe(true);
  });

  it('skips email-format check when email is absent (still fails on required)', () => {
    const result = validateUser({
      id: 'u1',
      firstName: 'A',
      lastName: 'B',
      role: 'homeowner',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('email is required');
    // No "Invalid email format" because the email guard was falsy
    expect(result.errors).not.toContain('Invalid email format');
  });

  it('does not run rating validation when rating is undefined', () => {
    const result = validateUser({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
    });
    expect(result.errors.some((e) => e.includes('Rating'))).toBe(false);
  });

  it('accepts rating of exactly 0 boundary as invalid via validateRating', () => {
    const result = validateUser({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
      rating: 0,
    });
    expect(result.errors.some((e) => e.includes('Rating'))).toBe(true);
  });
});

describe('validateJob — optional fields skipped (falsy guards)', () => {
  it('passes with only required fields and no optionals', () => {
    const result = validateJob({
      id: 'j1',
      title: 'A valid title',
      description: 'A sufficiently long description.',
      location: '1 Road',
      homeownerId: 'h1',
      budget: 100,
    });
    expect(result.isValid).toBe(true);
  });

  it('skips title length check when title is absent', () => {
    const result = validateJob({
      id: 'j1',
      description: 'A sufficiently long description.',
      location: '1 Road',
      homeownerId: 'h1',
      budget: 100,
    });
    expect(result.errors).toContain('title is required');
  });

  it('allows exactly 10 photos', () => {
    const result = validateJob({
      id: 'j1',
      title: 'A valid title',
      description: 'A sufficiently long description.',
      location: '1 Road',
      homeownerId: 'h1',
      budget: 100,
      photos: Array(10).fill('p.jpg'),
    });
    expect(result.isValid).toBe(true);
  });
});

describe('validateBid — optional fields skipped (falsy guards)', () => {
  it('skips amount check when amount is absent', () => {
    const result = validateBid({
      id: 'b1',
      jobId: 'j1',
      contractorId: 'c1',
      description: 'A sufficiently long description here.',
    });
    expect(result.errors).toContain('amount is required');
    expect(result.errors.some((e) => e.includes('positive number'))).toBe(
      false
    );
  });

  it('passes with required + valid optional status', () => {
    const result = validateBid({
      id: 'b1',
      jobId: 'j1',
      contractorId: 'c1',
      amount: 99,
      description: 'A sufficiently long description here.',
      status: 'accepted',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('validateMessage — optional fields skipped (falsy guards)', () => {
  it('skips text-length check when messageText is absent', () => {
    const result = validateMessage({
      id: 'm1',
      jobId: 'j1',
      senderId: 's1',
      receiverId: 'r1',
    });
    expect(result.errors).toContain('messageText is required');
  });

  it('passes for each valid non-default message type', () => {
    const types = [
      'image',
      'file',
      'video_call_invitation',
      'video_call_started',
      'video_call_ended',
      'video_call_missed',
    ];
    types.forEach((messageType) => {
      const result = validateMessage({
        id: 'm1',
        jobId: 'j1',
        senderId: 's1',
        receiverId: 'r1',
        messageText: 'hi',
        messageType: messageType as never,
      });
      expect(result.isValid).toBe(true);
    });
  });

  it('passes when messageType is absent (guard falsy)', () => {
    const result = validateMessage({
      id: 'm1',
      jobId: 'j1',
      senderId: 's1',
      receiverId: 'r1',
      messageText: 'hi',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('validateContractorProfile — optional fields skipped (falsy guards)', () => {
  it('passes with only base user fields (no contractor optionals)', () => {
    const result = validateContractorProfile({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
    });
    expect(result.isValid).toBe(true);
  });

  it('fails for negative years of experience', () => {
    const result = validateContractorProfile({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
      yearsExperience: -1,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Years of experience'))).toBe(
      true
    );
  });

  it('fails for non-integer years of experience', () => {
    const result = validateContractorProfile({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
      yearsExperience: 5.5,
    });
    expect(result.errors.some((e) => e.includes('Years of experience'))).toBe(
      true
    );
  });

  it('accepts boundary years of experience (0 and 50)', () => {
    const zero = validateContractorProfile({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
      yearsExperience: 0,
    });
    const fifty = validateContractorProfile({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
      yearsExperience: 50,
    });
    expect(zero.isValid).toBe(true);
    expect(fifty.isValid).toBe(true);
  });

  it('fails for invalid service radius', () => {
    const result = validateContractorProfile({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
      serviceRadius: -10,
    });
    expect(result.errors.some((e) => e.includes('serviceRadius'))).toBe(true);
  });

  it('allows exactly 20 portfolio images', () => {
    const result = validateContractorProfile({
      id: 'u1',
      email: 'ok@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
      portfolioImages: Array(20).fill('img.jpg'),
    });
    expect(result.isValid).toBe(true);
  });
});

describe('validateJobForm — optional fields skipped (falsy guards)', () => {
  it('skips per-field checks when only some fields present', () => {
    // budget absent => required error, but no positive-number check; title absent => no length check
    const result = validateJobForm({ description: 'long enough description' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('title is required');
    expect(result.errors).toContain('budget is required');
    expect(result.errors).toContain('location is required');
  });
});

describe('validateBidForm — optional fields skipped (falsy guards)', () => {
  it('skips amount check when amount absent', () => {
    const result = validateBidForm({ description: 'long enough description' });
    expect(result.errors).toContain('amount is required');
    expect(result.errors.some((e) => e.includes('positive number'))).toBe(
      false
    );
  });
});

describe('validateRegistrationForm — optional/branch coverage', () => {
  it('skips all field checks when nothing provided', () => {
    const result = validateRegistrationForm({});
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('email is required');
    expect(result.errors).toContain('password is required');
    expect(result.errors).toContain('firstName is required');
    expect(result.errors).toContain('lastName is required');
    expect(result.errors).toContain('role is required');
  });

  it('does not run complexity check when password is too short (<8)', () => {
    const result = validateRegistrationForm({
      email: 'ok@example.com',
      password: 'Ab1!',
      firstName: 'A',
      lastName: 'B',
      role: 'homeowner',
    });
    expect(result.isValid).toBe(false);
    // Length error present, complexity message absent because length < 8
    expect(result.errors.some((e) => e.includes('at least 8'))).toBe(true);
    expect(result.errors.some((e) => e.includes('at least 3 of'))).toBe(false);
  });

  it('passes a password meeting exactly 3 complexity classes', () => {
    // upper + lower + number, no special char => 3 classes => valid
    const result = validateRegistrationForm({
      email: 'ok@example.com',
      password: 'Abcdefg1',
      firstName: 'A',
      lastName: 'B',
      role: 'homeowner',
    });
    expect(result.isValid).toBe(true);
  });

  it('fails a long password with only 2 complexity classes', () => {
    const result = validateRegistrationForm({
      email: 'ok@example.com',
      password: 'abcdefgh1',
      firstName: 'A',
      lastName: 'B',
      role: 'contractor',
    });
    expect(result.errors.some((e) => e.includes('at least 3 of'))).toBe(true);
  });

  it('skips firstName/lastName length checks when absent', () => {
    const result = validateRegistrationForm({
      email: 'ok@example.com',
      password: 'Abcdefg1',
      role: 'homeowner',
    });
    expect(result.errors).toContain('firstName is required');
    expect(result.errors).toContain('lastName is required');
  });

  it('flags firstName exceeding max length', () => {
    const result = validateRegistrationForm({
      email: 'ok@example.com',
      password: 'Abcdefg1',
      firstName: 'x'.repeat(51),
      lastName: 'B',
      role: 'homeowner',
    });
    expect(result.errors.some((e) => e.includes('firstName'))).toBe(true);
  });
});

describe('ValidationSchemas registry', () => {
  it('exposes entity + form validators that delegate correctly', () => {
    expect(ValidationSchemas.user).toBe(validateUser);
    expect(ValidationSchemas.job).toBe(validateJob);
    expect(ValidationSchemas.bid).toBe(validateBid);
    expect(ValidationSchemas.message).toBe(validateMessage);
    expect(ValidationSchemas.contractorProfile).toBe(validateContractorProfile);
    expect(ValidationSchemas.forms.job).toBe(validateJobForm);
    expect(ValidationSchemas.forms.bid).toBe(validateBidForm);
    expect(ValidationSchemas.forms.registration).toBe(validateRegistrationForm);
  });

  it('default export equals the named ValidationSchemas', () => {
    expect(DefaultSchemas).toBe(ValidationSchemas);
  });
});
