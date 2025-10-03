/**
 * Error Type Definitions
 * Type definitions and interfaces for error tracking system
 */

import { ErrorCategory, ErrorSeverity } from '../errorTracking';

export interface ErrorMetrics {
  count: number;
  uniqueUsers: Set<string>;
  firstSeen: number;
  lastSeen: number;
  frequency: number; // errors per hour
  trend: 'increasing' | 'decreasing' | 'stable';
  impactScore: number; // 0-100
  resolution: 'pending' | 'investigating' | 'resolved' | 'wont_fix';
}

export interface ErrorPattern {
  id: string;
  signature: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  occurrences: ErrorOccurrence[];
  metrics: ErrorMetrics;
  insights: ErrorInsight[];
  recommendations: ErrorRecommendation[];
  tags: string[];
}

export interface ErrorOccurrence {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  context: ErrorContext;
  stackTrace: string;
  environment: {
    platform: string;
    version: string;
    device?: string;
    network?: string;
  };
  userAgent?: string;
  breadcrumbs: Breadcrumb[];
}

export interface ErrorContext {
  screen?: string;
  action?: string;
  feature?: string;
  userJourney?: string;
  jobId?: string;
  contractorId?: string;
  experimentVariant?: string;
  customData?: Record<string, any>;
}

export interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorInsight {
  type: 'correlation' | 'pattern' | 'trend' | 'impact';
  title: string;
  description: string;
  confidence: number; // 0-1
  data: Record<string, any>;
}

export interface ErrorRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'fix' | 'monitor' | 'investigate';
  title: string;
  description: string;
  actions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  potentialImpact: 'low' | 'medium' | 'high';
}

export interface ErrorTrend {
  period: '1h' | '6h' | '24h' | '7d' | '30d';
  data: Array<{
    timestamp: number;
    count: number;
    uniqueUsers: number;
    severity: Record<ErrorSeverity, number>;
    category: Record<ErrorCategory, number>;
  }>;
  summary: {
    totalErrors: number;
    uniqueUsers: number;
    errorRate: number; // errors per user session
    criticalErrors: number;
    newErrors: number; // first-time errors
    resolved: number;
  };
}

export interface UserErrorProfile {
  userId: string;
  totalErrors: number;
  uniqueErrors: number;
  errorPatterns: string[];
  mostCommonCategories: ErrorCategory[];
  averageSessionHealth: number; // 0-1, 1 being no errors
  lastErrorDate: number;
  errorFrequency: number; // errors per session
}

export { ErrorCategory, ErrorSeverity };
