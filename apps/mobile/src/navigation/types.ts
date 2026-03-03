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
  DiscoverTab: undefined;
  JobsTab: NavigatorScreenParams<JobsStackParamList> | undefined;
  AddTab: undefined;
  MessagingTab: NavigatorScreenParams<MessagingStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

// ============================================================================
// AUTH STACK NAVIGATION TYPES
// ============================================================================

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MFAVerification: { preMfaToken: string; redirectScreen?: string };
};

// ============================================================================
// JOBS STACK NAVIGATION TYPES
// ============================================================================

export type JobsStackParamList = {
  InvoiceManagement: undefined;
  CreateInvoice: { invoiceId?: string } | undefined;
  InvoiceDetail: { invoiceId: string };
  JobsList: undefined;
  JobDetails: { jobId: string };
  JobPosting: undefined;
  ExploreMap: undefined;
  BidSubmission: { jobId: string };
  JobPayment: { jobId: string; amount: number; contractorId: string; contractorName?: string };
  JobTimeline: { jobId: string };
  Dispute: { jobId: string; jobTitle: string };
  BidReview: { jobId: string };
  PhotoReview: { jobId: string };
  PhotoUpload: { jobId: string; photoType: 'before' | 'after' };
  ContractView: { jobId: string };
  ReviewSubmission: { jobId: string; contractorName?: string; jobTitle?: string };
  JobSignOff: { jobId: string };
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
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  HelpCenter: undefined;
  InvoiceManagement: undefined;
  CreateInvoice: { invoiceId?: string } | undefined;
  InvoiceDetail: { invoiceId: string };
  CRMDashboard: undefined;
  AddClient: undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ClientDetail: { client: any }; // ClientData from ClientCard
  QuoteDetail: { quoteId: string };
  QuoteTemplates: undefined;
  FinanceDashboard: undefined;
  ServiceAreas: undefined;
  QuoteBuilder: undefined;
  CreateQuote: { jobId?: string };
  ContractorCardEditor: undefined;
  ContractorVerification: undefined;
  Properties: undefined;
  PropertyDetail: { propertyId: string };
  PropertyAssessment: { propertyId?: string; propertyAddress?: string } | undefined;
  AddProperty: undefined;
  VideoCapture: { assessmentId?: string; propertyId?: string } | undefined;
  VideoProcessingStatus: { videoId: string; assessmentId?: string; propertyId?: string };
  PhotoUpload: { jobId: string; photoType: 'before' | 'after' };
  Calendar: undefined;
  Reviews: undefined;
  PaymentHistory: undefined;
  Subscription: undefined;
  Financials: undefined;
  SettingsHub: undefined;
  Expenses: undefined;
  Documents: undefined;
  Certifications: undefined;
  TimeTracking: undefined;
  AddTimeEntry: undefined;
  AddCertification: undefined;
  Reporting: undefined;
  Payouts: undefined;
  BookingStatus: undefined;
};

// ============================================================================
// MODAL STACK NAVIGATION TYPES
// ============================================================================

export type ModalStackParamList = {
  ServiceRequest: { propertyId?: string; priority?: 'low' | 'medium' | 'high' } | undefined;
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
