import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { MessagingStackParamList } from '../types';

// Import existing screens
import MessagesListScreen from '../../screens/MessagesListScreen';
import MessagingScreen from '../../screens/MessagingScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeMessagesListScreen = withScreenErrorBoundary(
  MessagesListScreen,
  'Messages List',
  { fallbackRoute: 'Main' }
);

const SafeMessagingScreen = withScreenErrorBoundary(
  MessagingScreen as any,
  'Messaging',
  { fallbackRoute: 'MessagesList' }
);

// ============================================================================
// MESSAGING NAVIGATOR
// ============================================================================

const MessagingStack = createStackNavigator<MessagingStackParamList>();

export const MessagingNavigator: React.FC = () => {
  return (
    <MessagingStack.Navigator
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
      initialRouteName="MessagesList"
    >
      <MessagingStack.Screen
        name="MessagesList"
        component={SafeMessagesListScreen}
        options={{
          title: 'Messages',
          headerShown: false,
        }}
      />
      
      <MessagingStack.Screen
        name="Messaging"
        component={SafeMessagingScreen}
        options={({ route }) => ({
          title: route.params?.jobTitle || 'Conversation',
          headerShown: false,
          gestureEnabled: true,
        })}
      />
    </MessagingStack.Navigator>
  );
};

export default MessagingNavigator;
