import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagingStackParamList } from '@mintenance/types';

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
  MessagingScreen as React.ComponentType<Record<string, unknown>>,
  'Messaging',
  { fallbackRoute: 'MessagesList' }
);

// ============================================================================
// MESSAGING NAVIGATOR
// ============================================================================

const MessagingStack = createNativeStackNavigator<MessagingStackParamList>();

export const MessagingNavigator: React.FC = () => {
  return (
    <MessagingStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
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
