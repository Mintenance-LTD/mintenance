// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { createServiceClient } from './supabase-test-client';
import { createTestUser } from './fixtures';

vi.mock('crypto', () => ({ randomUUID: vi.fn() }));
vi.mock('./supabase-test-client', () => ({ createServiceClient: vi.fn() }));

const createUser = vi.fn();
const update = vi.fn();
const eq = vi.fn();

beforeEach(() => {
  vi.mocked(createServiceClient).mockReturnValue({
    auth: { admin: { createUser } },
    from: vi.fn().mockReturnValue({ update }),
  } as unknown as ReturnType<typeof createServiceClient>);
  createUser.mockResolvedValue({
    data: { user: { id: 'synthetic-user' } },
    error: null,
  });
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
});

describe('integration Auth fixture password policy', () => {
  for (const role of ['homeowner', 'contractor', 'admin'] as const) {
    it.each([
      'abcdefab-abcd-4abc-8abc-abcdefabcdef',
      '00000000-0000-4000-8000-000000000000',
    ] as const)(
      `meets all required classes for ${role} with UUID %s`,
      async (uuid) => {
        vi.mocked(randomUUID).mockReturnValue(uuid);

        const user = await createTestUser({ role });
        const submitted = createUser.mock.calls[0][0];

        // Exercise the actual password sent to Auth, including the no-digit UUID case.
        expect(submitted.password.length).toBeGreaterThanOrEqual(12);
        expect(submitted.password).toMatch(/[a-z]/);
        expect(submitted.password).toMatch(/[A-Z]/);
        expect(submitted.password).toMatch(/[0-9]/);
        expect(submitted.password).toMatch(/[!@#$%^&*()_+\-=]/);
        expect(user.password).toBe(submitted.password);
        expect(submitted).toMatchObject({
          email: user.email,
          email_confirm: true,
          user_metadata: { role, test_user: true },
        });
        expect(update).toHaveBeenCalledWith({
          role,
          first_name: `itest_${role}`,
          last_name: 'test',
        });
      }
    );
  }

  it('retains random variation when an explicit email is supplied', async () => {
    vi.mocked(randomUUID)
      .mockReturnValueOnce('abcdefab-abcd-4abc-8abc-abcdefabcdef')
      .mockReturnValueOnce('fedcbafe-abcd-4abc-8abc-abcdefabcdef');

    const first = await createTestUser({
      role: 'contractor',
      email: 'first@test.local',
    });
    const second = await createTestUser({
      role: 'contractor',
      email: 'second@test.local',
    });

    expect(first.password).not.toBe(second.password);
    expect(createUser).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        email: 'first@test.local',
        password: first.password,
      })
    );
    expect(createUser).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        email: 'second@test.local',
        password: second.password,
      })
    );
  });
});
