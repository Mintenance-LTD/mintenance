// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

const { mockFrom, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => {
  const chain: Record<string, any> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'or']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue(chain);
  return { serverSupabase: { from: mockFrom } };
});

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mockLoggerError },
}));

import { isValidUUID, sendNotification } from '../webhook-helpers';

describe('isValidUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe(true);
  });

  it('accepts uppercase UUID', () => {
    expect(isValidUUID('A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D')).toBe(true);
  });

  it('rejects UUID v1 (wrong version digit)', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-1a7b-8c9d-0e1f2a3b4c5d')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects random string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('rejects UUID with wrong variant bits', () => {
    // variant bits should be 8, 9, a, or b — here using 'c'
    expect(isValidUUID('a1b2c3d4-e5f6-4a7b-cc9d-0e1f2a3b4c5d')).toBe(false);
  });

  it('rejects UUID with missing dashes', () => {
    expect(isValidUUID('a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d')).toBe(false);
  });

  it('rejects SQL injection attempts', () => {
    expect(isValidUUID("'; DROP TABLE users; --")).toBe(false);
  });
});

describe('sendNotification', () => {
  beforeEach(() => {
    const chain: Record<string, any> = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'or']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
  });

  it('inserts notification into notifications table', async () => {
    await sendNotification('user-123', 'Test Title', 'Test message', 'test_type');

    expect(mockFrom).toHaveBeenCalledWith('notifications');
    const chain = mockFrom.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        title: 'Test Title',
        message: 'Test message',
        type: 'test_type',
        read: false,
      })
    );
  });

  it('fails silently when insert throws', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('DB connection lost');
    });

    // Should not throw
    await expect(sendNotification('user-1', 'Title', 'Msg', 'type')).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to send notification',
      expect.any(Error),
      expect.objectContaining({ userId: 'user-1', type: 'type' }),
    );
  });
});
