/**
 * Test Template - Use this as a starting point for new tests
 *
 * This template shows proper testing patterns that achieve real code coverage.
 *
 * COPY THIS FILE and rename to match your service/component:
 *   cp test-template.test.ts src/__tests__/services/YourService.test.ts
 */

import { YourService } from '../services/YourService';  // ← Replace with actual import
import { supabase } from '../config/supabase';

// ============================================================================
// MOCKS - Only mock external I/O, not business logic
// ============================================================================

jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// ============================================================================
// TEST SUITE
// ============================================================================

describe('YourService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // HAPPY PATH TESTS - Test that things work when they should
  // ==========================================================================

  describe('methodName', () => {
    it('succeeds with valid input', async () => {
      // Arrange: Setup mock responses
      mockSupabase.from().select().single.mockResolvedValue({
        data: { id: '123', name: 'Test' },
        error: null,
      });

      // Act: Call the method
      const result = await YourService.methodName('valid-id');

      // Assert: Verify BEHAVIOR (not just that mock was called)
      expect(result).toEqual({
        id: '123',
        name: 'Test',
      });
      expect(result.id).toBeDefined();
    });

    it('returns transformed data', async () => {
      // Arrange
      mockSupabase.from().select().single.mockResolvedValue({
        data: { raw_field: 'raw_value' },
        error: null,
      });

      // Act
      const result = await YourService.methodName('id');

      // Assert: Verify data transformation logic
      expect(result.transformedField).toBe('TRANSFORMED_VALUE');
      // ✅ This tests actual business logic
    });
  });

  // ==========================================================================
  // VALIDATION TESTS - Test input validation
  // ==========================================================================

  describe('validation', () => {
    it('throws on null input', async () => {
      await expect(
        YourService.methodName(null as any)
      ).rejects.toThrow('Input required');
    });

    it('throws on empty string', async () => {
      await expect(
        YourService.methodName('')
      ).rejects.toThrow('Input cannot be empty');
    });

    it('throws on invalid format', async () => {
      await expect(
        YourService.methodName('invalid-format')
      ).rejects.toThrow('Invalid format');
    });

    it('accepts valid input', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { id: '123' },
        error: null,
      });

      await expect(
        YourService.methodName('valid-id-123')
      ).resolves.toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS - Test error scenarios
  // ==========================================================================

  describe('error handling', () => {
    it('handles database error gracefully', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'CONN_ERROR' },
      });

      await expect(
        YourService.methodName('id')
      ).rejects.toThrow('Database connection failed');
    });

    it('handles not found error', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      });

      await expect(
        YourService.methodName('nonexistent')
      ).rejects.toThrow('Not found');
    });

    it('handles network timeout', async () => {
      mockSupabase.from().select().single.mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        YourService.methodName('id')
      ).rejects.toThrow('Network timeout');
    });
  });

  // ==========================================================================
  // RETRY LOGIC TESTS - Test retry behavior
  // ==========================================================================

  describe('retry logic', () => {
    it('retries on transient failure', async () => {
      mockSupabase.from().select().single
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          data: { id: '123' },
          error: null,
        });

      const result = await YourService.methodNameWithRetry('id');

      expect(result.id).toBe('123');
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      // ✅ Verifies retry happened
    });

    it('fails after max retries', async () => {
      mockSupabase.from().select().single
        .mockRejectedValue(new Error('Persistent failure'));

      await expect(
        YourService.methodNameWithRetry('id')
      ).rejects.toThrow('Persistent failure');

      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
      // ✅ Verifies max retries respected
    });
  });

  // ==========================================================================
  // EDGE CASES - Test boundary conditions
  // ==========================================================================

  describe('edge cases', () => {
    it('handles empty result set', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await YourService.methodName('id');

      expect(result).toBeNull();
    });

    it('handles very long input', async () => {
      const longInput = 'a'.repeat(10000);

      await expect(
        YourService.methodName(longInput)
      ).rejects.toThrow('Input too long');
    });

    it('handles special characters', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { name: "O'Reilly & Sons" },
        error: null,
      });

      const result = await YourService.methodName('id');

      expect(result.name).toBe("O'Reilly & Sons");
      // ✅ Verifies special character handling
    });
  });

  // ==========================================================================
  // DATA TRANSFORMATION TESTS - Test business logic
  // ==========================================================================

  describe('data transformation', () => {
    it('converts currency correctly', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { amount_dollars: 150.50 },
        error: null,
      });

      const result = await YourService.methodName('id');

      expect(result.amountCents).toBe(15050);
      // ✅ Tests conversion logic
    });

    it('formats dates correctly', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { created_at: '2024-01-01T12:00:00Z' },
        error: null,
      });

      const result = await YourService.methodName('id');

      expect(result.formattedDate).toBe('January 1, 2024');
      // ✅ Tests date formatting logic
    });

    it('sanitizes sensitive data', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { password: 'secret123', api_key: 'key123' },
        error: null,
      });

      const result = await YourService.methodName('id');

      expect(result.password).toBeUndefined();
      expect(result.api_key).toBeUndefined();
      // ✅ Tests sanitization logic
    });
  });

  // ==========================================================================
  // STATE MANAGEMENT TESTS - Test stateful behavior
  // ==========================================================================

  describe('state management', () => {
    it('caches result on second call', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { id: '123' },
        error: null,
      });

      await YourService.methodNameWithCache('id');
      await YourService.methodNameWithCache('id');

      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      // ✅ Verifies caching works
    });

    it('invalidates cache on update', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { id: '123' },
        error: null,
      });

      await YourService.methodNameWithCache('id');
      await YourService.updateMethod('id', { name: 'Updated' });
      await YourService.methodNameWithCache('id');

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      // ✅ Verifies cache invalidation
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - Test multiple methods together
// ============================================================================

describe('YourService Integration', () => {
  it('complete workflow: create → read → update → delete', async () => {
    // Create
    mockSupabase.from().insert().single.mockResolvedValue({
      data: { id: 'new-123', name: 'Test' },
      error: null,
    });

    const created = await YourService.create({ name: 'Test' });
    expect(created.id).toBe('new-123');

    // Read
    mockSupabase.from().select().single.mockResolvedValue({
      data: { id: 'new-123', name: 'Test' },
      error: null,
    });

    const read = await YourService.read('new-123');
    expect(read.name).toBe('Test');

    // Update
    mockSupabase.from().update().single.mockResolvedValue({
      data: { id: 'new-123', name: 'Updated' },
      error: null,
    });

    const updated = await YourService.update('new-123', { name: 'Updated' });
    expect(updated.name).toBe('Updated');

    // Delete
    mockSupabase.from().delete().mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(YourService.delete('new-123')).resolves.not.toThrow();
  });
});

// ============================================================================
// NOTES FOR USING THIS TEMPLATE
// ============================================================================

/*
1. Replace all instances of:
   - YourService → ActualServiceName
   - methodName → actualMethodName
   - test data → realistic test data

2. Remove sections that don't apply:
   - If no retry logic, remove retry tests
   - If no caching, remove cache tests
   - etc.

3. Add sections for specific features:
   - File uploads
   - Webhooks
   - Real-time subscriptions
   - etc.

4. Verify coverage increases:
   npm test -- --coverage YourService.test.ts

5. Run quality check:
   node scripts/validate-test-quality.js path/to/YourService.test.ts

6. Target: 60% minimum, 80% ideal
*/
