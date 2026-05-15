/**
 * Phase 2 wizard — Step 3: Contact.
 *
 * Per PDF §5.1: "Phone number (optional for homeowner, required for
 * contractor — SMS OTP after)". This implementation captures the
 * phone number + enforces it as required for contractors. The SMS-
 * OTP verification step is explicitly Phase 3 of the audit — the
 * hook validator returns "Phone required for contractors" but does
 * not (yet) kick off an OTP challenge. That's tracked as a follow-
 * up once we pick a provider (Supabase Auth phone OTP vs. a direct
 * Twilio wiring).
 *
 * Phone number is not yet persisted to the profile by signUp (the
 * Supabase auth payload today only carries first_name / last_name /
 * role / full_name in user_metadata). The wire-up to profiles.phone
 * is the companion follow-up; capturing it in the UI now unblocks
 * the UX change.
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
