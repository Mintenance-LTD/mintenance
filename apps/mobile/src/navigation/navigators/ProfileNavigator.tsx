import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { ProfileStackParamList } from '../types';

// Import existing screens
import ProfileScreen from '../../screens/ProfileScreen';
import EditProfileScreen from '../../screens/EditProfileScreen';
import NotificationSettingsScreen from '../../screens/NotificationSettingsScreen';
import { PaymentMethodsScreen } from '../../screens/payment-methods';
import AddPaymentMethodScreen from '../../screens/AddPaymentMethodScreen';
import HelpCenterScreen from '../../screens/HelpCenterScreen';
import InvoiceManagementScreen from '../../screens/InvoiceManagementScreen';
import CRMDashboardScreen from '../../screens/CRMDashboardScreen';
import FinanceDashboardScreen from '../../screens/FinanceDashboardScreen';
import ServiceAreasScreen from '../../screens/ServiceAreasScreen';
import QuoteBuilderScreen from '../../screens/QuoteBuilderScreen';
import { CreateQuoteScreen } from '../../screens/create-quote';
import ContractorCardEditorScreen from '../../screens/ContractorCardEditorScreen';
import { ContractorVerificationScreen } from '../../screens/contractor-verification/ContractorVerificationScreen';
import { PropertiesScreen } from '../../screens/properties/PropertiesScreen';
import { PropertyDetailScreen } from '../../screens/properties/PropertyDetailScreen';
import { AddPropertyScreen } from '../../screens/properties/AddPropertyScreen';
import { CalendarScreen } from '../../screens/CalendarScreen';
import { ReviewsScreen } from '../../screens/ReviewsScreen';
import { PaymentHistoryScreen } from '../../screens/payment/PaymentHistoryScreen';
import { SubscriptionScreen } from '../../screens/subscription/SubscriptionScreen';
import { FinancialsScreen } from '../../screens/financials/FinancialsScreen';
import { SettingsHubScreen } from '../../screens/settings/SettingsHubScreen';
import { ExpensesScreen } from '../../screens/contractor/ExpensesScreen';
import { DocumentsScreen } from '../../screens/contractor/DocumentsScreen';
import { CertificationsScreen } from '../../screens/contractor/CertificationsScreen';
import { TimeTrackingScreen } from '../../screens/contractor/TimeTrackingScreen';
import { ReportingScreen } from '../../screens/contractor/ReportingScreen';
import { PayoutsScreen } from '../../screens/contractor/PayoutsScreen';
import { BookingStatusScreen } from '../../screens/booking/BookingStatusScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeProfileScreen = withScreenErrorBoundary(
  ProfileScreen,
  'Profile',
  { fallbackRoute: 'Main' }
);

const SafeEditProfileScreen = withScreenErrorBoundary(
  EditProfileScreen,
  'Edit Profile',
  { fallbackRoute: 'ProfileMain' }
);

const SafeNotificationSettingsScreen = withScreenErrorBoundary(
  NotificationSettingsScreen,
  'Notification Settings',
  { fallbackRoute: 'ProfileMain' }
);

const SafePaymentMethodsScreen = withScreenErrorBoundary(
  PaymentMethodsScreen,
  'Payment Methods',
  { fallbackRoute: 'ProfileMain' }
);

const SafeAddPaymentMethodScreen = withScreenErrorBoundary(
  AddPaymentMethodScreen,
  'Add Payment Method',
  { fallbackRoute: 'PaymentMethods' }
);

const SafeHelpCenterScreen = withScreenErrorBoundary(
  HelpCenterScreen,
  'Help Center',
  { fallbackRoute: 'ProfileMain' }
);

const SafeInvoiceManagementScreen = withScreenErrorBoundary(
  InvoiceManagementScreen,
  'Invoice Management',
  { fallbackRoute: 'ProfileMain' }
);

