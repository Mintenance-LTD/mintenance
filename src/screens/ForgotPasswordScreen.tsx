import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Button from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthService } from '../services/AuthService';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme';
import { logger } from '../utils/logger';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await AuthService.resetPassword(email);
      setSuccess(true);
      logger.info('Password reset email sent', { email });

      Alert.alert(
        'Check Your Email',
        "We've sent you a password reset link. Please check your email and follow the instructions to reset your password.",
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      logger.error('Password reset failed', error);
      Alert.alert(
        'Reset Failed',
        error.message ||
          'Failed to send reset email. Please check your email address and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode='contain'
            />
            <Text style={styles.headerTitle}>Mintenance</Text>
          </View>
        </View>

        <View style={styles.successContainer}>
          <Ionicons
            name='checkmark-circle'
            size={80}
            color={theme.colors.success}
          />
          <Text style={styles.successTitle}>Email Sent!</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to {email}. Please check your email
            and follow the instructions.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          accessibilityHint='Return to login screen'
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.headerLogo}
            resizeMode='contain'
          />
          <Text style={styles.headerTitle}>Reset Password</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.formContainer}>
            <View style={styles.instructionContainer}>
              <Ionicons name='mail' size={48} color={theme.colors.primary} />
              <Text style={styles.instructionTitle}>Forgot your password?</Text>
              <Text style={styles.instructionText}>
                Enter your email address and we'll send you a link to reset your
                password.
              </Text>
            </View>

            {/* Email Input with Icon */}
            <View style={styles.inputContainer}>
              <Ionicons
                name='mail-outline'
                size={20}
                color={theme.colors.placeholder}
                style={styles.inputIcon}
                accessibilityHidden={true}
              />
              <TextInput
                style={styles.input}
                placeholder='Email Address'
                value={email}
                onChangeText={setEmail}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel='Email address'
                accessibilityHint='Enter your email address to receive a password reset link'
                accessibilityRole='none'
                textContentType='emailAddress'
                autoComplete='email'
                autoFocus
              />
            </View>

            {/* Send Reset Link Button */}
            <Button
              variant='primary'
              title={loading ? 'Sending...' : 'Send Reset Link'}
              onPress={handleResetPassword}
              disabled={loading}
              loading={loading}
              accessibilityLabel={
                loading ? 'Sending reset email' : 'Send reset email'
              }
              fullWidth
              style={{ borderRadius: theme.borderRadius.xxl, marginBottom: 24 }}
            />

            {/* Back to Login Link */}
            <TouchableOpacity
              style={styles.backLinkButton}
              onPress={() => navigation.goBack()}
              accessibilityRole='button'
              accessibilityLabel='Back to login'
              accessibilityHint='Return to login screen'
            >
              <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backIconButton: {
    position: 'absolute',
    left: 24,
    top: 60,
    padding: 8,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: theme.colors.surface,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    paddingVertical: 18,
  },
  resetButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xxl,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  resetButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18,
    fontWeight: '600',
  },
  backLinkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backLinkText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xxl,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
