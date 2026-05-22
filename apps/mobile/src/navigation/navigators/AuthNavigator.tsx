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
// Phase 2 Screen 0 — role-tile pre-signup landing.
import { WelcomeScreen } from '../../screens/auth/WelcomeScreen';
// Phase 3 (2026-05-22) — splash is the new auth entry point (screen 01).
// Screens 08 (HomeownerSetup) and 10 (WelcomeFirstJob) run as
// fullscreen modals inside Main via OnboardingGateStack — they're
// not auth screens, so they don't live here.
import { SplashScreen } from '../../screens/auth/SplashScreen';

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

const SafeWelcomeScreen = withScreenErrorBoundary(WelcomeScreen, 'Welcome', {
  fallbackRoute: 'Login',
});

// Phase 3 (2026-05-22) — wrap Splash in the standard screen error
// boundary so a crash here drops the user back to Login instead of
// taking down the whole auth flow.
const SafeSplashScreen = withScreenErrorBoundary(SplashScreen, 'Splash', {
  fallbackRoute: 'Login',
});

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
      // Phase 3 (2026-05-22) — mobile-auth.html splash is the new
      // first impression. Splash → Welcome (role pick) → Register;
      // returning users tap "Sign in" on Splash → Login.
      initialRouteName='Splash'
    >
      <AuthStack.Screen
        name='Splash'
        component={SafeSplashScreen}
        options={{ title: 'Welcome' }}
      />
      <AuthStack.Screen
        name='Welcome'
        component={SafeWelcomeScreen}
        options={{ title: 'Choose role' }}
      />
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
