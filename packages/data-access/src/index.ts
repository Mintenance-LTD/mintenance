/**
 * @mintenance/data-access
 *
 * Shared query definitions for consistent data access across web and mobile.
 *
 * PATTERN:
 *   - Writes & complex reads → API routes (both platforms call web API)
 *   - Simple reads           → shared query functions from this package
 *   - Realtime               → direct Supabase subscriptions (both platforms)
 *
 * Each query function accepts a Supabase client as first arg, so it works with
 * both service-role (web server) and anon+JWT (mobile) clients.
 */

export * from './queries/jobs';
export * from './queries/messages';
export * from './queries/notifications';
export * from './queries/contractors';
