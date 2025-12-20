/**
 * Database Schema - Refactored & Modular
 *
 * NEW ARCHITECTURE: This file imports and composes domain-specific types
 * instead of containing all 3,778+ lines in a single monolithic file.
 *
 * @filesize Current: <100 lines (was 3,778 lines)
 * @compliance ✅ Architecture principles - File length under 500 lines
 */

import type { SupabaseConfig, Json } from './core/database.core'
import type { AreaLandmarks, AreaPerformance, ServiceAreas } from './location/location.types'
import type { Jobs, Bids, JobMilestones, JobProgress, JobsPhotos } from './jobs/job.types'

/**
 * Main Database Type
 * Composes all domain-specific table types into a single interface
 */
export type Database = SupabaseConfig & {
  public: {
    Tables: {
      // Location & Service Areas
      area_landmarks: AreaLandmarks
      area_performance: AreaPerformance
      service_areas: ServiceAreas

      // Jobs & Bidding
      jobs: Jobs
      bids: Bids
      job_milestones: JobMilestones
      job_progress: JobProgress
      jobs_photos: JobsPhotos

      // TODO: Add remaining domain types as they are created
      // Auth & Users (coming next)
      // users: Users
      // user_profiles: UserProfiles

      // Contractors (coming next)
      // contractor_skills: ContractorSkills
      // contractor_posts: ContractorPosts
      // contractor_follows: ContractorFollows

      // Payments (coming next)
      // escrow_transactions: EscrowTransactions
      // payment_methods: PaymentMethods

      // Messaging (coming next)
      // messages: Messages
      // notifications: Notifications
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Re-export core types for backward compatibility
export type { Json } from './core/database.core'

// Export all domain types for direct access
export * from './core/database.core'
export * from './location/location.types'
export * from './jobs/job.types'

/**
 * MIGRATION NOTES:
 *
 * 1. This refactored file reduces the original 3,778 lines to <100 lines
 * 2. Domain-specific types are now in focused files (<400 lines each)
 * 3. Each domain follows single responsibility principle
 * 4. Types are composable and reusable across services
 * 5. Maintains backward compatibility during migration
 *
 * NEXT STEPS:
 * 1. Create remaining domain type files (auth, contractors, payments, messaging)
 * 2. Update all imports throughout codebase to use new structure
 * 3. Replace original database.ts with this refactored version
 * 4. Add automated file size checking to prevent future violations
 */