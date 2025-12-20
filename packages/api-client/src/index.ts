/**
 * API Client Package - Main Export
 */

export * from './ErrorHandler';
export * from './ApiClient';
export * from './SupabaseClientWrapper';

// Re-export types
export type { ApiClientConfig, RequestOptions } from './ApiClient';
export type { SupabaseClientConfig } from './SupabaseClientWrapper';

