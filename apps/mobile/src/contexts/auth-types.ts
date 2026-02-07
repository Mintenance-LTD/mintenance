import type { ReactNode } from 'react';
import type { User } from '@mintenance/types';

/**
 * Minimal session shape used throughout the auth context.
 * Mirrors the Supabase session structure we rely on.
 */
export interface AuthSession {
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}

export interface SignUpUserData {
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
}

export interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: SignUpUserData
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  signInWithBiometrics: () => Promise<void>;
  isBiometricAvailable: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
}
