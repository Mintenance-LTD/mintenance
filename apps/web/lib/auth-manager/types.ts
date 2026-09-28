import type { User, CreateUserData } from '../database';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  cookieHeaders?: Headers;
  requiresEmailVerification?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RegisterData = CreateUserData;
