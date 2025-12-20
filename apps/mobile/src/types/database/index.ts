/**
 * Database Types Index
 * 
 * This file re-exports all database types from their respective modules
 * to maintain backward compatibility while organizing the codebase.
 */

// Re-export core types
export type {
  Database,
  Tables,
  Views,
  Functions,
  Enums,
  CompositeTypes,
  Json
} from './core'

// Re-export all table types
export type {
  AuthTables
} from './auth'

export type {
  JobTables
} from './jobs'

export type {
  ContractorTables
} from './contractors'

export type {
  PaymentTables
} from './payments'

export type {
  LocationTables
} from './locations'

export type {
  SocialTables
} from './social'

export type {
  AnalyticsTables
} from './analytics'

export type {
  SystemTables
} from './system'

// Re-export individual table types for convenience
export type {
  UsersTable,
  ProfilesTable,
  JobsTable,
  JobsPhotosTable,
  JobMilestonesTable,
  JobProgressTable,
  BidsTable,
  ContractorSkillsTable,
  ContractorMatchesTable,
  ContractorPayoutAccountsTable,
  ContractorExpertiseEndorsementsTable,
  EscrowTransactionsTable,
  HomeownerExpensesTable,
  HomeInvestmentsTable,
  MonthlyBudgetsTable,
  ServiceAreasTable,
  ServiceAreaCoverageTable,
  AreaLandmarksTable,
  ServiceRoutesTable,
  ContractorPostsTable,
  ContractorPostLikesTable,
  ContractorPostCommentsTable,
  ContractorFollowsTable,
  ReviewsTable,
  HomeownerTestimonialsTable,
  CommunityRecommendationsTable,
  SuccessStoriesTable,
  AreaPerformanceTable,
  ServiceCategoriesTable,
  ServiceSubcategoriesTable
} from './core'
