// Shared authentication utilities
export { validateEmail, validatePassword, hashPassword, comparePassword } from './validation';
export { generateJWT, verifyJWT, decodeJWTPayload, generateRefreshToken, hashRefreshToken, generateTokenPair } from './jwt';
export { ConfigManager } from './config';
export { PasswordValidator } from './password-validator';
export { PasswordHistoryManager } from './password-history';
export { AccountLockoutManager } from './account-lockout';
export { SessionValidator } from './session-validator';
// password-security uses Node.js crypto and argon2 which are incompatible with Edge Runtime.
// Import password-security directly where needed instead of through this barrel export.
// export { checkPasswordBreach, validatePasswordStrength, generateSecurePassword, passwordPolicy } from './password-security';
// Re-export types
export type { User, AuthResult, LoginCredentials, RegisterData, JWTPayload } from '@mintenance/types';
export type { PasswordValidationResult, PasswordRequirements } from './password-validator';
export type { PasswordHistoryEntry } from './password-history';
export type { LockoutStatus, LockoutConfig, LoginAttempt } from './account-lockout';
export type { SessionValidationResult, SessionTimeoutConfig } from './session-validator';