/**
 * API Protection - Shared Types
 */

export interface ApiRequest {
  endpoint: string;
  method: string;
  userId?: string;
  userTier?: string;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
}

export interface ApiResponse {
  statusCode: number;
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
}

export interface SecurityConfig {
  enableRateLimiting: boolean;
  enableDDoSProtection: boolean;
  enableAbuseDetection: boolean;
  enableRequestValidation: boolean;
  enableResponseSanitization: boolean;
  maxRequestSize: number;
  allowedOrigins: string[];
  blockedUserAgents: string[];
  sensitiveEndpoints: string[];
}

export interface AbusePattern {
  name: string;
  description: string;
  threshold: number;
  windowMs: number;
  actions: ('log' | 'block' | 'alert')[];
}

export interface SecurityViolation {
  type: 'rate_limit' | 'ddos' | 'abuse' | 'validation' | 'blocked_agent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  request: ApiRequest;
  details: string;
  timestamp: number;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableRateLimiting: true,
  enableDDoSProtection: true,
  enableAbuseDetection: true,
  enableRequestValidation: true,
  enableResponseSanitization: true,
  maxRequestSize: 10 * 1024 * 1024,
  allowedOrigins: ['*'],
  blockedUserAgents: ['bot', 'crawler', 'spider', 'scraper'],
  sensitiveEndpoints: ['/api/auth', '/api/payment', '/api/admin'],
};

export const DEFAULT_ABUSE_PATTERNS: AbusePattern[] = [
  {
    name: 'rapid_fire_requests',
    description: 'Too many requests in short time',
    threshold: 50,
    windowMs: 60 * 1000,
    actions: ['log', 'block'],
  },
  {
    name: 'failed_auth_attempts',
    description: 'Multiple failed authentication attempts',
    threshold: 10,
    windowMs: 15 * 60 * 1000,
    actions: ['log', 'block', 'alert'],
  },
  {
    name: 'suspicious_endpoints',
    description: 'Accessing sensitive endpoints rapidly',
    threshold: 5,
    windowMs: 5 * 60 * 1000,
    actions: ['log', 'alert'],
  },
  {
    name: 'data_scraping',
    description: 'Systematic data access patterns',
    threshold: 100,
    windowMs: 60 * 60 * 1000,
    actions: ['log', 'block'],
  },
];
