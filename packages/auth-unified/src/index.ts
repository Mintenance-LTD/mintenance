/**
 * @mintenance/auth-unified
 * Unified authentication package for web and mobile platforms
 *
 * Usage:
 * ```typescript
 * // Web
 * import { UnifiedAuth } from '@mintenance/auth-unified';
 * const auth = UnifiedAuth.forWeb(config);
 *
 * // Mobile
 * import { UnifiedAuth } from '@mintenance/auth-unified';
 * const auth = UnifiedAuth.forMobile(config);
 * ```
 */
import { UnifiedAuthService, AuthConfig, AuthTokens, SignUpData, AuthCredentials, CustomAuthError } from './core/UnifiedAuthService';
import { WebAuthAdapter } from './platform/WebAuthAdapter';
import { MobileAuthAdapter } from './platform/MobileAuthAdapter';
// Re-export types
export type {
  AuthConfig,
  AuthTokens,
  SignUpData,
  AuthCredentials,
} from './core/UnifiedAuthService';
export { CustomAuthError, UnifiedAuthService } from './core/UnifiedAuthService';
export { WebAuthAdapter } from './platform/WebAuthAdapter';
export { MobileAuthAdapter } from './platform/MobileAuthAdapter';
// Export WebAuthConfig and MobileAuthConfig types
export type { WebAuthConfig } from './platform/WebAuthAdapter';
export type { MobileAuthConfig } from './platform/MobileAuthAdapter';
/**
 * Main UnifiedAuth class with platform-specific factory methods
 */
export class UnifiedAuth {
  /**
   * Create auth instance for web platform
   */
  static forWeb(config: unknown): WebAuthAdapter {
    return new WebAuthAdapter(config);
  }
  /**
   * Create auth instance for mobile platform
   */
  static forMobile(config: unknown): MobileAuthAdapter {
    return new MobileAuthAdapter(config);
  }
  /**
   * Auto-detect platform and create appropriate instance
   */
  static create(config: AuthConfig): UnifiedAuthService {
    // Detect platform
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
    const isMobile = typeof window !== 'undefined' && !isWeb;
    const isServer = typeof window === 'undefined';
    if (isServer || isWeb) {
      return new WebAuthAdapter(config as unknown);
    } else {
      return new MobileAuthAdapter(config as unknown);
    }
  }
}
/**
 * Auth middleware for Next.js
 */
export { AuthMiddleware } from './middleware/AuthMiddleware';
/**
 * React hooks
 */
export { useAuth } from './hooks/useAuth';
/**
 * Auth guards
 */
export { RequireAuth } from './guards/RequireAuth';
export { RequireRole } from './guards/RequireRole';
// Default export
export default UnifiedAuth;