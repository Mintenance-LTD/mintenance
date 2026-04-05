/**
 * ContractorVerificationScreen
 *
 * Allows contractors to verify their business with license and address
 * Includes geocoding for location tracking on homeowner maps
 *
 * @filesize Target: <250 lines
 * @compliance MVVM pattern
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sanitize } from '@mintenance/security';
import { theme } from '../../theme';

interface VerificationScreenProps {
  navigation: { goBack: () => void };
}

interface VerificationData {
  companyName: string;
  businessAddress: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
}

export const ContractorVerificationScreen: React.FC<
  VerificationScreenProps
> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VerificationData>({
    companyName: '',
    businessAddress: '',
    licenseNumber: '',
    licenseType: 'trade',
    licenseExpiry: '',
  });
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    if (!user?.id) return;
    try {
      const result = (await (
        supabase
          .from('profiles')
          .select(
            'company_name, business_address, license_number, license_type, license_expiry, verification_status'
          ) as any
      )
        .eq('id', user.id)
        .single()) as { data: Record<string, string> | null };
      const profile = result.data;
      if (profile) {
        if (profile.verification_status === 'verified') {
          setIsVerified(true);
        }
        if (profile.company_name) {
          setFormData({
            companyName: profile.company_name || '',
            businessAddress: profile.business_address || '',
            licenseNumber: profile.license_number || '',
            licenseType: profile.license_type || 'trade',
            licenseExpiry: profile.license_expiry || '',
          });
        }
      }
    } catch {
      // Continue with empty form if profile fetch fails
    }
  };

  const handleSubmit = async () => {
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

    try {
      setLoading(true);

      const { error } = (await (
        supabase.from('profiles').update({
          company_name: sanitize.companyName(formData.companyName),
          business_address: sanitize.address(formData.businessAddress),
          license_number: sanitize.text(formData.licenseNumber.trim(), 50),
          license_type: formData.licenseType,
          license_expiry: formData.licenseExpiry || null,
          verification_status: 'pending',
        }) as any
      ).eq('id', user.id)) as { error: Error | null };

      if (error) throw error;

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
              Verified contractors appear on the homeowner map and get 3x more
              job opportunities
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
              {[
                { value: 'trade', label: 'Trade License' },
                { value: 'gas_safe', label: 'Gas Safe' },
                { value: 'electrical', label: 'Electrical License' },
                { value: 'other', label: 'Other' },
              ].map((option) => (
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
            <TextInput
              style={styles.input}
              value={formData.licenseExpiry}
              onChangeText={(text) =>
                setFormData({ ...formData, licenseExpiry: text })
              }
              placeholder='DD/MM/YYYY'
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Verification Benefits</Text>
          {[
            'Show up on homeowner map with location pin',
            'Get "Verified" badge on your profile',
            '3x more visibility to homeowners',
            'Priority in search results',
            'Build trust with potential clients',
          ].map((benefit, index) => (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  infoBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    backgroundColor: theme.colors.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  radioGroup: {
    marginTop: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: theme.colors.textPrimary,
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.textPrimary,
  },
  radioLabel: {
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  benefitsSection: {
    backgroundColor: theme.colors.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  benefitsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  submitButton: {
    backgroundColor: theme.colors.textPrimary,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  privacyNote: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 32,
  },
});
