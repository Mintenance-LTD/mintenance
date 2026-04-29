import type { NavigatorScreenParams } from '@react-navigation/native';

// ============================================================================
// ROOT STACK NAVIGATION TYPES
// ============================================================================

export type RootStackParamList = {
  // Auth flow
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;

  // Main app (tabs)
  Main: NavigatorScreenParams<RootTabParamList> | undefined;

  // Modals
  Modal: NavigatorScreenParams<ModalStackParamList> | undefined;

  // Booking screens (accessible from anywhere)
  BookingDetails: { bookingId: string };
  RescheduleBooking: { bookingId: string };
  RateBooking: { bookingId: string };
};

// ============================================================================
// TAB NAVIGATION TYPES
// ============================================================================

export type RootTabParamList = {
  HomeTab: undefined;
  JobsTab: NavigatorScreenParams<JobsStackParamList> | undefined;
  AddTab: undefined;
  BusinessTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
  MessagingTab: NavigatorScreenParams<MessagingStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

// ============================================================================
// AUTH STACK NAVIGATION TYPES
// ============================================================================

export type AuthStackParamList = {
  // Phase 2 Screen 0 (2026-04-20) — pre-signup welcome/role-tile
  // landing. Replaces Login as the AuthStack initialRouteName.
  // Users who only want to sign in tap the "Sign in" link at the
  // bottom of this screen; users who select a role tile go to
  // Register with that role pre-chosen.
  Welcome: undefined;
  // `email` is set when arriving from EmailVerificationPending after a
  // successful signUp, so the user doesn't re-type their address on the
  // sign-in step. We never forward the password: email-confirm is ON,
  // so the user must click their email link before any sign-in works,
  // and stashing the cleartext password in nav params is a leak risk
  // because React Navigation may serialize state to storage when
  // deep-linking is enabled.
  Login: { email?: string } | undefined;
  // `role` is populated by the Welcome screen tile tap (Phase 2) so
  // the registration form opens with the selected role already set.
  // When null/absent (e.g. deep-link straight to Register) the form
  // falls back to the default 'homeowner'.
  Register: { role?: 'homeowner' | 'contractor' } | undefined;
  // Phase 1.2 (Branch B) — shown after signUp while the Supabase-issued
  // confirmation email is pending. Entirely driven by user action; no
  // silent polling, no session state mutations.
  EmailVerificationPending: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  MFAVerification: { preMfaToken: string; redirectScreen?: string };
};

// ============================================================================
// JOBS STACK NAVIGATION TYPES
// ============================================================================

export type JobsStackParamList = {
  JobsList: undefined;
  JobDetails: { jobId: string };
  JobPosting: undefined;
  // R3 deferred #7 — Silver-mode-friendly assisted wizard (3 steps,
  // larger touch targets, fewer fields). Auto-routed when
  // useSilverMode().silverMode is true.
  PostJobWizard: undefined;
  ExploreMap: undefined;
  BidSubmission: { jobId: string; existingBidId?: string };
  JobPayment: {
    jobId: string;
    amount: number;
    contractorId: string;
    contractorName?: string;
  };
  JobTimeline: { jobId: string };
  Dispute: { jobId: string; jobTitle: string };
  BidReview: { jobId: string };
  PhotoReview: { jobId: string };
  PhotoUpload: { jobId: string; photoType: 'before' | 'after' };
  ContractView: { jobId: string };
  ContractPreparation: { jobId: string; jobTitle?: string };
  ReviewSubmission: {
    jobId: string;
    contractorName?: string;
    jobTitle?: string;
  };
  JobSignOff: { jobId: string };
  JobEdit: { jobId: string };
};

// ============================================================================
// MESSAGING STACK NAVIGATION TYPES
// ============================================================================

export type MessagingStackParamList = {
  MessagesList: undefined;
  Messaging: {
    conversationId: string;
    jobTitle?: string;
    recipientId?: string;
    recipientName?: string;
  };
};

// ============================================================================
// PROFILE STACK NAVIGATION TYPES
// ============================================================================

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  // BusinessHub is the initial screen of the BusinessNavigator (contractor
  // "Business" tab). Listed here because BusinessNavigator re-uses
  // ProfileStackParamList for type-safe screen registration.
  BusinessHub: undefined;
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  // AddPaymentMethodV2: removed 2026-04-25. V2 became the canonical
  // AddPaymentMethod screen — the legacy raw-CardField implementation
  // was the only thing that needed the V2 disambiguator.
  // ContractorPayouts: removed — Payouts in BusinessNavigator handles this
  HelpCenter: undefined;
  InvoiceManagement: undefined;
  // CreateInvoice can be opened blank, in edit mode (`invoiceId`), or
  // pre-filled from time-tracking (`initialLineItems`). The two pre-fill
  // modes are mutually exclusive but the type doesn't enforce that —
  // CreateInvoiceScreen prefers `invoiceId` if both are passed.
  CreateInvoice:
    | {
        invoiceId?: string;
        // Audit P1 #14 (2026-04-25): wired from TimeTrackingScreen so a
        // contractor can pre-fill an invoice from their billable hours.
        initialLineItems?: {
          description: string;
          quantity: string;
          rate: string;
        }[];
        // Optional contextual prefill — sourced from the most-tracked
        // job in the time-entry aggregate.
        clientName?: string;
        jobRef?: string;
      }
    | undefined;
  InvoiceDetail: { invoiceId: string };
  CRMDashboard: undefined;
  AddClient: undefined;
  ClientDetail: { client: Record<string, unknown> }; // ClientData — use ClientData type directly in ClientDetailScreen
  QuoteDetail: { quoteId: string };
  QuoteTemplates: undefined;
  FinanceDashboard: undefined;
  ServiceAreas: undefined;
  QuoteBuilder: undefined;
  CreateQuote: { jobId?: string };
  ContractorCardEditor: undefined;
  ContractorVerification: undefined;
  BusinessProfile: undefined;
  Properties: undefined;
  PropertyDetail: { propertyId: string };
  EditProperty: { propertyId: string };
  PropertyAssessment:
    | { propertyId?: string; propertyAddress?: string }
    | undefined;
  AddProperty: undefined;
  VideoCapture: { assessmentId?: string; propertyId?: string } | undefined;
  VideoProcessingStatus: {
    videoId: string;
    assessmentId?: string;
    propertyId?: string;
  };
  PhotoUpload: { jobId: string; photoType: 'before' | 'after' };
  Calendar: undefined;
  Reviews: undefined;
  // R7 #19 — contractor right-of-reply (48h moderation).
  ReplyToReview: {
    reviewId: string;
    reviewerName: string;
    reviewComment: string;
    rating: number;
  };
  PaymentHistory: undefined;
  Subscription: undefined;
  // R5 deferred #6 — mobile Home Health (£9.99/mo) subscribe flow
  HomeHealthSubscribe: undefined;
  Financials: undefined;
  SettingsHub: undefined;
  // Optional jobId opens the form pre-bound to a specific job — used
  // by the contractor job-detail "Log Expense for this Job" CTA so the
  // expense lands with `contractor_expenses.job_id` set instead of as a
  // standalone bookkeeping row (audit finding #9).
  Expenses: { jobId?: string; jobTitle?: string } | undefined;
  Documents: undefined;
  Certifications: undefined;
  DBSCheck: undefined;
  TimeTracking: undefined;
  AddTimeEntry: undefined;
  AddCertification: undefined;
  Reporting: undefined;
  Payouts: undefined;
  BookingStatus: undefined;
  // Contractor feature parity screens
  Insurance: undefined;
  Team: undefined;
  Marketing: undefined;
  MarketInsights: undefined;
  // Social/Connections: ARCHIVED - contractor-discovery feature removed
  Training: undefined;
  // PortfolioGallery: REMOVED - screen is archived, type entry cleaned up
  EscrowDashboard: undefined;
  // Favorites: ARCHIVED - contractor-discovery feature removed
  // GDPR/Account management screens
  MFASecurity: undefined;
  DataExport: undefined;
  DeleteAccount: undefined;
  // Newer settings screens that previously had no nav target — wired
  // through SettingsHub. AccessibilitySettings is the silver-mode
  // toggle (R3 #5a), NotificationPreferences is the granular per-event
  // opt-in surface (R2) backed by /api/user/notification-preferences;
  // distinct from the older NotificationSettings route which is the
  // legacy push/email/marketing toggle screen.
  AccessibilitySettings: undefined;
  NotificationPreferences: undefined;
};

