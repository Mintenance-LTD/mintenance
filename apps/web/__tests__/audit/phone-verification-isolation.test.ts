import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  verify: vi.fn(),
  privilegedVerify: vi.fn(),
  factory: vi.fn(),
  adminGet: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: mocks.from,
    auth: {
      verifyOtp: mocks.privilegedVerify,
      admin: { getUserById: mocks.adminGet },
    },
  },
  createAnonClient: mocks.factory,
}));
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
import { verifyPhoneCode } from '@/lib/services/verification/verifyPhoneCode';
const update = vi.fn();
const filters = new Map<string, unknown>();
beforeEach(() => {
  vi.clearAllMocks();
  filters.clear();
  mocks.factory.mockReturnValue({ auth: { verifyOtp: mocks.verify } });
  mocks.verify.mockResolvedValue({
    data: { user: { id: 'actor' } },
    error: null,
  });
  const read = {
    select: () => read,
    eq: () => read,
    single: async () => ({
      data: { phone: '+440000000000', phone_verified: false },
      error: null,
    }),
  };
  const write = {
    update: (value: unknown) => {
      update(value);
      return write;
    },
    eq: (key: string, value: unknown) => {
      filters.set(key, value);
      return write;
    },
    select: async () => ({ data: [{ phone_verified: true }], error: null }),
  };
  mocks.from.mockReturnValueOnce(read).mockReturnValueOnce(write);
});
it('verifies with a fresh client and conditions the privileged update on the proved phone', async () => {
  expect(await verifyPhoneCode('actor', 'synthetic', vi.fn())).toEqual({
    success: true,
  });
  expect(mocks.factory).toHaveBeenCalledTimes(1);
  expect(mocks.privilegedVerify).not.toHaveBeenCalled();
  expect(filters.get('phone')).toBe('+440000000000');
  expect(filters.get('id')).toBe('actor');
});
it('refuses proof for another identity without marking this account verified', async () => {
  mocks.verify.mockResolvedValue({
    data: { user: { id: 'other' } },
    error: null,
  });
  const fallback = vi.fn();
  expect((await verifyPhoneCode('actor', 'synthetic', fallback)).success).toBe(
    false
  );
  expect(update).not.toHaveBeenCalled();
  expect(fallback).not.toHaveBeenCalled();
});
it('does not announce success when a concurrent phone change prevents the update', async () => {
  mocks.from.mockReset();
  const q: Record<string, unknown> = {};
  q.select = q.eq = () => q;
  q.single = async () => ({
    data: { phone: '+440000000000', phone_verified: false },
    error: null,
  });
  const w: Record<string, unknown> = {};
  w.update = w.eq = () => w;
  w.select = async () => ({ data: [], error: null });
  mocks.from.mockReturnValueOnce(q).mockReturnValueOnce(w);
  expect((await verifyPhoneCode('actor', 'synthetic', vi.fn())).success).toBe(
    false
  );
});

it('does not send an OTP when the authoritative Auth lookup fails', async () => {
  const { PhoneVerificationService } =
    await import('@/lib/services/verification/PhoneVerificationService');
  mocks.adminGet.mockResolvedValue({
    data: { user: null },
    error: { message: 'synthetic unavailable service' },
  });
  expect(
    (
      await PhoneVerificationService.sendVerificationCode(
        'actor',
        '+440000000000'
      )
    ).success
  ).toBe(false);
  expect(mocks.factory).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});
