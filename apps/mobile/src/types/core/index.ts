/**
 * Core Types Index
 *
 * Re-exports all core database types for easy importing
 *
 * @filesize Target: <100 lines
 * @compliance Architecture principles - Clean exports
 */

// Core database types
export * from './database.core'

// Location domain types
export * from '../location/location.types'

// Jobs domain types
export * from '../jobs/job.types'

// Re-export legacy compatibility (temporary during migration)
export type { Database } from '../database'