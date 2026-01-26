import ValidationSchemas, {
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
  sanitizeNumber
} from '../../utils/validation';

describe('Validation Utility', () => {
  describe('ValidationError', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Test error', 'testField', 'testValue');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('validateRequired', () => {
    it('should validate required fields are present', () => {
      const obj = { name: 'John', email: 'john@example.com' };
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const obj = { name: 'John' };
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('email is required');
    });

    it('should detect empty string as missing', () => {
      const obj = { name: '' };
      const result = validateRequired(obj, ['name']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('name is required');
    });
  });

  describe('validateStringLength', () => {
    it('should validate string within length constraints', () => {
      const result = validateStringLength('hello', 'field', 3, 10);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect string too short', () => {
      const result = validateStringLength('hi', 'field', 3, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('field must be at least 3 characters');
    });

    it('should detect string too long', () => {
      const result = validateStringLength('hello world!', 'field', 3, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('field must not exceed 10 characters');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const invalidEmails = ['invalid', 'user@', '@example.com', 'user.example.com'];
      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = ['1234567890', '+11234567890', '(123) 456-7890'];
      validPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['123', '123456789012345678'];
      invalidPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Phone number must be 10-15 digits');
      });
    });
  });

  describe('validatePositiveNumber', () => {
    it('should validate positive numbers', () => {
      const result = validatePositiveNumber(10.5, 'amount');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-positive numbers', () => {
      const invalidNumbers = [0, -5, NaN, Infinity];
      invalidNumbers.forEach(num => {
        const result = validatePositiveNumber(num, 'amount');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('amount must be a positive number');
      });
    });
  });

  describe('validateRating', () => {
    it('should validate correct ratings', () => {
      [1, 2, 3, 4, 5].forEach(rating => {
        const result = validateRating(rating);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid ratings', () => {
      [0, 6, 2.5, -1].forEach(rating => {
        const result = validateRating(rating);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Rating must be an integer between 1 and 5');
      });
    });
  });

  describe('validateUser', () => {
    it('should validate valid user object', () => {
      const user = {
        id: '123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'contractor' as const
      };
      const result = validateUser(user);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid user object', () => {
      const user = {
        id: '123',
        email: 'invalid',
        firstName: '',
        lastName: 'Doe',
        role: 'admin' as any
      };
      const result = validateUser(user);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateJob', () => {
    it('should validate valid job object', () => {
      const job = {
        id: '123',
        title: 'Fix plumbing',
        description: 'Need to fix kitchen sink leak',
        location: '123 Main St',
        homeownerId: 'user123',
        budget: 500,
        status: 'posted' as const
      };
      const result = validateJob(job);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject job with invalid status', () => {
      const job = {
        id: '123',
        title: 'Fix plumbing',
        description: 'Need to fix kitchen sink leak',
        location: '123 Main St',
        homeownerId: 'user123',
        budget: 500,
        status: 'invalid' as any
      };
      const result = validateJob(job);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid job status');
    });
  });

  describe('validateBid', () => {
    it('should validate valid bid object', () => {
      const bid = {
        id: '123',
        jobId: 'job123',
        contractorId: 'contractor123',
        amount: 450,
        description: 'I can fix this issue quickly',
        status: 'pending' as const
      };
      const result = validateBid(bid);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject bid with negative amount', () => {
      const bid = {
        id: '123',
        jobId: 'job123',
        contractorId: 'contractor123',
        amount: -100,
        description: 'I can fix this issue quickly'
      };
      const result = validateBid(bid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount must be a positive number');
    });
  });

  describe('validateMessage', () => {
    it('should validate valid message object', () => {
      const message = {
        id: '123',
        jobId: 'job123',
        senderId: 'user1',
        receiverId: 'user2',
        messageText: 'Hello, I can help with your job',
        messageType: 'text' as const
      };
      const result = validateMessage(message);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject message with invalid type', () => {
      const message = {
        id: '123',
        jobId: 'job123',
        senderId: 'user1',
        receiverId: 'user2',
        messageText: 'Hello',
        messageType: 'invalid' as any
      };
      const result = validateMessage(message);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid message type');
    });
  });

  describe('validateContractorProfile', () => {
    it('should validate valid contractor profile', () => {
      const profile = {
        id: '123',
        email: 'contractor@example.com',
        firstName: 'John',
        lastName: 'Contractor',
        role: 'contractor' as const,
        hourlyRate: 50,
        yearsExperience: 10,
        serviceRadius: 25,
        availability: 'immediate' as const
      };
      const result = validateContractorProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid years of experience', () => {
      const profile = {
        id: '123',
        email: 'contractor@example.com',
        firstName: 'John',
        lastName: 'Contractor',
        role: 'contractor' as const,
        yearsExperience: 100
      };
      const result = validateContractorProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Years of experience must be between 0 and 50');
    });
  });

  describe('Form Validations', () => {
    describe('validateJobForm', () => {
      it('should validate valid job form data', () => {
        const formData = {
          title: 'Fix plumbing',
          description: 'Need to fix kitchen sink leak',
          location: '123 Main St',
          budget: 500
        };
        const result = validateJobForm(formData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateBidForm', () => {
      it('should validate valid bid form data', () => {
        const formData = {
          amount: 450,
          description: 'I can complete this job efficiently'
        };
        const result = validateBidForm(formData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateRegistrationForm', () => {
      it('should validate valid registration form data', () => {
        const formData = {
          email: 'user@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'homeowner'
        };
        const result = validateRegistrationForm(formData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate password complexity', () => {
        const formData = {
          email: 'user@example.com',
          password: 'simplepass',
          firstName: 'John',
          lastName: 'Doe',
          role: 'homeowner'
        };
        const result = validateRegistrationForm(formData);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Password must contain'))).toBe(true);
      });
    });
  });

  describe('Data Sanitization', () => {
    describe('sanitizeString', () => {
      it('should trim and remove angle brackets', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
        expect(sanitizeString('<script>alert()</script>')).toBe('scriptalert()/script');
      });
    });

    describe('sanitizeHtml', () => {
      it('should escape HTML characters', () => {
        expect(sanitizeHtml('<div>')).toBe('&lt;div&gt;');
        expect(sanitizeHtml('"test"')).toBe('&quot;test&quot;');
        expect(sanitizeHtml("it's")).toBe('it&#x27;s');
      });
    });

    describe('sanitizeNumber', () => {
      it('should convert valid numbers', () => {
        expect(sanitizeNumber('123')).toBe(123);
        expect(sanitizeNumber(456)).toBe(456);
        expect(sanitizeNumber('12.5')).toBe(12.5);
      });

      it('should return null for invalid numbers', () => {
        expect(sanitizeNumber('abc')).toBe(null);
        expect(sanitizeNumber(undefined)).toBe(null);
        expect(sanitizeNumber(null)).toBe(0);
      });
    });
  });

  describe('ValidationSchemas export', () => {
    it('should export all validation functions', () => {
      expect(ValidationSchemas.user).toBe(validateUser);
      expect(ValidationSchemas.job).toBe(validateJob);
      expect(ValidationSchemas.bid).toBe(validateBid);
      expect(ValidationSchemas.message).toBe(validateMessage);
      expect(ValidationSchemas.contractorProfile).toBe(validateContractorProfile);
      expect(ValidationSchemas.forms.job).toBe(validateJobForm);
      expect(ValidationSchemas.forms.bid).toBe(validateBidForm);
      expect(ValidationSchemas.forms.registration).toBe(validateRegistrationForm);
    });
  });
});