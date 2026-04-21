/**
 * Phase 2 wizard — Step 2: Name.
 *
 * Per PDF §5.1: split from step 1 "so users who bounce on password
 * entry don't lose their name data". This is also the step where the
 * current role (pre-selected via WelcomeScreen tile tap or defaulted)
 * is surfaced — users who deep-linked past Welcome can still switch
 * here, and users who arrived via Welcome can still correct a
 * mis-tap.
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Input } from '../../../components/ui/Input';
import { RoleSelector } from './RoleSelector';
import { theme } from '../../../theme';

interface WizardStep2NameProps {
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
  errors: {
    firstName?: string;
    lastName?: string;
  };
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onBlurFirstName: () => void;
  onBlurLastName: () => void;
  onChangeRole: (role: 'homeowner' | 'contractor') => void;
}

export const WizardStep2Name: React.FC<WizardStep2NameProps> = ({
  firstName,
  lastName,
  role,
  errors,
  onChangeFirstName,
  onChangeLastName,
  onBlurFirstName,
  onBlurLastName,
  onChangeRole,
}) => {
  return (
    <View>
      <Text style={styles.stepHeading}>Your Name</Text>
      <Text style={styles.stepHint}>
        Homeowners and contractors see this on your profile and messages.
      </Text>

      <Input
        testID='first-name-input'
        label='First Name'
        placeholder='First name'
        value={firstName}
        onChangeText={onChangeFirstName}
        onBlur={onBlurFirstName}
        errorText={errors.firstName}
        leftIcon='person-outline'
        autoCapitalize='words'
        accessibilityHint='Enter your first name'
        textContentType='givenName'
        autoComplete='given-name'
        variant='outline'
        size='lg'
        fullWidth
        required
      />

      <Input
        testID='last-name-input'
        label='Last Name'
        placeholder='Last name'
        value={lastName}
        onChangeText={onChangeLastName}
        onBlur={onBlurLastName}
        errorText={errors.lastName}
        leftIcon='person-outline'
        autoCapitalize='words'
        accessibilityHint='Enter your last name'
        textContentType='familyName'
        autoComplete='family-name'
        variant='outline'
        size='lg'
        fullWidth
        required
      />

      <Text style={styles.roleLabel}>I am a…</Text>
      <RoleSelector role={role} onRoleChange={onChangeRole} />
    </View>
  );
};

const styles = StyleSheet.create({
  stepHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  stepHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
});
