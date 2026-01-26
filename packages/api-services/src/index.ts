/**
 * @mintenance/api-services
 * Centralized business logic and services for the Mintenance platform
 */
// ============= Jobs Module =============
// Core Jobs API
export { JobController, jobController } from './jobs/JobController';
export { JobService } from './jobs/JobService';
export { JobRepository } from './jobs/JobRepository';
export { JobValidator } from './jobs/JobValidator';
export type { JobRecord } from './jobs/JobRepository';
// Job Details API (for /api/jobs/[id])
export { JobDetailsController, jobDetailsController } from './jobs/JobDetailsController';
export { JobDetailsService } from './jobs/JobDetailsService';
export { JobDetailsValidator } from './jobs/JobDetailsValidator';
export { JobStatusService } from './jobs/JobStatusService';
// Export job validation schemas for reuse
export {
  listJobsSchema,
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  assignContractorSchema,
} from './jobs/JobValidator';
export {
  fullUpdateSchema,
  partialUpdateSchema,
  statusUpdateSchema,
} from './jobs/JobDetailsValidator';
// ============= Payments Module =============
export { PaymentController, paymentController } from './payments/PaymentController';
export { PaymentService } from './payments/PaymentService';
export { EscrowService } from './payments/EscrowService';
export { RefundService } from './payments/RefundService';
// ============= Webhooks Module =============
export { WebhookController, webhookController } from './webhooks/WebhookController';
export { WebhookService } from './webhooks/WebhookService';
export { StripeWebhookHandler } from './webhooks/handlers/StripeWebhookHandler';
export { PaymentIntentHandler } from './webhooks/handlers/stripe/PaymentIntentHandler';
export { SubscriptionHandler } from './webhooks/handlers/stripe/SubscriptionHandler';
// ============= Bids Module =============
export { BidController, bidController } from './bids/BidController';
export { BidService } from './bids/BidService';
export { BidValidator } from './bids/BidValidator';
export { BidRepository } from './bids/BidRepository';
export { BidScoringService } from './bids/BidScoringService';
export { BidNotificationService } from './bids/BidNotificationService';
// ============= Contracts Module =============
export { ContractController, contractController } from './contracts/ContractController';
export { ContractService } from './contracts/ContractService';
export { ContractLifecycleService } from './contracts/ContractLifecycleService';
// ============= Admin ML Monitoring Module =============
export { MLMonitoringController, mlMonitoringController } from './admin/MLMonitoringController';
export { MLMonitoringService } from './admin/MLMonitoringService';
export { ModelPerformanceService } from './admin/ModelPerformanceService';
export { DriftDetectionService } from './admin/DriftDetectionService';
export { FeedbackProcessingService } from './admin/FeedbackProcessingService';
// ============= AI Search Module =============
export { AISearchController, aiSearchController } from './ai/AISearchController';
export { AISearchService } from './ai/AISearchService';
export { EmbeddingService } from './ai/EmbeddingService';
export { SearchRankingService } from './ai/SearchRankingService';
// ============= Feature Flags Module =============
export { FeatureFlagController, featureFlagController, FeatureFlag } from './feature-flags/FeatureFlagController';
export { FeatureFlagService } from './feature-flags/FeatureFlagService';
export { FeatureFlagMetricsService } from './feature-flags/FeatureFlagMetricsService';
export { RollbackService } from './feature-flags/RollbackService';
// ============= Notifications Module =============
// ============= Notifications Module =============
export { NotificationController } from './notifications/NotificationController';
export { NotificationService } from './notifications/NotificationService';
export { EmailService } from './notifications/EmailService';
export { SMSService } from './notifications/SMSService';
export { PushNotificationService } from './notifications/PushNotificationService';
export { InAppNotificationService } from './notifications/InAppNotificationService';
export { NotificationQueueService } from './notifications/NotificationQueueService';
export { NotificationTemplateService } from './notifications/NotificationTemplateService';
export { NotificationType } from './notifications/types';

// ============= Messaging Module =============
export { MessageController, MessageType } from './messaging/MessageController';
export { MessageService } from './messaging/MessageService';
export { ThreadService } from './messaging/ThreadService';
export { RealtimeService } from './messaging/RealtimeService';
export { MessageNotificationService } from './messaging/MessageNotificationService';
export { MessageAttachmentService } from './messaging/MessageAttachmentService';
export { VideoCallService } from './messaging/VideoCallService';

// ============= Analytics & Reporting Module =============
export { AnalyticsController } from './analytics/AnalyticsController';
export { EventType, type AnalyticsEvent } from './analytics/types';
export { EventTrackingService } from './analytics/EventTrackingService';
export { MetricsAggregationService } from './analytics/MetricsAggregationService';
export { ReportingService, type ReportType, type ReportFormat, type ReportStatus } from './analytics/ReportingService';
export { DashboardService, type DashboardType } from './analytics/DashboardService';
export { ExportService, type ExportFormat } from './analytics/ExportService';
export { InsightsService, type InsightType, type InsightPriority } from './analytics/InsightsService';
// ============= Users Module =============
export { UserService } from './users/UserService';
export { UserRepository } from './users/UserRepository';
export { UserProfileController } from './users/UserProfileController';
export { UserSettingsController } from './users/UserSettingsController';
export { UserAvatarController } from './users/UserAvatarController';
// Export user types
export type {
  User,
  UserProfile,
  UserSettings,
  NotificationPreferences,
  PrivacySettings,
  DisplaySettings,
  UserStats,
  HomeownerStats,
  ContractorStats,
} from './users';
// Re-export types (when we add them)
// export type * from './types';