import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  it('exports provider and hook', () => {
    expect(typeof AuthProvider).toBe('function');
    expect(typeof useAuth).toBe('function');
  });
});
