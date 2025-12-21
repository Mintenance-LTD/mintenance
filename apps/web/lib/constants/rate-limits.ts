/**
 * Rate Limiting Configuration
 * Centralized configuration for all API route rate limits
 *
 * Security levels:
 * - STRICT: Critical operations (auth, payments) - 5-10 requests per window
 * - MODERATE: Standard API operations - 30-100 requests per window
 * - RELAXED: Read-only operations - 100-500 requests per window
 * - PUBLIC: Public endpoints - 20-50 requests per window
 */

export type RateLimitTier = 'anonymous' | 'authenticated' | 'admin' | 'premium';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: Record<RateLimitTier, number>; // Max requests per tier
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  standardHeaders?: boolean; // Return rate limit info in headers
  legacyHeaders?: boolean; // Support X-RateLimit headers
  keyGenerator?: string; // How to identify clients (ip, userId, etc)
  handler?: 'block' | 'throttle'; // How to handle limit exceeded
  message?: string; // Custom error message
}

/**
 * Route-specific rate limit configurations
 * Organized by security level and functionality
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // ============================================================================
  // AUTHENTICATION & SECURITY (STRICT)
  // ============================================================================

  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: {
      anonymous: 5,
      authenticated: 10,
      admin: 20,
      premium: 15,
    },
    skipSuccessfulRequests: false,
    standardHeaders: true,
    handler: 'block',
    message: 'Too many login attempts. Please try again later.',
  },

  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: {
      anonymous: 3,
      authenticated: 5,
      admin: 10,
      premium: 5,
    },
    standardHeaders: true,
    handler: 'block',
    message: 'Registration limit exceeded. Please try again later.',
  },

  '/api/auth/forgot-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: {
      anonymous: 3,
      authenticated: 3,
      admin: 10,
      premium: 5,
    },
    standardHeaders: true,
    handler: 'block',
    message: 'Too many password reset requests. Please check your email.',
  },

  '/api/auth/reset-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: {
      anonymous: 3,
      authenticated: 3,
      admin: 10,
      premium: 5,
    },
    standardHeaders: true,
    handler: 'block',
  },

  '/api/auth/mfa/*': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: {
      anonymous: 5,
      authenticated: 10,
      admin: 20,
      premium: 15,
    },
    standardHeaders: true,
    handler: 'block',
    message: 'Too many MFA attempts. Please wait before trying again.',
  },

  // ============================================================================
  // PAYMENT & FINANCIAL (STRICT)
  // ============================================================================

  '/api/payments/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0, // No anonymous payments
      authenticated: 10,
      admin: 50,
      premium: 20,
    },
    standardHeaders: true,
    handler: 'block',
    message: 'Payment rate limit exceeded. Please wait before retrying.',
  },

  '/api/escrow/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 15,
      admin: 50,
      premium: 25,
    },
    standardHeaders: true,
    handler: 'block',
  },

  '/api/contractor/payout/*': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: {
      anonymous: 0,
      authenticated: 5,
      admin: 20,
      premium: 10,
    },
    standardHeaders: true,
    handler: 'block',
  },

  // ============================================================================
  // USER PROFILE & DATA MODIFICATION (MODERATE)
  // ============================================================================

  '/api/contractor/update-profile': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: {
      anonymous: 0,
      authenticated: 10,
      admin: 50,
      premium: 20,
    },
    standardHeaders: true,
    handler: 'throttle',
    message: 'Profile update rate limit exceeded. Please wait before making more changes.',
  },

  '/api/user/profile': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: {
      anonymous: 0,
      authenticated: 10,
      admin: 50,
      premium: 20,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  '/api/account/*': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: {
      anonymous: 0,
      authenticated: 20,
      admin: 100,
      premium: 40,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  // ============================================================================
  // MESSAGING & COMMUNICATION (MODERATE)
  // ============================================================================

  '/api/messages/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 30,
      admin: 100,
      premium: 50,
    },
    standardHeaders: true,
    handler: 'throttle',
    message: 'Message rate limit exceeded. Please slow down.',
  },

  '/api/notifications/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 50,
      admin: 200,
      premium: 100,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  // ============================================================================
  // JOB & BID OPERATIONS (MODERATE)
  // ============================================================================

  '/api/jobs': {
    windowMs: 60 * 60 * 1000, // 1 hour (job creation)
    max: {
      anonymous: 0,
      authenticated: 10,
      admin: 100,
      premium: 25,
    },
    standardHeaders: true,
    handler: 'block',
    message: 'Job creation limit reached. Please try again later.',
  },

  '/api/jobs/*': {
    windowMs: 60 * 1000, // 1 minute (job operations)
    max: {
      anonymous: 20, // Allow viewing
      authenticated: 100,
      admin: 500,
      premium: 200,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  '/api/contractor/submit-bid': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: {
      anonymous: 0,
      authenticated: 20,
      admin: 100,
      premium: 40,
    },
    standardHeaders: true,
    handler: 'throttle',
    message: 'Bid submission limit reached. Please try again later.',
  },

  '/api/bids/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 50,
      admin: 200,
      premium: 100,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  // ============================================================================
  // AI & RESOURCE-INTENSIVE OPERATIONS (STRICT)
  // ============================================================================

  '/api/ai/search': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 5,
      authenticated: 20,
      admin: 100,
      premium: 40,
    },
    standardHeaders: true,
    handler: 'throttle',
    message: 'AI search rate limit exceeded. Please wait before searching again.',
  },

  '/api/ai/generate-embedding': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 10,
      admin: 50,
      premium: 25,
    },
    standardHeaders: true,
    handler: 'block',
  },

  '/api/building-surveyor/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 5,
      admin: 30,
      premium: 15,
    },
    standardHeaders: true,
    handler: 'block',
    message: 'AI assessment rate limit exceeded.',
  },

  // ============================================================================
  // FILE UPLOADS (STRICT)
  // ============================================================================

  '/api/upload/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 10,
      admin: 50,
      premium: 25,
    },
    standardHeaders: true,
    handler: 'block',
    message: 'Upload rate limit exceeded. Please wait before uploading more files.',
  },

  '/api/contractor/upload-photos': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 10,
      admin: 50,
      premium: 25,
    },
    standardHeaders: true,
    handler: 'block',
  },

  // ============================================================================
  // PUBLIC & READ-ONLY ENDPOINTS (RELAXED)
  // ============================================================================

  '/api/contractors': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 30,
      authenticated: 200,
      admin: 1000,
      premium: 400,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  '/api/search/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 20,
      authenticated: 100,
      admin: 500,
      premium: 200,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  '/api/geocode': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 10,
      authenticated: 50,
      admin: 200,
      premium: 100,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  // ============================================================================
  // ADMIN OPERATIONS (RELAXED FOR ADMINS)
  // ============================================================================

  '/api/admin/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 0,
      authenticated: 0,
      admin: 500,
      premium: 0,
    },
    standardHeaders: true,
    handler: 'throttle',
  },

  // ============================================================================
  // WEBHOOKS (SPECIAL HANDLING)
  // ============================================================================

  '/api/webhooks/*': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 100, // Webhooks come from external services
      authenticated: 100,
      admin: 500,
      premium: 100,
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't count webhook validation failures
    standardHeaders: false, // Webhooks don't need rate limit headers
    handler: 'block',
  },

  // ============================================================================
  // HEALTH CHECKS & MONITORING (EXEMPT)
  // ============================================================================

  '/api/health': {
    windowMs: 60 * 1000,
    max: {
      anonymous: 1000,
      authenticated: 1000,
      admin: 10000,
      premium: 1000,
    },
    skipSuccessfulRequests: true,
    standardHeaders: false,
    handler: 'throttle',
  },

  '/api/metrics': {
    windowMs: 60 * 1000,
    max: {
      anonymous: 0,
      authenticated: 0,
      admin: 1000,
      premium: 0,
    },
    standardHeaders: false,
    handler: 'throttle',
  },

  // ============================================================================
  // DEFAULT FALLBACK (MODERATE)
  // ============================================================================

  'DEFAULT': {
    windowMs: 60 * 1000, // 1 minute
    max: {
      anonymous: 20,
      authenticated: 100,
      admin: 500,
      premium: 200,
    },
    standardHeaders: true,
    legacyHeaders: true,
    handler: 'throttle',
    message: 'Too many requests. Please try again later.',
  },
};

/**
 * Get rate limit configuration for a specific path
 */
