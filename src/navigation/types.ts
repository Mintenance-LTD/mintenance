import type { NavigatorScreenParams } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

// ============================================================================
// FEATURE-BASED NAVIGATION TYPES
// ============================================================================

// Auth Stack Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Jobs Stack Types
export type JobsStackParamList = {
  JobsList: undefined;
  JobDetails: { jobId: string };
  JobPosting: undefined;
  BidSubmission: { jobId: string };
};

// Messaging Stack Types
export type MessagingStackParamList = {
  MessagesList: undefined;
  Messaging: {
    jobId: string;
    jobTitle: string;
    otherUserId: string;
    otherUserName: string;
  };
};

// Profile Stack Types
export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  HelpCenter: undefined;
  InvoiceManagement: undefined;
  CRMDashboard: undefined;
  FinanceDashboard: undefined;
  ServiceAreas: undefined;
  QuoteBuilder: undefined;
  CreateQuote: { jobId?: string; clientName?: string; clientEmail?: string };
};

// Modal Stack Types
export type ModalStackParamList = {
  ServiceRequest: undefined;
  FindContractors: undefined;
  ContractorDiscovery: undefined;
  CreateQuote: { jobId?: string; clientName?: string; clientEmail?: string };
};

// Root Tab Types
export type RootTabParamList = {
  HomeTab: undefined;
  JobsTab: NavigatorScreenParams<JobsStackParamList>;
  FeedTab: undefined;
  MessagingTab: NavigatorScreenParams<MessagingStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Root Stack Types
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<RootTabParamList>;
  Modal: NavigatorScreenParams<ModalStackParamList>;
};

// ============================================================================
// GLOBAL NAVIGATION TYPES
// ============================================================================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// ============================================================================
// TYPE-SAFE NAVIGATION UTILITIES
// ============================================================================

export type NavigationProp<T extends keyof RootStackParamList> = StackNavigationProp<
  RootStackParamList,
  T
>;

export type ScreenRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

// Feature-specific navigation props
export type JobsNavigationProp<T extends keyof JobsStackParamList> = StackNavigationProp<
  JobsStackParamList,
  T
>;

export type JobsRouteProp<T extends keyof JobsStackParamList> = RouteProp<
  JobsStackParamList,
  T
>;

export type MessagingNavigationProp<T extends keyof MessagingStackParamList> = StackNavigationProp<
  MessagingStackParamList,
  T
>;

export type MessagingRouteProp<T extends keyof MessagingStackParamList> = RouteProp<
  MessagingStackParamList,
  T
>;

export type ProfileNavigationProp<T extends keyof ProfileStackParamList> = StackNavigationProp<
  ProfileStackParamList,
  T
>;

export type ProfileRouteProp<T extends keyof ProfileStackParamList> = RouteProp<
  ProfileStackParamList,
  T
>;

// ============================================================================
// SCREEN PROPS INTERFACES
// ============================================================================

export interface BaseScreenProps<
  TStack extends keyof RootStackParamList,
  TScreen extends keyof any
> {
  navigation: StackNavigationProp<any, TScreen>;
  route: RouteProp<any, TScreen>;
}

export interface JobsScreenProps<T extends keyof JobsStackParamList> {
  navigation: JobsNavigationProp<T>;
  route: JobsRouteProp<T>;
}

export interface MessagingScreenProps<T extends keyof MessagingStackParamList> {
  navigation: MessagingNavigationProp<T>;
  route: MessagingRouteProp<T>;
}

export interface ProfileScreenProps<T extends keyof ProfileStackParamList> {
  navigation: ProfileNavigationProp<T>;
  route: ProfileRouteProp<T>;
}
