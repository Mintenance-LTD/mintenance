import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ExploreMapScreen } from '../../screens/explore-map';
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

type DiscoverStackParamList = {
  ExploreMap: undefined;
};

const Stack = createStackNavigator<DiscoverStackParamList>();

const SafeExploreMapScreen = withScreenErrorBoundary(
  ExploreMapScreen,
  'Find Jobs Map'
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
          title: 'Find Jobs',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default DiscoverNavigator;
