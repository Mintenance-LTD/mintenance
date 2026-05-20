/**
 * Phase 2 wizard — Step 1: Identity.
 *
 * Per PDF §5.1 the minimal step-1 surface is email + password + terms
 * (3 taps). This implementation adds confirmPassword as a fourth tap
 * to match the current safety posture + existing test coverage; a
 * follow-up commit can drop it with a coordinated test update.
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Input } from '../../../components/ui/Input';
import { PasswordStrengthBar } from '../../../components/ui/PasswordStrengthBar';
import { TermsSection } from './TermsSection';
import { me } from '../../../design-system/mint-editorial';

interface WizardStep1IdentityProps {
  email: string;
  password: string;
  confirmPassword: string;
  passwordVisible: boolean;
  termsAccepted: boolean;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onBlurEmail: () => void;
  onBlurPassword: () => void;
  onBlurConfirmPassword: () => void;
  onTogglePasswordVisibility: () => void;
  onToggleTerms: () => void;
  onShowTerms: () => void;
  onShowPrivacy: () => void;
}

export const WizardStep1Identity: React.FC<WizardStep1IdentityProps> = ({
  email,
  password,
  confirmPassword,
  passwordVisible,
  termsAccepted,
  errors,
  onChangeEmail,
  onChangePassword,
  onChangeConfirmPassword,
  onBlurEmail,
  onBlurPassword,
  onBlurConfirmPassword,
  onTogglePasswordVisibility,
  onToggleTerms,
  onShowTerms,
  onShowPrivacy,
}) => {
  return (
    <View>
      <Text style={styles.stepHeading}>Account Details</Text>
      <Text style={styles.stepHint}>
        Use an email you check regularly — we&apos;ll send a confirmation link.
      </Text>

      <Input
        mint
        testID='email-input'
        label='Email'
        placeholder='you@example.com'
        value={email}
        onChangeText={onChangeEmail}
        onBlur={onBlurEmail}
        errorText={errors.email}
        leftIcon='mail-outline'
        keyboardType='email-address'
        autoCapitalize='none'
        autoCorrect={false}
        accessibilityHint='Enter your email address for account creation'
        textContentType='emailAddress'
        autoComplete='email'
        variant='outline'
        size='lg'
        fullWidth
        required
      />

      <Input
        mint
        testID='password-input'
        label='Password'
        placeholder='Create a password'
        value={password}
        onChangeText={onChangePassword}
        onBlur={onBlurPassword}
        errorText={errors.password}
        leftIcon='lock-closed-outline'
        rightIcon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={onTogglePasswordVisibility}
        secureTextEntry={!passwordVisible}
        accessibilityHint='Create a secure password with at least 8 characters'
        textContentType='newPassword'
        autoComplete='password-new'
        variant='outline'
        size='lg'
        fullWidth
        required
      />
      <PasswordStrengthBar password={password} />

      <Input
        mint
        testID='confirm-password-input'
        label='Confirm Password'
        placeholder='Re-enter password'
        value={confirmPassword}
        onChangeText={onChangeConfirmPassword}
        onBlur={onBlurConfirmPassword}
        errorText={errors.confirmPassword}
        leftIcon='lock-closed-outline'
        secureTextEntry
        accessibilityHint='Re-enter your password to confirm it matches'
        textContentType='newPassword'
        autoComplete='password-new'
        variant='outline'
        size='lg'
        fullWidth
        required
      />

      <TermsSection
        termsAccepted={termsAccepted}
        onToggleTerms={onToggleTerms}
        onShowTerms={onShowTerms}
        onShowPrivacy={onShowPrivacy}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  stepHeading: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.ink,
    marginBottom: 6,
    letterSpacing: me.displayTracking,
  },
  stepHint: {
    fontSize: 13,
    color: me.ink2,
    marginBottom: 16,
    lineHeight: 18,
  },
});
