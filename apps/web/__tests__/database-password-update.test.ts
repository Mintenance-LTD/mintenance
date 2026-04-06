// @vitest-environment node
/**
 * Regression test for the updateUserPassword security bug.
 *
 * The prior implementation validated the new password and stored it in
 * password_history, but NEVER called Supabase Auth to actually change the
 * user's password. Users thought they rotated their password; they hadn't.
 *
 * This test locks in that updateUserPassword calls
 * serverSupabase.auth.admin.updateUserById with the new password.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks — must be defined before the module under test imports
const mocks = vi.hoisted(() => ({
  updateUserById: vi.fn(),
  profileUpdate: vi.fn(),
  profileEq: vi.fn(),
  historySelect: vi.fn(),
  historyEq: vi.fn(),
  historyOrder: vi.fn(),
  historyLimit: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    auth: {
      admin: {
        updateUserById: mocks.updateUserById,
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'password_history') {
        return {
          select: mocks.historySelect.mockReturnValue({
            eq: mocks.historyEq.mockReturnValue({
              order: mocks.historyOrder.mockReturnValue({
                limit: mocks.historyLimit.mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          update: mocks.profileUpdate.mockReturnValue({
            eq: mocks.profileEq.mockResolvedValue({ error: null }),
          }),
        };
      }
      return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    }),
    rpc: mocks.rpc.mockResolvedValue({ data: null, error: null }),
  },
}));

describe('DatabaseManager.updateUserPassword (regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUserById.mockResolvedValue({ data: null, error: null });
    mocks.historyLimit.mockResolvedValue({ data: [], error: null });
    mocks.profileEq.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('SECURITY: calls Supabase Auth admin.updateUserById with the new password', async () => {
    const { DatabaseManager } = await import('@/lib/database');

    const strongPassword = 'Xyz9-Test-Password!@#StrongEnough';
    const result = await DatabaseManager.updateUserPassword(
      'user-abc',
      strongPassword,
    );

    expect(result).toBe(true);
    expect(mocks.updateUserById).toHaveBeenCalledTimes(1);
    expect(mocks.updateUserById).toHaveBeenCalledWith('user-abc', {
      password: strongPassword,
    });
  });

  it('returns false and does NOT log success when Supabase Auth update fails', async () => {
    mocks.updateUserById.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    });

    const { DatabaseManager } = await import('@/lib/database');
    const result = await DatabaseManager.updateUserPassword(
      'missing-user',
      'Xyz9-Test-Password!@#StrongEnough',
    );

    expect(result).toBe(false);
    expect(mocks.updateUserById).toHaveBeenCalledTimes(1);
  });

  it('rejects weak passwords before calling Supabase Auth', async () => {
    const { DatabaseManager } = await import('@/lib/database');

    await expect(
      DatabaseManager.updateUserPassword('user-abc', 'weak'),
    ).rejects.toThrow();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });
});
