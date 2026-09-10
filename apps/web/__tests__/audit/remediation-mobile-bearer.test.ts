// @vitest-environment node
import { SignJWT, generateKeyPair } from 'jose';
const m = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  createAnonClient: () => ({ auth: { getUser: m.getUser } }),
  serverSupabase: { rpc: m.rpc },
}));
import { verifySupabaseBearer } from '@/lib/auth/supabase-bearer';
let token: string;
beforeEach(async () => {
  const { privateKey } = await generateKeyPair('ES256');
  token = await new SignJWT({
    sub: 'synthetic-user',
    session_id: 'synthetic-session',
    user_metadata: { role: 'admin' },
  })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
  m.getUser.mockResolvedValue({
    data: {
      user: { id: 'synthetic-user', email: 'synthetic@example.invalid' },
    },
    error: null,
  });
  m.rpc.mockResolvedValue({
    data: [
      {
        profile_role: 'contractor',
        session_start_ms: Date.now() - 1000,
        last_activity_ms: Date.now() - 1000,
      },
    ],
    error: null,
  });
});
it('uses verified Supabase identity and database role rather than editable metadata', async () => {
  const result = await verifySupabaseBearer(token);
  expect(result).toMatchObject({ sub: 'synthetic-user', role: 'contractor' });
  expect(m.getUser).toHaveBeenCalledWith(token);
  expect(m.rpc).toHaveBeenCalledWith(
    'verified_mobile_session_context',
    expect.objectContaining({
      p_user_id: 'synthetic-user',
      p_session_id: 'synthetic-session',
    })
  );
});
it('does not trust decoded claims when Supabase rejects the token', async () => {
  m.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'invalid signature' },
  });
  expect(await verifySupabaseBearer(token)).toBeNull();
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each([
  { data: [], error: null },
  { data: null, error: { message: 'database unavailable' } },
])(
  'fails closed for missing/revoked session or failed context lookup',
  async (result) => {
    m.rpc.mockResolvedValue(result);
    expect(await verifySupabaseBearer(token)).toBeNull();
  }
);
