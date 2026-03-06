/**
 * useBusinessSuite - Barrel re-export
 * All hooks are split into focused modules under business-suite/
 */
 
export { BUSINESS_SUITE_KEYS } from "./business-suite/keys";
export { useBusinessMetrics, useFinancialSummary } from "./business-suite/useBusinessMetrics";
export { useInvoiceManagement, useExpenseTracking } from "./business-suite/useInvoices";
export { useClientAnalytics, useCRMManagement } from "./business-suite/useClients";
export { useScheduleManagement, useInventoryManagement } from "./business-suite/useSchedule";
export { useMarketingCampaigns, useBusinessGoals } from "./business-suite/useCampaigns";
export { useBusinessSuiteFormatters, useBusinessDashboard, businessSuiteUtils } from "./business-suite/useBusinessDashboard";
