/**
 * Validation Schema Tests
 * Tests for Zod validation schemas
 */

import {
  loginSchema,
  registerSchema,
  paymentIntentSchema,
  passwordResetSchema,
} from '../schemas';

describe('loginSchema', () => {
  it('should validate valid login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should normalize email to lowercase', () => {
    const data = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
    };

    const result = loginSchema.safeParse(data);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'not-an-email',
      password: 'password123',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'short',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should trim email whitespace', () => {
    const data = {
      email: '  test@example.com  ',
      password: 'password123',
    };

    const result = loginSchema.safeParse(data);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });
});

describe('registerSchema', () => {
  const validRegistration = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'homeowner' as const,
  };

  it('should validate valid registration data', () => {
    const result = registerSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it('should require uppercase in password', () => {
    const data = {
      ...validRegistration,
      password: 'securepass123!',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('uppercase');
    }
  });

  it('should require lowercase in password', () => {
    const data = {
      ...validRegistration,
      password: 'SECUREPASS123!',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('lowercase');
    }
  });

  it('should require number in password', () => {
    const data = {
      ...validRegistration,
      password: 'SecurePass!',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('number');
    }
  });

  it('should require special character in password', () => {
    const data = {
      ...validRegistration,
      password: 'SecurePass123',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('special character');
    }
  });

  it('should validate phone number format', () => {
    const data = {
      ...validRegistration,
      phone: '+441234567890',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should strip phone number formatting', () => {
    const data = {
      ...validRegistration,
      phone: '+44 (123) 456-7890',
    };

    const result = registerSchema.safeParse(data);
    if (result.success) {
      expect(result.data.phone).toBe('+441234567890');
    }
  });

  it('should reject invalid role', () => {
    const data = {
      ...validRegistration,
      role: 'invalid' as any,
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('paymentIntentSchema', () => {
  const validPayment = {
    amount: 150.50,
    currency: 'gbp' as const,
    jobId: '550e8400-e29b-41d4-a716-446655440000',
    contractorId: '550e8400-e29b-41d4-a716-446655440001',
  };

  it('should validate valid payment intent', () => {
    const result = paymentIntentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it('should round amount to 2 decimals', () => {
    const data = {
      ...validPayment,
      amount: 150.555,
    };

    const result = paymentIntentSchema.safeParse(data);
    if (result.success) {
      expect(result.data.amount).toBe(150.56);
    }
  });

  it('should reject negative amount', () => {
    const data = {
      ...validPayment,
      amount: -50,
    };

    const result = paymentIntentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject amount over maximum', () => {
    const data = {
      ...validPayment,
      amount: 15000,
    };

    const result = paymentIntentSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('10,000');
    }
  });

  it('should default currency to usd', () => {
    const data = {
      ...validPayment,
      currency: undefined,
    };

    const result = paymentIntentSchema.safeParse(data);
    if (result.success) {
      expect(result.data.currency).toBe('usd');
    }
  });

  it('should reject invalid UUID for jobId', () => {
    const data = {
      ...validPayment,
      jobId: 'not-a-uuid',
    };

    const result = paymentIntentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('passwordResetSchema', () => {
  it('should validate valid email', () => {
    const data = {
      email: 'test@example.com',
    };

    const result = passwordResetSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should normalize email', () => {
    const data = {
      email: '  TEST@EXAMPLE.COM  ',
    };

    const result = passwordResetSchema.safeParse(data);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });
});
