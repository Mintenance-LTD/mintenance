import typeConversion, { TypeConversion } from '../../utils/typeConversion';
import * as typeConversionModule from '../../utils/typeConversion';

// Mock the fieldMapper module
jest.mock('../../utils/fieldMapper', () => ({
  mapDatabaseUserToUser: jest.fn((user) => user),
  mapUserToDatabaseUser: jest.fn((user) => user),
  mapDatabaseJobToJob: jest.fn((job) => job),
  mapJobToDatabaseJob: jest.fn((job) => job),
  mapDatabaseMessageToMessage: jest.fn((msg) => msg),
  mapMessageToDatabaseMessage: jest.fn((msg) => msg)
}));

describe('typeConversion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Exports', () => {
    it('should export default TypeConversion object', () => {
      expect(typeConversion).toBeDefined();
      expect(typeof typeConversion).toBe('object');
    });

    it('should export TypeConversion named export', () => {
      expect(TypeConversion).toBeDefined();
      expect(TypeConversion).toBe(typeConversion);
    });

    it('should export all conversion functions', () => {
      expect(typeConversionModule.convertDatabaseUserToUser).toBeDefined();
      expect(typeConversionModule.convertUserToDatabaseUser).toBeDefined();
      expect(typeConversionModule.convertDatabaseJobToJob).toBeDefined();
      expect(typeConversionModule.convertJobToDatabaseJob).toBeDefined();
      expect(typeConversionModule.convertDatabaseMessageToMessage).toBeDefined();
      expect(typeConversionModule.convertMessageToDatabaseMessage).toBeDefined();
      expect(typeConversionModule.convertDatabaseBidToBid).toBeDefined();
      expect(typeConversionModule.normalizeFieldNames).toBeDefined();
    });
  });

  describe('convertDatabaseUserToUser', () => {
    it('should convert database user with snake_case fields to camelCase', () => {
      const dbUser = {
        id: 'user123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        profile_image_url: 'http://example.com/image.jpg',
        bio: 'Test bio',
        rating: 4.5,
        total_jobs_completed: 10,
        is_available: true,
        is_verified: false,
        phone: '+1234567890'
      };

      const result = typeConversionModule.convertDatabaseUserToUser(dbUser);

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St',
        profileImageUrl: 'http://example.com/image.jpg',
        bio: 'Test bio',
        rating: 4.5,
        totalJobsCompleted: 10,
        isAvailable: true,
        isVerified: false,
        phone: '+1234567890'
      });
    });

    it('should handle user with already camelCase fields', () => {
      const dbUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',  // Already camelCase
        lastName: 'Doe',    // Already camelCase
        role: 'contractor',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02'
      };

      const result = typeConversionModule.convertDatabaseUserToUser(dbUser);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should handle missing optional fields', () => {
      const dbUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'homeowner'
      };

      const result = typeConversionModule.convertDatabaseUserToUser(dbUser);

      expect(result.id).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBeUndefined();
      expect(result.bio).toBeUndefined();
      expect(result.rating).toBeUndefined();
    });

    it('should prioritize snake_case over camelCase when both exist', () => {
      const dbUser = {
        id: 'user123',
        first_name: 'SnakeCase',
        firstName: 'CamelCase',
        profile_image_url: 'snake.jpg',
        profileImageUrl: 'camel.jpg'
      };

      const result = typeConversionModule.convertDatabaseUserToUser(dbUser);

      // Should use snake_case value OR camelCase (implementation uses ||)
      expect(result.firstName).toBe('SnakeCase');
      expect(result.profileImageUrl).toBe('snake.jpg');
    });
  });

  describe('convertUserToDatabaseUser', () => {
    it('should convert application user with camelCase to snake_case', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'contractor',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        profileImageUrl: 'http://example.com/image.jpg',
        totalJobsCompleted: 25,
        isAvailable: true,
        isVerified: true
      };

      const result = typeConversionModule.convertUserToDatabaseUser(user);

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'contractor',
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
        profile_image_url: 'http://example.com/image.jpg',
        total_jobs_completed: 25,
        is_available: true,
        is_verified: true,
        latitude: undefined,
        longitude: undefined,
        address: undefined,
        bio: undefined,
        rating: undefined,
        phone: undefined
      });
    });

    it('should handle undefined fields', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'homeowner'
      };

      const result = typeConversionModule.convertUserToDatabaseUser(user);

      expect(result.id).toBe('user123');
      expect(result.first_name).toBeUndefined();
      expect(result.profile_image_url).toBeUndefined();
    });
  });

  describe('convertDatabaseJobToJob', () => {
    it('should convert database job with snake_case to camelCase', () => {
      const dbJob = {
        id: 'job123',
        title: 'Fix plumbing',
        description: 'Leaky faucet',
        location: '123 Main St',
        homeowner_id: 'user456',
        contractor_id: 'user789',
        status: 'pending',
        budget: 500,
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
        category: 'plumbing',
        subcategory: 'faucets',
        priority: 'high',
        photos: ['photo1.jpg', 'photo2.jpg']
      };

      const result = typeConversionModule.convertDatabaseJobToJob(dbJob);

      expect(result).toEqual({
        id: 'job123',
        title: 'Fix plumbing',
        description: 'Leaky faucet',
        location: '123 Main St',
        homeownerId: 'user456',
        contractorId: 'user789',
        status: 'pending',
        budget: 500,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        category: 'plumbing',
        subcategory: 'faucets',
        priority: 'high',
        photos: ['photo1.jpg', 'photo2.jpg'],
        homeowner: undefined,
        contractor: undefined,
        bids: undefined
      });
    });

    it('should convert nested related entities', () => {
      const dbJob = {
        id: 'job123',
        title: 'Fix roof',
        homeowner: {
          id: 'user456',
          email: 'owner@example.com',
          first_name: 'Jane'
        },
        contractor: {
          id: 'user789',
          email: 'contractor@example.com',
          first_name: 'Bob'
        },
        bids: [
          { id: 'bid1', amount: 100 },
          { id: 'bid2', amount: 150 }
        ]
      };

      const result = typeConversionModule.convertDatabaseJobToJob(dbJob);

      expect(result.homeowner).toBeDefined();
      expect(result.homeowner.firstName).toBe('Jane');
      expect(result.contractor).toBeDefined();
      expect(result.contractor.firstName).toBe('Bob');
      expect(result.bids).toHaveLength(2);
    });

    it('should handle job with camelCase fields', () => {
      const dbJob = {
        id: 'job123',
        homeownerId: 'user456',  // Already camelCase
        contractorId: 'user789', // Already camelCase
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02'
      };

      const result = typeConversionModule.convertDatabaseJobToJob(dbJob);

      expect(result.homeownerId).toBe('user456');
      expect(result.contractorId).toBe('user789');
    });
  });

  describe('convertJobToDatabaseJob', () => {
    it('should convert application job to database format', () => {
      const job = {
        id: 'job123',
        title: 'Paint house',
        description: 'Interior painting',
        location: '456 Oak St',
        homeownerId: 'user456',
        contractorId: 'user789',
        status: 'in_progress',
        budget: 2000,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        category: 'painting',
        subcategory: 'interior',
        priority: 'medium',
        photos: ['before.jpg', 'after.jpg']
      };

      const result = typeConversionModule.convertJobToDatabaseJob(job);

      expect(result).toEqual({
        id: 'job123',
        title: 'Paint house',
        description: 'Interior painting',
        location: '456 Oak St',
        homeowner_id: 'user456',
        contractor_id: 'user789',
        status: 'in_progress',
        budget: 2000,
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
        category: 'painting',
        subcategory: 'interior',
        priority: 'medium',
        photos: ['before.jpg', 'after.jpg']
      });
    });

    it('should not include related entities in database format', () => {
      const job = {
        id: 'job123',
        title: 'Clean gutters',
        homeowner: { id: 'user456', email: 'test@example.com' },
        contractor: { id: 'user789', email: 'contractor@example.com' },
        bids: [{ id: 'bid1' }]
      };

      const result = typeConversionModule.convertJobToDatabaseJob(job);

      expect(result.homeowner).toBeUndefined();
      expect(result.contractor).toBeUndefined();
      expect(result.bids).toBeUndefined();
    });
  });

  describe('convertDatabaseMessageToMessage', () => {
    it('should convert database message to application format', () => {
      const dbMessage = {
        id: 'msg123',
        job_id: 'job456',
        sender_id: 'user789',
        receiver_id: 'user012',
        message_text: 'Hello there',
        message_type: 'text',
        attachment_url: 'http://example.com/file.pdf',
        read: false,
        created_at: '2023-01-01T12:00:00Z',
        synced_at: '2023-01-01T12:05:00Z',
        call_id: 'call123',
        call_duration: 300
      };

      const result = typeConversionModule.convertDatabaseMessageToMessage(dbMessage);

      expect(result).toEqual({
        id: 'msg123',
        jobId: 'job456',
        senderId: 'user789',
        receiverId: 'user012',
        messageText: 'Hello there',
        messageType: 'text',
        attachmentUrl: 'http://example.com/file.pdf',
        read: false,
        createdAt: '2023-01-01T12:00:00Z',
        syncedAt: '2023-01-01T12:05:00Z',
        callId: 'call123',
        callDuration: 300,
        sender: undefined,
        receiver: undefined,
        job: undefined,
        senderName: undefined,
        senderRole: undefined
      });
    });

    it('should compute sender name from related entity', () => {
      const dbMessage = {
        id: 'msg123',
        sender: {
          id: 'user789',
          first_name: 'John',
          last_name: 'Smith',
          role: 'contractor'
        }
      };

      const result = typeConversionModule.convertDatabaseMessageToMessage(dbMessage);

      expect(result.senderName).toBe('John Smith');
      expect(result.senderRole).toBe('contractor');
    });

    it('should handle sender with missing names', () => {
      const dbMessage = {
        id: 'msg123',
        sender: {
          id: 'user789',
          first_name: '',
          last_name: null,
          role: 'homeowner'
        }
      };

      const result = typeConversionModule.convertDatabaseMessageToMessage(dbMessage);

      expect(result.senderName).toBe('');
      expect(result.senderRole).toBe('homeowner');
    });

    it('should handle message with camelCase fields', () => {
      const dbMessage = {
        id: 'msg123',
        jobId: 'job456',         // Already camelCase
        senderId: 'user789',      // Already camelCase
        messageText: 'Test message',
        createdAt: '2023-01-01'
      };

      const result = typeConversionModule.convertDatabaseMessageToMessage(dbMessage);

      expect(result.jobId).toBe('job456');
      expect(result.senderId).toBe('user789');
    });
  });

  describe('convertMessageToDatabaseMessage', () => {
    it('should convert application message to database format', () => {
      const message = {
        id: 'msg123',
        jobId: 'job456',
        senderId: 'user789',
        receiverId: 'user012',
        messageText: 'Hello',
        messageType: 'text',
        attachmentUrl: 'http://example.com/image.jpg',
        read: true,
        createdAt: '2023-01-01T12:00:00Z',
        syncedAt: '2023-01-01T12:05:00Z',
        callId: 'call456',
        callDuration: 180
      };

      const result = typeConversionModule.convertMessageToDatabaseMessage(message);

      expect(result).toEqual({
        id: 'msg123',
        job_id: 'job456',
        sender_id: 'user789',
        receiver_id: 'user012',
        message_text: 'Hello',
        message_type: 'text',
        attachment_url: 'http://example.com/image.jpg',
        read: true,
        created_at: '2023-01-01T12:00:00Z',
        synced_at: '2023-01-01T12:05:00Z',
        call_id: 'call456',
        call_duration: 180
      });
    });

    it('should not include computed fields', () => {
      const message = {
        id: 'msg123',
        jobId: 'job456',
        senderId: 'user789',
        senderName: 'John Doe',     // Computed field
        senderRole: 'contractor',    // Computed field
        sender: { id: 'user789' },   // Related entity
        receiver: { id: 'user012' }  // Related entity
      };

      const result = typeConversionModule.convertMessageToDatabaseMessage(message);

      expect(result.senderName).toBeUndefined();
      expect(result.senderRole).toBeUndefined();
      expect(result.sender).toBeUndefined();
      expect(result.receiver).toBeUndefined();
    });
  });

  describe('convertDatabaseBidToBid', () => {
    it('should convert database bid to application format', () => {
      const dbBid = {
        id: 'bid123',
        job_id: 'job456',
        contractor_id: 'user789',
        amount: 1500,
        description: 'I can fix this quickly',
        status: 'pending',
        created_at: '2023-01-01T10:00:00Z',
        updated_at: '2023-01-01T11:00:00Z'
      };

      const result = typeConversionModule.convertDatabaseBidToBid(dbBid);

      expect(result).toEqual({
        id: 'bid123',
        jobId: 'job456',
        contractorId: 'user789',
        amount: 1500,
        description: 'I can fix this quickly',
        status: 'pending',
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T11:00:00Z',
        contractorName: undefined,
        contractorEmail: undefined,
        contractorRating: undefined,
        jobTitle: undefined,
        jobDescription: undefined,
        jobLocation: undefined,
        jobBudget: undefined
      });
    });

    it('should compute contractor fields from related entity', () => {
      const dbBid = {
        id: 'bid123',
        contractor: {
          first_name: 'Bob',
          last_name: 'Builder',
          email: 'bob@example.com',
          rating: 4.8
        }
      };

      const result = typeConversionModule.convertDatabaseBidToBid(dbBid);

      expect(result.contractorName).toBe('Bob Builder');
      expect(result.contractorEmail).toBe('bob@example.com');
      expect(result.contractorRating).toBe(4.8);
    });

    it('should compute job fields from related entity', () => {
      const dbBid = {
        id: 'bid123',
        job: {
          title: 'Fix sink',
          description: 'Kitchen sink is leaking',
          location: '789 Pine St',
          budget: 200
        }
      };

      const result = typeConversionModule.convertDatabaseBidToBid(dbBid);

      expect(result.jobTitle).toBe('Fix sink');
      expect(result.jobDescription).toBe('Kitchen sink is leaking');
      expect(result.jobLocation).toBe('789 Pine St');
      expect(result.jobBudget).toBe(200);
    });

    it('should handle bid with camelCase fields', () => {
      const dbBid = {
        id: 'bid123',
        jobId: 'job456',          // Already camelCase
        contractorId: 'user789',   // Already camelCase
        createdAt: '2023-01-01'
      };

      const result = typeConversionModule.convertDatabaseBidToBid(dbBid);

      expect(result.jobId).toBe('job456');
      expect(result.contractorId).toBe('user789');
    });
  });

  describe('Array Conversion Utilities', () => {
    describe('convertDatabaseUsersToUsers', () => {
      it('should convert array of database users', () => {
        const dbUsers = [
          { id: 'user1', email: 'user1@example.com', first_name: 'Alice' },
          { id: 'user2', email: 'user2@example.com', first_name: 'Bob' }
        ];

        const result = typeConversionModule.convertDatabaseUsersToUsers(dbUsers);

        expect(result).toHaveLength(2);
        expect(result[0].firstName).toBe('Alice');
        expect(result[1].firstName).toBe('Bob');
      });

      it('should handle empty array', () => {
        const result = typeConversionModule.convertDatabaseUsersToUsers([]);
        expect(result).toEqual([]);
      });
    });

    describe('convertDatabaseJobsToJobs', () => {
      it('should convert array of database jobs', () => {
        const dbJobs = [
          { id: 'job1', title: 'Job 1', homeowner_id: 'user1' },
          { id: 'job2', title: 'Job 2', homeowner_id: 'user2' }
        ];

        const result = typeConversionModule.convertDatabaseJobsToJobs(dbJobs);

        expect(result).toHaveLength(2);
        expect(result[0].homeownerId).toBe('user1');
        expect(result[1].homeownerId).toBe('user2');
      });
    });

    describe('convertDatabaseMessagesToMessages', () => {
      it('should convert array of database messages', () => {
        const dbMessages = [
          { id: 'msg1', message_text: 'Hello', sender_id: 'user1' },
          { id: 'msg2', message_text: 'Hi', sender_id: 'user2' }
        ];

        const result = typeConversionModule.convertDatabaseMessagesToMessages(dbMessages);

        expect(result).toHaveLength(2);
        expect(result[0].messageText).toBe('Hello');
        expect(result[1].senderId).toBe('user2');
      });
    });

    describe('convertDatabaseBidsToBids', () => {
      it('should convert array of database bids', () => {
        const dbBids = [
          { id: 'bid1', amount: 100, contractor_id: 'user1' },
          { id: 'bid2', amount: 150, contractor_id: 'user2' }
        ];

        const result = typeConversionModule.convertDatabaseBidsToBids(dbBids);

        expect(result).toHaveLength(2);
        expect(result[0].contractorId).toBe('user1');
        expect(result[1].amount).toBe(150);
      });
    });
  });

  describe('Generic Conversion Utilities', () => {
    describe('convertDatabaseEntity', () => {
      it('should convert user entity', () => {
        const dbUser = { id: 'user1', first_name: 'John' };
        const result = typeConversionModule.convertDatabaseEntity(dbUser, 'user');
        expect(result.firstName).toBe('John');
      });

      it('should convert job entity', () => {
        const dbJob = { id: 'job1', homeowner_id: 'user1' };
        const result = typeConversionModule.convertDatabaseEntity(dbJob, 'job');
        expect(result.homeownerId).toBe('user1');
      });

      it('should convert message entity', () => {
        const dbMessage = { id: 'msg1', message_text: 'Hello' };
        const result = typeConversionModule.convertDatabaseEntity(dbMessage, 'message');
        expect(result.messageText).toBe('Hello');
      });

      it('should convert bid entity', () => {
        const dbBid = { id: 'bid1', contractor_id: 'user1' };
        const result = typeConversionModule.convertDatabaseEntity(dbBid, 'bid');
        expect(result.contractorId).toBe('user1');
      });

      it('should return original for unknown entity type', () => {
        const entity = { id: 'unknown1', some_field: 'value' };
        const result = typeConversionModule.convertDatabaseEntity(entity, 'unknown');
        expect(result).toBe(entity);
      });
    });

    describe('convertApplicationEntity', () => {
      it('should convert user entity to database', () => {
        const user = { id: 'user1', firstName: 'John' };
        const result = typeConversionModule.convertApplicationEntity(user, 'user');
        expect(result.first_name).toBe('John');
      });

      it('should convert job entity to database', () => {
        const job = { id: 'job1', homeownerId: 'user1' };
        const result = typeConversionModule.convertApplicationEntity(job, 'job');
        expect(result.homeowner_id).toBe('user1');
      });

      it('should convert message entity to database', () => {
        const message = { id: 'msg1', messageText: 'Hello' };
        const result = typeConversionModule.convertApplicationEntity(message, 'message');
        expect(result.message_text).toBe('Hello');
      });

      it('should return original for bid (no reverse conversion)', () => {
        const bid = { id: 'bid1', contractorId: 'user1' };
        const result = typeConversionModule.convertApplicationEntity(bid, 'bid');
        expect(result).toBe(bid);
      });

      it('should return original for unknown entity type', () => {
        const entity = { id: 'unknown1', someField: 'value' };
        const result = typeConversionModule.convertApplicationEntity(entity, 'unknown');
        expect(result).toBe(entity);
      });
    });
  });

  describe('normalizeFieldNames', () => {
    describe('snake_case conversion', () => {
      it('should convert camelCase to snake_case', () => {
        const obj = {
          firstName: 'John',
          lastName: 'Doe',
          profileImageUrl: 'http://example.com/image.jpg',
          isAvailable: true
        };

        const result = typeConversionModule.normalizeFieldNames(obj, 'snake_case');

        expect(result).toEqual({
          first_name: 'John',
          last_name: 'Doe',
          profile_image_url: 'http://example.com/image.jpg',
          is_available: true
        });
      });

      it('should handle already snake_case fields', () => {
        const obj = {
          first_name: 'Jane',
          user_id: '123'
        };

        const result = typeConversionModule.normalizeFieldNames(obj, 'snake_case');

        expect(result).toEqual({
          first_name: 'Jane',
          user_id: '123'
        });
      });

      it('should handle mixed case fields', () => {
        const obj = {
          userID: '123',          // ID in caps
          XMLData: '<xml/>',      // Acronym
          HTMLContent: '<div/>'   // Mixed acronym
        };

        const result = typeConversionModule.normalizeFieldNames(obj, 'snake_case');

        expect(result).toEqual({
          user_i_d: '123',        // Each capital gets underscore
          x_m_l_data: '<xml/>',
          h_t_m_l_content: '<div/>'
        });
      });
    });

    describe('camelCase conversion', () => {
      it('should convert snake_case to camelCase', () => {
        const obj = {
          first_name: 'John',
          last_name: 'Doe',
          profile_image_url: 'http://example.com/image.jpg',
          is_verified: false
        };

        const result = typeConversionModule.normalizeFieldNames(obj, 'camelCase');

        expect(result).toEqual({
          firstName: 'John',
          lastName: 'Doe',
          profileImageUrl: 'http://example.com/image.jpg',
          isVerified: false
        });
      });

      it('should handle already camelCase fields', () => {
        const obj = {
          firstName: 'Jane',
          userId: '123'
        };

        const result = typeConversionModule.normalizeFieldNames(obj, 'camelCase');

        expect(result).toEqual({
          firstName: 'Jane',
          userId: '123'
        });
      });

      it('should handle leading underscores', () => {
        const obj = {
          _private_field: 'secret',
          __double_underscore: 'value'
        };

        const result = typeConversionModule.normalizeFieldNames(obj, 'camelCase');

        expect(result).toEqual({
          _privateField: 'secret',
          __doubleUnderscore: 'value'
        });
      });
    });

    describe('Edge cases', () => {
      it('should return non-objects as-is', () => {
        expect(typeConversionModule.normalizeFieldNames(null, 'snake_case')).toBeNull();
        expect(typeConversionModule.normalizeFieldNames(undefined, 'camelCase')).toBeUndefined();
        expect(typeConversionModule.normalizeFieldNames('string', 'snake_case')).toBe('string');
        expect(typeConversionModule.normalizeFieldNames(123, 'camelCase')).toBe(123);
        expect(typeConversionModule.normalizeFieldNames(true, 'snake_case')).toBe(true);
      });

      it('should handle empty objects', () => {
        const result = typeConversionModule.normalizeFieldNames({}, 'snake_case');
        expect(result).toEqual({});
      });

      it('should preserve values including nested objects', () => {
        const obj = {
          userName: 'John',
          userDetails: {
            nestedField: 'value'
          },
          userScores: [1, 2, 3]
        };

        const result = typeConversionModule.normalizeFieldNames(obj, 'snake_case');

        expect(result).toEqual({
          user_name: 'John',
          user_details: {          // Nested object not converted
            nestedField: 'value'
          },
          user_scores: [1, 2, 3]
        });
      });
    });
  });

  describe('TypeConversion object structure', () => {
    it('should have user conversion methods', () => {
      expect(TypeConversion.user).toBeDefined();
      expect(TypeConversion.user.fromDatabase).toBe(typeConversionModule.convertDatabaseUserToUser);
      expect(TypeConversion.user.toDatabase).toBe(typeConversionModule.convertUserToDatabaseUser);
      expect(TypeConversion.user.arrayFromDatabase).toBe(typeConversionModule.convertDatabaseUsersToUsers);
    });

    it('should have job conversion methods', () => {
      expect(TypeConversion.job).toBeDefined();
      expect(TypeConversion.job.fromDatabase).toBe(typeConversionModule.convertDatabaseJobToJob);
      expect(TypeConversion.job.toDatabase).toBe(typeConversionModule.convertJobToDatabaseJob);
      expect(TypeConversion.job.arrayFromDatabase).toBe(typeConversionModule.convertDatabaseJobsToJobs);
    });

    it('should have message conversion methods', () => {
      expect(TypeConversion.message).toBeDefined();
      expect(TypeConversion.message.fromDatabase).toBe(typeConversionModule.convertDatabaseMessageToMessage);
      expect(TypeConversion.message.toDatabase).toBe(typeConversionModule.convertMessageToDatabaseMessage);
      expect(TypeConversion.message.arrayFromDatabase).toBe(typeConversionModule.convertDatabaseMessagesToMessages);
    });

    it('should have bid conversion methods', () => {
      expect(TypeConversion.bid).toBeDefined();
      expect(TypeConversion.bid.fromDatabase).toBe(typeConversionModule.convertDatabaseBidToBid);
      expect(TypeConversion.bid.arrayFromDatabase).toBe(typeConversionModule.convertDatabaseBidsToBids);
    });

    it('should have generic conversion methods', () => {
      expect(TypeConversion.generic).toBeDefined();
      expect(TypeConversion.generic.fromDatabase).toBe(typeConversionModule.convertDatabaseEntity);
      expect(TypeConversion.generic.toDatabase).toBe(typeConversionModule.convertApplicationEntity);
      expect(TypeConversion.generic.normalizeFields).toBe(typeConversionModule.normalizeFieldNames);
    });
  });

  describe('Integration tests', () => {
    it('should round-trip user conversion', () => {
      const originalUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'contractor',
        profileImageUrl: 'http://example.com/image.jpg',
        isAvailable: true
      };

      const dbUser = typeConversionModule.convertUserToDatabaseUser(originalUser);
      const convertedBack = typeConversionModule.convertDatabaseUserToUser(dbUser);

      expect(convertedBack.id).toBe(originalUser.id);
      expect(convertedBack.email).toBe(originalUser.email);
      expect(convertedBack.firstName).toBe(originalUser.firstName);
      expect(convertedBack.lastName).toBe(originalUser.lastName);
      expect(convertedBack.profileImageUrl).toBe(originalUser.profileImageUrl);
      expect(convertedBack.isAvailable).toBe(originalUser.isAvailable);
    });

    it('should round-trip job conversion', () => {
      const originalJob = {
        id: 'job123',
        title: 'Fix roof',
        homeownerId: 'user456',
        contractorId: 'user789',
        budget: 1500,
        createdAt: '2023-01-01'
      };

      const dbJob = typeConversionModule.convertJobToDatabaseJob(originalJob);
      const convertedBack = typeConversionModule.convertDatabaseJobToJob(dbJob);

      expect(convertedBack.id).toBe(originalJob.id);
      expect(convertedBack.title).toBe(originalJob.title);
      expect(convertedBack.homeownerId).toBe(originalJob.homeownerId);
      expect(convertedBack.contractorId).toBe(originalJob.contractorId);
      expect(convertedBack.budget).toBe(originalJob.budget);
    });

    it('should round-trip message conversion', () => {
      const originalMessage = {
        id: 'msg123',
        jobId: 'job456',
        senderId: 'user789',
        receiverId: 'user012',
        messageText: 'Hello',
        messageType: 'text',
        read: false
      };

      const dbMessage = typeConversionModule.convertMessageToDatabaseMessage(originalMessage);
      const convertedBack = typeConversionModule.convertDatabaseMessageToMessage(dbMessage);

      expect(convertedBack.id).toBe(originalMessage.id);
      expect(convertedBack.jobId).toBe(originalMessage.jobId);
      expect(convertedBack.senderId).toBe(originalMessage.senderId);
      expect(convertedBack.messageText).toBe(originalMessage.messageText);
      expect(convertedBack.read).toBe(originalMessage.read);
    });
  });
});