import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Banner } from '../../components/ui/Banner';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { me } from '../../design-system/mint-editorial';
import { useScreenCaptureGuard } from '../../hooks/useScreenCaptureGuard';
import {
  getPasswordStrengthBreakdown,
  validatePasswordStrength,
} from '../../services/auth/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

// AUDIT_PUNCH_LIST P1 #15 (B2-P1-1) — was duplicating a 3-rule
// password check inline. Now consumes the canonical 5-rule
// validator from `services/auth/validators.ts` so reset-password
// matches signup / signin requirements exactly.

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  // SECURITY: prevent screenshots / screen recording of the new-password
  // entry form.
  useScreenCaptureGuard();

  const insets = useSafeAreaInsets();
  const _token = route.params?.token;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const strength = getPasswordStrengthBreakdown(password);

  const clearError = useCallback(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const validateForm = (): boolean => {
    const result = validatePasswordStrength(password);
    if (!result.valid) {
      setErrorMessage(result.message ?? 'Password does not meet requirements.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setErrorMessage(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      logger.info('Password reset successfully');
    } catch (error) {
      logger.error('Password reset failed', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const StrengthIndicator: React.FC<{ met: boolean; label: string }> = ({
    met,
    label,
  }) => (
    <View style={styles.strengthRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? me.brand : me.ink3}
      />
      <Text style={[styles.strengthLabel, met && styles.strengthLabelMet]}>
        {label}
      </Text>
    </View>
  );

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.headerContent}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.headerLogo}
                resizeMode='contain'
                accessible={false}
              />
              <Text style={styles.headerTitle} accessibilityRole='header'>
                Mintenance
              </Text>
            </View>
          </View>

          <View style={styles.successContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons
                name='checkmark-circle'
                size={48}
                color={me.brand}
                accessible={false}
              />
            </View>
            <Text style={styles.successTitle} accessibilityRole='header'>
              Password Updated!
            </Text>
            <Text style={styles.successMessage}>
              Your password has been successfully reset. You can now sign in
              with your new password.
            </Text>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole='button'
              accessibilityLabel='Back to login'
              accessibilityHint='Double tap to return to the login screen'
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            accessibilityHint='Return to previous screen'
          >
            <Ionicons name='arrow-back' size={24} color={me.ink} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode='contain'
              accessible={false}
            />
            <Text style={styles.headerTitle} accessibilityRole='header'>
              New Password
            </Text>
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
            {errorMessage ? (
              <Banner
                message={errorMessage}
                variant='error'
                testID='reset-error-banner'
              />
            ) : null}

            <View style={styles.formContainer}>
              <View style={styles.instructionContainer}>
                <View style={styles.lockIconWrap}>
                  <Ionicons
                    name='lock-closed'
                    size={28}
                    color='#3B82F6'
                    accessible={false}
                  />
                </View>
                <Text
                  style={styles.instructionTitle}
                  accessibilityRole='header'
                >
                  Set a new password
                </Text>
                <Text style={styles.instructionText}>
                  Choose a strong password that you haven't used before.
                </Text>
              </View>

              <Input
                label='New Password'
                placeholder='New Password'
                value={password}
                onChangeText={(value) => {
                  clearError();
                  setPassword(value);
                }}
                leftIcon='lock-closed-outline'
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                secureTextEntry={!showPassword}
                autoCapitalize='none'
                autoCorrect={false}
                textContentType='newPassword'
                accessibilityHint='Enter your new password'
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <View style={styles.strengthContainer}>
                <StrengthIndicator
                  met={strength.hasMinLength}
                  label='At least 8 characters'
                />
                <StrengthIndicator
                  met={strength.hasLowercase}
                  label='One lowercase letter'
                />
                <StrengthIndicator
                  met={strength.hasUppercase}
                  label='One uppercase letter'
                />
                <StrengthIndicator
                  met={strength.hasNumber}
                  label='One number'
                />
                <StrengthIndicator
                  met={strength.hasSpecial}
                  label='One special character (@$!%*?&)'
                />
              </View>

              <Input
                label='Confirm Password'
                placeholder='Confirm Password'
                value={confirmPassword}
                onChangeText={(value) => {
                  clearError();
                  setConfirmPassword(value);
                }}
                leftIcon='lock-closed-outline'
                secureTextEntry={!showPassword}
                autoCapitalize='none'
                autoCorrect={false}
                textContentType='newPassword'
                accessibilityHint='Re-enter your new password to confirm'
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <Button
                variant='primary'
                title={loading ? 'Updating...' : 'Reset Password'}
                onPress={handleResetPassword}
                disabled={loading}
                loading={loading}
                accessibilityLabel={
                  loading ? 'Updating password' : 'Reset password'
                }
                fullWidth
                style={{ borderRadius: 28, marginTop: 16, marginBottom: 24 }}
              />

              <TouchableOpacity
                style={styles.backLinkButton}
                onPress={() => navigation.navigate('Login')}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: me.surface,
  },
  container: {
    flex: 1,
    backgroundColor: me.surface,
  },
  header: {
    backgroundColor: me.surface,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
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
    fontSize: 26,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.3,
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
  lockIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  instructionText: {
    fontSize: 15,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  strengthContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 13,
    color: me.ink3,
    marginLeft: 8,
  },
  strengthLabelMet: {
    color: me.brand,
  },
  backLinkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backLinkText: {
    color: me.brand,
    fontSize: 15,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: me.ink,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  successMessage: {
    fontSize: 15,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ResetPasswordScreen;
