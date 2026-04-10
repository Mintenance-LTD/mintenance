# Dead Code Audit — Mintenance Monorepo

**Date:** 2026-04-10 **Tool:** knip v5.88.1 (TypeScript equivalent of Python ruff/vulture)
**Scope:** apps/web (Next.js), apps/mobile (React Native), 8/10 shared packages (packages/ai-core
and packages/design-tokens timed out during scan — both small, manual spot-check recommended)

> **Caveat:** knip reports files unreachable from entry points (page/route/layout/middleware). Some
> flagged files may be referenced only by dynamic imports or runtime strings — always verify before
> deleting. However, spot checks confirmed knip is accurate: flagged files are either unimported or
> part of dead chains.

## Executive Summary

| Area               | Unused Files | Unused Exports | Unused Types | Unused Deps | Duplicate Exports |
| ------------------ | ------------ | -------------- | ------------ | ----------- | ----------------- |
| apps/web           | 532          | 686            | 463          | 14 (+7 dev) | 53                |
| apps/mobile        | 76           | 675            | 386          | 7 (+3 dev)  | 158               |
| packages/security  | 0            | 0              | 1            | 0 (+2 dev)  | 1                 |
| packages/shared-ui | 4            | 24             | 26           | 0 (+2 dev)  | 10                |
| packages/shared    | 4            | 2              | 3            | 1 (+0 dev)  | 0                 |
| **TOTAL**          | **616**      | —              | —            | —           | —                 |

## Deletion Priority Matrix

### Tier A — Safe to delete (high confidence)

1. **Root-level orphans** (fix-\*.cjs test migration scripts, middleware-cache.ts,
   middleware-security.ts, version-checker.tsx)
