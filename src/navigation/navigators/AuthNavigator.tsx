import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { AuthStackParamList } from '../types';

// Import existing screens
import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen';
import ForgotPasswordScreen from '../../screens/ForgotPasswordScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeLoginScreen = withScreenErrorBoundary(
  LoginScreen,
  'Login',
  { fallbackRoute: 'Register' }
);

const SafeRegisterScreen = withScreenErrorBoundary(
  RegisterScreen,
  'Register',
  { fallbackRoute: 'Login' }
);

const SafeForgotPasswordScreen = withScreenErrorBoundary(
  ForgotPasswordScreen,
  'Forgot Password',
  { fallbackRoute: 'Login' }
);

// ============================================================================
// AUTH NAVIGATOR
// ============================================================================

const AuthStack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
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
      initialRouteName="Login"
    >
      <AuthStack.Screen
        name="Login"
        component={SafeLoginScreen}
        options={{
          title: 'Sign In',
          animationTypeForReplace: 'push',
        }}
      />
      
      <AuthStack.Screen
        name="Register"
        component={SafeRegisterScreen}
        options={{
          title: 'Create Account',
          gestureEnabled: true,
        }}
      />
      
      <AuthStack.Screen
        name="ForgotPassword"
        component={SafeForgotPasswordScreen}
        options={{
          title: 'Reset Password',
          gestureEnabled: true,
        }}
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
