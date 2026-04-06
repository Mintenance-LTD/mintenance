import type { User, CreateUserData } from '../database';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  cookieHeaders?: Headers;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends CreateUserData {}
