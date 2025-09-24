import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ContractorDiscoveryScreen from '../../screens/ContractorDiscoveryScreen';
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

const Stack = createStackNavigator();

const SafeContractorDiscoveryScreen = withScreenErrorBoundary(
  ContractorDiscoveryScreen,
  'Contractor Discovery'
);

const DiscoverNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ContractorDiscovery"
        component={SafeContractorDiscoveryScreen}
        options={{ title: 'Discover Contractors' }}
      />
    </Stack.Navigator>
  );
};

export default DiscoverNavigator;

