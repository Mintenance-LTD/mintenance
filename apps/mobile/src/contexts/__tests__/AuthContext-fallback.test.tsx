import * as AuthContextFallback from '../AuthContext-fallback';

describe('AuthContext-fallback', () => {
  it('exports the fallback context helpers', () => {
    expect(AuthContextFallback.useAuth).toBeDefined();
    expect(AuthContextFallback.AuthProvider).toBeDefined();
  });
});
