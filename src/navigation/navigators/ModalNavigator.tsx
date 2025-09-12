import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { ModalStackParamList } from '../types';

// Import existing screens
import ServiceRequestScreen from '../../screens/ServiceRequestScreen';
import FindContractorsScreen from '../../screens/FindContractorsScreen';
import ContractorDiscoveryScreen from '../../screens/ContractorDiscoveryScreen';
import CreateQuoteScreen from '../../screens/CreateQuoteScreen';

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

const SafeFindContractorsScreen = withScreenErrorBoundary(
  FindContractorsScreen,
  'Find Contractors',
  { fallbackRoute: 'Main' }
);

const SafeContractorDiscoveryScreen = withScreenErrorBoundary(
  ContractorDiscoveryScreen,
  'Contractor Discovery',
  { fallbackRoute: 'Main' }
);

const SafeCreateQuoteScreen = withScreenErrorBoundary(
  CreateQuoteScreen,
  'Create Quote',
  { fallbackRoute: 'Main' }
);

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
        name="FindContractors"
        component={SafeFindContractorsScreen}
        options={{
          title: 'Find Contractors',
          gestureEnabled: true,
        }}
      />
      
      <ModalStack.Screen
        name="ContractorDiscovery"
        component={SafeContractorDiscoveryScreen}
        options={{
          title: 'Discover Contractors',
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
    </ModalStack.Navigator>
  );
};

export default ModalNavigator;