const SafeCRMDashboardScreen = withScreenErrorBoundary(
  CRMDashboardScreen,
  'CRM Dashboard',
  { fallbackRoute: 'ProfileMain' }
);

const SafeFinanceDashboardScreen = withScreenErrorBoundary(
  FinanceDashboardScreen,
  'Finance Dashboard',
  { fallbackRoute: 'ProfileMain' }
);

const SafeServiceAreasScreen = withScreenErrorBoundary(
  ServiceAreasScreen,
  'Service Areas',
  { fallbackRoute: 'ProfileMain' }
);

const SafeQuoteBuilderScreen = withScreenErrorBoundary(
  QuoteBuilderScreen,
  'Quote Builder',
  { fallbackRoute: 'ProfileMain' }
);

const SafeCreateQuoteScreen = withScreenErrorBoundary(
  CreateQuoteScreen,
  'Create Quote',
  { fallbackRoute: 'QuoteBuilder' }
);

const SafeContractorCardEditorScreen = withScreenErrorBoundary(
  ContractorCardEditorScreen,
  'Edit Discovery Card',
  { fallbackRoute: 'ProfileMain' }
);

const SafeContractorVerificationScreen = withScreenErrorBoundary(
  ContractorVerificationScreen,
  'Contractor Verification',
  { fallbackRoute: 'ProfileMain' }
);

const SafePropertiesScreen = withScreenErrorBoundary(
  PropertiesScreen,
  'Properties',
  { fallbackRoute: 'ProfileMain' }
);

const SafePropertyDetailScreen = withScreenErrorBoundary(
  PropertyDetailScreen,
  'Property Detail',
  { fallbackRoute: 'Properties' }
);

const SafeAddPropertyScreen = withScreenErrorBoundary(
  AddPropertyScreen,
  'Add Property',
  { fallbackRoute: 'Properties' }
);

const SafeCalendarScreen = withScreenErrorBoundary(
  CalendarScreen,
  'Calendar',
  { fallbackRoute: 'ProfileMain' }
);

const SafeReviewsScreen = withScreenErrorBoundary(
  ReviewsScreen,
  'Reviews',
  { fallbackRoute: 'ProfileMain' }
);

const SafePaymentHistoryScreen = withScreenErrorBoundary(
  PaymentHistoryScreen,
  'Payment History',
  { fallbackRoute: 'ProfileMain' }
);

const SafeSubscriptionScreen = withScreenErrorBoundary(
  SubscriptionScreen,
  'Subscription',
  { fallbackRoute: 'ProfileMain' }
);

const SafeFinancialsScreen = withScreenErrorBoundary(
  FinancialsScreen,
  'Financials',
  { fallbackRoute: 'ProfileMain' }
);

const SafeSettingsHubScreen = withScreenErrorBoundary(
  SettingsHubScreen,
  'Settings',
  { fallbackRoute: 'ProfileMain' }
);

const SafeExpensesScreen = withScreenErrorBoundary(
  ExpensesScreen,
  'Expenses',
  { fallbackRoute: 'ProfileMain' }
);

const SafeDocumentsScreen = withScreenErrorBoundary(
  DocumentsScreen,
  'Documents',
  { fallbackRoute: 'ProfileMain' }
);

const SafeCertificationsScreen = withScreenErrorBoundary(
  CertificationsScreen,
  'Certifications',
  { fallbackRoute: 'ProfileMain' }
);

const SafeTimeTrackingScreen = withScreenErrorBoundary(
  TimeTrackingScreen,
  'Time Tracking',
  { fallbackRoute: 'ProfileMain' }
);

const SafeReportingScreen = withScreenErrorBoundary(
  ReportingScreen,
  'Reporting',
  { fallbackRoute: 'ProfileMain' }
);

const SafePayoutsScreen = withScreenErrorBoundary(
  PayoutsScreen,
  'Payouts',
  { fallbackRoute: 'ProfileMain' }
);

