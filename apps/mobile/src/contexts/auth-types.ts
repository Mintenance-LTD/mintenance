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
  // 2026-05-23: previously the registration form validated phoneNumber
  // as required for contractors but never forwarded it to Supabase, so
  // every signup left profiles.phone NULL. Now optional on the type and
  // wired through performSignUp -> AuthService.signUp -> supabase.auth
  // signUp options.data, where the handle_new_user trigger picks it up.
  phone?: string;
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
  refreshUser: () => Promise<void>;
  signInWithBiometrics: () => Promise<void>;
  isBiometricAvailable: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
}
