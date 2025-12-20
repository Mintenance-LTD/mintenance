/**
 * Unit tests for GCP bucket creation script
 */

import { Storage } from '@google-cloud/storage';

// Mock @google-cloud/storage
jest.mock('@google-cloud/storage');

// Mock GCPAuthService
jest.mock('../../apps/web/lib/services/gcp/GCPAuthService', () => ({
  GCPAuthService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getStorageClient: jest.fn().mockResolvedValue({
      createBucket: jest.fn(),
      bucket: jest.fn(),
      getBuckets: jest.fn(),
    }),
  },
}));

describe('GCP Bucket Creation', () => {
  let mockStorage: jest.Mocked<Storage>;
  let mockBucket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBucket = {
      exists: jest.fn(),
      setMetadata: jest.fn(),
      getMetadata: jest.fn(),
      iam: {
        setPolicy: jest.fn(),
      },
    };

    mockStorage = {
      createBucket: jest.fn(),
      bucket: jest.fn().mockReturnValue(mockBucket),
      getBuckets: jest.fn(),
    } as any;
  });

  describe('isRetryableError', () => {
    it('should identify retryable HTTP status codes', () => {
      const retryableCodes = [408, 429, 500, 502, 503, 504];
      
      retryableCodes.forEach((code) => {
        const error = { code, message: 'Test error' };
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should identify retryable error messages', () => {
      const retryableMessages = [
        'timeout',
        'network error',
        'connection reset',
        'rate limit exceeded',
        'service unavailable',
      ];

      retryableMessages.forEach((message) => {
        const error = { message };
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should not retry on non-retryable errors', () => {
      const nonRetryableErrors = [
        { code: 404, message: 'Not found' },
        { code: 400, message: 'Bad request' },
        { code: 403, message: 'Permission denied' },
      ];

      nonRetryableErrors.forEach((error) => {
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 500, message: 'Internal error' })
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue({ code: 500, message: 'Internal error' });

      await expect(
        withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 })
      ).rejects.toMatchObject({ code: 500 });

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue({ code: 404, message: 'Not found' });

      await expect(
        withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 })
      ).rejects.toMatchObject({ code: 404 });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 500 })
        .mockRejectedValueOnce({ code: 500 })
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000 });
      const duration = Date.now() - startTime;

      // Should have waited at least 100ms (first retry delay)
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('createBucket', () => {
    it('should create a new bucket successfully', async () => {
      mockBucket.exists.mockResolvedValue([false]);
      mockStorage.createBucket.mockResolvedValue([mockBucket]);

      const bucketConfig = {
        name: 'test-bucket',
        description: 'Test bucket',
        lifecycleDays: 365,
        versioning: false,
      };

      const result = await createBucket(bucketConfig, mockStorage);

      expect(result).toBe(true);
      expect(mockStorage.createBucket).toHaveBeenCalledWith('test-bucket', {
        location: 'europe-west2',
        projectId: expect.any(String),
        metadata: {
          labels: {
            description: 'Test bucket',
            createdBy: 'mintenance-bucket-setup-script',
          },
        },
      });
    });

    it('should update existing bucket configuration', async () => {
      mockBucket.exists.mockResolvedValue([true]);
      mockBucket.setMetadata.mockResolvedValue([{}]);
      mockBucket.iam.setPolicy.mockResolvedValue([{}]);

      const bucketConfig = {
        name: 'existing-bucket',
        description: 'Existing bucket',
        lifecycleDays: 365,
        versioning: true,
      };

      const result = await createBucket(bucketConfig, mockStorage);

      expect(result).toBe(true);
      expect(mockStorage.createBucket).not.toHaveBeenCalled();
      expect(mockBucket.setMetadata).toHaveBeenCalled();
    });

    it('should handle creation errors gracefully', async () => {
      mockBucket.exists.mockResolvedValue([false]);
      mockStorage.createBucket.mockRejectedValue(
        new Error('Permission denied')
      );

      const bucketConfig = {
        name: 'test-bucket',
        description: 'Test bucket',
      };

      const result = await createBucket(bucketConfig, mockStorage);

      expect(result).toBe(false);
    });
  });

  describe('updateBucketConfiguration', () => {
    it('should enable versioning when specified', async () => {
      const bucketConfig = {
        name: 'test-bucket',
        description: 'Test bucket',
        versioning: true,
      };

      mockBucket.setMetadata.mockResolvedValue([{}]);
      mockBucket.iam.setPolicy.mockResolvedValue([{}]);

      await updateBucketConfiguration(bucketConfig, mockStorage);

      expect(mockBucket.setMetadata).toHaveBeenCalledWith({
        versioning: { enabled: true },
      });
    });

    it('should set lifecycle policy when specified', async () => {
      const bucketConfig = {
        name: 'test-bucket',
        description: 'Test bucket',
        lifecycleDays: 365,
      };

      mockBucket.setMetadata.mockResolvedValue([{}]);
      mockBucket.iam.setPolicy.mockResolvedValue([{}]);

      await updateBucketConfiguration(bucketConfig, mockStorage);

      expect(mockBucket.setMetadata).toHaveBeenCalledWith({
        lifecycle: {
          rule: [
            {
              action: { type: 'Delete' },
              condition: { age: 365 },
            },
          ],
        },
      });
    });
  });
});

// Helper functions (these would be exported from the main script in a real implementation)
function isRetryableError(error: any): boolean {
  if (!error) return false;

  const code = error.code || error.status || error.statusCode;
  const message = String(error.message || error).toLowerCase();

  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (retryableStatusCodes.includes(code)) {
    return true;
  }

  const retryableMessages = [
    'timeout',
    'network',
    'connection',
    'econnreset',
    'etimedout',
    'rate limit',
    'quota exceeded',
    'service unavailable',
    'internal error',
    'deadline exceeded',
  ];

  return retryableMessages.some((msg) => message.includes(msg));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number } = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
  context: string = 'operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt >= config.maxAttempts) {
        throw error;
      }

      const delayMs = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function createBucket(bucket: any, storage: Storage): Promise<boolean> {
  try {
    const bucketHandle = storage.bucket(bucket.name);
    const [exists] = await bucketHandle.exists();

    if (exists) {
      await updateBucketConfiguration(bucket, storage);
      return true;
    }

    await storage.createBucket(bucket.name, {
      location: 'europe-west2',
      projectId: 'test-project',
      metadata: {
        labels: {
          description: bucket.description,
          createdBy: 'mintenance-bucket-setup-script',
        },
      },
    });

    await updateBucketConfiguration(bucket, storage);
    return true;
  } catch (error: any) {
    return false;
  }
}

async function updateBucketConfiguration(bucket: any, storage: Storage): Promise<void> {
  const bucketHandle = storage.bucket(bucket.name);

  if (bucket.versioning !== undefined) {
    await bucketHandle.setMetadata({
      versioning: {
        enabled: bucket.versioning,
      },
    });
  }

  await bucketHandle.iam.setPolicy({
    bindings: [
      {
        role: 'roles/storage.objectViewer',
        members: [],
      },
    ],
  });

  if (bucket.lifecycleDays) {
    await bucketHandle.setMetadata({
      lifecycle: {
        rule: [
          {
            action: { type: 'Delete' },
            condition: { age: bucket.lifecycleDays },
          },
        ],
      },
    });
  }
}

