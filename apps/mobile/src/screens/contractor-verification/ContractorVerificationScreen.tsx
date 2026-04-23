/**
 * ContractorVerificationScreen
 *
 * Contractor business verification form.
 *
 * Phase 2.5 (2026-04-20) — evolved from the 4e110276 unblock that
 * added the missing columns on `profiles`. Changes in this rewrite:
 *
 *   1. Removed the two `as any` casts around supabase.from(...).
 *      Replaced with an explicit `ProfileRow` interface + single
 *      post-read cast. Schema drift of the kind that hid the 42703
 *      error for months would now surface at the type boundary
 *      instead of silently at runtime.
 *
 *   2. License expiry is now a proper date picker
 *      (@react-native-community/datetimepicker) rather than a
 *      free-text DD/MM/YYYY input. The value is stored as an ISO
 *      YYYY-MM-DD string on the wire — parseable into
 *      credential_verifications.expires_at (timestamptz).
 *
 *   3. Dual-write on submit:
 *        - `profiles.{company_name, business_address, license_*,
 *           verification_status}` — backward compat for the 20+
 *           readers still pointing at these columns.
 *        - `credential_verifications` (new source of truth) — one
 *          fresh 'pending' row per submission; RLS enforces
 *          (user_id = auth.uid() AND status = 'pending') on
 *          INSERT. Admin moderation will close out duplicates.
 *      A follow-up Phase 2.6 will migrate readers and drop the
 *      profiles.license_* columns.
 *
 *   4. Hydration still reads from `profiles` for now. The screen
 *      preserves the "edit existing submission" UX for the 2
 *      admin_verified contractors whose data lives there.
 *
 * @filesize Target: <500 lines (pre-commit gate).
 * @compliance MVVM pattern
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sanitize } from '@mintenance/security';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';
import { styles } from './ContractorVerificationScreen.styles';
import {
  INITIAL_FORM,
  LICENSE_TYPE_OPTIONS,
  VERIFICATION_BENEFITS,
  formatExpiryForDisplay,
  formatExpiryForPersistence,
  parseLegacyExpiry,
  type LicenseType,
  type ProfileRow,
  type VerificationData,
} from './ContractorVerificationScreen.helpers';

interface VerificationScreenProps {
  navigation: { goBack: () => void };
}

export const ContractorVerificationScreen: React.FC<
  VerificationScreenProps
> = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VerificationData>(INITIAL_FORM);
  const [isVerified, setIsVerified] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    // AuthContext resolves `user` asynchronously from SecureStore.
    // Running on `[]` alone meant `checkVerificationStatus` short-circuited
    // at the `!user?.id` guard on cold-mount and never re-ran, leaving
    // the form blank even when `profiles.company_name` was populated.
    // Key on `user.id` so the fetch fires exactly once as soon as the
    // auth session is resolved.
    if (!user?.id) return;
    void checkVerificationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const checkVerificationStatus = async (): Promise<void> => {
    if (!user?.id) return;
    try {
      // Single fetch — no `as any`. Typed through the local ProfileRow.
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'company_name, business_address, license_number, license_type, license_expiry, verification_status'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      const profile = (data ?? null) as ProfileRow | null;
      if (!profile) return;

      if (profile.verification_status === 'verified') {
        setIsVerified(true);
      }

      // Only populate the form when there's ANY data to show — avoids
      // stomping an empty form on a fresh user.
      if (
        profile.company_name ||
        profile.business_address ||
        profile.license_number
      ) {
        setFormData({
          companyName: profile.company_name ?? '',
          businessAddress: profile.business_address ?? '',
          licenseNumber: profile.license_number ?? '',
          licenseType: (profile.license_type as LicenseType | null) ?? 'trade',
          licenseExpiry: parseLegacyExpiry(profile.license_expiry),
        });
      }
    } catch (err) {
      // Non-fatal — the screen renders an empty form so a fresh user
      // can still submit verification. Telemetry only.
      logger.warn('ContractorVerification: failed to hydrate existing status', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ): void => {
    // Android: the picker is a modal that dismisses itself via event.type
    // (either 'set' or 'dismissed'). iOS inlines the picker so the
    // caller decides when to hide it via the "Done" button below.
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selected) {
      setFormData((prev) => ({ ...prev, licenseExpiry: selected }));
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to submit verification');
      return;
    }
    if (!formData.companyName.trim()) {
      Alert.alert('Required', 'Please enter your company name');
      return;
    }
    if (!formData.businessAddress.trim()) {
      Alert.alert('Required', 'Please enter your business address');
      return;
    }
    if (!formData.licenseNumber.trim()) {
      Alert.alert('Required', 'Please enter your license number');
      return;
    }

    const expiryIso = formatExpiryForPersistence(formData.licenseExpiry);

    try {
      setLoading(true);

      // 1) Backward-compat write to profiles — 20+ readers still
      //    consume these columns. Safe to drop in a follow-up.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_name: sanitize.companyName(formData.companyName),
          business_address: sanitize.address(formData.businessAddress),
          license_number: sanitize.text(formData.licenseNumber.trim(), 50),
          license_type: formData.licenseType,
          license_expiry: expiryIso,
          verification_status: 'pending',
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // 2) New source of truth — credential_verifications. Each
      //    submission creates a fresh 'pending' row; admin moderation
      //    closes out duplicates. RLS enforces user_id = auth.uid()
      //    + status = 'pending' on INSERT.
      const { error: credError } = await supabase
        .from('credential_verifications')
        .insert({
          user_id: user.id,
          register: formData.licenseType,
          registration_number: sanitize.text(formData.licenseNumber.trim(), 50),
          status: 'pending',
          expires_at: expiryIso ? new Date(expiryIso).toISOString() : null,
        });
      if (credError) {
        // Non-fatal for the user: profiles write already succeeded so
        // the existing admin-review flow still works. Log loud for
        // observability — this is the new path we're rolling out.
        logger.error(
          'ContractorVerification: credential_verifications insert failed',
          credError,
          { userId: user.id }
        );
      }

      await refreshUser();
      Alert.alert(
        'Verification Submitted',
        'Your verification request has been submitted and will be reviewed within 24-48 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Failed to submit verification. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole='header'>
          Business Verification
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIconWrap}>
            <Ionicons
              name='shield-checkmark'
              size={24}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Why Verify?</Text>
            <Text style={styles.infoBannerText}>
              {isVerified
                ? 'Your business is verified — edits will be re-reviewed.'
                : 'Verified contractors appear on the homeowner map and get 3x more job opportunities'}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Company Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.companyName}
              onChangeText={(text) =>
                setFormData({ ...formData, companyName: text })
              }
              placeholder='e.g., ABC Plumbing Ltd'
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Business Address <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.businessAddress}
              onChangeText={(text) =>
                setFormData({ ...formData, businessAddress: text })
              }
              placeholder='123 Main Street, London, UK'
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.helpText}>
              This address will be used to show your location on the homeowner
              map
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              License Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.licenseNumber}
              onChangeText={(text) =>
                setFormData({ ...formData, licenseNumber: text })
              }
              placeholder='e.g., LIC-12345-UK'
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>License Type</Text>
            <View style={styles.radioGroup}>
              {LICENSE_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() =>
                    setFormData({ ...formData, licenseType: option.value })
                  }
                  accessibilityRole='radio'
                  accessibilityLabel={option.label}
                  accessibilityState={{
                    selected: formData.licenseType === option.value,
                  }}
                >
                  <View
                    style={[
                      styles.radio,
                      formData.licenseType === option.value &&
                        styles.radioActive,
                    ]}
                  >
                    {formData.licenseType === option.value && (
                      <View style={styles.radioSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>License Expiry Date (Optional)</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole='button'
              accessibilityLabel='Pick license expiry date'
            >
              <Text
                style={{
                  color: formData.licenseExpiry
                    ? theme.colors.textPrimary
                    : theme.colors.textTertiary,
                  fontSize: 15,
                }}
              >
                {formatExpiryForDisplay(formData.licenseExpiry)}
              </Text>
            </TouchableOpacity>
            {formData.licenseExpiry && (
              <TouchableOpacity
                onPress={() =>
                  setFormData({ ...formData, licenseExpiry: null })
                }
                accessibilityRole='button'
                accessibilityLabel='Clear license expiry date'
              >
                <Text
                  style={[
                    styles.helpText,
                    { color: theme.colors.primary, marginTop: 6 },
                  ]}
                >
                  Clear date
                </Text>
              </TouchableOpacity>
            )}
            {showDatePicker && (
              <>
                <DateTimePicker
                  value={formData.licenseExpiry ?? new Date()}
                  mode='date'
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={{ alignSelf: 'flex-end', padding: 8 }}
                    accessibilityRole='button'
                    accessibilityLabel='Done picking date'
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: '600',
                      }}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Verification Benefits</Text>
          {VERIFICATION_BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Ionicons
                name='checkmark-circle'
                size={18}
                color={theme.colors.primary}
              />
              <Text style={styles.benefitItem}>{benefit}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel={
            loading ? 'Submitting verification' : 'Submit for verification'
          }
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Verification</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          Your information is securely encrypted and will only be used for
          verification purposes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};
