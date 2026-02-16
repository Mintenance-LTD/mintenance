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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sanitize } from '@mintenance/security';

interface VerificationScreenProps {
  navigation: unknown;
}

interface VerificationData {
  companyName: string;
  businessAddress: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
}

export const ContractorVerificationScreen: React.FC<VerificationScreenProps> = ({ navigation }) => {
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
      const { data } = await supabase
        .from('profiles')
        .select('company_name, business_address, license_number, license_type, license_expiry, verification_status')
        .eq('id', user.id)
        .single();
      if (data) {
        if (data.verification_status === 'verified') {
          setIsVerified(true);
        }
        if (data.company_name) {
          setFormData({
            companyName: data.company_name || '',
            businessAddress: data.business_address || '',
            licenseNumber: data.license_number || '',
            licenseType: data.license_type || 'trade',
            licenseExpiry: data.license_expiry || '',
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

    // Validation
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

      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: sanitize.companyName(formData.companyName),
          business_address: sanitize.address(formData.businessAddress),
          license_number: sanitize.text(formData.licenseNumber.trim(), 50),
          license_type: formData.licenseType,
          license_expiry: formData.licenseExpiry || null,
          verification_status: 'pending',
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        'Verification Submitted',
        'Your verification request has been submitted and will be reviewed within 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole='header'>Business Verification</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>✅</Text>
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Why Verify?</Text>
            <Text style={styles.infoBannerText}>
              Verified contractors appear on the homeowner map and get 3x more job opportunities
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Company Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Company Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.companyName}
              onChangeText={(text) => setFormData({ ...formData, companyName: text })}
              placeholder="e.g., ABC Plumbing Ltd"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {/* Business Address */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Business Address <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.businessAddress}
              onChangeText={(text) => setFormData({ ...formData, businessAddress: text })}
              placeholder="123 Main Street, London, UK"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.helpText}>
              📍 This address will be used to show your location on the homeowner map
            </Text>
          </View>

          {/* License Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              License Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
              placeholder="e.g., LIC-12345-UK"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {/* License Type */}
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
                  onPress={() => setFormData({ ...formData, licenseType: option.value })}
                  accessibilityRole='radio'
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: formData.licenseType === option.value }}
                >
                  <View style={styles.radio}>
                    {formData.licenseType === option.value && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* License Expiry */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>License Expiry Date (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseExpiry}
              onChangeText={(text) => setFormData({ ...formData, licenseExpiry: text })}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        {/* Benefits List */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Verification Benefits:</Text>
          {[
            '✓ Show up on homeowner map with location pin',
            '✓ Get "Verified" badge on your profile',
            '✓ 3x more visibility to homeowners',
            '✓ Priority in search results',
            '✓ Build trust with potential clients',
          ].map((benefit, index) => (
            <Text key={index} style={styles.benefitItem}>
              {benefit}
            </Text>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel={loading ? 'Submitting verification' : 'Submit for verification'}
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Verification</Text>
          )}
        </TouchableOpacity>

        {/* Privacy Note */}
        <Text style={styles.privacyNote}>
          🔒 Your information is securely encrypted and will only be used for verification purposes.
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
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    paddingRight: theme.spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  infoBannerIcon: {
    fontSize: 32,
    marginRight: theme.spacing.sm,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  form: {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
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
    marginTop: theme.spacing.xs,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  benefitsSection: {
    backgroundColor: theme.colors.background,
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  benefitItem: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  privacyNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
});

