import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { DiscoverStackParamList } from '../types';
import { ExploreMapScreen } from '../../screens/explore-map';
import { ContractorProfileScreen } from '../../screens/contractor-profile';
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

const Stack = createStackNavigator<DiscoverStackParamList>();

const SafeExploreMapScreen = withScreenErrorBoundary(
  ExploreMapScreen,
  'Explore Map'
);

const SafeContractorProfileScreen = withScreenErrorBoundary(
  ContractorProfileScreen,
  'Contractor Profile'
);

const DiscoverNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
      initialRouteName="ExploreMap"
    >
      <Stack.Screen
        name="ExploreMap"
        component={SafeExploreMapScreen}
        options={{ 
          title: 'Explore Contractors',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ContractorProfile"
        component={SafeContractorProfileScreen}
        options={({ route }) => ({
          title: route.params?.contractorName || 'Contractor Profile',
          headerShown: false,
        })}
      />
    </Stack.Navigator>
  );
};

export default DiscoverNavigator;