2. **Commented-out imports** (`PerformanceDashboard` disabled in layout.tsx — "Temporarily disabled
   for testing")
3. **Duplicate components** where both paths exist but only one is imported (e.g.,
   components/dashboard/JobCard.tsx vs components/cards/JobCard.tsx)
4. **Old middleware modules** (security-headers.ts replaced by inline CSP; csrf-protection.ts
   replaced by csrf.ts)

### Tier B — Verify then delete (medium confidence)

1. Files in dead chains (entire feature trees where the entry component is unused)
2. Hooks superseded by newer React Query hooks (useFeatureFlag, useLoadingState,
   useOnboardingTooltips)
3. Design system duplicates (Card.unified.tsx vs Card.tsx, Badge.unified.tsx vs Badge.tsx,
   UnifiedButton vs Button)

### Tier C — Keep or archive (low confidence)

1. **Dev scripts** under apps/web/scripts — one-off utilities, useful as reference. Move to `tools/`
   or keep.
2. **Test mocks/fixtures** — may be loaded implicitly by test runners.
3. **Mobile feature stubs** — some services may be for planned features (e.g., FeedPostsService).

## Unused Production Dependencies

### apps/web (14 prod + 7 dev)

**Production (remove from apps/web/package.json):**

- `@chatscope/chat-ui-kit-react`
- `@google-cloud/aiplatform`
- `@googlemaps/markerclusterer`
- `@mintenance/api-contracts`
- `@radix-ui/react-slot`
- `canvas-confetti`
- `cmdk`
- `embla-carousel-react`
- `google-auth-library`
- `html2canvas`
- `jose`
- `onnxruntime-web`
- `react-confetti`
- `react-pdf`

**Dev:**

- `@googlemaps/js-api-loader`
- `@next/bundle-analyzer`
- `@tailwindcss/container-queries`
- `@types/canvas-confetti`
- `@types/google.maps`
- `form-data`
- `msw`

### apps/mobile (7 prod + 3 dev)

**Production:**

- `@mintenance/api-contracts`
- `@react-native/babel-plugin-codegen`
- `@react-navigation/drawer`
- `date-fns`
- `expo-crypto`
- `expo-network`
- `react-native-swiper-flatlist`

**Dev:**

- `expo-mcp`
- `jest-circus`
- `react-native-worklets-core`

### ⚠️ Mobile unlisted dependencies (used but not declared)

- `@testing-library/react`
- `@jest/globals`
- `@testing-library/react-hooks`
- `react-native-vector-icons`
- `expo-media-library`

## Duplicate Exports (default + named of same value)

**53 in apps/web, 158 in apps/mobile**

Common React pattern where a component is exported as both `default` and as a named export.
**Recommendation:** standardize on named exports only (better for tree-shaking, avoids import
inconsistency).

Sample (first 15 in web):

- `lib/config/feature-flags.ts`: featureFlags, default
- `lib/theme.ts`: theme, default
- `components/ui/ErrorBoundary.tsx`: ErrorBoundary, default
- `components/ui/Button.tsx`: Button, default
- `lib/logger.ts`: logger, default
- `components/ui/MotionDiv.tsx`: MotionDiv, default
- `components/ui/Card.tsx`: Card, default
- `components/ui/ErrorView.tsx`: ErrorView, default
- `components/ui/ChartSkeleton.tsx`: ChartSkeleton, default
- `lib/middleware/public-rate-limiter-redis.ts`: publicRateLimiter, searchRateLimiter,
  resourceRateLimiter
- `components/ui/Input.tsx`: Input, default
- `app/contractor/discover/components/ContractorDiscoverClient.tsx`: ContractorDiscoverClient,
  default
- `components/ui/Card.unified.tsx`: Card, default
- `components/ui/PricingBreakdown.tsx`: PricingBreakdown, default
- `lib/openai-client.ts`: openai, default

## Web App — Unused Files by Category

### App components (non-page) (229)

- `app/version-checker.tsx`
- `app/actions/auth.ts`
- `app/register/enhanced-register.tsx`
- `app/resources/resources-data.ts`
- `app/resources/ResourcesClient.tsx`
- `app/subscription-plans/SubscriptionPlansClient.tsx`
- `app/about/components/AboutCTA.tsx`
- `app/about/components/AboutFooter.tsx`
- `app/about/components/AboutHero.tsx`
- `app/about/components/AboutNavigation.tsx`
- `app/about/components/AboutStatsSection.tsx`
- `app/about/components/AboutStory.tsx`
- `app/about/components/AboutValues.tsx`
- `app/about/components/CompanyInfo.tsx`
- `app/about/components/GradientBar.tsx`
- `app/about/components/MissionVision.tsx`
- `app/about/components/TechnologySection.tsx`
- `app/analytics/components/AnalyticsClient.tsx`
- `app/analytics/components/JobsChart.tsx`
- `app/analytics/components/PerformanceMetrics.tsx`
- `app/analytics/components/RevenueChart.tsx`
- `app/components/landing/AirbnbLandingPage.tsx`
- `app/components/landing/CTAClient.tsx`
- `app/components/landing/CTASection.tsx`
- `app/components/landing/CTASection2025.tsx`
- `app/components/landing/FeaturesSection.tsx`
- `app/components/landing/FeaturesSection2025.tsx`
- `app/components/landing/FooterSection.tsx`
- `app/components/landing/HeroSectionFixed.tsx`
- `app/components/landing/HeroSectionTest.tsx`
- `app/components/landing/HowItWorksSection.tsx`
- `app/components/landing/HowItWorksSection2025.tsx`
- `app/components/landing/PricingSection2025.tsx`
- `app/components/landing/ProductionLandingPage.tsx`
- `app/components/landing/ServicesSection.tsx`
- `app/components/landing/SocialProofSection2025.tsx`
- `app/components/landing/StaticHeroRight.tsx`
- `app/components/landing/StatsSection.tsx`
- `app/components/ui/DemoModal.tsx`
- `app/contractor/components/ContractorLayout.tsx`
- `app/contractor/components/ModernContractorLayout.tsx`
- `app/contractors/components/ContractorCard.tsx`
- `app/contractors/components/ContractorComparison.tsx`
- `app/contractors/components/ContractorFilters.tsx`
- `app/contractors/components/ContractorListView.tsx`
- `app/contractors/components/ContractorMapView.tsx`
- `app/contractors/components/ContractorsBrowseAirbnb.tsx`
- `app/contractors/components/ContractorsBrowseClient.tsx`
- `app/contractors/components/ContractorSwipeView.tsx`
- `app/contractors/components/index.tsx`
- `app/contractors/components/NeighborhoodRecommendations.tsx`
- `app/dashboard/components/ActiveJobsWidget2025.tsx`
- `app/dashboard/components/ActivityFeed.tsx`
- `app/dashboard/components/AirbnbActivityTimeline.tsx`
- `app/dashboard/components/AirbnbJobsCarousel.tsx`
- `app/dashboard/components/AirbnbQuickActions.tsx`
- `app/dashboard/components/AirbnbStatsGrid.tsx`
- `app/dashboard/components/AirbnbWelcomeCard.tsx`
- `app/dashboard/components/ArticleCard.tsx`
- `app/dashboard/components/BarChartsSection.tsx`
- `app/dashboard/components/bento-grid.css`
- `app/dashboard/components/BentoGrid.tsx`
- `app/dashboard/components/ContentShowcase.tsx`
- `app/dashboard/components/DashboardSidebar.tsx`
- `app/dashboard/components/FeaturedArticle.tsx`
- `app/dashboard/components/HomeownerDashboardAirbnb.tsx`
- `app/dashboard/components/HomeownerDashboardProfessional.tsx`
- `app/dashboard/components/HomeownerDashboardWithSearch.tsx`
- `app/dashboard/components/InvoicesChart.tsx`
- `app/dashboard/components/KpiCards.tsx`
- `app/dashboard/components/MetricsDropdown.tsx`
- `app/dashboard/components/NewsletterSignup.tsx`
- `app/dashboard/components/PrimaryMetricCard2025.tsx`
- `app/dashboard/components/RecentActivity.tsx`
- `app/dashboard/components/RevenueChart2025.tsx`
- `app/dashboard/components/SpendingSummary.tsx`
- `app/dashboard/components/UpcomingList.tsx`
- `app/dashboard/components/WelcomeHero2025.tsx`
- `app/help/components/ArticleDetailModal.tsx`
- `app/help/components/PopularArticlesSection.tsx`
- `app/jobs/components/JobsFilters.tsx`
- `app/jobs/components/JobsTable.tsx`
- `app/jobs/components/MobileFilterDrawer.tsx`
- `app/messages/components/ChatInterface2025.tsx`
- `app/messages/components/ConversationList2025.tsx`
- `app/notifications/components/NotificationsClient.tsx`
- `app/payment-methods/components/AddPaymentMethodForm.tsx`
- `app/payment-methods/components/PaymentMethodCardDisplay.tsx`
- `app/payment-methods/components/PaymentMethodsHeroHeader.tsx`
- `app/profile/components/DangerZone.tsx`
- `app/profile/components/LocationInput.tsx`
- `app/profile/components/ProfileFormField.tsx`
- `app/profile/components/ProfileHeroHeader.tsx`
- `app/profile/components/ProfileInfoTab.tsx`
- `app/profile/components/ProfileNotificationsTab.tsx`
- `app/profile/components/ProfilePictureSection.tsx`
- `app/profile/components/ProfilePreferencesTab.tsx`
- `app/profile/components/ProfileSecurityTab.tsx`
- `app/profile/lib/hooks.ts`
- `app/profile/lib/types.ts`
- `app/profile/lib/utils.ts`
- `app/properties/components/AddPropertyButton.tsx`
- `app/properties/components/AddPropertyDialog.tsx`
- `app/properties/components/AddPropertyModal.tsx`
- `app/properties/components/PropertiesEmptyState.tsx`
- `app/properties/components/PropertyCard.tsx`
- `app/resources/components/index.ts`
- `app/scheduling/components/PageContent.tsx`
- `app/scheduling/components/SchedulingKpiCards.tsx`
- `app/settings/components/GDPRSettings.tsx`
- `app/subscription-plans/components/FeatureComparisonTable.tsx`
- `app/subscription-plans/components/PlanCards.tsx`
- `app/subscription-plans/components/PlansCTA.tsx`
- `app/subscription-plans/components/PlansFAQ.tsx`
- `app/subscription-plans/components/PlansHero.tsx`
- `app/subscription-plans/components/PlatformFeeSavings.tsx`
- `app/subscription-plans/components/ROICalculator.tsx`
- `app/subscription-plans/components/SuccessStories.tsx`
- `app/video-calls/components/VideoCallHistory.tsx`
- `app/video-calls/components/VideoCallInterface.tsx`
- `app/admin/revenue/components/RevenueBreakdownChart.tsx`
- `app/admin/revenue/components/RevenueDashboardClient.tsx`
- `app/admin/revenue/components/RevenueKPICards.tsx`
- `app/admin/revenue/components/RevenueMRRChart.tsx`
- `app/admin/revenue/components/RevenueTrendsChart.tsx`
- `app/admin/revenue/components/RevenueTypes.ts`
- `app/admin/users/components/ContractorVerificationSection.tsx`
- `app/admin/users/components/UserDetailModal.tsx`
- `app/components/landing/ProductionLandingPage/CategoriesSection.tsx`
- `app/components/landing/ProductionLandingPage/constants.tsx`
- `app/components/landing/ProductionLandingPage/CtaSection.tsx`
- `app/components/landing/ProductionLandingPage/FeaturedContractorsSection.tsx`
- `app/components/landing/ProductionLandingPage/FooterSection.tsx`
- `app/components/landing/ProductionLandingPage/HeroSection.tsx`
- `app/components/landing/ProductionLandingPage/HowItWorksSection.tsx`
- `app/components/landing/ProductionLandingPage/StatsSection.tsx`
- `app/components/landing/ProductionLandingPage/types.ts`
- `app/contractor/crm/components/CRMDashboardClient.tsx`
- `app/contractor/dashboard-enhanced/components/ActivityFeed.tsx`
- `app/contractor/dashboard-enhanced/components/BarChartsSection.tsx`
- `app/contractor/dashboard-enhanced/components/BentoGrid.tsx`
- `app/contractor/dashboard-enhanced/components/ContentShowcase.tsx`
- `app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client.tsx`
- `app/contractor/dashboard-enhanced/components/ContractorDashboardAirbnb.tsx`
- `app/contractor/dashboard-enhanced/components/ContractorWelcomeHero2025.tsx`
- `app/contractor/dashboard-enhanced/components/DashboardSearchHeader.tsx`
- `app/contractor/dashboard-enhanced/components/LargeChart.tsx`
- `app/contractor/dashboard-enhanced/components/NewsletterSignup.tsx`
- `app/contractor/dashboard-enhanced/components/PaymentSetupBanner.tsx`
- `app/contractor/dashboard-enhanced/components/ProgressTrendChart.tsx`
- `app/contractor/dashboard-enhanced/components/ResponsiveGrid.module.css`
- `app/contractor/dashboard-enhanced/components/ResponsiveGrid.tsx`
- `app/contractor/dashboard-enhanced/components/WelcomeHeader.tsx`
- `app/contractor/discover/components/ContractorDiscoverLazy.tsx`
- `app/contractor/finance/components/FinanceDashboardClient.tsx`
- `app/contractor/finance/components/FinanceDashboardEnhanced.tsx`
- `app/contractor/finance/components/FinancePageClient.tsx`
- `app/contractor/messages/components/ActiveContractCard.tsx`
- `app/contractor/messages/components/CreateContractModal.tsx`
- `app/contractor/profile/components/ContractorProfileLazy.tsx`
- `app/contractor/profile/components/DangerZoneSection.tsx`
- `app/contractor/profile/components/EditProfileModal.tsx`
- `app/contractor/profile/components/EditProfileTabs.tsx`
- `app/contractor/profile/components/PhotoUploadModal.tsx`
- `app/contractor/profile/components/ProfilePhotoUpload.tsx`
- `app/contractor/profile/components/SkillsSelector.tsx`
- `app/contractor/quotes/components/QuoteBuilderClient.tsx`
- `app/contractor/reporting/components/ReportingDashboard.tsx`
- `app/contractor/subscription/components/SubscriptionExpiredReminder.tsx`
- `app/contractor/subscription/hooks/useSubscriptionExpiredReminder.ts`
- `app/contractors/components/ContractorMapView/ContractorDetailsModal.tsx`
- `app/contractors/components/ContractorMapView/MapContractorCard.tsx`
- `app/contractors/components/ContractorMapView/MapInfoCard.tsx`
- `app/contractors/components/ContractorMapView/types.ts`
- `app/contractors/components/ContractorMapView/utils.ts`
- `app/contractors/components/ContractorsBrowse/BrowseEmptyState.tsx`
- `app/contractors/components/ContractorsBrowse/BrowseHero.tsx`
- `app/contractors/components/ContractorsBrowse/BrowseToolbar.tsx`
- `app/jobs/create/components/CostCalculator.tsx`
- `app/jobs/create/components/FeeBreakdown.tsx`
- `app/jobs/create/components/QuickJobTemplates.tsx`
- `app/jobs/[id]/components/BidComparisonClient.tsx`
- `app/jobs/[id]/components/BidComparisonTable2025.tsx`
- `app/jobs/[id]/components/BidListClient.tsx`
- `app/jobs/[id]/components/BidSwipeCard.tsx`
- `app/jobs/[id]/components/BidSwipeView.tsx`
- `app/jobs/[id]/components/ContractorViewersList.tsx`
- `app/jobs/[id]/components/DeleteJobButton.tsx`
- `app/jobs/[id]/components/IntelligentMatching.tsx`
- `app/jobs/[id]/components/JobDetailsAirbnb.tsx`
- `app/jobs/[id]/components/JobDetailsHero2025.tsx`
- `app/jobs/[id]/components/JobLocationMap.tsx`
- `app/jobs/[id]/components/LocationTracking.tsx`
- `app/jobs/[id]/components/MessageContractorButton.tsx`
- `app/jobs/[id]/components/page-professional-example.tsx`
- `app/jobs/[id]/components/PhotoGallery.tsx`
- `app/jobs/[id]/edit/page-refactored.tsx`
- `app/messages/[jobId]/components/QuoteViewModal.tsx`
- `app/properties/components/AddPropertyModal/AddressField.tsx`
- `app/properties/components/AddPropertyModal/PhotoUploader.tsx`
- `app/properties/components/AddPropertyModal/types.ts`
- `app/properties/components/AddPropertyModal/useAddPropertyForm.ts`
- `app/api/webhooks/stripe/handlers/account.handler.ts`
- `app/api/webhooks/stripe/handlers/charge.handler.ts`
- `app/api/webhooks/stripe/handlers/checkout.handler.ts`
- `app/api/webhooks/stripe/handlers/index.ts`
- `app/api/webhooks/stripe/handlers/invoice.handler.ts`
- `app/api/webhooks/stripe/handlers/subscription.handler.ts`
- `app/contractor/bid/[jobId]/components/BidSubmissionLazy.tsx`
- `app/contractor/bid/[jobId]/components/JobViewTracker.tsx`
- `app/contractor/jobs/[id]/components/JobProgressBar.tsx`
- `app/contractor/profile/components/EditProfileModal/BasicInfoTab.tsx`
- `app/contractor/profile/components/EditProfileModal/BusinessInfoTab.tsx`
- `app/contractor/profile/components/EditProfileModal/LocationContactTab.tsx`
- `app/contractor/profile/components/EditProfileModal/ModalFooter.tsx`
- `app/contractor/profile/components/EditProfileModal/types.ts`
- `app/contractor/subscription/payment-methods/components/GDPRForm.tsx`
- `app/jobs/[id]/components/JobDetailsAirbnb/ImageModal.tsx`
- `app/jobs/[id]/components/JobDetailsAirbnb/MainContent.tsx`
- `app/jobs/[id]/components/JobDetailsAirbnb/PageHeader.tsx`
- `app/jobs/[id]/components/JobDetailsAirbnb/PhotoGallerySection.tsx`
- `app/jobs/[id]/components/JobDetailsAirbnb/Sidebar.tsx`
- `app/jobs/[id]/components/JobDetailsAirbnb/types.ts`
- `app/jobs/[id]/edit/components/ImageUploadManager.tsx`
- `app/jobs/[id]/edit/components/JobBasicFields.tsx`
- `app/jobs/[id]/edit/components/JobMetadata.tsx`
- `app/jobs/[id]/edit/services/aiAnalysisService.ts`
- `app/jobs/[id]/payment/components/PaymentSuccess2025.tsx`
- `app/jobs/[id]/payment/components/StripePaymentElement2025.tsx`

### Components (shared UI) (110)

- `components/DashboardLoading.tsx`
- `components/LogoLink.tsx`
- `components/LogoutButton.tsx`
- `components/MobileLandingPage.tsx`
- `components/PerformanceDashboard.tsx`
- `components/PWAInitializer.tsx`
- `components/SkipNavigation.tsx`
- `components/accessibility/AccessibleForm.tsx`
- `components/accessibility/AriaLiveRegion.tsx`
- `components/accessibility/FocusTrap.tsx`
- `components/accessibility/SkipLinks.tsx`
- `components/admin/AdminEmptyState.tsx`
- `components/admin/AdminErrorState.tsx`
- `components/admin/AdminLoadingState.tsx`
- `components/admin/AdminPageHeader.tsx`
- `components/admin/AdminPageTitle.tsx`
- `components/admin/ConformalPredictionMonitor.tsx`
- `components/admin/SecurityDashboard.tsx`
- `components/analytics/AnalyticsOverview.tsx`
- `components/analytics/index.ts`
- `components/analytics/PerformanceInsights.tsx`
- `components/analytics/PerformanceTrends.tsx`
- `components/building-surveyor/ModelMonitoringDashboard.tsx`
- `components/Calendar/index.ts`
- `components/cards/ContractorCard.tsx`
- `components/contractor/DBSCheckModal.tsx`
- `components/contractor/MetricCard.tsx`
- `components/contractor/PersonalityTestModal.tsx`
- `components/contractor/ProfileBoostMeter.tsx`
- `components/contractor/ProfileBoostWidget.tsx`
- `components/contractor/StandardCard.tsx`
- `components/contractor/VerificationBadges.tsx`
- `components/dashboard/ActivityTimeline.tsx`
- `components/dashboard/DashboardSkeleton.tsx`
- `components/dashboard/EmptyStateCard.tsx`
- `components/dashboard/index.ts`
- `components/dashboard/JobCard.tsx`
- `components/dashboard/KpiCard.tsx`
- `components/dashboard/PerformanceInsightCard.tsx`
- `components/dashboard/QuickActionsCard.tsx`
- `components/dashboard/StatsCard.tsx`
- `components/design-system/DesignSystemShowcase.tsx`
- `components/escrow/PhotoUploadWizard.tsx`
- `components/examples/BidPageIntegrationExample.tsx`
- `components/examples/ChartExamples.tsx`
- `components/examples/ContractorFormExample.tsx`
- `components/examples/DialogExamples.tsx`
- `components/examples/FeatureAccessExamples.tsx`
- `components/jobs/BudgetDisplay.tsx`
- `components/jobs/CategoryIcon.tsx`
- `components/jobs/index.ts`
- `components/jobs/JobActions.tsx`
- `components/jobs/JobDetailsDialog.tsx`
- `components/jobs/JobStatusBadge.tsx`
- `components/jobs/JobTimeline.tsx`
- `components/landing/AIAssessmentShowcase.tsx`
- `components/landing/CustomerTestimonials.tsx`
- `components/landing/index.ts`
- `components/landing/LiveActivityFeed.tsx`
- `components/landing/QuickQuoteWidget.tsx`
- `components/landing/sticky-cta.tsx`
- `components/landing/testimonials-section.tsx`
- `components/landing/UrgencyBanner.tsx`
- `components/layouts/AdminNavItem.tsx`
- `components/layouts/DarkNavySidebar.tsx`
- `components/layouts/Header.tsx`
- `components/layouts/PageHeader.tsx`
- `components/layouts/ThreePanelLayout.tsx`
- `components/layouts/UnifiedSidebar.module.css`
- `components/modals/PaymentMethodModal.tsx`
- `components/navigation/TopNavigationBar.tsx`
- `components/notifications/index.ts`
- `components/onboarding/FeatureAnnouncement.tsx`
- `components/onboarding/FeatureTooltip.tsx`
- `components/onboarding/FirstUseEmptyState.tsx`
- `components/onboarding/index.ts`
- `components/onboarding/ProfileCompletionCard.tsx`
- `components/onboarding/TooltipManager.tsx`
- `components/onboarding/TutorialTooltip.tsx`
- `components/optimized/LazyLoadWrapper.tsx`
- `components/optimized/OptimizedImage.tsx`
- `components/payments/FeeCalculator.tsx`
- `components/payments/PaymentCard.tsx`
- `components/project-timeline/index.ts`
- `components/settings/GDPRSettings.tsx`
- `components/settings/PrivacyPolicyContent.tsx`
- `components/settings/TermsOfServiceContent.tsx`
- `components/skeletons/ProfileSkeleton.tsx`
- `components/ui/AccessibleButton.tsx`
- `components/ui/AdvancedFilters.tsx`
- `components/ui/badge.tsx`
- `components/ui/BentoGridModern.tsx`
- `components/ui/DateRangePicker.tsx`
- `components/ui/DesignSystemExamples.tsx`
- `components/ui/EnhancedChart.tsx`
- `components/ui/ExportMenu.tsx`
- `components/ui/ModernGrid.tsx`
- `components/ui/OptimizedImage.tsx`
- `components/ui/PricingTable.example.tsx`
- `components/ui/progress.tsx`
- `components/verification/VerificationBadge.tsx`
- `components/video-call/index.ts`
- `components/video-call/VideoCallHistory.tsx`
- `components/video-call/VideoCallInterface.tsx`
- `components/video-call/VideoCallScheduler.tsx`
- `components/admin/security/index.ts`
- `components/admin/security/RecentSecurityEvents.tsx`
- `components/admin/security/SecurityCharts.tsx`
- `components/admin/security/SecurityMetricsCards.tsx`
- `components/admin/security/TopOffendingIPs.tsx`

### Scripts (dev utilities) (82)

- `scripts/add-csrf-protection.ts`
- `scripts/add-test-jobs.ts`
- `scripts/adjust-rollout.ts`
- `scripts/analyze-yolo-training-data.ts`
- `scripts/apply-ab-test-schema.ts`
- `scripts/apply-certifications-migration.ts`
- `scripts/apply-combined-migration.ts`
- `scripts/apply-materials-migration.ts`
- `scripts/apply-migration-direct.ts`
- `scripts/apply-migration-via-mcp-config.ts`
- `scripts/apply-migration.ts`
- `scripts/apply-migrations-batch.ts`
- `scripts/apply-migrations-to-supabase.ts`
- `scripts/apply-migrations.ts`
- `scripts/apply-pending-migrations.ts`
- `scripts/apply-platform-migrations.ts`
- `scripts/apply-stripe-connect-migration.ts`
- `scripts/backfill-geocoding-simple.ts`
- `scripts/backfill-job-geocoding.ts`
- `scripts/benchmark-presence-detection.ts`
- `scripts/bootstrap-maintenance-training.ts`
- `scripts/check-building-surveyor-data.ts`
- `scripts/check-jobs-db.ts`
- `scripts/check-maintenance-tables.ts`
- `scripts/check-pending-migrations.ts`
- `scripts/check-real-jobs.ts`
- `scripts/check-storage-buckets.ts`
- `scripts/check-training-data.ts`
- `scripts/check-yolo-models.ts`
- `scripts/cleanup-test-data.ts`
- `scripts/convert-building-surveyor-to-maintenance.ts`
- `scripts/convert-tensorflow-to-ground-truth.ts`
- `scripts/create-exec-sql-via-direct-connection.ts`
- `scripts/create-mock-model.ts`
- `scripts/deploy-yolo-model.ts`
- `scripts/explore-supabase-database.ts`
- `scripts/export-shadow-mode-data.ts`
- `scripts/find-images-from-cache.ts`
- `scripts/fix-any-types.ts`
- `scripts/fix-job-geocoding.ts`
- `scripts/fix-job-homeowner-relationships.ts`
- `scripts/fix-typescript-errors.ts`
- `scripts/generate-yolo-training-data.ts`
- `scripts/geocode-all-jobs.ts`
- `scripts/inspect-assessment-data.ts`
- `scripts/migrate-to-2025.mjs`
- `scripts/migrate-to-2025.ts`
- `scripts/monitor-ab-test-metrics-simple.ts`
- `scripts/monitor-ab-test-metrics.ts`
- `scripts/monitor-migration-performance.ts`
- `scripts/performance-monitoring.ts`
- `scripts/populate-ab-test-calibration-data.ts`
- `scripts/populate-ab-test-historical-validations.ts`
- `scripts/populate-calibration-data-from-ground-truth.ts`
- `scripts/prepare-test-data.ts`
- `scripts/prepare-training-dataset.ts`
- `scripts/process-1000-training-images.ts`
- `scripts/process-all-1000-images.ts`
- `scripts/query-real-rollout.ts`
- `scripts/replace-console-statements.ts`
- `scripts/rollout-status.ts`
- `scripts/run-shadow-mode-batch.ts`
- `scripts/run-training-pipeline.ts`
- `scripts/run-yolo-training-pipeline.ts`
- `scripts/security-audit.ts`
- `scripts/seed-damp-materials.ts`
- `scripts/seed-maintenance-jobs-with-images.ts`
- `scripts/seed-more-real-jobs.ts`
- `scripts/seed-real-jobs.ts`
- `scripts/set-rollout-10.ts`
- `scripts/show-materials-sample.ts`
- `scripts/store-maintenance-training-data.ts`
- `scripts/stripe-webhook-whitelist.ts`
- `scripts/update-yolo-database-record.ts`
- `scripts/upload-training-images-to-supabase.ts`
- `scripts/upload-yolo-large-file.ts`
- `scripts/upload-yolo-to-database.ts`
- `scripts/verify-ai-system.ts`
- `scripts/verify-edge-function-env.ts`
- `scripts/verify-material-detection.ts`
- `scripts/verify-migration-status.ts`
- `scripts/warm-up-critic.ts`

### lib/services (46)

- `lib/services/AISearchService.ts`
- `lib/services/ContractorService.ts`
- `lib/services/MaintenanceDetectionClient.ts`
- `lib/services/MaintenanceDetectionService.ts`
- `lib/services/NotificationService.ts`
- `lib/services/PaymentService.ts`
- `lib/services/ProjectTimelineService.ts`
- `lib/services/VideoCallService.ts`
- `lib/services/building-surveyor/ActiveLearningService.ts`
- `lib/services/building-surveyor/conformal-types.ts`
- `lib/services/building-surveyor/SAM2VideoService.ts`
- `lib/services/cache/DatabaseQueryCache.ts`
- `lib/services/contractor-analytics/index.ts`
- `lib/services/gcp/GCPAuthService.ts`
- `lib/services/gcp/index.ts`
- `lib/services/notifications/HomeownerNotifications.ts`
- `lib/services/notifications/TrialNotifications.ts`
- `lib/services/payment/EscrowService.ts`
- `lib/services/payment/PaymentConfirmation.ts`
- `lib/services/payment/PaymentInitialization.ts`
- `lib/services/payment/PayoutService.ts`
- `lib/services/payment/types.ts`
- `lib/services/project-timeline/analytics-service.ts`
- `lib/services/project-timeline/index.ts`
- `lib/services/project-timeline/mappers.ts`
- `lib/services/project-timeline/milestone-service.ts`
- `lib/services/project-timeline/template-service.ts`
- `lib/services/project-timeline/timeline-service.ts`
- `lib/services/project-timeline/types.ts`
- `lib/services/verification/InsuranceVerificationService.ts`
- `lib/services/verification/LicenseVerificationService.ts`
- `lib/services/video-call/config.ts`
- `lib/services/video-call/formatters.ts`
- `lib/services/video-call/invitations.ts`
- `lib/services/video-call/mocks.ts`
- `lib/services/video-call/quality.ts`
- `lib/services/video-call/types.ts`
- `lib/services/ai/analyzers/index.ts`
- `lib/services/building-surveyor/distillation/index.ts`
- `lib/services/building-surveyor/fusion/index.ts`
- `lib/services/building-surveyor/stages/index.ts`
- `lib/services/ml-engine/analytics/MemoryAnalytics.ts`
- `lib/services/ml-engine/memory/ContextFlowCollector.ts`
- `lib/services/ml-engine/memory/OnlineLearningService.ts`
- `lib/services/ml-engine/memory/examples/backpropagation-demo.ts`
- `lib/services/ml-engine/memory/examples/performance-comparison.ts`

### lib (other) (42)

- `lib/accessibility.ts`
- `lib/advanced-cache-config.ts`
- `lib/csrf-protection.ts`
- `lib/csrf-validator.ts`
- `lib/design-system.ts`
- `lib/dynamic-imports.tsx`
- `lib/error-handler.ts`
- `lib/formatters.ts`
- `lib/logger-enhanced.ts`
- `lib/onboarding.ts`
- `lib/pwa.ts`
- `lib/route-selector.ts`
- `lib/serverSanitizer.ts`
- `lib/theme-2025.ts`
- `lib/a11y/aria.ts`
- `lib/a11y/colors.ts`
- `lib/a11y/focus-styles.ts`
- `lib/a11y/index.ts`
- `lib/animations/index.ts`
- `lib/animations/motion-config.ts`
- `lib/api/response.ts`
- `lib/api/with-rate-limit.ts`
- `lib/cache/api-cache.ts`
- `lib/config/gcp.config.ts`
- `lib/design-system/contractor-theme.ts`
- `lib/design-tokens/index.ts`
- `lib/feature-access/index.ts`
- `lib/hooks/useDebounce.ts`
- `lib/i18n/index.ts`
- `lib/i18n/useTranslation.ts`
- `lib/middleware/redis-rate-limiter.ts`
- `lib/monitoring/FNRMonitoringService.ts`
- `lib/monitoring/QueryPerformanceMonitor.ts`
- `lib/onboarding/analytics.ts`
- `lib/onboarding/examples.tsx`
- `lib/types/ml.types.ts`
- `lib/utils/api-response.ts`
- `lib/utils/image-compression.ts`
- `lib/utils/image-validation.ts`
- `src/lib/feature-flags.ts`
- `lib/hooks/queries/index.ts`
- `lib/i18n/locales/en-GB.ts`

### Other (7)

- `styles/accessibility.css`
- `types/admin.types.ts`
- `types/building.types.ts`
- `types/discovery.types.ts`
- `types/index.d.ts`
- `types/index.ts`
- `types/social.types.ts`

### Root-level (6)

- `fix-corrupted-tests.cjs`
- `fix-metadata-tests.cjs`
- `fix-tests.cjs`
- `middleware-cache.ts`
- `middleware-security.ts`
- `vitest.integration.config.ts`

### Hooks (5)

- `hooks/useAccessibility.ts`
- `hooks/useFeatureFlag.ts`
- `hooks/useLoadingState.ts`
- `hooks/useOnboardingTooltips.ts`
- `hooks/usePerformanceMonitor.ts`

### Tests / fixtures (3)

- `test/mockFactories.ts`
- `test/mocks/ai-services.ts`
- `test/mocks/dompurify.ts`

### Middleware (1)

- `middleware/security-headers.ts`

### Utils (1)

- `e2e/helpers/index.ts`

## Mobile App — Unused Files by Category

### Components (shared UI) (30)

- `src/components/JobListOffline.tsx`
- `src/components/JobStatusTracker.tsx`
- `src/components/LoadingScreen.tsx`
- `src/components/LoadingStates.tsx`
- `src/components/neighborhoodLeaderboardStyles.ts`
- `src/components/QueryStateWrapper.tsx`
- `src/components/SustainabilityScoreWidget.tsx`
- `src/components/sustainabilityScoreWidgetStyles.ts`
- `src/components/accessibility/AccessibleComponents.tsx`
- `src/components/advanced-search/advancedSearchFiltersStyles.ts`
- `src/components/animations/AnimationComponents.tsx`
- `src/components/lazy/BusinessDashboard.tsx`
- `src/components/lazy/index.ts`
- `src/components/map/ContractorDetailsSheet.tsx`
- `src/components/navigation/index.ts`
- `src/components/onboarding/index.ts`
- `src/components/optimized/OptimizedList.tsx`
- `src/components/skeletons/index.ts`
- `src/components/skeletons/JobListSkeleton.tsx`
- `src/components/specialists/SpecialistProfileCard.tsx`
- `src/components/ui/RatingBadge.tsx`
- `src/components/utils/logger.ts`
- `src/components/video/VideoListItem.tsx`
- `src/components/ui/Button/index.ts`
- `src/components/ui/Card/index.ts`
- `src/components/ui/Input/index.ts`
- `src/screens/assessment/components/AIInsightsCard.tsx`
- `src/screens/explore-map/components/index.ts`
- `src/screens/explore-map/components/JobPreviewCard.tsx`
- `src/screens/home/components/DashboardHeader.tsx`

### Services (mobile) (14)

- `src/services/ContractService.ts`
- `src/services/ImageCompressionService.example.ts`
- `src/services/IntegrationTestService.ts`
- `src/services/ModerationService.ts`
- `src/services/PlatformServices.ts`
- `src/services/ProtectedServices.ts`
- `src/services/PushNotificationService.ts`
- `src/services/contractor/ContractorDocumentsService.ts`
- `src/services/contractor/TimeTrackingService.ts`
- `src/services/notifications/index.ts`
- `src/services/user/index.ts`
- `src/services/web/WebBiometricService.ts`
- `src/services/web/WebCameraService.ts`
- `src/services/web/WebNotificationService.ts`

### Other (12)

- `src/pricing/PricingEngine.ts`
- `src/providers/QueryProvider-fallback.tsx`
- `src/providers/StripeProvider.tsx`
- `src/schemas/index.ts`
- `src/testing/e2e-setup.ts`
- `src/types/pricing.types.ts`
- `src/types/search.ts`
- `src/pricing/core/RiskAssessment.ts`
- `src/types/core/database.core.ts`
- `src/types/core/index.ts`
- `src/types/jobs/job.types.ts`
- `src/types/location/location.types.ts`

### Screens (mobile) (11)

- `src/screens/ErrorFallback.tsx`
- `src/screens/booking/index.ts`
- `src/screens/contractor/ContractorOnboardingScreen.tsx`
- `src/screens/contractor/PayoutsScreen.tsx`
- `src/screens/contractor/PortfolioGalleryScreen.tsx`
- `src/screens/contractor/SocialScreen.tsx`
- `src/screens/explore-map/index.ts`
- `src/screens/help/HelpCenterScreen.tsx`
- `src/screens/home/StatsCards.tsx`
- `src/screens/PerformanceDashboard/index.ts`
- `src/screens/home/viewmodels/HomeViewModel.ts`

### Utils (4)

- `src/utils/errorHandlingEnhanced.ts`
- `src/utils/networkDiagnostics.ts`
- `src/utils/errorHandling/ErrorHandler.ts`
- `src/utils/performance/PerformanceBudgetService.ts`

### lib/services (2)

- `src/web/lib/services/ml-engine/memory/MemoryManager.ts`
- `src/web/lib/services/ml-engine/memory/types.ts`

### Config (1)

- `src/config/certificatePinning.ts`

### Contexts (1)

- `src/contexts/AppStateContext.tsx`

### Tests / fixtures (1)

- `test/mocks/supabaseMockFactory.ts`

## Shared Packages

### packages/security

**Unused types:**

- `packages/security/src/core/BaseSanitizer.ts`:11 → `SanitizationResult`

### packages/shared-ui

**Unused files:**

- `packages/shared-ui/src/components/Badge/index.ts`
- `packages/shared-ui/src/components/Button/index.ts`
- `packages/shared-ui/src/components/Card/index.ts`
- `packages/shared-ui/src/components/Input/index.ts`

**Unused exports:**

- `packages/shared-ui/src/components/Input/Input.web.tsx`:291 → `default`
- `packages/shared-ui/src/components/Badge/Badge.web.tsx`:100 → `default`
- `packages/shared-ui/src/components/Badge/Badge.native.tsx`:143 → `default`
- `packages/shared-ui/src/components/Button/Button.native.tsx`:254 → `default`
- `packages/shared-ui/src/components/Card/Card.native.tsx`:128 → `CardHeader`
- `packages/shared-ui/src/components/Card/Card.native.tsx`:135 → `CardBody`
- `packages/shared-ui/src/components/Card/Card.native.tsx`:142 → `CardFooter`
- `packages/shared-ui/src/components/Card/Card.native.tsx`:215 → `default`
- `packages/shared-ui/src/components/Input/Input.native.tsx`:192 → `default`
- `packages/shared-ui/src/components/Card.tsx`:11 → `CardHeader`
- `packages/shared-ui/src/components/Card.tsx`:15 → `CardContent`
- `packages/shared-ui/src/components/Card.tsx`:19 → `CardFooter`
- `packages/shared-ui/src/utils/usePlatform.ts`:11 → `detectPlatform`
- `packages/shared-ui/src/utils/usePlatform.ts`:30 → `isWeb`
- `packages/shared-ui/src/utils/usePlatform.ts`:36 → `isNative`
- `packages/shared-ui/src/components/Badge/Badge.tsx`:14 → `default`
- `packages/shared-ui/src/components/Button/Button.tsx`:16 → `default`
- `packages/shared-ui/src/components/Card/Card.tsx`:15 → `CardHeader`
- `packages/shared-ui/src/components/Card/Card.tsx`:16 → `CardFooter`
- `packages/shared-ui/src/components/Card/Card.tsx`:17 → `CardTitle`
- ...and 4 more

**Unused types:**

- `packages/shared-ui/src/components/Card/Card.native.tsx`:124 → `CardHeaderProps`
- `packages/shared-ui/src/components/Card/Card.native.tsx`:131 → `CardBodyProps`
- `packages/shared-ui/src/components/Card/Card.native.tsx`:138 → `CardFooterProps`
- `packages/shared-ui/src/components/Card.tsx`:3 → `CardProps`
- `packages/shared-ui/src/utils/usePlatform.ts`:6 → `Platform`
- `packages/shared-ui/src/components/Badge/Badge.tsx`:11 → `WebBadgeProps`
- `packages/shared-ui/src/components/Badge/Badge.tsx`:11 → `NativeBadgeProps`
- `packages/shared-ui/src/components/Badge/Badge.tsx`:11 → `BaseBadgeProps`
- `packages/shared-ui/src/components/Badge/Badge.tsx`:11 → `BadgeVariant`
- `packages/shared-ui/src/components/Badge/Badge.tsx`:11 → `BadgeSize`
- `packages/shared-ui/src/components/Button/Button.tsx`:13 → `WebButtonProps`
- `packages/shared-ui/src/components/Button/Button.tsx`:13 → `NativeButtonProps`
- `packages/shared-ui/src/components/Button/Button.tsx`:13 → `BaseButtonProps`
- `packages/shared-ui/src/components/Button/Button.tsx`:13 → `ButtonVariant`
- `packages/shared-ui/src/components/Button/Button.tsx`:13 → `ButtonSize`
- `packages/shared-ui/src/components/Card/Card.tsx`:11 → `WebCardProps`
- `packages/shared-ui/src/components/Card/Card.tsx`:11 → `NativeCardProps`
- `packages/shared-ui/src/components/Card/Card.tsx`:11 → `BaseCardProps`
- `packages/shared-ui/src/components/Card/Card.tsx`:11 → `CardVariant`
- `packages/shared-ui/src/components/Card/Card.tsx`:11 → `CardPadding`
- ...and 6 more

### packages/shared

**Unused files:**

- `packages/shared/src/enhanced-logger.ts`
- `packages/shared/src/lib/logger-config.ts`
- `packages/shared/src/services/conformal-prediction.ts`
- `packages/shared/src/services/hybrid-inference-with-cp.ts`

**Unused deps:** `@mintenance/types`

**Unused exports:**

- `packages/shared/src/utils.ts`:44 → `delay`
- `packages/shared/src/utils.ts`:50 → `retry`

**Unused types:**

- `packages/shared/src/logger.ts`:13 → `LogLevel`
- `packages/shared/src/logger.ts`:15 → `LogContext`
- `packages/shared/src/logger.ts`:22 → `LogEntry`

## Recommended Deletion Order

1. **Remove unused dependencies** from package.json files (fastest, no code impact)
2. **Delete duplicate components** where both copies exist (JobCard dashboard/ vs cards/)
3. **Delete root-level orphans** (apps/web/fix-_.cjs, middleware-_.ts, version-checker.tsx)
4. **Delete commented-out dead imports** (PerformanceDashboard)
5. **Delete dead feature chains** (entire AnalyticsClient chain, resources/ duplicates)
6. **Delete obsolete UI variants** (\*.unified.tsx duplicates, old admin/ components)
7. **Audit scripts/** manually — keep migration-relevant, archive one-offs
8. **Mobile services/components** — verify feature status before deleting

## Verification Steps Before Deletion

```bash
# 1. Search for imports
grep -rn "filename" apps/ packages/ --include="*.ts" --include="*.tsx"

# 2. Check dynamic imports
grep -rn "import(.*filename" apps/ packages/

# 3. Check git history for recent relevance
git log --all --oneline -- path/to/file.tsx | head

# 4. After deletion, verify build
npx tsc --noEmit --project apps/web/tsconfig.json
npx tsc --noEmit --project apps/mobile/tsconfig.json
```

## JSON Reports

Machine-readable results saved to:

- `audit-reports/knip-web.json`
- `audit-reports/knip-mobile.json`
- `audit-reports/knip-pkg-*.json` (one per shared package)

To regenerate:
`NODE_OPTIONS="--max-old-space-size=8192" node_modules/.bin/knip --workspace apps/web --reporter json`