// ============================================================================
// MODAL STACK NAVIGATION TYPES
// ============================================================================

export type ModalStackParamList = {
  ServiceRequest:
    | { propertyId?: string; priority?: 'low' | 'medium' | 'high' }
    | undefined;
  // Tier 1 step 7 (2026-04-19 onboarding audit) — live-capture
  // selfie screen for new contractors. Front camera only, no
  // library picker. Takes no params.
  SelfieCapture: undefined;
  CreateQuote: { jobId?: string };
  MeetingSchedule: {
    contractorId: string;
    contractorName?: string;
  };
  MeetingDetails: {
    meetingId: string;
  };
  ContractorProfile: {
    contractorId: string;
    contractorName?: string;
    /**
     * Origin context for the profile view. `bidReview` enables the
     * Accept / Reject / Message bid actions on the profile; `general`
     * (default) shows the discovery CTAs only.
     */
    source?: 'bidReview' | 'general';
    /** Required when `source === 'bidReview'` so the screen can act on the bid. */
    jobId?: string;
    /** Required when `source === 'bidReview'`. */
    bidId?: string;
  };
  EnhancedHome: undefined;
  Notifications: undefined;
  AIAssessment: undefined;
  AISearch: undefined;
  QuickJobPost: {
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    category: string;
    urgency: string;
  };
};

// ============================================================================
// NAVIGATION PROP HELPERS
// ============================================================================

// Use these types to type your navigation props in screens:
//
// Example usage in a screen:
//
// import type { NativeStackScreenProps } from '@react-navigation/native-stack';
// import type { RootStackParamList } from './types';
//
// type Props = NativeStackScreenProps<RootStackParamList, 'BookingDetails'>;
//
// export const BookingDetailsScreen = ({ route, navigation }: Props) => {
//   const { bookingId } = route.params;
//   ...
// }

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
