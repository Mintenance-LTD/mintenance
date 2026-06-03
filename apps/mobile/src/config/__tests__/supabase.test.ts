// NOTE: jest.config.js maps every `config/supabase` import to the chainable
// manual mock in `src/config/__mocks__/supabase.ts`. To exercise the REAL
// module under test we pull it in with `jest.requireActual` against the
// concrete source path, which bypasses `moduleNameMapper`.
const { isSupabaseConfigured } = jest.requireActual('../supabase') as {
  isSupabaseConfigured: boolean;
};

describe('isSupabaseConfigured', () => {
  it('is a boolean derived from credential validation', () => {
    // Source exports `credentialsValid && !useMockFlag` — a boolean, not a fn.
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('resolves to true with the valid test env credentials', () => {
    // jest-setup.js seeds EXPO_PUBLIC_SUPABASE_URL (valid *.supabase.co) and a
    // JWT-shaped EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_USE_MOCK is
    // unset, so the guard should report a configured client.
    expect(isSupabaseConfigured).toBe(true);
  });
});
