import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { ModalStackParamList } from '../types';

// Import existing screens
import ServiceRequestScreen from '../../screens/ServiceRequestScreen';
import { ContractorProfileScreen } from '../../screens/contractor-profile';
import { EnhancedHomeScreen } from '../../screens/enhanced-home';
import { PaymentMethodsScreen as PaymentMethodsScreenRefactored } from '../../screens/payment-methods';
import { CreateQuoteScreen } from '../../screens/create-quote';
import { MeetingScheduleScreen } from '../../screens/meeting-schedule';
import MeetingDetailsScreen from '../../screens/MeetingDetailsScreen';
import { NotificationScreen } from '../../screens/NotificationScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeServiceRequestScreen = withScreenErrorBoundary(
  ServiceRequestScreen,
  'Service Request',
  { fallbackRoute: 'Main' }
);

const SafeCreateQuoteScreen = withScreenErrorBoundary(
  CreateQuoteScreen,
  'Create Quote',
  { fallbackRoute: 'Main' }
);

const SafeMeetingScheduleScreen = withScreenErrorBoundary(
  MeetingScheduleScreen,
  'Schedule Meeting',
  { fallbackRoute: 'Main' }
);

const SafeMeetingDetailsScreen = withScreenErrorBoundary(
  MeetingDetailsScreen,
  'Meeting Details',
  { fallbackRoute: 'Main' }
);

const SafeContractorProfileScreen = withScreenErrorBoundary(
  ContractorProfileScreen,
  'Contractor Profile',
  { fallbackRoute: 'Main' }
);

const SafeEnhancedHomeScreen = withScreenErrorBoundary(
  EnhancedHomeScreen,
  'Enhanced Home',
  { fallbackRoute: 'Main' }
);

const SafeNotificationScreen = withScreenErrorBoundary(
  NotificationScreen,
  'Notifications',
  { fallbackRoute: 'Main' }
);

// Note: PaymentMethodsScreenRefactored ready but not yet replacing ProfileNavigator version

// ============================================================================
// MODAL NAVIGATOR
// ============================================================================

const ModalStack = createStackNavigator<ModalStackParamList>();

export const ModalNavigator: React.FC = () => {
  return (
    <ModalStack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        gestureEnabled: true,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 300 } },
          close: { animation: 'timing', config: { duration: 250 } },
        },
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
          overlayStyle: {
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        }),
      }}
    >
      <ModalStack.Screen
        name="ServiceRequest"
        component={SafeServiceRequestScreen}
        options={{
          title: 'Request Service',
          gestureEnabled: true,
        }}
      />

      <ModalStack.Screen
        name="CreateQuote"
        component={SafeCreateQuoteScreen}
        options={({ route }) => ({
          title: route.params?.jobId ? 'Quote for Job' : 'Create Quote',
          gestureEnabled: true,
        })}
      />

      <ModalStack.Screen
        name="MeetingSchedule"
        component={SafeMeetingScheduleScreen}
        options={{
          title: 'Schedule Meeting',
          gestureEnabled: true,
        }}
      />

      <ModalStack.Screen
        name="MeetingDetails"
        component={SafeMeetingDetailsScreen}
        options={{
          title: 'Meeting Details',
          gestureEnabled: true,
        }}
      />

      <ModalStack.Screen
        name="ContractorProfile"
        component={SafeContractorProfileScreen}
        options={({ route }) => ({
          title: route.params?.contractorName || 'Contractor Profile',
          gestureEnabled: true,
        })}
      />

      <ModalStack.Screen
        name="EnhancedHome"
        component={SafeEnhancedHomeScreen}
        options={{
          title: 'Home',
          gestureEnabled: true,
        }}
      />

      <ModalStack.Screen
        name="Notifications"
        component={SafeNotificationScreen}
        options={{
          title: 'Notifications',
          gestureEnabled: true,
        }}
      />
    </ModalStack.Navigator>
  );
};

export default ModalNavigator;