const SafeBookingStatusScreen = withScreenErrorBoundary(
  BookingStatusScreen,
  'Booking Status',
  { fallbackRoute: 'ProfileMain' }
);

// ============================================================================
// PROFILE NAVIGATOR
// ============================================================================

const ProfileStack = createStackNavigator<ProfileStackParamList>();

export const ProfileNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 300 } },
          close: { animation: 'timing', config: { duration: 250 } },
        },
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
      initialRouteName="ProfileMain"
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={SafeProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />
      
      <ProfileStack.Screen
        name="EditProfile"
        component={SafeEditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="NotificationSettings"
        component={SafeNotificationSettingsScreen}
        options={{
          title: 'Notifications',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="PaymentMethods"
        component={SafePaymentMethodsScreen}
        options={{
          title: 'Payment Methods',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="AddPaymentMethod"
        component={SafeAddPaymentMethodScreen}
        options={{
          title: 'Add Payment Method',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="HelpCenter"
        component={SafeHelpCenterScreen}
        options={{
          title: 'Help Center',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="InvoiceManagement"
        component={SafeInvoiceManagementScreen}
        options={{
          title: 'Invoices',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="CRMDashboard"
        component={SafeCRMDashboardScreen}
        options={{
          title: 'CRM Dashboard',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="FinanceDashboard"
        component={SafeFinanceDashboardScreen}
        options={{
          title: 'Finance Dashboard',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="ServiceAreas"
        component={SafeServiceAreasScreen}
        options={{
          title: 'Service Areas',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="QuoteBuilder"
        component={SafeQuoteBuilderScreen}
        options={{
          title: 'Quote Builder',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      
      <ProfileStack.Screen
        name="CreateQuote"
        component={SafeCreateQuoteScreen}
        options={{
          title: 'Create Quote',
          presentation: 'modal',
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateY: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.height, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />

      <ProfileStack.Screen
        name="ContractorCardEditor"
        component={SafeContractorCardEditorScreen}
        options={{
          title: 'Edit Discovery Card',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="ContractorVerification"
        component={SafeContractorVerificationScreen}
        options={{
          title: 'Verify Business',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Properties"
        component={SafePropertiesScreen}
        options={{
          title: 'My Properties',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="PropertyDetail"
        component={SafePropertyDetailScreen}
        options={{
          title: 'Property Details',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="AddProperty"
        component={SafeAddPropertyScreen}
        options={{
          title: 'Add Property',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Calendar"
        component={SafeCalendarScreen}
        options={{
          title: 'Calendar',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Reviews"
        component={SafeReviewsScreen}
        options={{
          title: 'Reviews',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="PaymentHistory"
        component={SafePaymentHistoryScreen}
        options={{
          title: 'Payment History',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Subscription"
        component={SafeSubscriptionScreen}
        options={{
          title: 'Subscription',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Financials"
        component={SafeFinancialsScreen}
        options={{
          title: 'Financials',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="SettingsHub"
        component={SafeSettingsHubScreen}
        options={{
          title: 'Settings',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Expenses"
        component={SafeExpensesScreen}
        options={{
          title: 'Expenses',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Documents"
        component={SafeDocumentsScreen}
        options={{
          title: 'Documents',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Certifications"
        component={SafeCertificationsScreen}
        options={{
          title: 'Certifications',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="TimeTracking"
        component={SafeTimeTrackingScreen}
        options={{
          title: 'Time Tracking',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Reporting"
        component={SafeReportingScreen}
        options={{
          title: 'Reports & Analytics',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="Payouts"
        component={SafePayoutsScreen}
        options={{
          title: 'Payouts',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      <ProfileStack.Screen
        name="BookingStatus"
        component={SafeBookingStatusScreen}
        options={{
          title: 'Bookings',
          headerShown: false,
          gestureEnabled: true,
        }}
      />

    </ProfileStack.Navigator>
  );
};

export default ProfileNavigator;
