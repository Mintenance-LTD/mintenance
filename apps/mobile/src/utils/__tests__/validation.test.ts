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
} from '../validation';

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
    const result = validateContractorProfile({ ...validProfile, hourlyRate: -5 });
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
});
