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
  FeedTab: undefined;
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
};

// ============================================================================
// JOBS STACK NAVIGATION TYPES
// ============================================================================

export type JobsStackParamList = {
  JobsList: undefined;
  JobDetails: { jobId: string };
  JobPosting: undefined;
  BidSubmission: { jobId: string };
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
  CRMDashboard: undefined;
  FinanceDashboard: undefined;
  ServiceAreas: undefined;
  QuoteBuilder: undefined;
  CreateQuote: { jobId?: string };
  ContractorCardEditor: undefined;
  Connections: undefined;
};

// ============================================================================
// MODAL STACK NAVIGATION TYPES
// ============================================================================

export type ModalStackParamList = {
  ServiceRequest: undefined;
  FindContractors: undefined;
  ContractorDiscovery: undefined;
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
