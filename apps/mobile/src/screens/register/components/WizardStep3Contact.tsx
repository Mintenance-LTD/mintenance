/**
 * Phase 2 wizard — Step 3: Contact.
 *
 * Per PDF §5.1: "Phone number (optional for homeowner, required for
 * contractor — SMS OTP after)". This implementation captures the
 * phone number + enforces it as required for contractors.
 *
 * Persistence (wired 2026-05-23, previously noted here as pending):
 * handleRegister forwards the number through performSignUp ->
 * AuthService.signUp -> signUp options.data.phone, and the
 * handle_new_user trigger copies it to profiles.phone. Pinned by
 * tests in useRegistrationForm.test.ts / AuthService.test.ts
 * (2026-07-26 — until then no test covered the chain and this
 * header still claimed it didn't exist).
 *
 * SMS OTP at signup remains future work; verification now happens
 * in-flow at first job post via PhoneVerificationModal (2026-07-26).
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Input } from '../../../components/ui/Input';
import { me } from '../../../design-system/mint-editorial';

interface WizardStep3ContactProps {
  phoneNumber: string;
  role: 'homeowner' | 'contractor';
  errors: {
    phoneNumber?: string;
  };
  onChangePhoneNumber: (value: string) => void;
  onBlurPhoneNumber: () => void;
}

export const WizardStep3Contact: React.FC<WizardStep3ContactProps> = ({
  phoneNumber,
  role,
  errors,
  onChangePhoneNumber,
  onBlurPhoneNumber,
}) => {
  const isContractor = role === 'contractor';

  return (
    <View>
      <Text style={styles.stepHeading}>
        {isContractor ? 'Your Phone Number' : 'One Last Step'}
      </Text>
      <Text style={styles.stepHint}>
        {isContractor
          ? "Homeowners call this number when you're on the way. We'll verify it via text in a future step."
          : "Optional — but contractors can reach you faster when it's on file."}
      </Text>

      <Input
        mint
        testID='phone-input'
        label={isContractor ? 'Phone Number' : 'Phone Number (optional)'}
        placeholder={isContractor ? '07xxx xxxxxx' : '07xxx xxxxxx (optional)'}
        value={phoneNumber}
        onChangeText={onChangePhoneNumber}
        onBlur={onBlurPhoneNumber}
        errorText={errors.phoneNumber}
        leftIcon='call-outline'
        keyboardType='phone-pad'
        accessibilityHint='Enter your phone number for account verification'
        textContentType='telephoneNumber'
        autoComplete='tel'
        variant='outline'
        size='lg'
        fullWidth
        required={isContractor}
      />

      <View style={styles.privacyRow}>
        <Text style={styles.privacyText}>
          We only text you about your jobs — never for marketing.
        </Text>
      </View>
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
  privacyRow: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  privacyText: {
    fontSize: 12,
    color: me.ink3,
    lineHeight: 18,
  },
});
