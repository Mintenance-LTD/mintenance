// Shared authentication utilities
export { validateEmail, validatePassword, hashPassword, comparePassword } from './validation';
export { generateJWT, verifyJWT, decodeJWTPayload } from './jwt';
export { ConfigManager } from './config';

// Re-export types
export type { User, AuthResult, LoginCredentials, RegisterData, JWTPayload } from '@mintenance/types';