import {
  toCamelCase,
  toSnakeCase,
  keysToCamelCase,
  keysToSnakeCase,
  DATABASE_FIELDS,
  mapDatabaseToApp,
  mapAppToDatabase,
  mapDatabaseUserToUser,
  mapUserToDatabaseUser,
  mapDatabaseJobToJob,
  mapJobToDatabaseJob,
  mapDatabaseBidToBid,
  mapBidToDatabaseBid,
  mapDatabaseMessageToMessage,
  mapMessageToDatabaseMessage,
  mapDatabaseArrayToApp,
  mapAppArrayToDatabase,
  validateRequiredFields,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeDate,
} from '../../utils/fieldMapper';

describe('fieldMapper', () => {
  describe('String conversion functions', () => {
    describe('toCamelCase', () => {
      it('should convert snake_case to camelCase', () => {
        expect(toCamelCase('snake_case')).toBe('snakeCase');
        expect(toCamelCase('first_name')).toBe('firstName');
        expect(toCamelCase('user_profile_image_url')).toBe('userProfileImageUrl');
        expect(toCamelCase('created_at')).toBe('createdAt');
      });

      it('should handle strings without underscores', () => {
        expect(toCamelCase('simple')).toBe('simple');
        expect(toCamelCase('camelCase')).toBe('camelCase');
      });

      it('should handle edge cases', () => {
        expect(toCamelCase('')).toBe('');
        expect(toCamelCase('_test')).toBe('test');
        expect(toCamelCase('test_')).toBe('test_');
        expect(toCamelCase('__double__underscore__')).toBe('_doubleUnderscore_');
      });
    });

    describe('toSnakeCase', () => {
      it('should convert camelCase to snake_case', () => {
        expect(toSnakeCase('camelCase')).toBe('camel_case');
        expect(toSnakeCase('firstName')).toBe('first_name');
        expect(toSnakeCase('userProfileImageUrl')).toBe('user_profile_image_url');
        expect(toSnakeCase('createdAt')).toBe('created_at');
      });

      it('should handle strings without uppercase letters', () => {
        expect(toSnakeCase('simple')).toBe('simple');
        expect(toSnakeCase('snake_case')).toBe('snake_case');
      });

      it('should handle edge cases', () => {
        expect(toSnakeCase('')).toBe('');
        expect(toSnakeCase('A')).toBe('_a');
        expect(toSnakeCase('ABC')).toBe('_a_b_c');
      });
    });
  });

  describe('Object key conversion functions', () => {
    describe('keysToCamelCase', () => {
      it('should convert object keys from snake_case to camelCase', () => {
        const input = {
          first_name: 'John',
          last_name: 'Doe',
          profile_image_url: 'http://example.com/image.jpg',
          created_at: '2024-01-01',
        };

        const expected = {
          firstName: 'John',
          lastName: 'Doe',
          profileImageUrl: 'http://example.com/image.jpg',
          createdAt: '2024-01-01',
        };

        expect(keysToCamelCase(input)).toEqual(expected);
      });

      it('should handle nested objects', () => {
        const input = {
          user_data: {
            first_name: 'John',
            contact_info: {
              phone_number: '123-456-7890',
              email_address: 'john@example.com',
            },
          },
        };

        const expected = {
          userData: {
            firstName: 'John',
            contactInfo: {
              phoneNumber: '123-456-7890',
              emailAddress: 'john@example.com',
            },
          },
        };

        expect(keysToCamelCase(input)).toEqual(expected);
      });

      it('should handle arrays', () => {
        const input = [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' },
        ];

        const expected = [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ];

        expect(keysToCamelCase(input)).toEqual(expected);
      });

      it('should handle null and undefined values', () => {
        expect(keysToCamelCase(null)).toBe(null);
        expect(keysToCamelCase(undefined)).toBe(undefined);
      });

      it('should handle primitive values', () => {
        expect(keysToCamelCase('string')).toBe('string');
        expect(keysToCamelCase(123)).toBe(123);
        expect(keysToCamelCase(true)).toBe(true);
      });
    });

    describe('keysToSnakeCase', () => {
      it('should convert object keys from camelCase to snake_case', () => {
        const input = {
          firstName: 'John',
          lastName: 'Doe',
          profileImageUrl: 'http://example.com/image.jpg',
          createdAt: '2024-01-01',
        };

        const expected = {
          first_name: 'John',
          last_name: 'Doe',
          profile_image_url: 'http://example.com/image.jpg',
          created_at: '2024-01-01',
        };

        expect(keysToSnakeCase(input)).toEqual(expected);
      });

      it('should handle nested objects', () => {
        const input = {
          userData: {
            firstName: 'John',
            contactInfo: {
              phoneNumber: '123-456-7890',
              emailAddress: 'john@example.com',
            },
          },
        };

        const expected = {
          user_data: {
            first_name: 'John',
            contact_info: {
              phone_number: '123-456-7890',
              email_address: 'john@example.com',
            },
          },
        };

        expect(keysToSnakeCase(input)).toEqual(expected);
      });

      it('should handle arrays', () => {
        const input = [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ];

        const expected = [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' },
        ];

        expect(keysToSnakeCase(input)).toEqual(expected);
      });
    });
  });

  describe('Generic mapping functions', () => {
    describe('mapDatabaseToApp', () => {
      it('should map database fields to application fields', () => {
        const dbData = {
          id: '123',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          created_at: '2024-01-01',
        };

        const fieldMapping = {
          id: 'id',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
          createdAt: 'created_at',
        };

        const expected = {
          id: '123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          createdAt: '2024-01-01',
        };

        expect(mapDatabaseToApp(dbData, fieldMapping)).toEqual(expected);
      });

      it('should handle missing fields gracefully', () => {
        const dbData = {
          id: '123',
          first_name: 'John',
        };

        const fieldMapping = {
          id: 'id',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
        };

        const expected = {
          id: '123',
          firstName: 'John',
        };

        expect(mapDatabaseToApp(dbData, fieldMapping)).toEqual(expected);
      });

      it('should handle null/undefined input', () => {
        const fieldMapping = { id: 'id' };
        expect(mapDatabaseToApp(null, fieldMapping)).toBe(null);
        expect(mapDatabaseToApp(undefined, fieldMapping)).toBe(undefined);
      });
    });

    describe('mapAppToDatabase', () => {
      it('should map application fields to database fields', () => {
        const appData = {
          id: '123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          createdAt: '2024-01-01',
        };

        const fieldMapping = {
          id: 'id',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
          createdAt: 'created_at',
        };

        const expected = {
          id: '123',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          created_at: '2024-01-01',
        };

        expect(mapAppToDatabase(appData, fieldMapping)).toEqual(expected);
      });

      it('should handle missing fields gracefully', () => {
        const appData = {
          id: '123',
          firstName: 'John',
        };

        const fieldMapping = {
          id: 'id',
          firstName: 'first_name',
          lastName: 'last_name',
          email: 'email',
        };

        const expected = {
          id: '123',
          first_name: 'John',
        };

        expect(mapAppToDatabase(appData, fieldMapping)).toEqual(expected);
      });
    });
  });

  describe('Entity-specific mappers', () => {
    describe('User mapping', () => {
      it('should map database user to application user', () => {
        const dbUser = {
          id: '123',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'homeowner',
          phone: '123-456-7890',
          profile_image_url: 'http://example.com/image.jpg',
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
        };

        const appUser = mapDatabaseUserToUser(dbUser);

        expect(appUser).toEqual({
          id: '123',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'homeowner',
          phone: '123-456-7890',
          profileImageUrl: 'http://example.com/image.jpg',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        });
      });

      it('should map application user to database user', () => {
        const appUser = {
          id: '123',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'homeowner',
          phone: '123-456-7890',
          profileImageUrl: 'http://example.com/image.jpg',
        };

        const dbUser = mapUserToDatabaseUser(appUser);

        expect(dbUser).toEqual({
          id: '123',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'homeowner',
          phone: '123-456-7890',
          profile_image_url: 'http://example.com/image.jpg',
        });
      });
    });

    describe('Job mapping', () => {
      it('should map database job to application job', () => {
        const dbJob = {
          id: '456',
          title: 'Fix leaky faucet',
          description: 'Kitchen faucet is dripping',
          location: 'New York, NY',
          homeowner_id: '123',
          contractor_id: '789',
          status: 'in_progress',
          budget: 200,
          category: 'plumbing',
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
        };

        const appJob = mapDatabaseJobToJob(dbJob);

        expect(appJob).toEqual({
          id: '456',
          title: 'Fix leaky faucet',
          description: 'Kitchen faucet is dripping',
          location: 'New York, NY',
          homeownerId: '123',
          contractorId: '789',
          status: 'in_progress',
          budget: 200,
          category: 'plumbing',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        });
      });

      it('should map application job to database job', () => {
        const appJob = {
          id: '456',
          title: 'Fix leaky faucet',
          description: 'Kitchen faucet is dripping',
          homeownerId: '123',
          contractorId: '789',
          status: 'in_progress',
          budget: 200,
        };

        const dbJob = mapJobToDatabaseJob(appJob);

        expect(dbJob).toEqual({
          id: '456',
          title: 'Fix leaky faucet',
          description: 'Kitchen faucet is dripping',
          homeowner_id: '123',
          contractor_id: '789',
          status: 'in_progress',
          budget: 200,
        });
      });
    });

    describe('Bid mapping', () => {
      it('should map database bid to application bid', () => {
        const dbBid = {
          id: '789',
          job_id: '456',
          contractor_id: '123',
          amount: 250,
          description: 'I can fix this quickly',
          status: 'pending',
          created_at: '2024-01-01',
        };

        const appBid = mapDatabaseBidToBid(dbBid);

        expect(appBid).toEqual({
          id: '789',
          jobId: '456',
          contractorId: '123',
          amount: 250,
          description: 'I can fix this quickly',
          status: 'pending',
          createdAt: '2024-01-01',
        });
      });

      it('should map application bid to database bid', () => {
        const appBid = {
          id: '789',
          jobId: '456',
          contractorId: '123',
          amount: 250,
          description: 'I can fix this quickly',
          status: 'pending',
        };

        const dbBid = mapBidToDatabaseBid(appBid);

        expect(dbBid).toEqual({
          id: '789',
          job_id: '456',
          contractor_id: '123',
          amount: 250,
          description: 'I can fix this quickly',
          status: 'pending',
        });
      });
    });

    describe('Message mapping', () => {
      it('should map database message to application message', () => {
        const dbMessage = {
          id: '999',
          job_id: '456',
          sender_id: '123',
          receiver_id: '789',
          message_text: 'Hello there!',
          message_type: 'text',
          read: false,
          created_at: '2024-01-01',
        };

        const appMessage = mapDatabaseMessageToMessage(dbMessage);

        expect(appMessage).toEqual({
          id: '999',
          jobId: '456',
          senderId: '123',
          receiverId: '789',
          messageText: 'Hello there!',
          messageType: 'text',
          read: false,
          createdAt: '2024-01-01',
        });
      });

      it('should map application message to database message', () => {
        const appMessage = {
          id: '999',
          jobId: '456',
          senderId: '123',
          receiverId: '789',
          messageText: 'Hello there!',
          messageType: 'text',
          read: false,
        };

        const dbMessage = mapMessageToDatabaseMessage(appMessage);

        expect(dbMessage).toEqual({
          id: '999',
          job_id: '456',
          sender_id: '123',
          receiver_id: '789',
          message_text: 'Hello there!',
          message_type: 'text',
          read: false,
        });
      });
    });
  });

  describe('Array mapping functions', () => {
    it('should map database array to application array', () => {
      const dbArray = [
        { id: '1', first_name: 'John' },
        { id: '2', first_name: 'Jane' },
      ];

      const mapper = (item: any) => ({ id: item.id, firstName: item.first_name });
      const result = mapDatabaseArrayToApp(dbArray, mapper);

      expect(result).toEqual([
        { id: '1', firstName: 'John' },
        { id: '2', firstName: 'Jane' },
      ]);
    });

    it('should map application array to database array', () => {
      const appArray = [
        { id: '1', firstName: 'John' },
        { id: '2', firstName: 'Jane' },
      ];

      const mapper = (item: any) => ({ id: item.id, first_name: item.firstName });
      const result = mapAppArrayToDatabase(appArray, mapper);

      expect(result).toEqual([
        { id: '1', first_name: 'John' },
        { id: '2', first_name: 'Jane' },
      ]);
    });
  });

  describe('Validation utilities', () => {
    describe('validateRequiredFields', () => {
      it('should validate required fields are present', () => {
        const obj = {
          id: '123',
          name: 'John',
          email: 'john@example.com',
        };

        const result = validateRequiredFields(obj, ['id', 'name', 'email']);

        expect(result).toEqual({
          isValid: true,
          missingFields: [],
        });
      });

      it('should identify missing fields', () => {
        const obj = {
          id: '123',
          name: '',
          email: null,
        };

        const result = validateRequiredFields(obj, ['id', 'name', 'email', 'phone']);

        expect(result).toEqual({
          isValid: false,
          missingFields: ['name', 'email', 'phone'],
        });
      });

      it('should handle undefined values', () => {
        const obj = {
          id: '123',
          name: undefined,
        };

        const result = validateRequiredFields(obj, ['id', 'name']);

        expect(result).toEqual({
          isValid: false,
          missingFields: ['name'],
        });
      });
    });
  });

  describe('Sanitization utilities', () => {
    describe('sanitizeString', () => {
      it('should trim string values', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
        expect(sanitizeString('hello')).toBe('hello');
        expect(sanitizeString('')).toBe('');
      });

      it('should return empty string for non-string values', () => {
        expect(sanitizeString(123)).toBe('');
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
        expect(sanitizeString({})).toBe('');
      });
    });

    describe('sanitizeNumber', () => {
      it('should convert valid numbers', () => {
        expect(sanitizeNumber(123)).toBe(123);
        expect(sanitizeNumber('123')).toBe(123);
        expect(sanitizeNumber('123.45')).toBe(123.45);
        expect(sanitizeNumber(0)).toBe(0);
      });

      it('should return 0 for invalid numbers', () => {
        expect(sanitizeNumber('abc')).toBe(0);
        expect(sanitizeNumber(null)).toBe(0);
        expect(sanitizeNumber(undefined)).toBe(0);
        expect(sanitizeNumber({})).toBe(0);
        expect(sanitizeNumber('')).toBe(0);
      });
    });

    describe('sanitizeBoolean', () => {
      it('should handle boolean values', () => {
        expect(sanitizeBoolean(true)).toBe(true);
        expect(sanitizeBoolean(false)).toBe(false);
      });

      it('should handle string values', () => {
        expect(sanitizeBoolean('true')).toBe(true);
        expect(sanitizeBoolean('True')).toBe(true);
        expect(sanitizeBoolean('TRUE')).toBe(true);
        expect(sanitizeBoolean('false')).toBe(false);
        expect(sanitizeBoolean('False')).toBe(false);
        expect(sanitizeBoolean('anything')).toBe(false);
      });

      it('should handle other values', () => {
        expect(sanitizeBoolean(1)).toBe(true);
        expect(sanitizeBoolean(0)).toBe(false);
        expect(sanitizeBoolean(null)).toBe(false);
        expect(sanitizeBoolean(undefined)).toBe(false);
        expect(sanitizeBoolean({})).toBe(true);
        expect(sanitizeBoolean([])).toBe(true);
      });
    });

    describe('sanitizeDate', () => {
      it('should handle Date objects', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        expect(sanitizeDate(date)).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should handle valid date strings', () => {
        expect(sanitizeDate('2024-01-01')).toBe('2024-01-01T00:00:00.000Z');
        expect(sanitizeDate('2024-01-01T12:00:00Z')).toBe('2024-01-01T12:00:00.000Z');
      });

      it('should return current date for invalid values', () => {
        const beforeCall = Date.now();
        const result = sanitizeDate('invalid-date');
        const afterCall = Date.now();

        const resultTime = new Date(result).getTime();
        expect(resultTime).toBeGreaterThanOrEqual(beforeCall);
        expect(resultTime).toBeLessThanOrEqual(afterCall);
      });

      it('should return current date for null/undefined', () => {
        const beforeCall = Date.now();
        const result1 = sanitizeDate(null);
        const result2 = sanitizeDate(undefined);
        const afterCall = Date.now();

        const result1Time = new Date(result1).getTime();
        const result2Time = new Date(result2).getTime();

        expect(result1Time).toBeGreaterThanOrEqual(beforeCall);
        expect(result1Time).toBeLessThanOrEqual(afterCall);
        expect(result2Time).toBeGreaterThanOrEqual(beforeCall);
        expect(result2Time).toBeLessThanOrEqual(afterCall);
      });
    });
  });

  describe('DATABASE_FIELDS constants', () => {
    it('should have all required user fields', () => {
      expect(DATABASE_FIELDS.user).toHaveProperty('id');
      expect(DATABASE_FIELDS.user).toHaveProperty('firstName');
      expect(DATABASE_FIELDS.user).toHaveProperty('lastName');
      expect(DATABASE_FIELDS.user).toHaveProperty('email');
      expect(DATABASE_FIELDS.user).toHaveProperty('createdAt');
      expect(DATABASE_FIELDS.user).toHaveProperty('updatedAt');
    });

    it('should have all required job fields', () => {
      expect(DATABASE_FIELDS.job).toHaveProperty('id');
      expect(DATABASE_FIELDS.job).toHaveProperty('title');
      expect(DATABASE_FIELDS.job).toHaveProperty('homeownerId');
      expect(DATABASE_FIELDS.job).toHaveProperty('contractorId');
      expect(DATABASE_FIELDS.job).toHaveProperty('status');
    });

    it('should have all required bid fields', () => {
      expect(DATABASE_FIELDS.bid).toHaveProperty('id');
      expect(DATABASE_FIELDS.bid).toHaveProperty('jobId');
      expect(DATABASE_FIELDS.bid).toHaveProperty('contractorId');
      expect(DATABASE_FIELDS.bid).toHaveProperty('amount');
      expect(DATABASE_FIELDS.bid).toHaveProperty('status');
    });

    it('should have all required message fields', () => {
      expect(DATABASE_FIELDS.message).toHaveProperty('id');
      expect(DATABASE_FIELDS.message).toHaveProperty('jobId');
      expect(DATABASE_FIELDS.message).toHaveProperty('senderId');
      expect(DATABASE_FIELDS.message).toHaveProperty('receiverId');
      expect(DATABASE_FIELDS.message).toHaveProperty('messageText');
    });
  });
});