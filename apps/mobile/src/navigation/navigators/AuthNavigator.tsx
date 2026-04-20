import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types';

// Import existing screens
import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen';
import ForgotPasswordScreen from '../../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../../screens/auth/ResetPasswordScreen';
import MFAVerificationScreen from '../../screens/auth/MFAVerificationScreen';
// Phase 1.2 (Branch B) — shown after signUp until email-confirmation lands.
import EmailVerificationPendingScreen from '../../screens/auth/EmailVerificationPendingScreen';

// Import error boundary wrapper
import { withScreenErrorBoundary } from '../../components/ErrorBoundaryProvider';

// ============================================================================
// SCREEN WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

const SafeLoginScreen = withScreenErrorBoundary(LoginScreen, 'Login', {
  fallbackRoute: 'Login',
});

const SafeRegisterScreen = withScreenErrorBoundary(RegisterScreen, 'Register', {
  fallbackRoute: 'Login',
});

const SafeForgotPasswordScreen = withScreenErrorBoundary(
  ForgotPasswordScreen,
  'Forgot Password',
  { fallbackRoute: 'Login' }
);

const SafeResetPasswordScreen = withScreenErrorBoundary(
  ResetPasswordScreen,
  'Reset Password',
  { fallbackRoute: 'Login' }
);

const SafeMFAVerificationScreen = withScreenErrorBoundary(
  MFAVerificationScreen,
  'MFA Verification',
  { fallbackRoute: 'Login' }
);

const SafeEmailVerificationPendingScreen = withScreenErrorBoundary(
  EmailVerificationPendingScreen,
  'Email Verification Pending',
  { fallbackRoute: 'Login' }
);

// ============================================================================
// AUTH NAVIGATOR
// ============================================================================

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
      initialRouteName='Login'
    >
      <AuthStack.Screen
        name='Login'
        component={SafeLoginScreen}
        options={{ title: 'Sign In' }}
      />
      <AuthStack.Screen
        name='Register'
        component={SafeRegisterScreen}
        options={{ title: 'Create Account' }}
      />
      <AuthStack.Screen
        name='ForgotPassword'
        component={SafeForgotPasswordScreen}
        options={{ title: 'Reset Password' }}
      />
      <AuthStack.Screen
        name='ResetPassword'
        component={SafeResetPasswordScreen}
        options={{ title: 'New Password' }}
      />
      <AuthStack.Screen
        name='MFAVerification'
        component={SafeMFAVerificationScreen}
        options={{ title: 'Verify Identity', gestureEnabled: false }}
      />
      <AuthStack.Screen
        name='EmailVerificationPending'
        component={SafeEmailVerificationPendingScreen}
        options={{ title: 'Check Your Email' }}
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
