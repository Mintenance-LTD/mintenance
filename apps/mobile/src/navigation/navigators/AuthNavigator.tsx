import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types';

// Import existing screens
import LandingScreen from '../../screens/LandingScreen';
import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen';
import ForgotPasswordScreen from '../../screens/ForgotPasswordScreen';
import MFAVerificationScreen from '../../screens/auth/MFAVerificationScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeLandingScreen = withScreenErrorBoundary(
  LandingScreen,
  'Landing',
  { fallbackRoute: 'Login' }
);

const SafeLoginScreen = withScreenErrorBoundary(
  LoginScreen,
  'Login',
  { fallbackRoute: 'Landing' }
);

const SafeRegisterScreen = withScreenErrorBoundary(
  RegisterScreen,
  'Register',
  { fallbackRoute: 'Landing' }
);

const SafeForgotPasswordScreen = withScreenErrorBoundary(
  ForgotPasswordScreen,
  'Forgot Password',
  { fallbackRoute: 'Login' }
);

const SafeMFAVerificationScreen = withScreenErrorBoundary(
  MFAVerificationScreen,
  'MFA Verification',
  { fallbackRoute: 'Login' }
);

// ============================================================================
// AUTH NAVIGATOR
// ============================================================================

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
      initialRouteName="Landing"
    >
      <AuthStack.Screen
        name="Landing"
        component={SafeLandingScreen}
        options={{ title: 'Welcome' }}
      />
      <AuthStack.Screen
        name="Login"
        component={SafeLoginScreen}
        options={{ title: 'Sign In' }}
      />
      <AuthStack.Screen
        name="Register"
        component={SafeRegisterScreen}
        options={{ title: 'Create Account' }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={SafeForgotPasswordScreen}
        options={{ title: 'Reset Password' }}
      />
      <AuthStack.Screen
        name="MFAVerification"
        component={SafeMFAVerificationScreen}
        options={{ title: 'Verify Identity', gestureEnabled: false }}
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
