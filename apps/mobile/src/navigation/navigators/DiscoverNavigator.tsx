import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ExploreMapScreen } from '../../screens/explore-map';
import ContractorDiscoveryScreen from '../../screens/ContractorDiscoveryScreen';
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';
import { useAuth } from '../../contexts/AuthContext';

type DiscoverStackParamList = {
  ExploreMap: undefined;
  ContractorDiscovery: undefined;
};

const Stack = createStackNavigator<DiscoverStackParamList>();

const SafeExploreMapScreen = withScreenErrorBoundary(
  ExploreMapScreen,
  'Find Jobs Map'
);

const SafeContractorDiscoveryScreen = withScreenErrorBoundary(
  ContractorDiscoveryScreen,
  'Find Contractors'
);

const DiscoverNavigator: React.FC = () => {
  const { user } = useAuth();
  const isHomeowner = user?.role === 'homeowner';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
      initialRouteName={isHomeowner ? 'ContractorDiscovery' : 'ExploreMap'}
    >
      <Stack.Screen
        name="ExploreMap"
        component={SafeExploreMapScreen}
        options={{
          title: 'Find Jobs',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ContractorDiscovery"
        component={SafeContractorDiscoveryScreen}
        options={{
          title: 'Find Contractors',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default DiscoverNavigator;