export function getRateLimitConfig(path: string): RateLimitConfig {
  // Direct match
  if (RATE_LIMITS[path]) {
    return RATE_LIMITS[path];
  }

  // Wildcard match (e.g., /api/auth/mfa/* matches /api/auth/mfa/verify)
  for (const pattern in RATE_LIMITS) {
    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2);
      if (path.startsWith(basePattern)) {
        return RATE_LIMITS[pattern];
      }
    }
  }

  // Default fallback
  return RATE_LIMITS['DEFAULT'];
}

/**
 * Get user tier from request context
 */
export function getUserTier(user?: { role?: string; premium?: boolean }): RateLimitTier {
  if (!user) return 'anonymous';
  if (user.role === 'admin') return 'admin';
  if (user.premium) return 'premium';
  return 'authenticated';
}

/**
 * Rate limit bypass rules for special cases
 */
export const RATE_LIMIT_BYPASS = {
  // Bypass for health checks from monitoring services
  healthCheckUserAgents: [
    'UptimeRobot',
    'Pingdom',
    'DataDog',
    'NewRelic',
    'Site24x7',
  ],

  // Bypass for internal service-to-service communication
  internalServiceTokens: process.env.INTERNAL_SERVICE_TOKENS?.split(',') || [],

  // IP addresses to bypass (e.g., office IPs, CI/CD servers)
  whitelistedIPs: process.env.RATE_LIMIT_WHITELIST_IPS?.split(',') || [],
};

/**
 * Check if a request should bypass rate limiting
 */
export function shouldBypassRateLimit(request: {
  headers: { get: (key: string) => string | null };
  url: string;
}): boolean {
  // Check user agent for health check services
  const userAgent = request.headers.get('user-agent') || '';
  if (RATE_LIMIT_BYPASS.healthCheckUserAgents.some(agent => userAgent.includes(agent))) {
    return true;
  }

  // Check for internal service token
  const serviceToken = request.headers.get('x-service-token');
  if (serviceToken && RATE_LIMIT_BYPASS.internalServiceTokens.includes(serviceToken)) {
    return true;
  }

  // Check IP whitelist
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') || '';
  if (RATE_LIMIT_BYPASS.whitelistedIPs.includes(clientIP)) {
    return true;
  }

  return false;
}