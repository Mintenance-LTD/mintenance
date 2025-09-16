import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { ProfileStackParamList } from '../types';

// Import existing screens
import ProfileScreen from '../../screens/ProfileScreen';
import EditProfileScreen from '../../screens/EditProfileScreen';
import NotificationSettingsScreen from '../../screens/NotificationSettingsScreen';
import PaymentMethodsScreen from '../../screens/PaymentMethodsScreen';
import AddPaymentMethodScreen from '../../screens/AddPaymentMethodScreen';
import HelpCenterScreen from '../../screens/HelpCenterScreen';
import InvoiceManagementScreen from '../../screens/InvoiceManagementScreen';
import CRMDashboardScreen from '../../screens/CRMDashboardScreen';
import FinanceDashboardScreen from '../../screens/FinanceDashboardScreen';
import ServiceAreasScreen from '../../screens/ServiceAreasScreen';
import QuoteBuilderScreen from '../../screens/QuoteBuilderScreen';
import CreateQuoteScreen from '../../screens/CreateQuoteScreen';
import ContractorCardEditorScreen from '../../screens/ContractorCardEditorScreen';
import ConnectionsScreen from '../../screens/ConnectionsScreen';

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

const SafeConnectionsScreen = withScreenErrorBoundary(
  ConnectionsScreen,
  'Connections',
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
        name="Connections"
        component={SafeConnectionsScreen}
        options={{
          title: 'Connections',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigator;
