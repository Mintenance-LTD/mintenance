import type { User } from './user';

// Authentication types
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  phone?: string;
}

// JWT Payload
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  iat: number;
  exp: number;

  // VULN-009: Session timeout tracking
  sessionStart?: number;   // Unix timestamp (ms) - Original login time, never changes across refreshes
  lastActivity?: number;   // Unix timestamp (ms) - Last API request, updated on refreshes
}
