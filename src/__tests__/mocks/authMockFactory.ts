import type { AuthContextType } from '../../contexts/AuthContext';
import type { User } from '../../types';

// ============================================================================
// AUTH MOCK FACTORY
// ============================================================================

export class AuthMockFactory {
  static createCompleteAuthMock(overrides: Partial<AuthContextType> = {}): AuthContextType {
    return {
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      signInWithBiometrics: jest.fn(),
      isBiometricAvailable: jest.fn(() => Promise.resolve(false)),
      isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
      ...overrides,
    };
  }

  static createAuthenticatedHomeowner(overrides: Partial<User> = {}): AuthContextType {
    const homeowner: User = {
      id: 'homeowner-123',
      email: 'homeowner@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'homeowner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };

    return this.createCompleteAuthMock({
      user: homeowner,
      session: { user: homeowner, access_token: 'token123' },
    });
  }

  static createAuthenticatedContractor(overrides: Partial<User> = {}): AuthContextType {
    const contractor: User = {
      id: 'contractor-456',
      email: 'contractor@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'contractor',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };

    return this.createCompleteAuthMock({
      user: contractor,
      session: { user: contractor, access_token: 'token456' },
    });
  }

  static createLoadingState(): AuthContextType {
    return this.createCompleteAuthMock({
      loading: true,
    });
  }

  static createBiometricEnabledMock(): AuthContextType {
    return this.createCompleteAuthMock({
      isBiometricAvailable: jest.fn(() => Promise.resolve(true)),
      isBiometricEnabled: jest.fn(() => Promise.resolve(true)),
    });
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const mockAuthNotAuthenticated = AuthMockFactory.createCompleteAuthMock();
export const mockAuthHomeowner = AuthMockFactory.createAuthenticatedHomeowner();
export const mockAuthContractor = AuthMockFactory.createAuthenticatedContractor();
export const mockAuthLoading = AuthMockFactory.createLoadingState();
export const mockAuthBiometric = AuthMockFactory.createBiometricEnabledMock();

export default AuthMockFactory;
