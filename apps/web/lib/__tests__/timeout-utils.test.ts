// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { createTimeoutQuery, withTimeout, batchOperations } from '../timeout-utils';

describe('createTimeoutQuery', () => {
  it('should handle normal cases', async () => {
    const mockQueryFn = vi.fn().mockResolvedValue('result');
    const result = await createTimeoutQuery(mockQueryFn);
    expect(result).toBe('result');
  });

  it('should handle timeout', async () => {
    const slowQueryFn = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('late'), 50000))
    );
    const result = await createTimeoutQuery(slowQueryFn, 10);
    expect(result).toBeNull();
  });

  it('should handle error cases', async () => {
    const errorQueryFn = vi.fn().mockRejectedValue(new Error('Query failed'));
    await expect(createTimeoutQuery(errorQueryFn)).rejects.toThrow('Query failed');
  });
});

describe('withTimeout', () => {
  it('should return result for fast operations', async () => {
    const fastOp = () => Promise.resolve('fast result');
    const result = await withTimeout(fastOp);
    expect(result).toBe('fast result');
  });

  it('should return fallback for slow operations', async () => {
    const slowOp = () => new Promise(resolve => setTimeout(() => resolve('slow'), 50000));
    const result = await withTimeout(slowOp, { timeoutMs: 10, fallbackValue: 'fallback' });
    expect(result).toBe('fallback');
  });
});

describe('batchOperations', () => {
  it('should process items in batches', async () => {
    const items = [1, 2, 3, 4, 5];
    const processor = vi.fn().mockImplementation((batch: number[]) =>
      Promise.resolve(batch.map(n => n * 2))
    );
    const results = await batchOperations(items, processor, 2, 0);
    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(processor).toHaveBeenCalledTimes(3);
  });

  it('should handle empty array', async () => {
    const processor = vi.fn().mockResolvedValue([]);
    const results = await batchOperations([], processor);
    expect(results).toEqual([]);
    expect(processor).not.toHaveBeenCalled();
  });
});
